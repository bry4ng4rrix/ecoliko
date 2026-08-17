import 'package:flutter/material.dart';

import 'common.dart';

const joursSemaine = [
  {'code': 'LUN', 'label': 'Lundi'},
  {'code': 'MAR', 'label': 'Mardi'},
  {'code': 'MER', 'label': 'Mercredi'},
  {'code': 'JEU', 'label': 'Jeudi'},
  {'code': 'VEN', 'label': 'Vendredi'},
  {'code': 'SAM', 'label': 'Samedi'},
];

/// Emploi du temps en agenda par jour — utilisé par les rôles Élève et Enseignant.
/// Sur mobile, un agenda scrollable par jour est plus lisible que la grille Horaire×Jours
/// du web, qui déborde sur un petit écran.
class EdtAgendaList extends StatelessWidget {
  final List<Map<String, dynamic>> creneaux;
  final bool showEnseignant;
  final bool showClasse;

  const EdtAgendaList({super.key, required this.creneaux, this.showEnseignant = true, this.showClasse = false});

  @override
  Widget build(BuildContext context) {
    if (creneaux.isEmpty) {
      return const EmptyView(message: 'Aucun créneau enregistré.', icon: Icons.calendar_today_outlined);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: joursSemaine.map((jour) {
        final slots = creneaux.where((c) => c['jour'] == jour['code']).toList()
          ..sort((a, b) => (a['heure_debut'] as String).compareTo(b['heure_debut'] as String));
        if (slots.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(bottom: 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(jour['label']!, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              ...slots.map((s) => _slotCard(context, s)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _slotCard(BuildContext context, Map<String, dynamic> s) {
    final couleur = _parseHexColor(s['matiere_couleur'] as String? ?? '#6366f1');
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(width: 4, height: 44, decoration: BoxDecoration(color: couleur, borderRadius: BorderRadius.circular(4))),
            const SizedBox(width: 12),
            SizedBox(
              width: 78,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_shortTime(s['heure_debut']), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  Text(_shortTime(s['heure_fin']), style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s['matiere_intitule']?.toString() ?? '—', style: const TextStyle(fontWeight: FontWeight.w700)),
                  if (showClasse && s['classe_nom'] != null)
                    Text(s['classe_nom'].toString(), style: TextStyle(fontSize: 12.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  if (showEnseignant && s['enseignant_nom'] != null)
                    Text(s['enseignant_nom'].toString(), style: TextStyle(fontSize: 12.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  if (s['salle_nom'] != null)
                    Text(s['salle_nom'].toString(), style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _shortTime(dynamic value) {
    final s = value?.toString() ?? '';
    return s.length >= 5 ? s.substring(0, 5) : s;
  }

  Color _parseHexColor(String hex) {
    var h = hex.replaceAll('#', '');
    if (h.length == 6) h = 'FF$h';
    return Color(int.tryParse(h, radix: 16) ?? 0xFF6366F1);
  }
}
