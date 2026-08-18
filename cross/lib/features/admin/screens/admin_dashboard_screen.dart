import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import '../admin_providers.dart';
import '../widgets/distribution_classe_radar_chart.dart';
import '../widgets/taux_par_trimestre_chart.dart';

/// Miroir de `DashboardOverview` (frontend/src/pages/AdminDashboard.jsx) — cartes de
/// synthèse + graphiques Area (taux par trimestre) et Radar (distribution par classe).
class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final etudiantsAsync = ref.watch(adminEtudiantsProvider);
    final personnelAsync = ref.watch(adminPersonnelProvider);
    final classesAsync = ref.watch(adminClassesProvider);
    final anneesAsync = ref.watch(adminAnneesScolairesProvider);

    return anneesAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => const ErrorView(message: 'Années scolaires indisponibles'),
      data: (annees) {
        final actives = annees.where((a) => a['est_active'] == true).toList();
        final anneeActiveId = actives.isNotEmpty ? actives.first['id'] as int : (annees.isNotEmpty ? annees.first['id'] as int : null);
        final statsAsync = ref.watch(statistiquesProvider(anneeActiveId));

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(adminEtudiantsProvider);
            ref.invalidate(adminPersonnelProvider);
            ref.invalidate(adminClassesProvider);
            ref.invalidate(statistiquesProvider(anneeActiveId));
          },
          child: ListView(
            children: [
              const SectionHeader(title: 'Tableau de bord', subtitle: 'Bienvenue sur la plateforme SIG-Lycée'),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  etudiantsAsync.when(
                    data: (e) => StatCard(title: 'Élèves inscrits', value: '${e.length}', icon: Icons.groups_rounded),
                    loading: () => const StatCard(title: 'Élèves inscrits', value: '…', icon: Icons.groups_rounded),
                    error: (e, _) => const StatCard(title: 'Élèves inscrits', value: '—', icon: Icons.groups_rounded),
                  ),
                  personnelAsync.when(
                    data: (p) => StatCard(title: 'Enseignants', value: '${p.where((x) => x['role'] == 'ENSEIGNANT').length}', icon: Icons.school_rounded),
                    loading: () => const StatCard(title: 'Enseignants', value: '…', icon: Icons.school_rounded),
                    error: (e, _) => const StatCard(title: 'Enseignants', value: '—', icon: Icons.school_rounded),
                  ),
                  classesAsync.when(
                    data: (c) => StatCard(title: 'Classes actives', value: '${c.length}', icon: Icons.class_rounded),
                    loading: () => const StatCard(title: 'Classes actives', value: '…', icon: Icons.class_rounded),
                    error: (e, _) => const StatCard(title: 'Classes actives', value: '—', icon: Icons.class_rounded),
                  ),
                  statsAsync.when(
                    data: (s) => StatCard(
                      title: 'Taux de réussite',
                      value: s?['taux_reussite'] != null ? '${s!['taux_reussite']}%' : '—',
                      subtitle: s?['nb_evalues'] != null ? '${s!['nb_evalues']} élève(s) évalué(s)' : null,
                      icon: Icons.speed_rounded,
                    ),
                    loading: () => const StatCard(title: 'Taux de réussite', value: '…', icon: Icons.speed_rounded),
                    error: (e, _) => const StatCard(title: 'Taux de réussite', value: '—', icon: Icons.speed_rounded),
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
                      Text('Taux par trimestre', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      Text('Réussite, absence et retard', style: TextStyle(fontSize: 12.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                      const SizedBox(height: 12),
                      TauxParTrimestreChart(anneeScolaireId: anneeActiveId),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Distribution par classe', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              classesAsync.when(
                loading: () => const LoadingView(),
                error: (e, _) => const ErrorView(message: 'Classes indisponibles'),
                data: (classes) {
                  if (classes.isEmpty) return const EmptyView(message: "Aucune classe pour l'année scolaire active.");
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: DistributionClasseRadarChart(classes: classes),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
}
