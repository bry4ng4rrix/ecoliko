import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cross/main.dart';

void main() {
  testWidgets('App boots to the login screen when unauthenticated', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: SigLyceeApp()));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('SIG-Lycée'), findsWidgets);
    expect(find.text('Connexion'), findsOneWidget);
  });
}
