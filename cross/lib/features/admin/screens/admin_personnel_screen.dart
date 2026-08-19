import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/resource_service.dart';
import '../../../core/widgets/common.dart';
import '../admin_providers.dart';
import '../widgets/personnel_form_dialog.dart';

const _roleLabels = {
  'ADMIN': 'Administrateur',
  'RESPONSABLE': 'Responsable pédagogique',
  'ENSEIGNANT': 'Enseignant',
  'SECRETARIAT': 'Bureau administratif',
};

/// Miroir de `PersonnelPanel` (frontend/src/components/personnel/PersonnelPanel.jsx) : liste +
/// création/modification/suppression de compte. Pour un enseignant, affiche ses matières/classes
/// affectées (miroir de la colonne "Matières / Classe" du web).
class AdminPersonnelScreen extends ConsumerStatefulWidget {
  final String? roleFilter;
  final String title;
  const AdminPersonnelScreen({super.key, this.roleFilter, required this.title});

  @override
  ConsumerState<AdminPersonnelScreen> createState() => _AdminPersonnelScreenState();
}

class _AdminPersonnelScreenState extends ConsumerState<AdminPersonnelScreen> {
  Future<void> _supprimer(Map<String, dynamic> personnel) async {
    final confirme = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer ce compte ?'),
        content: Text('${personnel['first_name']} ${personnel['last_name']} sera définitivement supprimé.'),
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
      await ResourceService('/personnel').remove(personnel['id']);
      ref.invalidate(adminPersonnelProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Compte supprimé.')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur lors de la suppression.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final personnelAsync = ref.watch(adminPersonnelProvider);
    final matieresAsync = ref.watch(adminMatieresProvider);
    final classesAsync = ref.watch(adminClassesProvider);
    final scheme = Theme.of(context).colorScheme;

    return personnelAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Personnel indisponible', onRetry: () => ref.invalidate(adminPersonnelProvider)),
      data: (personnel) {
        final liste = widget.roleFilter != null ? personnel.where((p) => p['role'] == widget.roleFilter).toList() : personnel;
        final matieres = matieresAsync.value ?? [];
        final classes = classesAsync.value ?? [];

        String affectations(int id) {
          if (widget.roleFilter != 'ENSEIGNANT') return '';
          final mats = matieres.where((m) => m['enseignant'] == id).map((m) => m['intitule']?.toString() ?? '').join(', ');
          final classesEnseignees = classes.where((c) => (c['enseignants'] as List?)?.contains(id) == true).map((c) => c['nom']?.toString() ?? '').toList();
          final titulaireDe = classes.where((c) => c['titulaire'] == id).toList();
          final buffer = StringBuffer(mats.isEmpty ? '—' : mats);
          if (classesEnseignees.isNotEmpty) buffer.write('\nClasses : ${classesEnseignees.join(', ')}');
          if (titulaireDe.isNotEmpty) buffer.write('\nTitulaire : ${titulaireDe.first['nom']}');
          return buffer.toString();
        }

        return Scaffold(
          backgroundColor: Colors.transparent,
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => ouvrirFormulairePersonnel(context, roleFilter: widget.roleFilter),
            icon: const Icon(Icons.person_add_alt_1),
            label: const Text('Compte'),
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(adminPersonnelProvider);
              ref.invalidate(adminMatieresProvider);
              ref.invalidate(adminClassesProvider);
            },
            child: ListView(
              children: [
                SectionHeader(title: widget.title),
                if (liste.isEmpty)
                  const EmptyView(message: 'Aucun compte.', icon: Icons.people_outline)
                else
                  ...liste.map((p) {
                    final id = p['id'] as int;
                    final infos = affectations(id);
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: UserAvatar(photoUrl: p['photo'] as String?, initials: _initials(p)),
                        title: Text('${p['first_name']} ${p['last_name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${p['email'] ?? ''}${p['matricule'] != null ? ' · ${p['matricule']}' : ''}'),
                            if (widget.roleFilter == null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(color: scheme.secondaryContainer, borderRadius: BorderRadius.circular(20)),
                                  child: Text(_roleLabels[p['role']] ?? '${p['role']}', style: const TextStyle(fontSize: 10.5)),
                                ),
                              ),
                            if (widget.roleFilter == 'ENSEIGNANT' && infos.isNotEmpty)
                              Padding(padding: const EdgeInsets.only(top: 4), child: Text(infos, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant))),
                          ],
                        ),
                        isThreeLine: widget.roleFilter == 'ENSEIGNANT' && infos.isNotEmpty,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 20),
                              tooltip: 'Modifier',
                              onPressed: () => ouvrirFormulairePersonnel(context, personnel: p, roleFilter: widget.roleFilter),
                            ),
                            IconButton(
                              icon: Icon(Icons.delete_outline, size: 20, color: scheme.error),
                              tooltip: 'Supprimer',
                              onPressed: () => _supprimer(p),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 80),
              ],
            ),
          ),
        );
      },
    );
  }

  String _initials(Map<String, dynamic> p) {
    final f = (p['first_name'] as String? ?? '').isNotEmpty ? (p['first_name'] as String)[0] : '';
    final l = (p['last_name'] as String? ?? '').isNotEmpty ? (p['last_name'] as String)[0] : '';
    final r = '$f$l'.toUpperCase();
    return r.isEmpty ? '?' : r;
  }
}
