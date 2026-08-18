import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/error_message.dart';
import '../../../core/api/file_download.dart';
import '../admin_providers.dart';

const _statutLabels = {'PAYE': 'Payé', 'PARTIEL': 'Partiel', 'EN_ATTENTE': 'En attente', 'ANNULE': 'Annulé', 'EN_RETARD': 'En retard'};

const _statutColors = {
  'PAYE': Colors.green,
  'PARTIEL': Colors.orange,
  'EN_ATTENTE': Colors.grey,
  'ANNULE': Colors.grey,
  'EN_RETARD': Colors.red,
};

/// DRF sérialise les `DecimalField` (montants) en chaînes JSON (ex. `"120000.00"`), pas en
/// nombres — un cast `as num?` direct plante dessus (`String is not a subtype of num?`).
num? _num(dynamic valeur) {
  if (valeur == null) return null;
  if (valeur is num) return valeur;
  return num.tryParse(valeur.toString());
}

const _moisLabels = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/// Marqueur distinguant un `PaiementEcolage` "droit d'inscription/réinscription" d'un
/// paiement d'écolage mensuel ordinaire — `mois_couvert` étant obligatoire côté backend,
/// on le rattache conventionnellement au mois de début du cycle scolaire et on le tague via
/// `commentaire` (même mécanisme que `MARQUEUR_INSCRIPTION`, EtudiantsPanel.jsx).
const _marqueurInscription = "Droit d'inscription/réinscription";

/// Miroir de `PaiementsEtudiantDialog` (frontend/src/components/etudiants/EtudiantsPanel.jsx) :
/// dossier financier, droit d'inscription/réinscription (facture + bascule payé/non payé) et
/// calendrier mensuel d'écolage (12 mois, facture + bascule payé/non payé par mois).
Future<void> ouvrirPaiementsEtudiant(BuildContext context, Map<String, dynamic> etudiant, {int? anneeScolaireId}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => _PaiementsContent(etudiant: etudiant, anneeScolaireId: anneeScolaireId, scrollController: scrollController),
    ),
  );
}

class _PaiementsContent extends ConsumerStatefulWidget {
  final Map<String, dynamic> etudiant;
  final int? anneeScolaireId;
  final ScrollController scrollController;

  const _PaiementsContent({required this.etudiant, required this.anneeScolaireId, required this.scrollController});

  @override
  ConsumerState<_PaiementsContent> createState() => _PaiementsContentState();
}

class _PaiementsContentState extends ConsumerState<_PaiementsContent> {
  String? _actionEnCours;

  int get _etudiantId => widget.etudiant['id'] as int;

  void _invaliderFinance() {
    ref.invalidate(paiementsDeLetudiantProvider);
    ref.invalidate(dossierFinancierProvider);
  }

