import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import '../admin_providers.dart';

const _statutLabels = {'PAYE': 'Payé', 'PARTIEL': 'Partiel', 'EN_ATTENTE': 'En attente', 'ANNULE': 'Annulé', 'EN_RETARD': 'En retard'};

const _statutColors = {
  'PAYE': Colors.green,
  'PARTIEL': Colors.orange,
  'EN_ATTENTE': Colors.grey,
  'ANNULE': Colors.grey,
  'EN_RETARD': Colors.red,
};

const _moisLabels = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/// Miroir simplifié de `PaiementsEtudiantDialog` (frontend/src/components/etudiants/EtudiantsPanel.jsx) :
/// dossier financier + liste des paiements d'écolage de l'étudiant pour l'année active.
Future<void> ouvrirPaiementsEtudiant(BuildContext context, Map<String, dynamic> etudiant, {int? anneeScolaireId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => _PaiementsContent(etudiant: etudiant, anneeScolaireId: anneeScolaireId, scrollController: scrollController),
    ),
  );
}

class _PaiementsContent extends ConsumerWidget {
  final Map<String, dynamic> etudiant;
  final int? anneeScolaireId;
  final ScrollController scrollController;

  const _PaiementsContent({required this.etudiant, required this.anneeScolaireId, required this.scrollController});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final etudiantId = etudiant['id'] as int;
    final dossierAsync = ref.watch(dossierFinancierProvider((etudiantId: etudiantId, anneeScolaireId: anneeScolaireId)));
    final paiementsAsync = ref.watch(paiementsDeLetudiantProvider((etudiantId: etudiantId, anneeScolaireId: anneeScolaireId)));

    return SafeArea(
      child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.all(20),
        children: [
          Text('Paiements — ${etudiant['prenom']} ${etudiant['nom']}', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          if (anneeScolaireId == null)
            const Text('Aucune année scolaire active.')
          else ...[
            dossierAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: LinearProgressIndicator()),
              error: (e, _) => const Text('Dossier indisponible.'),
              data: (dossier) {
                if (dossier == null) return const SizedBox.shrink();
                return Row(
                  children: [
                    Expanded(child: StatCard(title: 'Total dû', value: '${dossier['total_du'] ?? 0} Ar', icon: Icons.receipt_long_rounded)),
                    const SizedBox(width: 10),
                    Expanded(child: StatCard(title: 'Reste dû', value: '${dossier['reste_du'] ?? 0} Ar', icon: Icons.warning_amber_rounded, accentColor: Colors.orange)),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),
            Text('Historique des paiements', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            paiementsAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => const Text('Paiements indisponibles.'),
              data: (paiements) {
                if (paiements.isEmpty) return const EmptyView(message: 'Aucun paiement enregistré.', icon: Icons.receipt_outlined);
                final tries = [...paiements]..sort((a, b) => (a['mois_couvert'] as num? ?? 0).compareTo(b['mois_couvert'] as num? ?? 0));
                return Column(
                  children: tries.map((p) {
                    final statut = p['statut']?.toString() ?? 'EN_ATTENTE';
                    final couleur = _statutColors[statut] ?? Colors.grey;
                    final mois = (p['mois_couvert'] as num?)?.toInt();
                    final estMarqueurInscription = p['commentaire']?.toString().contains("inscription") == true;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(estMarqueurInscription ? "Droit d'inscription/réinscription" : (mois != null && mois >= 1 && mois <= 12 ? _moisLabels[mois] : 'Écolage')),
                        subtitle: Text('${p['montant'] ?? 0} Ar · échéance ${p['date_echeance'] ?? '—'}'),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(color: couleur.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                          child: Text(_statutLabels[statut] ?? statut, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: couleur.shade700)),
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
