import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/resource_service.dart';
import '../../../core/widgets/common.dart';
import '../admin_providers.dart';
import '../widgets/bulletin_etudiant_sheet.dart';
import '../widgets/changer_classe_dialog.dart';
import '../widgets/dossier_etudiant_sheet.dart';
import '../widgets/etudiant_detail_sheet.dart';
import '../widgets/etudiant_form_dialog.dart';
import '../widgets/paiements_etudiant_sheet.dart';

/// Miroir de `EtudiantsPanel` (frontend/src/components/etudiants/EtudiantsPanel.jsx) : liste +
/// recherche + les 6 actions par élève (dossier & parents, paiements, changer de classe,
/// modifier, supprimer) + création d'un nouvel élève.
class AdminEtudiantsScreen extends ConsumerStatefulWidget {
  const AdminEtudiantsScreen({super.key});

  @override
  ConsumerState<AdminEtudiantsScreen> createState() => _AdminEtudiantsScreenState();
}

class _AdminEtudiantsScreenState extends ConsumerState<AdminEtudiantsScreen> {
  String _query = '';
  String? _classeFiltre;

  Future<void> _supprimer(Map<String, dynamic> etudiant) async {
    final confirme = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cet élève ?'),
        content: Text('${etudiant['prenom']} ${etudiant['nom']} sera définitivement supprimé.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirme != true) return;
    try {
      await ResourceService('/etudiants').remove(etudiant['id']);
      ref.invalidate(adminEtudiantsProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Étudiant supprimé.')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur lors de la suppression.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final etudiantsAsync = ref.watch(adminEtudiantsProvider);
    final anneesAsync = ref.watch(adminAnneesScolairesProvider);
    final anneeActiveId = anneesAsync.maybeWhen(
      data: (annees) {
        final actives = annees.where((a) => a['est_active'] == true).toList();
        return actives.isNotEmpty ? actives.first['id'] as int : (annees.isNotEmpty ? annees.first['id'] as int : null);
      },
      orElse: () => null,
    );

    final classesAsync = ref.watch(adminClassesProvider);

    return etudiantsAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Élèves indisponibles', onRetry: () => ref.invalidate(adminEtudiantsProvider)),
      data: (etudiants) {
        final q = _query.trim().toLowerCase();
        final filtres = etudiants.where((e) {
          final matricule = (e['matricule']?.toString() ?? '').toLowerCase();
          final nom = (e['nom']?.toString() ?? '').toLowerCase();
          final prenom = (e['prenom']?.toString() ?? '').toLowerCase();
          final matchQuery = q.isEmpty || matricule.contains(q) || nom.contains(q) || prenom.contains(q);
          final matchClasse = _classeFiltre == null || e['classe_actuelle'] == _classeFiltre;
          return matchQuery && matchClasse;
        }).toList();

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(adminEtudiantsProvider),
          child: ListView(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Expanded(child: SectionHeader(title: 'Gestion Étudiants', subtitle: 'Recherche par nom, prénom ou matricule')),
                      FilledButton.icon(
                        onPressed: () => ouvrirFormulaireEtudiant(context, anneeScolaireId: anneeActiveId),
                        icon: const Icon(Icons.add_rounded, size: 18),
                        label: const Text('Nouvel étudiant'),
                      ),
                    ],
                  ),
                  TextField(
                    decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Rechercher un élève...'),
                    onChanged: (v) => setState(() => _query = v),
                  ),
                  const SizedBox(height: 10),
                  classesAsync.when(
                    loading: () => const SizedBox.shrink(),
                    error: (e, _) => const SizedBox.shrink(),
                    data: (classes) {
                      final noms = classes.map((c) => c['nom']?.toString() ?? '').where((n) => n.isNotEmpty).toSet().toList()..sort();
                      return SizedBox(
                        height: 36,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: const Text('Toutes les classes'),
                                selected: _classeFiltre == null,
                                onSelected: (_) => setState(() => _classeFiltre = null),
                              ),
                            ),
                            ...noms.map((nom) => Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: ChoiceChip(
                                    label: Text(nom),
                                    selected: _classeFiltre == nom,
                                    onSelected: (_) => setState(() => _classeFiltre = _classeFiltre == nom ? null : nom),
                                  ),
                                )),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 14),
                  Text('${filtres.length} élève(s)', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12.5)),
                  const SizedBox(height: 8),
                  if (filtres.isEmpty)
                    const EmptyView(message: 'Aucun élève trouvé.', icon: Icons.person_search_outlined)
                  else
                    ...filtres.map((e) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: UserAvatar(photoUrl: e['photo'] as String?, initials: _initials(e)),
                            title: Text('${e['prenom']} ${e['nom']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            subtitle: Text('${e['matricule'] ?? '—'} · ${e['classe_actuelle'] ?? 'Non affecté'}'),
                            onTap: () => ouvrirDetailEtudiant(context, e),
                            trailing: PopupMenuButton<String>(
                              tooltip: 'Actions',
                              onSelected: (action) {
                                switch (action) {
                                  case 'dossier':
                                    ouvrirDossierEtudiant(context, e);
                                    break;
                                  case 'infos':
                                    ouvrirDetailEtudiant(context, e);
                                    break;
                                  case 'bulletin':
                                    ouvrirBulletinEtudiant(context, e);
                                    break;
                                  case 'paiements':
                                    ouvrirPaiementsEtudiant(context, e, anneeScolaireId: anneeActiveId);
                                    break;
                                  case 'classe':
                                    ouvrirChangerClasse(context, ref, e, anneeActiveId);
                                    break;
                                  case 'modifier':
                                    ouvrirFormulaireEtudiant(context, etudiant: e, anneeScolaireId: anneeActiveId);
                                    break;
                                  case 'supprimer':
                                    _supprimer(e);
                                    break;
                                }
                              },
                              itemBuilder: (context) => const [
                                PopupMenuItem(value: 'dossier', child: ListTile(leading: Icon(Icons.description_outlined), title: Text('Dossier'), contentPadding: EdgeInsets.zero)),
                                PopupMenuItem(value: 'infos', child: ListTile(leading: Icon(Icons.people_outline_rounded), title: Text('Infos élève et parents'), contentPadding: EdgeInsets.zero)),
                                PopupMenuItem(value: 'bulletin', child: ListTile(leading: Icon(Icons.grade_outlined), title: Text('Bulletin'), contentPadding: EdgeInsets.zero)),
                                PopupMenuItem(value: 'paiements', child: ListTile(leading: Icon(Icons.account_balance_wallet_outlined), title: Text('Paiements'), contentPadding: EdgeInsets.zero)),
                                PopupMenuItem(value: 'classe', child: ListTile(leading: Icon(Icons.swap_horiz_rounded), title: Text('Changer de classe'), contentPadding: EdgeInsets.zero)),
                                PopupMenuItem(value: 'modifier', child: ListTile(leading: Icon(Icons.edit_outlined), title: Text('Modifier'), contentPadding: EdgeInsets.zero)),
                                PopupMenuItem(
                                  value: 'supprimer',
                                  child: ListTile(leading: Icon(Icons.delete_outline, color: Colors.red), title: Text('Supprimer', style: TextStyle(color: Colors.red)), contentPadding: EdgeInsets.zero),
                                ),
                              ],
                            ),
                          ),
                        )),
                  const SizedBox(height: 80),
                ],
              ),
        );
      },
    );
  }

  String _initials(Map<String, dynamic> e) {
    final p = (e['prenom'] as String? ?? '').isNotEmpty ? (e['prenom'] as String)[0] : '';
    final n = (e['nom'] as String? ?? '').isNotEmpty ? (e['nom'] as String)[0] : '';
    final result = '$p$n'.toUpperCase();
    return result.isEmpty ? '?' : result;
  }
}
