import 'package:flutter/material.dart';

import '../../core/widgets/common.dart';
import '../../core/widgets/role_shell.dart';
import 'screens/parent_dashboard_screen.dart';
import 'screens/parent_enfants_screen.dart';
import 'screens/parent_bulletins_screen.dart';
import 'screens/parent_absences_screen.dart';

/// Miroir de ParentDashboard.jsx (frontend/src/pages/ParentDashboard.jsx).
const _items = [
  NavItem(id: 'home', label: 'Accueil', icon: Icons.home_rounded),
  NavItem(id: 'enfants', label: 'Mes Enfants', icon: Icons.family_restroom_rounded),
  NavItem(id: 'bulletins', label: 'Bulletins', icon: Icons.picture_as_pdf_rounded),
  NavItem(id: 'cahier', label: 'Cahier de textes', icon: Icons.menu_book_rounded),
  NavItem(id: 'absences', label: 'Absences', icon: Icons.event_busy_rounded),
  NavItem(id: 'paiements', label: 'Paiements', icon: Icons.payments_rounded),
  NavItem(id: 'communication', label: 'Communication', icon: Icons.forum_rounded),
];

class ParentShell extends StatelessWidget {
  const ParentShell({super.key});

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      appTitle: 'SIG-Lycée · Parent',
      items: _items,
      screenBuilder: (context, id) {
        switch (id) {
          case 'home':
            return const ParentDashboardScreen();
          case 'enfants':
            return const ParentEnfantsScreen();
          case 'bulletins':
            return const ParentBulletinsScreen();
          case 'cahier':
            return const ComingSoonView(feature: 'Cahier de textes');
          case 'absences':
            return const ParentAbsencesScreen();
          case 'paiements':
            return const ComingSoonView(feature: 'Paiements');
          case 'communication':
            return const ComingSoonView(feature: 'Communication');
          default:
            return const SizedBox.shrink();
        }
      },
    );
  }
}
