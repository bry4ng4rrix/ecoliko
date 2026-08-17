import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/resource_service.dart';
import '../../../core/widgets/common.dart';
import 'admin_personnel_screen.dart';

const _typeDocumentLabels = {
  'CERTIFICAT_SCOLARITE': 'Certificat de scolarité',
  'ATTESTATION': 'Attestation de fréquentation',
  'CERTIFICAT_REUSSITE': 'Certificat de réussite',
};

final _paiementsAdminProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) => ResourceService('/paiements').list());
final _demandesDocumentsAdminProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) => ResourceService('/demandes-documents').list());

/// Miroir simplifié de `PaiementsPanel` / `DocumentsValidationPanel` / `PersonnelPanel`
/// (frontend/src/components/{finance,documents,personnel}/) réunis sous "Gestion Administrative",
/// comme sur le web. Filtrage par classe et impression de reçu ne sont pas repris (voir ROADMAP.md).
class AdminAdministrativeScreen extends StatelessWidget {
  const AdminAdministrativeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          const TabBar(tabs: [Tab(text: 'Paiements'), Tab(text: 'Documents'), Tab(text: 'Utilisateurs')]),
          const SizedBox(height: 12),
          const Expanded(
            child: TabBarView(children: [_PaiementsTab(), _DocumentsTab(), AdminPersonnelScreen(title: 'Utilisateurs')]),
          ),
        ],
      ),
    );
  }
}

class _PaiementsTab extends ConsumerWidget {
  const _PaiementsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paiementsAsync = ref.watch(_paiementsAdminProvider);
    return paiementsAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Paiements indisponibles', onRetry: () => ref.invalidate(_paiementsAdminProvider)),
      data: (paiements) {
        final triees = [...paiements]..sort((a, b) => '${b['date_paiement'] ?? ''}'.compareTo('${a['date_paiement'] ?? ''}'));
        if (triees.isEmpty) return const EmptyView(message: 'Aucun paiement enregistré.', icon: Icons.receipt_long_outlined);
        return ListView(
          children: triees.map((p) {
            final date = DateTime.tryParse(p['date_paiement']?.toString() ?? '');
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(p['etudiant_nom']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${_fmt(p['montant'])} Ar · ${date != null ? DateFormat('dd/MM/yyyy').format(date) : ''}'),
                trailing: Text(p['statut']?.toString() ?? '', style: const TextStyle(fontSize: 11)),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  String _fmt(dynamic value) {
    final n = double.tryParse('$value') ?? 0;
    return NumberFormat('#,##0', 'fr_FR').format(n).replaceAll(',', ' ');
  }
}

class _DocumentsTab extends ConsumerStatefulWidget {
  const _DocumentsTab();

  @override
  ConsumerState<_DocumentsTab> createState() => _DocumentsTabState();
}

class _DocumentsTabState extends ConsumerState<_DocumentsTab> {
  int? _busyId;

  Future<void> _valider(int id) async {
    setState(() => _busyId = id);
    try {
      await ApiClient.instance.dio.post('/demandes-documents/$id/valider/');
      ref.invalidate(_demandesDocumentsAdminProvider);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur lors de la validation.')));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _refuser(int id) async {
    final motifCtrl = TextEditingController();
    final motif = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Motif du refus'),
        content: TextField(controller: motifCtrl, decoration: const InputDecoration(hintText: 'Motif...')),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.of(context).pop(motifCtrl.text), child: const Text('Refuser')),
        ],
      ),
    );
    if (motif == null) return;
    setState(() => _busyId = id);
    try {
      await ApiClient.instance.dio.post('/demandes-documents/$id/refuser/', data: {'motif': motif});
      ref.invalidate(_demandesDocumentsAdminProvider);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur lors du refus.')));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final demandesAsync = ref.watch(_demandesDocumentsAdminProvider);
    return demandesAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Demandes indisponibles', onRetry: () => ref.invalidate(_demandesDocumentsAdminProvider)),
      data: (demandes) {
        final enAttente = demandes.where((d) => d['statut'] == 'EN_ATTENTE').toList();
        if (enAttente.isEmpty) return const EmptyView(message: 'Aucune demande en attente.', icon: Icons.description_outlined);
        return ListView(
          children: enAttente.map((d) {
            final busy = _busyId == d['id'];
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(d['etudiant_nom']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text(_typeDocumentLabels[d['type_document']] ?? '${d['type_document']}', style: TextStyle(fontSize: 12.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        FilledButton(onPressed: busy ? null : () => _valider(d['id'] as int), child: const Text('Valider')),
                        const SizedBox(width: 8),
                        OutlinedButton(onPressed: busy ? null : () => _refuser(d['id'] as int), child: const Text('Rejeter')),
                      ],
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
