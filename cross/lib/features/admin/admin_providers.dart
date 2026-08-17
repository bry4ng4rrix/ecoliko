import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/resource_service.dart';

final adminEtudiantsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) => ResourceService('/etudiants').list());

final adminPersonnelProvider = FutureProvider<List<Map<String, dynamic>>>((ref) => ResourceService('/personnel').list());

final adminClassesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) => ResourceService('/classes').list());

final adminAnneesScolairesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) => ResourceService('/annees-scolaires').list());

/// Miroir de `fetchStatistiques` (frontend/src/services/index.js).
final statistiquesProvider = FutureProvider.family<Map<String, dynamic>?, int?>((ref, anneeScolaireId) async {
  if (anneeScolaireId == null) return null;
  final response = await ApiClient.instance.dio.get('/statistiques/', queryParameters: {'annee_scolaire': anneeScolaireId});
  return response.data as Map<String, dynamic>;
});

final adminTrimestresProvider = FutureProvider<List<Map<String, dynamic>>>((ref) => ResourceService('/trimestres').list());

/// Miroir du bilan annuel de passage/redoublement : GET /classes/<id>/classement-annuel/.
final classementAnnuelProvider = FutureProvider.family<List<Map<String, dynamic>>, int>((ref, classeId) async {
  final response = await ApiClient.instance.dio.get('/classes/$classeId/classement-annuel/');
  return (response.data as List).cast<Map<String, dynamic>>();
});

/// Miroir du classement trimestriel : GET /classes/<id>/classement/?trimestre=<id>.
final classementTrimestreProvider = FutureProvider.family<List<Map<String, dynamic>>, ({int classeId, int trimestreId})>((ref, args) async {
  final response = await ApiClient.instance.dio.get('/classes/${args.classeId}/classement/', queryParameters: {'trimestre': args.trimestreId});
  return (response.data as List).cast<Map<String, dynamic>>();
});