  Future<void> _executer(String cle, Future<void> Function() action, {String repli = 'Erreur lors de la mise à jour.'}) async {
    setState(() => _actionEnCours = cle);
    try {
      await action();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(messageErreur(e, repli))));
    } finally {
      if (mounted) setState(() => _actionEnCours = null);
    }
  }

  String _dateEcheancePourMois(Map<String, dynamic> anneeActive, int mois) {
    final anneeDebut = DateTime.parse(anneeActive['date_debut'].toString()).year;
    final moisDebut = (anneeActive['mois_debut_annee_scolaire'] as num?)?.toInt() ?? 9;
    final jourEcheance = (anneeActive['jour_echeance_mensuelle'] as num?)?.toInt() ?? 5;
    final annee = mois >= moisDebut ? anneeDebut : anneeDebut + 1;
    return '$annee-${mois.toString().padLeft(2, '0')}-${jourEcheance.toString().padLeft(2, '0')}';
  }

  Future<void> _marquerPaye(Map<String, dynamic> anneeActive, List<Map<String, dynamic>> paiementsDuMois, int mois, num? montantEcolageMensuel) {
    return _executer('mois-$mois', () async {
      final existant = paiementsDuMois.isNotEmpty ? paiementsDuMois.first : null;
      final dio = ApiClient.instance.dio;
      if (existant != null) {
        await dio.patch('/paiements/${existant['id']}/', data: {'statut': 'PAYE'});
      } else {
        await dio.post('/paiements/', data: {
          'etudiant': _etudiantId,
          'annee_scolaire': anneeActive['id'],
          'montant': montantEcolageMensuel ?? 0,
          'date_echeance': _dateEcheancePourMois(anneeActive, mois),
          'mois_couvert': mois,
          'statut': 'PAYE',
        });
      }
      _invaliderFinance();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Mois marqué comme payé.')));
    });
  }

  Future<void> _marquerNonPaye(List<Map<String, dynamic>> paiementsDuMois, int mois) {
    return _executer('mois-$mois', () async {
      if (paiementsDuMois.isEmpty) return;
      await ApiClient.instance.dio.patch('/paiements/${paiementsDuMois.first['id']}/', data: {'statut': 'EN_ATTENTE'});
      _invaliderFinance();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Mois marqué comme non payé.')));
    });
  }

  Future<void> _toggleInscriptionPaye(Map<String, dynamic> anneeActive, Map<String, dynamic>? paiementInscription, bool dejaPaye, num? montantInscription) {
    return _executer('inscription', () async {
      final dio = ApiClient.instance.dio;
      if (paiementInscription != null) {
        await dio.patch('/paiements/${paiementInscription['id']}/', data: {'statut': dejaPaye ? 'EN_ATTENTE' : 'PAYE'});
      } else {
        await dio.post('/paiements/', data: {
          'etudiant': _etudiantId,
          'annee_scolaire': anneeActive['id'],
          'montant': montantInscription ?? 0,
          'date_echeance': anneeActive['date_debut'],
          'mois_couvert': (anneeActive['mois_debut_annee_scolaire'] as num?)?.toInt() ?? 9,
          'statut': 'PAYE',
          'commentaire': _marqueurInscription,
        });
      }
      _invaliderFinance();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(dejaPaye ? "Droit d'inscription marqué comme non payé." : "Droit d'inscription marqué comme payé.")));
      }
    });
  }

  Future<void> _telechargerCarteEcolage() {
    return _executer(
      'carte',
      () async {
        final matricule = widget.etudiant['matricule'];
        await downloadAndOpen('/etudiants/$_etudiantId/carte-ecolage/', 'carte_ecolage_$matricule.pdf');
      },
      repli: 'Erreur lors de la génération de la carte.',
    );
  }

  Future<void> _telechargerFacture({required int anneeId, int? mois, bool inscription = false, bool allowPaye = false}) {
    return _executer(
      inscription ? 'facture-inscription' : 'facture-$mois',
      () async {
        final matricule = widget.etudiant['matricule'];
        final params = <String>['annee_scolaire=$anneeId'];
        if (inscription) {
          params.add('type=inscription');
        } else {
          params.add('mois=$mois');
        }
        if (allowPaye) params.add('allow_paye=1');
        final suffix = inscription ? 'inscription' : 'mois_$mois';
        await downloadAndOpen('/etudiants/$_etudiantId/facture-ecolage/?${params.join('&')}', 'facture_${matricule}_$suffix.pdf');
      },
      repli: 'Erreur lors de la génération de la facture.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final anneesAsync = ref.watch(adminAnneesScolairesProvider);
    final classesAsync = ref.watch(adminClassesProvider);
    final inscriptionsAsync = ref.watch(toutesInscriptionsDeLetudiantProvider(_etudiantId));
    final fraisAsync = ref.watch(fraisScolariteProvider);
    final dossierAsync = ref.watch(dossierFinancierProvider((etudiantId: _etudiantId, anneeScolaireId: widget.anneeScolaireId)));
    final paiementsAsync = ref.watch(paiementsDeLetudiantProvider((etudiantId: _etudiantId, anneeScolaireId: widget.anneeScolaireId)));
    final scheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: ListView(
        controller: widget.scrollController,
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Paiements — ${widget.etudiant['prenom']} ${widget.etudiant['nom']}', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _actionEnCours == 'carte' ? null : _telechargerCarteEcolage,
            icon: _actionEnCours == 'carte' ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.receipt_long_rounded, size: 18),
            label: const Text("Générer la carte d'écolage"),
          ),
          const SizedBox(height: 20),
          if (widget.anneeScolaireId == null)
            const Text('Aucune année scolaire active.')
          else
            anneesAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => const Text('Année scolaire indisponible.'),
              data: (annees) {
                final anneeActive = annees.firstWhere((a) => a['id'] == widget.anneeScolaireId, orElse: () => <String, dynamic>{});
                if (anneeActive.isEmpty) return const Text('Année scolaire introuvable.');

                return classesAsync.when(
                  loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator())),
                  error: (e, _) => const Text('Classes indisponibles.'),
                  data: (classes) => inscriptionsAsync.when(
                    loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator())),
                    error: (e, _) => const Text('Inscriptions indisponibles.'),
                    data: (inscriptions) => fraisAsync.when(
                      loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator())),
                      error: (e, _) => const Text('Tarifs indisponibles.'),
                      data: (fraisScolarite) => paiementsAsync.when(
                        loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator())),
                        error: (e, _) => const Text('Paiements indisponibles.'),
                        data: (mesPaiements) {
                          final inscriptionActive = inscriptions.where((i) => i['annee_scolaire'] == anneeActive['id']).toList();
                          final classeActuelle = inscriptionActive.isNotEmpty ? classes.where((c) => c['id'] == inscriptionActive.first['classe']).toList() : <Map<String, dynamic>>[];
                          final classe = classeActuelle.isNotEmpty ? classeActuelle.first : null;

                          final tarifNiveau = classe != null
                              ? fraisScolarite.where((f) => f['annee_scolaire'] == anneeActive['id'] && f['niveau'] == classe['niveau'] && (f['filiere']) == (classe['filiere'])).toList()
                              : <Map<String, dynamic>>[];
                          final tarif = tarifNiveau.isNotEmpty ? tarifNiveau.first : null;

                          final estReinscription = inscriptions.any((i) {
                            final anneeIns = annees.where((a) => a['id'] == i['annee_scolaire']).toList();
                            if (anneeIns.isEmpty) return false;
                            return anneeIns.first['date_debut'].toString().compareTo(anneeActive['date_debut'].toString()) < 0;
                          });

                          final droitClasse = estReinscription && classe?['frais_reinscription'] != null ? _num(classe!['frais_reinscription']) : _num(classe?['frais_inscription']);
                          final montantInscription = droitClasse ?? _num(tarif?['montant_inscription']);
                          final montantAnnuel = _num(tarif?['montant_annuel']);
                          final montantEcolageMensuel = _num(classe?['frais_ecolage_mensuel']) ?? (montantAnnuel != null ? montantAnnuel / 12 : null);

                          final totalPayeEcolage = mesPaiements.where((p) => p['statut'] == 'PAYE').fold<num>(0, (a, p) => a + (_num(p['montant']) ?? 0));
                          final droitInscriptionPaye = montantInscription != null && totalPayeEcolage >= montantInscription;

                          final paiementInscription = mesPaiements.where((p) => p['commentaire'] == _marqueurInscription).toList();
                          final paiementInscriptionRecord = paiementInscription.isNotEmpty ? paiementInscription.first : null;

                          List<Map<String, dynamic>> paiementsParMois(int mois) =>
                              mesPaiements.where((p) => p['mois_couvert'] == mois && p['commentaire'] != _marqueurInscription).toList();

                          final aujourdhui = DateTime.now().toIso8601String().substring(0, 10);
                          final moisEnRetard = List.generate(12, (i) => i + 1).where((mois) {
                            final dejaPaye = paiementsParMois(mois).any((p) => p['statut'] == 'PAYE');
                            return !dejaPaye && _dateEcheancePourMois(anneeActive, mois).compareTo(aujourdhui) < 0;
                          }).length;

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              dossierAsync.when(
                                loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: LinearProgressIndicator()),
                                error: (e, _) => const Text('Dossier indisponible.'),
                                data: (dossier) {
                                  if (dossier == null) return const SizedBox.shrink();
                                  return Wrap(
                                    spacing: 10,
                                    runSpacing: 10,
                                    children: [
                                      _statTuile(context, 'Total dû', '${dossier['total_du'] ?? 0} Ar', scheme.onSurface),
                                      _statTuile(context, 'Total payé', '${dossier['total_paye'] ?? 0} Ar', Colors.green.shade700),
                                      _statTuile(context, 'Reste à payer', '${dossier['reste_du'] ?? 0} Ar', Colors.red.shade700),
                                      _statTuile(context, 'Statut', _statutLabels[dossier['statut']] ?? dossier['statut']?.toString() ?? '—', scheme.onSurface),
                                      _statTuile(context, 'Mois en retard', '$moisEnRetard', moisEnRetard > 0 ? Colors.red.shade700 : scheme.onSurface),
                                    ],
                                  );
                                },
                              ),
                              const SizedBox(height: 24),
                              Text('Frais généraux', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 10),
                              if (montantInscription == null && montantEcolageMensuel == null)
                                const Text('Aucun tarif configuré (ni sur la classe, ni par niveau) pour cette année.', style: TextStyle(fontSize: 13))
                              else ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(10)),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Wrap(
                                        crossAxisAlignment: WrapCrossAlignment.center,
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          Text(estReinscription ? "Droit de réinscription" : "Droit d'inscription", style: const TextStyle(fontWeight: FontWeight.w600)),
                                          Text(montantInscription != null ? '$montantInscription Ar' : '—', style: const TextStyle(fontFamily: 'monospace')),
                                          _badge(droitInscriptionPaye ? 'Payé' : 'Pas encore payé', droitInscriptionPaye ? Colors.green : Colors.red),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          _petitBouton(
                                            'Générer facture',
                                            Colors.blue,
                                            _actionEnCours == 'facture-inscription',
                                            () => _telechargerFacture(anneeId: anneeActive['id'] as int, inscription: true),
                                          ),
                                          _petitBouton(
                                            droitInscriptionPaye ? 'Marquer non payé' : 'Marquer payé',
                                            droitInscriptionPaye ? Colors.orange : Colors.green,
                                            _actionEnCours == 'inscription',
                                            () => _toggleInscriptionPaye(anneeActive, paiementInscriptionRecord, droitInscriptionPaye, montantInscription),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(10)),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Écolage mensuel'),
                                      Text(montantEcolageMensuel != null ? '${montantEcolageMensuel.toStringAsFixed(0)} Ar/mois' : '—', style: const TextStyle(fontFamily: 'monospace')),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 24),
                              Text('Cartes d\'écolage — suivi mensuel', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 10),
                              ...List.generate(12, (i) {
                                final mois = i + 1;
                                final lignes = paiementsParMois(mois);
                                final dejaPaye = lignes.any((p) => p['statut'] == 'PAYE');
                                final busy = _actionEnCours == 'mois-$mois' || _actionEnCours == 'facture-$mois';

                                if (lignes.isEmpty) {
                                  final echeance = _dateEcheancePourMois(anneeActive, mois);
                                  final enRetard = echeance.compareTo(aujourdhui) < 0;
                                  return _ligneMois(
                                    context,
                                    label: _moisLabels[mois],
                                    montant: '—',
                                    sousTitre: 'Échéance : $echeance',
                                    badge: _badge(enRetard ? 'En retard' : 'Non payé', enRetard ? Colors.red : Colors.grey),
                                    actions: [
                                      _petitBouton('Marquer payé', Colors.green, busy, () => _marquerPaye(anneeActive, lignes, mois, montantEcolageMensuel)),
                                    ],
                                  );
                                }
                                return Column(
                                  children: lignes.map((p) {
                                    final statut = p['statut']?.toString() ?? 'EN_ATTENTE';
                                    return _ligneMois(
                                      context,
                                      label: _moisLabels[mois],
                                      montant: '${p['montant'] ?? 0} Ar',
                                      sousTitre: p['date_paiement']?.toString() ?? '',
                                      badge: _badge(_statutLabels[statut] ?? statut, _statutColors[statut] ?? Colors.grey),
                                      actions: dejaPaye
                                          ? [
                                              _petitBouton('Facture', Colors.blue, busy, () => _telechargerFacture(anneeId: anneeActive['id'] as int, mois: mois, allowPaye: true)),
                                              _petitBouton('Marquer non payé', Colors.red, busy, () => _marquerNonPaye(lignes, mois)),
                                            ]
                                          : [
                                              _petitBouton('Marquer payé', Colors.green, busy, () => _marquerPaye(anneeActive, lignes, mois, montantEcolageMensuel)),
                                            ],
                                    );
                                  }).toList(),
                                );
                              }),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _statTuile(BuildContext context, String label, String value, Color couleur) {
    return Container(
      width: 148,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: couleur)),
        ],
      ),
    );
  }

  Widget _badge(String texte, MaterialColor couleur) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: couleur.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
      child: Text(texte, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: couleur.shade700)),
    );
  }

  Widget _petitBouton(String texte, MaterialColor couleur, bool busy, VoidCallback onPressed) {
    return SizedBox(
      height: 28,
      child: TextButton(
        onPressed: busy ? null : onPressed,
        style: TextButton.styleFrom(
          backgroundColor: couleur.withValues(alpha: 0.15),
          foregroundColor: couleur.shade700,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          minimumSize: Size.zero,
          textStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
        ),
        child: busy ? SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: couleur.shade700)) : Text(texte),
      ),
    );
  }

  Widget _ligneMois(BuildContext context, {required String label, required String montant, required String sousTitre, required Widget badge, required List<Widget> actions}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
                Text(montant, style: const TextStyle(fontFamily: 'monospace')),
                const SizedBox(width: 8),
                badge,
              ],
            ),
            const SizedBox(height: 2),
            Text(sousTitre, style: TextStyle(fontSize: 11.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 6),
            Wrap(spacing: 6, runSpacing: 6, children: actions),
          ],
        ),
      ),
    );
  }
}
