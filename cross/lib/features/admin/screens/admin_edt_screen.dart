import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/resource_service.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/edt_agenda.dart';
import '../admin_providers.dart';

const _jourCodes = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

final _edtAdminProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, int>((ref, classeId) => ResourceService('/emplois-du-temps').list({'classe': classeId}));
final _matieresForEdtProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) => ResourceService('/matieres').list());
final _sallesForEdtProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) => ResourceService('/salles').list());

/// Miroir simplifié de `EmploiDuTempsCalendar` (frontend/src/components/academique/EmploiDuTempsCalendar.jsx) :
/// sélection d'une classe puis agenda + ajout de créneau.
class AdminEdtScreen extends ConsumerStatefulWidget {
  const AdminEdtScreen({super.key});

  @override
  ConsumerState<AdminEdtScreen> createState() => _AdminEdtScreenState();
}

class _AdminEdtScreenState extends ConsumerState<AdminEdtScreen> {
  int? _classeId;

  @override
  Widget build(BuildContext context) {
    final classesAsync = ref.watch(adminClassesProvider);

    return classesAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Classes indisponibles', onRetry: () => ref.invalidate(adminClassesProvider)),
      data: (classes) {
        if (classes.isEmpty) return const EmptyView(message: 'Aucune classe.');
        final classeId = _classeId ?? classes.first['id'] as int;
        final edtAsync = ref.watch(_edtAdminProvider(classeId));

        return Scaffold(
          backgroundColor: Colors.transparent,
          floatingActionButton: FloatingActionButton(
            child: const Icon(Icons.add),
            onPressed: () => _ouvrirFormulaire(context, classeId),
          ),
          body: ListView(
            children: [
              const SectionHeader(title: 'Emploi du Temps'),
              DropdownButtonFormField<int>(
                initialValue: classeId,
                decoration: const InputDecoration(labelText: 'Classe'),
                items: classes.map((c) => DropdownMenuItem(value: c['id'] as int, child: Text(c['nom'].toString()))).toList(),
                onChanged: (v) => setState(() => _classeId = v),
              ),
              const SizedBox(height: 16),
              edtAsync.when(
                loading: () => const LoadingView(),
                error: (e, _) => const ErrorView(message: 'Créneaux indisponibles'),
                data: (creneaux) => EdtAgendaList(creneaux: creneaux, showClasse: false),
              ),
              const SizedBox(height: 80),
            ],
          ),
        );
      },
    );
  }

  Future<void> _ouvrirFormulaire(BuildContext context, int classeId) async {
    final matieres = await ref.read(_matieresForEdtProvider.future);
    final personnel = await ref.read(adminPersonnelProvider.future);
    final salles = await ref.read(_sallesForEdtProvider.future);
    final enseignants = personnel.where((p) => p['role'] == 'ENSEIGNANT').toList();
    if (matieres.isEmpty || enseignants.isEmpty) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Aucune matière/enseignant disponible.')));
      return;
    }

    int matiereId = matieres.first['id'] as int;
    int enseignantId = enseignants.first['id'] as int;
    int? salleId;
    String jour = 'LUN';
    TimeOfDay heureDebut = const TimeOfDay(hour: 8, minute: 0);
    TimeOfDay heureFin = const TimeOfDay(hour: 9, minute: 0);
    bool envoiEnCours = false;
    String? erreur;

    String fmt(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}:00';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Nouveau créneau', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 16),
                DropdownButtonFormField<int>(
                  initialValue: matiereId,
                  decoration: const InputDecoration(labelText: 'Matière'),
                  items: matieres.map((m) => DropdownMenuItem(value: m['id'] as int, child: Text(m['intitule'].toString()))).toList(),
                  onChanged: (v) => setModalState(() => matiereId = v!),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<int>(
                  initialValue: enseignantId,
                  decoration: const InputDecoration(labelText: 'Enseignant'),
                  items: enseignants.map((e) => DropdownMenuItem(value: e['id'] as int, child: Text('${e['first_name']} ${e['last_name']}'))).toList(),
                  onChanged: (v) => setModalState(() => enseignantId = v!),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: jour,
                  decoration: const InputDecoration(labelText: 'Jour'),
                  items: _jourCodes.map((j) => DropdownMenuItem(value: j, child: Text(j))).toList(),
                  onChanged: (v) => setModalState(() => jour = v!),
                ),
                if (salles.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  DropdownButtonFormField<int?>(
                    initialValue: salleId,
                    decoration: const InputDecoration(labelText: 'Salle (optionnel)'),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('—')),
                      ...salles.map((s) => DropdownMenuItem(value: s['id'] as int, child: Text(s['nom'].toString()))),
                    ],
                    onChanged: (v) => setModalState(() => salleId = v),
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('Début : ${heureDebut.format(context)}'),
                        onTap: () async {
                          final picked = await showTimePicker(context: context, initialTime: heureDebut);
                          if (picked != null) setModalState(() => heureDebut = picked);
                        },
                      ),
                    ),
                    Expanded(
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('Fin : ${heureFin.format(context)}'),
                        onTap: () async {
                          final picked = await showTimePicker(context: context, initialTime: heureFin);
                          if (picked != null) setModalState(() => heureFin = picked);
                        },
                      ),
                    ),
                  ],
                ),
                if (erreur != null) ...[
                  const SizedBox(height: 8),
                  Text(erreur!, style: const TextStyle(color: Colors.red, fontSize: 12.5)),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: envoiEnCours
                        ? null
                        : () async {
                            setModalState(() {
                              envoiEnCours = true;
                              erreur = null;
                            });
                            try {
                              await ResourceService('/emplois-du-temps').create({
                                'classe': classeId,
                                'matiere': matiereId,
                                'enseignant': enseignantId,
                                'jour': jour,
                                'heure_debut': fmt(heureDebut),
                                'heure_fin': fmt(heureFin),
                                if (salleId != null) 'salle': salleId,
                              });
                              ref.invalidate(_edtAdminProvider(classeId));
                              if (context.mounted) Navigator.of(context).pop();
                            } catch (e) {
                              setModalState(() {
                                envoiEnCours = false;
                                erreur = 'Erreur lors de la création (chevauchement de créneau ?).';
                              });
                            }
                          },
                    child: envoiEnCours ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Ajouter'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
