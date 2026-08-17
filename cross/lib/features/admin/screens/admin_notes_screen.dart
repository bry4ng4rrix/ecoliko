import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import '../admin_providers.dart';

/// Miroir de `NotesEvaluationsPanel` (frontend/src/components/notes/NotesEvaluationsPanel.jsx) :
/// classement par trimestre ou bilan annuel (passage/redoublement) par classe.
class AdminNotesScreen extends ConsumerStatefulWidget {
  const AdminNotesScreen({super.key});

  @override
  ConsumerState<AdminNotesScreen> createState() => _AdminNotesScreenState();
}

class _AdminNotesScreenState extends ConsumerState<AdminNotesScreen> {
  int? _classeId;
  int? _trimestreId;
  bool _vueAnnuelle = false;

  @override
  Widget build(BuildContext context) {
    final classesAsync = ref.watch(adminClassesProvider);
    final trimestresAsync = ref.watch(adminTrimestresProvider);

    return classesAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Classes indisponibles', onRetry: () => ref.invalidate(adminClassesProvider)),
      data: (classes) {
        if (classes.isEmpty) return const EmptyView(message: 'Aucune classe.');
        final classeId = _classeId ?? classes.first['id'] as int;
        final classe = classes.firstWhere((c) => c['id'] == classeId);

        return trimestresAsync.when(
          loading: () => const LoadingView(),
          error: (e, _) => const ErrorView(message: 'Trimestres indisponibles'),
          data: (trimestres) {
            final trimestresDeLaClasse = trimestres.where((t) => t['annee_scolaire'] == classe['annee_scolaire']).toList();
            final actif = trimestresDeLaClasse.where((t) => t['est_actif'] == true).toList();
            final trimestreId = _trimestreId ?? (actif.isNotEmpty ? actif.first['id'] as int : (trimestresDeLaClasse.isNotEmpty ? trimestresDeLaClasse.first['id'] as int : null));

            return ListView(
              children: [
                const SectionHeader(title: 'Notes & Évaluations'),
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(label: const Text('Par trimestre'), selected: !_vueAnnuelle, onSelected: (_) => setState(() => _vueAnnuelle = false)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ChoiceChip(label: const Text('Bilan annuel'), selected: _vueAnnuelle, onSelected: (_) => setState(() => _vueAnnuelle = true)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  initialValue: classeId,
                  decoration: const InputDecoration(labelText: 'Classe'),
                  items: classes.map((c) => DropdownMenuItem(value: c['id'] as int, child: Text(c['nom'].toString()))).toList(),
                  onChanged: (v) => setState(() {
                    _classeId = v;
                    _trimestreId = null;
                  }),
                ),
                if (!_vueAnnuelle) ...[
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    initialValue: trimestreId,
                    decoration: const InputDecoration(labelText: 'Trimestre'),
                    items: trimestresDeLaClasse.map((t) => DropdownMenuItem(value: t['id'] as int, child: Text('Trimestre ${t['numero']}'))).toList(),
                    onChanged: (v) => setState(() => _trimestreId = v),
                  ),
                ],
                const SizedBox(height: 16),
                if (_vueAnnuelle)
                  _buildClassement(context, ref.watch(classementAnnuelProvider(classeId)), estAnnuel: true)
                else if (trimestreId != null)
                  _buildClassement(context, ref.watch(classementTrimestreProvider((classeId: classeId, trimestreId: trimestreId))), estAnnuel: false)
                else
                  const EmptyView(message: 'Aucun trimestre disponible pour cette classe.'),
                const SizedBox(height: 24),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildClassement(BuildContext context, AsyncValue<List<Map<String, dynamic>>> async, {required bool estAnnuel}) {
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => const ErrorView(message: 'Classement indisponible'),
      data: (lignes) {
        if (lignes.isEmpty) return const EmptyView(message: 'Aucun élève dans cette classe.');
        return Column(
          children: lignes.map((l) {
            final moyenne = l['moyenne'];
            final estAdmis = moyenne != null && double.tryParse('$moyenne') != null && double.parse('$moyenne') >= 10;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(radius: 16, child: Text('${l['rang']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
                title: Text(l['nom_complet']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(moyenne != null ? '${double.parse('$moyenne').toStringAsFixed(2)}/20' : '—', style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(width: 8),
                    if (moyenne != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: (estAdmis ? Colors.green : Colors.red).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                        child: Text(
                          estAdmis ? (estAnnuel ? 'Passant' : 'Admis') : 'Redouble',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: estAdmis ? Colors.green.shade700 : Colors.red.shade700),
                        ),
                      ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
