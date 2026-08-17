import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'token_storage.dart';

/// Base URL du backend Django. `127.0.0.1` fonctionne pour le web/desktop/iOS simulator,
/// mais l'émulateur Android route `localhost` de la machine hôte via `10.0.2.2` — d'où le
/// choix dynamique ci-dessous. Pour un vrai appareil, remplacer par l'IP LAN du serveur ou
/// lancer avec `--dart-define=API_BASE_URL=http://<ip>:8000/api`.
String _defaultBaseUrl() {
  if (kIsWeb) return 'http://127.0.0.1:8000/api';
  try {
    if (Platform.isAndroid) return 'http://10.0.2.2:8000/api';
  } catch (_) {
    // Platform indisponible (ex. certains contextes de test) : on retombe sur le défaut.
  }
  return 'http://127.0.0.1:8000/api';
}

const _envBaseUrl = String.fromEnvironment('API_BASE_URL');

class ApiClient {
  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: _envBaseUrl.isNotEmpty ? _envBaseUrl : _defaultBaseUrl(),
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
      ),
    );
    dio.interceptors.add(_AuthInterceptor(dio));
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio dio;
}

/// Reproduit le comportement de `apiClient.js` : injecte le Bearer token sur chaque
/// requête, et sur un 401 (hors endpoints d'auth), tente un rafraîchissement unique
/// partagé par toutes les requêtes concurrentes avant de rejouer la requête d'origine.
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._dio);

  final Dio _dio;
  Future<String?>? _refreshing;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final access = await TokenStorage.instance.readAccess();
    if (access != null) {
      options.headers['Authorization'] = 'Bearer $access';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final response = err.response;
    final path = err.requestOptions.path;
    final isAuthEndpoint = path.contains('/auth/token');
    final alreadyRetried = err.requestOptions.extra['retried'] == true;

    if (response?.statusCode != 401 || isAuthEndpoint || alreadyRetried) {
      handler.next(err);
      return;
    }

    final refresh = await TokenStorage.instance.readRefresh();
    if (refresh == null) {
      await TokenStorage.instance.clear();
      handler.next(err);
      return;
    }

    try {
      _refreshing ??= _doRefresh(refresh);
      final newAccess = await _refreshing;
      _refreshing = null;
      if (newAccess == null) throw Exception('refresh failed');

      final retryOptions = err.requestOptions;
      retryOptions.extra['retried'] = true;
      retryOptions.headers['Authorization'] = 'Bearer $newAccess';
      final response = await _dio.fetch(retryOptions);
      handler.resolve(response);
    } catch (_) {
      _refreshing = null;
      await TokenStorage.instance.clear();
      handler.next(err);
    }
  }

  Future<String?> _doRefresh(String refresh) async {
    final response = await Dio(BaseOptions(baseUrl: _dio.options.baseUrl))
        .post('/auth/token/refresh/', data: {'refresh': refresh});
    final access = response.data['access'] as String;
    await TokenStorage.instance.updateAccess(access);
    return access;
  }
}
