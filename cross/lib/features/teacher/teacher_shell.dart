import 'package:flutter/material.dart';

import '../../core/widgets/common.dart';
import '../../core/widgets/role_shell.dart';
import 'screens/teacher_dashboard_screen.dart';
import 'screens/teacher_edt_screen.dart';
import 'screens/teacher_notes_screen.dart';
import 'screens/teacher_devoirs_screen.dart';

/// Miroir de TeacherDashboard.jsx (frontend/src/pages/TeacherDashboard.jsx).
const _items = [
  NavItem(id: 'home', label: 'Tableau de bord', icon: Icons.home_rounded),
  NavItem(id: 'emploi-du-temps', label: 'Emploi du Temps', icon: Icons.calendar_month_rounded),
  NavItem(id: 'notes', label: 'Notes & Évaluations', icon: Icons.bar_chart_rounded),
  NavItem(id: 'devoirs', label: 'Devoirs', icon: Icons.assignment_rounded),
  NavItem(id: 'cahier', label: 'Cahier de textes', icon: Icons.menu_book_rounded),
  NavItem(id: 'presence', label: 'Présence & Absences', icon: Icons.access_time_rounded),
  NavItem(id: 'communication', label: 'Communication', icon: Icons.forum_rounded),
  NavItem(id: 'historique', label: 'Historique Étudiants', icon: Icons.history_rounded),
  NavItem(id: 'rapports', label: 'Rapports', icon: Icons.insert_chart_rounded),
];

class TeacherShell extends StatelessWidget {
  const TeacherShell({super.key});

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      appTitle: 'SIG-Lycée · Prof',
      items: _items,
      screenBuilder: (context, id) {
        switch (id) {
          case 'home':
            return const TeacherDashboardScreen();
          case 'emploi-du-temps':
            return const TeacherEdtScreen();
          case 'notes':
            return const TeacherNotesScreen();
          case 'devoirs':
            return const TeacherDevoirsScreen();
          case 'cahier':
            return const ComingSoonView(feature: 'Cahier de textes');
          case 'presence':
            return const ComingSoonView(feature: 'Présence & Absences');
          case 'communication':
            return const ComingSoonView(feature: 'Communication (chat de classe)');
          case 'historique':
            return const ComingSoonView(feature: 'Historique Étudiants');
          case 'rapports':
            return const ComingSoonView(feature: 'Rapports');
          default:
            return const SizedBox.shrink();
        }
      },
    );
  }
}
