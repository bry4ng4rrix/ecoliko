import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import '../admin_providers.dart';

const _relationLabels = {'PERE': 'Père', 'MERE': 'Mère', 'TUTEUR': 'Tuteur légal', 'AUTRE': 'Autre'};

const _statutDossierLabels = {'PAYE': 'Payé', 'PARTIEL': 'Partiel', 'IMPAYE': 'Impayé', 'NON_CONFIGURE': 'Non configuré'};

const _statutDossierColors = {
  'PAYE': Colors.green,
  'PARTIEL': Colors.orange,
  'IMPAYE': Colors.red,
  'NON_CONFIGURE': Colors.grey,
};

/// Affiche les informations d'un élève + son dossier financier + ses parents/tuteurs.
/// Miroir de `InfosEtudiantParentsDialog` (frontend/src/components/etudiants/EtudiantsPanel.jsx).
Future<void> ouvrirDetailEtudiant(BuildContext context, Map<String, dynamic> etudiant, {int? anneeScolaireId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => _EtudiantDetailContent(
        etudiant: etudiant,
        anneeScolaireId: anneeScolaireId,
        scrollController: scrollController,
      ),
    ),
  );
}

class _EtudiantDetailContent extends ConsumerWidget {
  final Map<String, dynamic> etudiant;
  final int? anneeScolaireId;
  final ScrollController scrollController;

  const _EtudiantDetailContent({required this.etudiant, required this.anneeScolaireId, required this.scrollController});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final etudiantId = etudiant['id'] as int;
    final tuteursAsync = ref.watch(tuteursDeLetudiantProvider(etudiantId));
    final dossierAsync = ref.watch(dossierFinancierProvider((etudiantId: etudiantId, anneeScolaireId: anneeScolaireId)));

    return SafeArea(
      child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              UserAvatar(photoUrl: etudiant['photo'] as String?, initials: _initiales(etudiant), radius: 28),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${etudiant['prenom']} ${etudiant['nom']}', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                    Text('${etudiant['matricule'] ?? '—'} · ${etudiant['classe_actuelle'] ?? 'Non affecté'}', style: TextStyle(color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Informations', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  _ligne(context, Icons.phone_rounded, etudiant['telephone']?.toString()),
                  _ligne(context, Icons.email_rounded, etudiant['email']?.toString()),
                  _ligne(context, Icons.home_rounded, etudiant['adresse']?.toString()),
                  _ligne(context, Icons.emergency_rounded, etudiant['contact_urgence']?.toString()),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Dossier financier', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  dossierAsync.when(
                    loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: LinearProgressIndicator()),
                    error: (e, _) => const Text('Dossier indisponible.'),
                    data: (dossier) {
                      if (dossier == null) return const Text('Aucune année scolaire active.');
                      final statut = dossier['statut']?.toString() ?? 'NON_CONFIGURE';
                      final couleur = _statutDossierColors[statut] ?? Colors.grey;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _statLigne(context, 'Total dû', dossier['total_du']),
                          _statLigne(context, 'Total payé', dossier['total_paye'], couleur: Colors.green),
                          _statLigne(context, 'Reste dû', dossier['reste_du'], gras: true),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(color: couleur.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                            child: Text(
                              _statutDossierLabels[statut] ?? statut,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: couleur.shade700),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Parents / tuteurs', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          tuteursAsync.when(
            loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: LinearProgressIndicator()),
            error: (e, _) => const Text('Parents indisponibles.'),
            data: (tuteurs) {
              if (tuteurs.isEmpty) return const Text('Aucun parent/tuteur lié.');
              return Column(
                children: tuteurs.map((t) {
                  final estPrincipal = t['est_contact_principal'] == true;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: UserAvatar(photoUrl: t['parent_photo'] as String?, initials: _initialesNom(t['parent_nom']?.toString())),
                      title: Row(
                        children: [
                          Flexible(child: Text(t['parent_nom']?.toString() ?? '—', style: const TextStyle(fontWeight: FontWeight.w700))),
                          if (estPrincipal) ...[const SizedBox(width: 6), Icon(Icons.star_rounded, size: 16, color: Colors.amber.shade700)],
                        ],
                      ),
                      subtitle: Text('${_relationLabels[t['relation']] ?? t['relation'] ?? ''}${estPrincipal ? ' · Contact principal' : ''}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if ((t['parent_telephone'] as String?)?.isNotEmpty == true)
                            Text(t['parent_telephone'].toString(), style: const TextStyle(fontSize: 11)),
                          if ((t['parent_email'] as String?)?.isNotEmpty == true)
                            Text(t['parent_email'].toString(), style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _ligne(BuildContext context, IconData icon, String? valeur) {
    if (valeur == null || valeur.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Expanded(child: Text(valeur)),
        ],
      ),
    );
  }

  Widget _statLigne(BuildContext context, String label, dynamic valeur, {Color? couleur, bool gras = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          Text(
            '${valeur ?? 0} Ar',
            style: TextStyle(fontWeight: gras ? FontWeight.w800 : FontWeight.w600, color: couleur),
          ),
        ],
      ),
    );
  }

  String _initiales(Map<String, dynamic> e) {
    final p = (e['prenom'] as String? ?? '').isNotEmpty ? (e['prenom'] as String)[0] : '';
    final n = (e['nom'] as String? ?? '').isNotEmpty ? (e['nom'] as String)[0] : '';
    final result = '$p$n'.toUpperCase();
    return result.isEmpty ? '?' : result;
  }

  String _initialesNom(String? nomComplet) {
    if (nomComplet == null || nomComplet.trim().isEmpty) return '?';
    final parts = nomComplet.trim().split(RegExp(r'\s+'));
    final result = parts.map((p) => p.isNotEmpty ? p[0] : '').join().toUpperCase();
    return result.isEmpty ? '?' : result.substring(0, result.length > 2 ? 2 : result.length);
  }
}
