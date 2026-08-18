import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import '../admin_providers.dart';
import '../widgets/etudiant_detail_sheet.dart';

/// Miroir simplifié de `EtudiantsPanel` (frontend/src/components/etudiants/EtudiantsPanel.jsx) :
/// liste + recherche. La création/modification d'un dossier élève reste à porter.
class AdminEtudiantsScreen extends ConsumerStatefulWidget {
  const AdminEtudiantsScreen({super.key});

  @override
  ConsumerState<AdminEtudiantsScreen> createState() => _AdminEtudiantsScreenState();
}

class _AdminEtudiantsScreenState extends ConsumerState<AdminEtudiantsScreen> {
  String _query = '';

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

    return etudiantsAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Élèves indisponibles', onRetry: () => ref.invalidate(adminEtudiantsProvider)),
      data: (etudiants) {
        final q = _query.trim().toLowerCase();
        final filtres = q.isEmpty
            ? etudiants
            : etudiants.where((e) {
                final matricule = (e['matricule']?.toString() ?? '').toLowerCase();
                final nom = (e['nom']?.toString() ?? '').toLowerCase();
                final prenom = (e['prenom']?.toString() ?? '').toLowerCase();
                return matricule.contains(q) || nom.contains(q) || prenom.contains(q);
              }).toList();

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(adminEtudiantsProvider),
          child: ListView(
            children: [
              const SectionHeader(title: 'Gestion Étudiants', subtitle: 'Recherche par nom, prénom ou matricule'),
              TextField(
                decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Rechercher un élève...'),
                onChanged: (v) => setState(() => _query = v),
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
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => ouvrirDetailEtudiant(context, e, anneeScolaireId: anneeActiveId),
                      ),
                    )),
              const SizedBox(height: 24),
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
