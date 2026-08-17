import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/resource_service.dart';
import '../../../core/widgets/common.dart';
import '../admin_providers.dart';

const _roleLabels = {
  'ADMIN': 'Administrateur',
  'RESPONSABLE': 'Responsable pédagogique',
  'ENSEIGNANT': 'Enseignant',
  'SECRETARIAT': 'Bureau administratif',
};

/// Miroir simplifié de `PersonnelPanel` (frontend/src/components/personnel/PersonnelPanel.jsx),
/// filtré sur ENSEIGNANT (utilisé pour la section "Gestion des Profs") : liste + création de
/// compte (mot de passe temporaire imposé côté serveur). Les dossiers RH ne sont pas repris.
class AdminPersonnelScreen extends ConsumerStatefulWidget {
  final String? roleFilter;
  final String title;
  const AdminPersonnelScreen({super.key, this.roleFilter, required this.title});

  @override
  ConsumerState<AdminPersonnelScreen> createState() => _AdminPersonnelScreenState();
}

class _AdminPersonnelScreenState extends ConsumerState<AdminPersonnelScreen> {
  @override
  Widget build(BuildContext context) {
    final personnelAsync = ref.watch(adminPersonnelProvider);

    return personnelAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Personnel indisponible', onRetry: () => ref.invalidate(adminPersonnelProvider)),
      data: (personnel) {
        final liste = widget.roleFilter != null ? personnel.where((p) => p['role'] == widget.roleFilter).toList() : personnel;

        return Scaffold(
          backgroundColor: Colors.transparent,
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _ouvrirFormulaire(context),
            icon: const Icon(Icons.person_add_alt_1),
            label: const Text('Compte'),
          ),
          body: RefreshIndicator(
            onRefresh: () async => ref.invalidate(adminPersonnelProvider),
            child: ListView(
              children: [
                SectionHeader(title: widget.title),
                if (liste.isEmpty)
                  const EmptyView(message: 'Aucun compte.', icon: Icons.people_outline)
                else
                  ...liste.map((p) => Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: UserAvatar(photoUrl: p['photo'] as String?, initials: _initials(p)),
                          title: Text('${p['first_name']} ${p['last_name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${p['email'] ?? ''}${p['matricule'] != null ? ' · ${p['matricule']}' : ''}'),
                          trailing: widget.roleFilter == null
                              ? Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondaryContainer, borderRadius: BorderRadius.circular(20)),
                                  child: Text(_roleLabels[p['role']] ?? '${p['role']}', style: const TextStyle(fontSize: 10.5)),
                                )
                              : null,
                        ),
                      )),
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

  Future<void> _ouvrirFormulaire(BuildContext context) async {
    final prenomCtrl = TextEditingController();
    final nomCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final matriculeCtrl = TextEditingController();
    final telephoneCtrl = TextEditingController();
    String role = widget.roleFilter ?? 'ENSEIGNANT';
    bool envoiEnCours = false;
    String? erreur;

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
                const Text('Nouveau compte', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const Text('Mot de passe temporaire imposé : 12345678 (à changer à la première connexion).', style: TextStyle(fontSize: 11.5)),
                const SizedBox(height: 16),
                TextField(controller: prenomCtrl, decoration: const InputDecoration(labelText: 'Prénom')),
                const SizedBox(height: 10),
                TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom')),
                const SizedBox(height: 10),
                TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 10),
                TextField(controller: matriculeCtrl, decoration: const InputDecoration(labelText: 'Matricule (optionnel)')),
                const SizedBox(height: 10),
                TextField(controller: telephoneCtrl, decoration: const InputDecoration(labelText: 'Téléphone (optionnel)')),
                if (widget.roleFilter == null) ...[
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: role,
                    decoration: const InputDecoration(labelText: 'Rôle'),
                    items: _roleLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                    onChanged: (v) => setModalState(() => role = v!),
                  ),
                ],
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
                            if (prenomCtrl.text.trim().isEmpty || nomCtrl.text.trim().isEmpty || emailCtrl.text.trim().isEmpty) {
                              setModalState(() => erreur = 'Prénom, nom et email sont requis.');
                              return;
                            }
                            setModalState(() {
                              envoiEnCours = true;
                              erreur = null;
                            });
                            try {
                              await ResourceService('/personnel').create({
                                'first_name': prenomCtrl.text.trim(),
                                'last_name': nomCtrl.text.trim(),
                                'email': emailCtrl.text.trim(),
                                'role': role,
                                if (matriculeCtrl.text.trim().isNotEmpty) 'matricule': matriculeCtrl.text.trim(),
                                if (telephoneCtrl.text.trim().isNotEmpty) 'telephone': telephoneCtrl.text.trim(),
                              });
                              ref.invalidate(adminPersonnelProvider);
                              if (context.mounted) Navigator.of(context).pop();
                            } catch (e) {
                              setModalState(() {
                                envoiEnCours = false;
                                erreur = 'Erreur lors de la création du compte.';
                              });
                            }
                          },
                    child: envoiEnCours ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Créer le compte'),
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
