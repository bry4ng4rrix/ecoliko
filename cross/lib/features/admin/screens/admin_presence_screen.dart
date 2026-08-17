import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/resource_service.dart';
import '../../../core/widgets/common.dart';

final _presencesAdminProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) => ResourceService('/presences').list());

/// Miroir de la partie oversight de `AttendancePanel` (frontend/src/components/presences/AttendancePanel.jsx) :
/// indicateurs + validation des justificatifs. La saisie d'appel n'est pas reprise ici (voir
/// l'écran équivalent côté enseignant, qui couvre le même besoin).
class AdminPresenceScreen extends ConsumerStatefulWidget {
  const AdminPresenceScreen({super.key});

  @override
  ConsumerState<AdminPresenceScreen> createState() => _AdminPresenceScreenState();
}

class _AdminPresenceScreenState extends ConsumerState<AdminPresenceScreen> {
  int? _busyId;

  Future<void> _agirSurJustificatif(int id, bool accepter) async {
    setState(() => _busyId = id);
    try {
      await ApiClient.instance.dio.post('/presences/$id/${accepter ? 'valider' : 'refuser'}-justification/');
      ref.invalidate(_presencesAdminProvider);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur lors du traitement du justificatif.')));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final presencesAsync = ref.watch(_presencesAdminProvider);

    return presencesAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Présences indisponibles', onRetry: () => ref.invalidate(_presencesAdminProvider)),
      data: (presences) {
        final total = presences.length;
        final compteurs = <String, int>{};
        for (final p in presences) {
          final s = p['statut'] as String? ?? '';
          compteurs[s] = (compteurs[s] ?? 0) + 1;
        }
        final tauxPresence = total > 0 ? ((compteurs['P'] ?? 0) / total * 100).toStringAsFixed(1) : null;
        final nonJustifiees = presences.where((p) => p['statut'] == 'A' && (p['justificatif'] == null || p['justificatif'] == '')).toList();
        final enAttente = presences.where((p) => p['justification_statut'] == 'EN_ATTENTE').toList();

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(_presencesAdminProvider),
          child: ListView(
            children: [
              const SectionHeader(title: 'Présence & Absences'),
              Row(
                children: [
                  Expanded(child: StatCard(title: 'Taux présence général', value: tauxPresence != null ? '$tauxPresence%' : '—', icon: Icons.check_circle_outline)),
                  const SizedBox(width: 10),
                  Expanded(child: StatCard(title: 'Absences', value: '${compteurs['A'] ?? 0}', icon: Icons.cancel_outlined)),
                  const SizedBox(width: 10),
                  Expanded(child: StatCard(title: 'Non justifiées', value: '${nonJustifiees.length}', icon: Icons.warning_amber_outlined, accentColor: Colors.orange)),
                ],
              ),
              if (enAttente.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text('Justificatifs en attente', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...enAttente.map((item) {
                  final busy = _busyId == item['id'];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['etudiant_nom']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                          Text('${item['date_cours']} - ${item['matiere_intitule'] ?? ''}', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                          if ((item['justificatif'] as String?)?.isNotEmpty == true) ...[
                            const SizedBox(height: 4),
                            Text(item['justificatif'].toString()),
                          ],
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              FilledButton(onPressed: busy ? null : () => _agirSurJustificatif(item['id'] as int, true), child: const Text('Accepter')),
                              const SizedBox(width: 8),
                              OutlinedButton(onPressed: busy ? null : () => _agirSurJustificatif(item['id'] as int, false), child: const Text('Refuser')),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
              const SizedBox(height: 20),
              Text('Absences non justifiées', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              if (nonJustifiees.isEmpty)
                const EmptyView(message: 'Aucune absence non justifiée.', icon: Icons.event_available_outlined)
              else
                ...nonJustifiees.map((item) => Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(item['etudiant_nom']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text('${item['date_cours']} - ${item['matiere_intitule'] ?? ''}'),
                      ),
                    )),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
}
