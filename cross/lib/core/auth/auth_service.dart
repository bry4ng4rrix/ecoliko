import '../api/api_client.dart';
import '../api/token_storage.dart';
import '../../models/user.dart';

/// Miroir de `authService.js` — mêmes endpoints, même contrat (`{access, refresh, user}`).
class AuthService {
  final _dio = ApiClient.instance.dio;

  /// [identifiant] accepte un email OU un matricule (résolu côté backend, voir
  /// `CustomTokenObtainPairSerializer`).
  Future<AppUser> login(String identifiant, String password) async {
    final response = await _dio.post('/auth/token/', data: {
      'email': identifiant,
      'password': password,
    });
    final data = response.data as Map<String, dynamic>;
    await TokenStorage.instance.save(access: data['access'] as String, refresh: data['refresh'] as String);
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<AppUser> fetchProfile() async {
    final response = await _dio.get('/auth/profile/');
    return AppUser.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> changePassword(String ancien, String nouveau) async {
    await _dio.post('/auth/changer-mot-de-passe/', data: {
      'ancien_mot_de_passe': ancien,
      'nouveau_mot_de_passe': nouveau,
    });
  }

  Future<void> logout() async {
    await TokenStorage.instance.clear();
  }
}
