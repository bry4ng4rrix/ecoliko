from rest_framework import status
from rest_framework.test import APITestCase

from application.models import AnneeScolaire, Matiere, Note, User
from . import factories as f


class RegisterViewTests(APITestCase):
    def test_public_registration_rejects_admin_role(self):
        """Vérifie la correction de la faille : un anonyme ne peut pas s'auto-promouvoir ADMIN."""
        ecole = f.make_ecole()
        response = self.client.post('/api/auth/register/', {
            'email': 'attaquant@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ADMIN', 'ecole': ecole.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='attaquant@example.com').exists())

    def test_public_registration_accepts_etudiant_but_stays_inactive(self):
        ecole = f.make_ecole()
        response = self.client.post('/api/auth/register/', {
            'email': 'eleve@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='eleve@example.com')
        self.assertFalse(user.is_active)

    def test_inactive_user_cannot_login(self):
        ecole = f.make_ecole()
        self.client.post('/api/auth/register/', {
            'email': 'eleve2@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole.id,
        })
        response = self.client.post('/api/auth/token/', {
            'email': 'eleve2@example.com', 'password': 'Test1234!',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RegisterEcoleViewTests(APITestCase):
    """Auto-inscription d'un administrateur fondateur créant son propre établissement."""

    def payload(self, **overrides):
        data = {
            'ecole_nom': 'Lycée Nouveau', 'ecole_code': 'LYC-NEW',
            'admin_email': 'fondateur@example.com', 'admin_password': 'Test1234!',
            'admin_first_name': 'Jean', 'admin_last_name': 'Dupont',
        }
        data.update(overrides)
        return data

    def test_creates_ecole_and_active_admin(self):
        response = self.client.post('/api/auth/register/ecole/', self.payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email='fondateur@example.com')
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_active)
        self.assertEqual(user.ecole.code, 'LYC-NEW')
        self.assertEqual(user.ecole.nom, 'Lycée Nouveau')

    def test_founding_admin_can_login_immediately(self):
        self.client.post('/api/auth/register/ecole/', self.payload())
        response = self.client.post('/api/auth/token/', {
            'email': 'fondateur@example.com', 'password': 'Test1234!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], 'ADMIN')

    def test_rejects_duplicate_ecole_code(self):
        f.make_ecole(code='LYC-NEW')
        response = self.client.post('/api/auth/register/ecole/', self.payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ecole_code', response.data)

    def test_rejects_duplicate_admin_email(self):
        f.make_user(email='fondateur@example.com')
        response = self.client.post('/api/auth/register/ecole/', self.payload())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('admin_email', response.data)

    def test_second_founder_gets_isolated_ecole(self):
        """Deux fondateurs distincts obtiennent bien deux établissements cloisonnés."""
        self.client.post('/api/auth/register/ecole/', self.payload())
        self.client.post('/api/auth/register/ecole/', self.payload(
            ecole_nom='Collège Bis', ecole_code='COL-BIS', admin_email='autre@example.com',
        ))
        admin1 = User.objects.get(email='fondateur@example.com')
        admin2 = User.objects.get(email='autre@example.com')
        self.assertNotEqual(admin1.ecole_id, admin2.ecole_id)


class TenantIsolationTests(APITestCase):
    def test_admin_cannot_see_etudiants_of_another_ecole(self):
        ecole_a = f.make_ecole()
        ecole_b = f.make_ecole()
        f.make_etudiant(ecole=ecole_a)
        f.make_etudiant(ecole=ecole_b)

        admin_a = f.make_user(role=User.Role.ADMIN, ecole=ecole_a)
        self.client.force_authenticate(user=admin_a)

        response = self.client.get('/api/etudiants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vus = {e['ecole'] for e in response.data}
        self.assertEqual(vus, {ecole_a.id})

    def test_staff_created_by_admin_is_forced_into_admin_ecole(self):
        ecole_a = f.make_ecole()
        ecole_b = f.make_ecole()
        admin_a = f.make_user(role=User.Role.ADMIN, ecole=ecole_a)
        self.client.force_authenticate(user=admin_a)

        response = self.client.post('/api/personnel/', {
            'email': 'prof@example.com', 'password': 'Test1234!',
            'first_name': 'P', 'last_name': 'Q', 'role': 'ENSEIGNANT',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        prof = User.objects.get(email='prof@example.com')
        self.assertEqual(prof.ecole_id, ecole_a.id)
        self.assertNotEqual(prof.ecole_id, ecole_b.id)


class MatriculeAuthentificationTests(APITestCase):
    def test_staff_creation_ignores_client_password_and_forces_temporary_one(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/personnel/', {
            'email': 'prof.matricule@example.com', 'password': 'JeChoisisMonMotDePasse!',
            'matricule': 'ENS-0001', 'first_name': 'P', 'last_name': 'Q', 'role': 'ENSEIGNANT',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        prof = User.objects.get(email='prof.matricule@example.com')
        self.assertTrue(prof.check_password('12345678'))
        self.assertFalse(prof.check_password('JeChoisisMonMotDePasse!'))
        self.assertTrue(prof.must_change_password)
        self.assertEqual(prof.matricule, 'ENS-0001')

    def test_teacher_can_login_with_matricule_and_temporary_password(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.force_authenticate(user=admin)
        self.client.post('/api/personnel/', {
            'email': 'prof2@example.com', 'matricule': 'ENS-0002',
            'first_name': 'P', 'last_name': 'Q', 'role': 'ENSEIGNANT',
        })
        self.client.force_authenticate(user=None)

        response = self.client.post('/api/auth/token/', {'email': 'ENS-0002', 'password': '12345678'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['user']['role'], 'ENSEIGNANT')
        self.assertTrue(response.data['user']['must_change_password'])

    def test_matricule_must_be_unique_within_ecole(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole, matricule='ENS-0003')
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/personnel/', {
            'email': 'prof.dup@example.com', 'matricule': 'ENS-0003',
            'first_name': 'P', 'last_name': 'Q', 'role': 'ENSEIGNANT',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('matricule', response.data)

    def test_creating_etudiant_auto_creates_login_account_with_matricule(self):
        annee = f.make_annee_scolaire()
        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/etudiants/', {
            'matricule': '2026-ELV-0001', 'nom': 'Rakoto', 'prenom': 'Jean',
            'date_naissance': '2009-05-12', 'lieu_naissance': 'Antananarivo', 'genre': 'H',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNotNone(response.data['utilisateur'])

        compte = User.objects.get(pk=response.data['utilisateur'])
        self.assertEqual(compte.matricule, '2026-ELV-0001')
        self.assertEqual(compte.role, User.Role.ETUDIANT)
        self.assertTrue(compte.is_active)
        self.assertTrue(compte.check_password('12345678'))

        self.client.force_authenticate(user=None)
        login = self.client.post('/api/auth/token/', {'email': '2026-ELV-0001', 'password': '12345678'})
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.data)

    def test_change_password_requires_correct_current_password(self):
        user = f.make_user(role=User.Role.ENSEIGNANT, must_change_password=True)
        user.set_password('12345678')
        user.save()
        self.client.force_authenticate(user=user)

        mauvais = self.client.post('/api/auth/changer-mot-de-passe/', {
            'ancien_mot_de_passe': 'faux', 'nouveau_mot_de_passe': 'NouveauMdp1!',
        })
        self.assertEqual(mauvais.status_code, status.HTTP_400_BAD_REQUEST)

        bon = self.client.post('/api/auth/changer-mot-de-passe/', {
            'ancien_mot_de_passe': '12345678', 'nouveau_mot_de_passe': 'NouveauMdp1!',
        })
        self.assertEqual(bon.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password('NouveauMdp1!'))
        self.assertFalse(user.must_change_password)


class DemandeInscriptionTests(APITestCase):
    def test_admin_sees_pending_self_registrations_of_his_ecole(self):
        ecole_a = f.make_ecole()
        ecole_b = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole_a)
        self.client.post('/api/auth/register/', {
            'email': 'candidat.a@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole_a.id,
        })
        self.client.post('/api/auth/register/', {
            'email': 'candidat.b@example.com', 'password': 'Test1234!',
            'first_name': 'C', 'last_name': 'D', 'role': 'ETUDIANT', 'ecole': ecole_b.id,
        })
        self.client.force_authenticate(user=admin)

        response = self.client.get('/api/demandes-inscription/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = {d['email'] for d in response.data}
        self.assertEqual(emails, {'candidat.a@example.com'})

    def test_enseignant_cannot_access_demandes_inscription(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.get('/api/demandes-inscription/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_valider_active_le_compte(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.post('/api/auth/register/', {
            'email': 'candidat.valide@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole.id,
        })
        candidat = User.objects.get(email='candidat.valide@example.com')
        self.client.force_authenticate(user=admin)

        response = self.client.post(f'/api/demandes-inscription/{candidat.id}/valider/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        candidat.refresh_from_db()
        self.assertTrue(candidat.is_active)

        login = self.client.post('/api/auth/token/', {
            'email': 'candidat.valide@example.com', 'password': 'Test1234!',
        })
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_rejeter_supprime_la_demande(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.post('/api/auth/register/', {
            'email': 'candidat.rejete@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole.id,
        })
        candidat = User.objects.get(email='candidat.rejete@example.com')
        self.client.force_authenticate(user=admin)

        response = self.client.post(f'/api/demandes-inscription/{candidat.id}/rejeter/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=candidat.id).exists())

    def test_dossier_expose_suivi_par_defaut_et_pieces_jointes_vides(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.post('/api/auth/register/', {
            'email': 'candidat.dossier@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole.id,
        })
        candidat = User.objects.get(email='candidat.dossier@example.com')
        self.client.force_authenticate(user=admin)

        response = self.client.get(f'/api/demandes-inscription/{candidat.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['suivi'], {'frais_inscription_paye': False, 'notes': None})
        self.assertEqual(response.data['pieces_jointes'], [])

    def test_secretariat_can_mark_frais_inscription_payes(self):
        ecole = f.make_ecole()
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=ecole)
        self.client.post('/api/auth/register/', {
            'email': 'candidat.paye@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole.id,
        })
        candidat = User.objects.get(email='candidat.paye@example.com')
        self.client.force_authenticate(user=secretaire)

        response = self.client.patch(f'/api/demandes-inscription/{candidat.id}/suivi/', {
            'frais_inscription_paye': True, 'notes': 'Payé en espèces le 10/08',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data['suivi']['frais_inscription_paye'])
        self.assertEqual(response.data['suivi']['notes'], 'Payé en espèces le 10/08')

    def test_admin_can_upload_and_list_pieces_jointes(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.post('/api/auth/register/', {
            'email': 'candidat.piece@example.com', 'password': 'Test1234!',
            'first_name': 'A', 'last_name': 'B', 'role': 'ETUDIANT', 'ecole': ecole.id,
        })
        candidat = User.objects.get(email='candidat.piece@example.com')
        self.client.force_authenticate(user=admin)

        fichier = SimpleUploadedFile('acte.pdf', b'contenu-pdf', content_type='application/pdf')
        response = self.client.post('/api/pieces-jointes-inscription/', {
            'demandeur': candidat.id, 'type_document': 'ACTE_NAISSANCE', 'fichier': fichier,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        dossier = self.client.get(f'/api/demandes-inscription/{candidat.id}/')
        self.assertEqual(len(dossier.data['pieces_jointes']), 1)
        self.assertEqual(dossier.data['pieces_jointes'][0]['type_document'], 'ACTE_NAISSANCE')

    def test_enseignant_cannot_upload_pieces_jointes(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        candidat = f.make_user(role=User.Role.ETUDIANT, ecole=ecole, is_active=False)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/pieces-jointes-inscription/', {
            'demandeur': candidat.id, 'type_document': 'ACTE_NAISSANCE',
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CarteEtudiantTests(APITestCase):
    def test_admin_can_generate_carte_etudiant_pdf(self):
        etudiant = f.make_etudiant()
        f.make_inscription(etudiant=etudiant)
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.get(f'/api/etudiants/{etudiant.id}/carte/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertGreater(len(response.content), 0)

    def test_carte_etudiant_sans_inscription_ne_plante_pas(self):
        etudiant = f.make_etudiant()
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.get(f'/api/etudiants/{etudiant.id}/carte/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_generate_certificat_scolarite(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post(f'/api/etudiants/{etudiant.id}/certificat-scolarite/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertGreater(len(response.content), 0)

        from application.models import DemandeDocument
        demande = DemandeDocument.objects.get(etudiant=etudiant)
        self.assertEqual(demande.statut, DemandeDocument.Statut.VALIDE)
        self.assertEqual(demande.traite_par, admin)

    def test_certificat_scolarite_sans_annee_active_renvoie_400(self):
        etudiant = f.make_etudiant()
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post(f'/api/etudiants/{etudiant.id}/certificat-scolarite/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enseignant_cannot_generate_certificat_scolarite(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=etudiant.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post(f'/api/etudiants/{etudiant.id}/certificat-scolarite/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_generate_carte_ecolage(self):
        classe = f.make_classe(frais_ecolage_mensuel=100000, frais_inscription=50000)
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.get(f'/api/etudiants/{etudiant.id}/carte-ecolage/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertGreater(len(response.content), 0)

    def test_enseignant_cannot_generate_carte_ecolage(self):
        """`get_queryset` scope déjà un enseignant à ses propres élèves (même mécanisme que

        pour toutes les autres ressources scopées par rôle de ce projet) : un élève hors
        périmètre est simplement absent du queryset, d'où un 404 — pas un 403, qui
        supposerait une vérification d'accès après coup sur l'objet."""
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=etudiant.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.get(f'/api/etudiants/{etudiant.id}/carte-ecolage/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SallePermissionTests(APITestCase):
    def test_secretariat_can_create_salle_without_annee_scolaire(self):
        """La salle est un bien physique de l'établissement, pas lié à une année scolaire."""
        ecole = f.make_ecole()
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=ecole)
        self.client.force_authenticate(user=secretaire)

        response = self.client.post('/api/salles/', {
            'nom': 'Labo Physique', 'capacite': 30, 'type_salle': 'Laboratoire',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['ecole'], ecole.id)

    def test_enseignant_cannot_create_salle(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/salles/', {'nom': 'Salle X', 'capacite': 20}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ClassePermissionTests(APITestCase):
    def test_enseignant_cannot_create_classe(self):
        classe = f.make_classe()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/classes/', {
            'annee_scolaire': classe.annee_scolaire.id, 'niveau': classe.niveau.id, 'nom': '3ème B',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_classe(self):
        annee = f.make_annee_scolaire()
        niveau = f.make_niveau(ecole=annee.ecole)
        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/classes/', {
            'annee_scolaire': annee.id, 'niveau': niveau.id, 'nom': '3ème B',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_admin_can_create_classe_without_niveau(self):
        """Le niveau n'est pas obligatoire à la création : peut être renseigné plus tard."""
        annee = f.make_annee_scolaire()
        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/classes/', {
            'annee_scolaire': annee.id, 'nom': '3ème C',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNone(response.data['niveau'])
        self.assertIsNone(response.data['niveau_intitule'])

    def test_secretariat_can_create_classe(self):
        """Le bureau administratif gère les classes au quotidien, au même titre que l'admin."""
        annee = f.make_annee_scolaire()
        niveau = f.make_niveau(ecole=annee.ecole)
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=annee.ecole)
        self.client.force_authenticate(user=secretaire)

        response = self.client.post('/api/classes/', {
            'annee_scolaire': annee.id, 'niveau': niveau.id, 'nom': '3ème C',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_admin_can_assign_multiple_enseignants_to_classe(self):
        """Un enseignant peut intervenir dans plusieurs classes, une classe peut avoir plusieurs profs."""
        annee = f.make_annee_scolaire()
        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        prof1 = f.make_user(role=User.Role.ENSEIGNANT, ecole=annee.ecole)
        prof2 = f.make_user(role=User.Role.ENSEIGNANT, ecole=annee.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/classes/', {
            'annee_scolaire': annee.id, 'nom': '3ème D', 'enseignants': [prof1.id, prof2.id],
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertCountEqual(response.data['enseignants'], [prof1.id, prof2.id])
        self.assertCountEqual(response.data['enseignants_noms'], [prof1.get_full_name(), prof2.get_full_name()])

    def test_classe_rejects_enseignant_from_another_ecole(self):
        annee = f.make_annee_scolaire()
        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        prof_autre_ecole = f.make_user(role=User.Role.ENSEIGNANT, ecole=f.make_ecole())
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/classes/', {
            'annee_scolaire': annee.id, 'nom': '3ème E', 'enseignants': [prof_autre_ecole.id],
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('enseignants', response.data)

    def test_enseignant_only_sees_his_own_classes(self):
        classe_a = f.make_classe()
        matiere = f.make_matiere(filiere=classe_a.filiere, niveau=classe_a.niveau)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe_a.annee_scolaire.ecole)
        matiere.enseignant = prof
        matiere.save()
        autre_annee = f.make_annee_scolaire(ecole=classe_a.annee_scolaire.ecole, est_active=False)
        f.make_classe(annee_scolaire=autre_annee)  # sans lien avec ce prof

        self.client.force_authenticate(user=prof)
        response = self.client.get('/api/classes/')
        ids = {c['id'] for c in response.data}
        self.assertEqual(ids, {classe_a.id})


class ClassementAnnuelApiTests(APITestCase):
    """Bilan annuel (passage/redoublement) d'une classe : GET /classes/<id>/classement-annuel/."""

    def test_returns_moyenne_and_decision_per_etudiant(self):
        from application.models import Note

        classe = f.make_classe()
        annee = classe.annee_scolaire
        t1 = f.make_trimestre(annee_scolaire=annee, numero=1)
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau, coefficient=1)

        admis = f.make_etudiant(ecole=annee.ecole)
        redouble = f.make_etudiant(ecole=annee.ecole)
        f.make_inscription(etudiant=admis, classe=classe)
        f.make_inscription(etudiant=redouble, classe=classe)
        Note.objects.create(etudiant=admis, matiere=matiere, trimestre=t1, valeur=15, type_evaluation='CC')
        Note.objects.create(etudiant=redouble, matiere=matiere, trimestre=t1, valeur=6, type_evaluation='CC')

        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.get(f'/api/classes/{classe.id}/classement-annuel/')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        par_etudiant = {row['etudiant']: row for row in response.data}
        self.assertEqual(par_etudiant[admis.id]['decision'], 'ADMIS')
        self.assertEqual(par_etudiant[redouble.id]['decision'], 'REDOUBLE')

    def test_etudiant_sans_note_a_une_decision_nulle(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        f.make_inscription(etudiant=etudiant, classe=classe)

        admin = f.make_user(role=User.Role.ADMIN, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=admin)
        response = self.client.get(f'/api/classes/{classe.id}/classement-annuel/')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIsNone(response.data[0]['decision'])
        self.assertIsNone(response.data[0]['moyenne'])

    def test_requires_authentication(self):
        classe = f.make_classe()
        response = self.client.get(f'/api/classes/{classe.id}/classement-annuel/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MatierePermissionTests(APITestCase):
    """Le catalogue des matières est géré par l'admin/le bureau ; un enseignant peut

    ajouter les matières qu'il enseigne lui-même, mais ne peut pas toucher à celles d'un collègue.
    """

    def test_secretariat_can_create_matiere(self):
        niveau = f.make_niveau()
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=niveau.ecole)
        self.client.force_authenticate(user=secretaire)

        response = self.client.post('/api/matieres/', {
            'code': 'PHY', 'intitule': 'Physique', 'niveau': niveau.id, 'coefficient': 3, 'filiere': None,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_enseignant_can_create_his_own_matiere(self):
        niveau = f.make_niveau()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=niveau.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/matieres/', {
            'code': 'MATH', 'intitule': 'Mathématiques', 'niveau': niveau.id,
            'coefficient': 4, 'enseignant': prof.id, 'filiere': None,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_enseignant_cannot_create_matiere_assigned_to_colleague(self):
        niveau = f.make_niveau()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=niveau.ecole)
        collegue = f.make_user(role=User.Role.ENSEIGNANT, ecole=niveau.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/matieres/', {
            'code': 'SVT', 'intitule': 'SVT', 'niveau': niveau.id,
            'coefficient': 2, 'enseignant': collegue.id, 'filiere': None,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enseignant_cannot_update_colleagues_matiere(self):
        ecole = f.make_ecole()
        collegue = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=ecole), enseignant=collegue)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.patch(f'/api/matieres/{matiere.id}/', {'coefficient': 5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enseignant_can_update_his_own_matiere(self):
        ecole = f.make_ecole()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        matiere = f.make_matiere(filiere=None, niveau=f.make_niveau(ecole=ecole), enseignant=prof)
        self.client.force_authenticate(user=prof)

        response = self.client.patch(f'/api/matieres/{matiere.id}/', {'coefficient': 5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_admin_can_create_matiere_with_only_intitule_enseignant_couleur(self):
        """Formulaire simplifié : ni code, ni niveau, ni filière requis — tout est optionnel/dérivé."""
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/matieres/', {
            'intitule': 'Histoire-Géographie', 'enseignant': prof.id, 'couleur': '#f59e0b',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(response.data['code'])  # généré automatiquement, non vide
        self.assertIsNone(response.data['niveau'])
        self.assertEqual(response.data['couleur'], '#f59e0b')
        self.assertEqual(response.data['ecole'], ecole.id)

    def test_matiere_code_auto_generation_avoids_collision(self):
        ecole = f.make_ecole()
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.force_authenticate(user=admin)

        r1 = self.client.post('/api/matieres/', {'intitule': 'Anglais'}, format='json')
        r2 = self.client.post('/api/matieres/', {'intitule': 'Anglais'}, format='json')

        self.assertEqual(r1.status_code, status.HTTP_201_CREATED, r1.data)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED, r2.data)
        self.assertNotEqual(r1.data['code'], r2.data['code'])


class EmploiDuTempsPermissionTests(APITestCase):
    def test_secretariat_can_create_emploi_du_temps(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        secretaire = f.make_user(role=User.Role.SECRETARIAT, ecole=classe.annee_scolaire.ecole)
        self.client.force_authenticate(user=secretaire)

        response = self.client.post('/api/emplois-du-temps/', {
            'classe': classe.id, 'matiere': matiere.id,
            'jour': 'LUN', 'heure_debut': '08:00', 'heure_fin': '09:00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class NotePermissionTests(APITestCase):
    def test_enseignant_cannot_create_note_for_matiere_not_his(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere()  # sans enseignant assigné
        trimestre = f.make_trimestre()
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=etudiant.ecole)
        self.client.force_authenticate(user=prof)

        response = self.client.post('/api/notes/', {
            'etudiant': etudiant.id, 'matiere': matiere.id, 'trimestre': trimestre.id,
            'valeur': '15.00', 'type_evaluation': 'CC1',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enseignant_can_create_note_for_his_own_matiere(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere(filiere=None, niveau=f.make_niveau(ecole=etudiant.ecole))
        trimestre = f.make_trimestre(annee_scolaire=f.make_annee_scolaire(ecole=etudiant.ecole))
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=etudiant.ecole)
        matiere.enseignant = prof
        matiere.save()

        self.client.force_authenticate(user=prof)
        response = self.client.post('/api/notes/', {
            'etudiant': etudiant.id, 'matiere': matiere.id, 'trimestre': trimestre.id,
            'valeur': '15.00', 'type_evaluation': 'CC1',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        note = Note.objects.get(pk=response.data['id'])
        self.assertEqual(note.saisie_par, prof)

    def test_note_rejects_value_above_20(self):
        etudiant = f.make_etudiant()
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))
        trimestre = f.make_trimestre()
        admin = f.make_user(role=User.Role.ADMIN, ecole=etudiant.ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post('/api/notes/', {
            'etudiant': etudiant.id, 'matiere': matiere.id, 'trimestre': trimestre.id,
            'valeur': '25.00', 'type_evaluation': 'CC1',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_etudiant_sees_only_his_own_notes(self):
        etudiant = f.make_etudiant()
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=etudiant.ecole)
        etudiant.save()
        autre_etudiant = f.make_etudiant(ecole=etudiant.ecole)
        matiere = f.make_matiere(niveau=f.make_niveau(ecole=etudiant.ecole))
        trimestre = f.make_trimestre()

        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=12, type_evaluation='CC1')
        Note.objects.create(etudiant=autre_etudiant, matiere=matiere, trimestre=trimestre, valeur=8, type_evaluation='CC1')

        self.client.force_authenticate(user=etudiant.utilisateur)
        response = self.client.get('/api/notes/')
        etudiants_dans_reponse = {n['etudiant'] for n in response.data}
        self.assertEqual(etudiants_dans_reponse, {etudiant.id})


class AnneeScolaireActivationTests(APITestCase):
    def test_activating_new_annee_deactivates_old_one(self):
        ecole = f.make_ecole()
        ancienne = f.make_annee_scolaire(ecole=ecole, libelle='2024-2025', est_active=True)
        nouvelle = f.make_annee_scolaire(ecole=ecole, libelle='2025-2026', est_active=False)
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        self.client.force_authenticate(user=admin)

        response = self.client.post(f'/api/annees-scolaires/{nouvelle.id}/activer/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        ancienne.refresh_from_db()
        nouvelle.refresh_from_db()
        self.assertFalse(ancienne.est_active)
        self.assertTrue(nouvelle.est_active)
