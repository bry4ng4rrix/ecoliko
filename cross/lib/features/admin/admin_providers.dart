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

/// Variante de [statistiquesProvider] avec filtre trimestre optionnel, pour l'écran Rapports.
final statistiquesFiltreesProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>?, ({int? anneeScolaireId, int? trimestreId})>((ref, args) async {
  if (args.anneeScolaireId == null) return null;
  final response = await ApiClient.instance.dio.get('/statistiques/', queryParameters: {
    'annee_scolaire': args.anneeScolaireId,
    if (args.trimestreId != null) 'trimestre': args.trimestreId,
  });
  return response.data as Map<String, dynamic>;
});

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

/// Parents/tuteurs d'un étudiant — miroir de `InfosEtudiantParentsDialog`
/// (frontend/src/components/etudiants/EtudiantsPanel.jsx).
final tuteursDeLetudiantProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, int>(
  (ref, etudiantId) => ResourceService('/tuteurs').list({'etudiant': etudiantId}),
);

/// Dossier financier (total dû/payé/reste) d'un étudiant pour une année — miroir de
/// `fetchDossierFinancier` (frontend/src/services/index.js).
final dossierFinancierProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>?, ({int etudiantId, int? anneeScolaireId})>((ref, args) async {
  if (args.anneeScolaireId == null) return null;
  final response = await ApiClient.instance.dio.get('/paiements/dossier/', queryParameters: {
    'etudiant': args.etudiantId,
    'annee_scolaire': args.anneeScolaireId,
  });
  return response.data as Map<String, dynamic>;
});

/// Inscription active d'un étudiant pour une année — miroir de `inscriptionActive`
/// (`ChangerClasseDialog` / `PaiementsEtudiantDialog`, EtudiantsPanel.jsx).
final inscriptionActiveProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>?, ({int etudiantId, int? anneeScolaireId})>((ref, args) async {
  if (args.anneeScolaireId == null) return null;
  final resultats = await ResourceService('/inscriptions').list({
    'etudiant': args.etudiantId,
    'annee_scolaire': args.anneeScolaireId,
  });
  return resultats.isEmpty ? null : resultats.first;
});

/// Paiements d'écolage d'un étudiant pour une année — miroir de `mesPaiements`
/// (`PaiementsEtudiantDialog`, EtudiantsPanel.jsx).
final paiementsDeLetudiantProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, ({int etudiantId, int? anneeScolaireId})>((ref, args) async {
  if (args.anneeScolaireId == null) return [];
  return ResourceService('/paiements').list({
    'etudiant': args.etudiantId,
    'annee_scolaire': args.anneeScolaireId,
  });
});
