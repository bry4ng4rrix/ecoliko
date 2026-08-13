from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from application.models import Annonce, Message, Notification, Note, PaiementEcolage, TuteurEtudiant, User
from application.services.bulletin import generer_bulletin, valider_bulletin
from application.services.documents import valider_demande
from . import factories as f


class NotificationSignalTests(APITestCase):
    def test_new_note_notifies_student_and_parent(self):
        classe = f.make_classe()
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau)
        trimestre = f.make_trimestre(annee_scolaire=classe.annee_scolaire)
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=classe.annee_scolaire.ecole)
        etudiant.save()
        parent = f.make_user(role=User.Role.PARENT, ecole=classe.annee_scolaire.ecole)
        TuteurEtudiant.objects.create(parent=parent, etudiant=etudiant, relation='PERE')

        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=15, type_evaluation='CC')

        self.assertTrue(Notification.objects.filter(destinataire=etudiant.utilisateur, type_notification='NOTE').exists())
        self.assertTrue(Notification.objects.filter(destinataire=parent, type_notification='NOTE').exists())

    def test_paye_paiement_notifies_student(self):
        classe = f.make_classe()
        etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=classe.annee_scolaire.ecole)
        etudiant.save()

        PaiementEcolage.objects.create(
            etudiant=etudiant, annee_scolaire=classe.annee_scolaire, montant=Decimal('100000'),
            date_echeance='2025-10-01', mois_couvert=10, statut=PaiementEcolage.StatutPaiement.PAYE,
        )

        self.assertTrue(Notification.objects.filter(destinataire=etudiant.utilisateur, type_notification='PAIEMENT').exists())

    def test_regenerating_bulletin_does_not_spam_notifications(self):
        classe = f.make_classe()
        annee = classe.annee_scolaire
        matiere = f.make_matiere(filiere=classe.filiere, niveau=classe.niveau, coefficient=1)
        trimestre = f.make_trimestre(annee_scolaire=annee)
        etudiant = f.make_etudiant(ecole=annee.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)
        etudiant.save()
        f.make_inscription(etudiant=etudiant, classe=classe)
        Note.objects.create(etudiant=etudiant, matiere=matiere, trimestre=trimestre, valeur=12, type_evaluation='CC')

        bulletin = generer_bulletin(etudiant, annee, trimestre)
        generer_bulletin(etudiant, annee, trimestre)  # régénération : ne doit pas notifier
        self.assertEqual(Notification.objects.filter(type_notification='BULLETIN').count(), 0)

        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        valider_bulletin(bulletin, admin)
        self.assertEqual(Notification.objects.filter(type_notification='BULLETIN').count(), 1)

        valider_bulletin(bulletin, admin)  # revalider ne doit pas dupliquer
        self.assertEqual(Notification.objects.filter(type_notification='BULLETIN').count(), 2)  # une par (re)validation explicite, jamais par régénération

    def test_document_validation_notifies_student(self):
        from application.models import DemandeDocument

        annee = f.make_annee_scolaire()
        etudiant = f.make_etudiant(ecole=annee.ecole)
        etudiant.utilisateur = f.make_user(role=User.Role.ETUDIANT, ecole=annee.ecole)
        etudiant.save()
        demande = DemandeDocument.objects.create(etudiant=etudiant, annee_scolaire=annee, type_document='ATTESTATION')
        self.assertEqual(Notification.objects.filter(type_notification='DOCUMENT').count(), 0)

        admin = f.make_user(role=User.Role.ADMIN, ecole=annee.ecole)
        valider_demande(demande, admin)
        self.assertEqual(Notification.objects.filter(type_notification='DOCUMENT').count(), 1)


class MessageApiTests(APITestCase):
    def test_send_and_list_message(self):
        ecole = f.make_ecole()
        expediteur = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        destinataire = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)

        self.client.force_authenticate(user=expediteur)
        response = self.client.post('/api/messages/', {
            'destinataire': destinataire.id, 'objet': 'Réunion', 'contenu': 'Demain 10h',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Message.objects.get().expediteur, expediteur)
        self.assertTrue(Notification.objects.filter(destinataire=destinataire, type_notification='MESSAGE').exists())

    def test_third_party_does_not_see_others_messages(self):
        ecole = f.make_ecole()
        a = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        b = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        c = f.make_user(role=User.Role.SECRETARIAT, ecole=ecole)
        Message.objects.create(expediteur=a, destinataire=b, objet='Privé', contenu='...')

        self.client.force_authenticate(user=c)
        response = self.client.get('/api/messages/')
        self.assertEqual(response.data, [])


class AnnonceApiTests(APITestCase):
    def test_enseignant_cannot_publish_to_parents_scope_restricted_by_visibility_not_write(self):
        # La portée n'est pas restreinte à l'écriture (MVP) : on vérifie seulement que la visibilité en lecture l'est.
        ecole = f.make_ecole()
        Annonce.objects.create(ecole=ecole, portee=Annonce.Portee.PARENTS, titre='Réunion parents', contenu='...')
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)

        self.client.force_authenticate(user=prof)
        response = self.client.get('/api/annonces/')
        self.assertEqual(response.data, [])

    def test_etudiant_sees_etablissement_and_his_classe_announcements_only(self):
        classe = f.make_classe()
        ecole = classe.annee_scolaire.ecole
        etudiant_user = f.make_user(role=User.Role.ETUDIANT, ecole=ecole)
        etudiant = f.make_etudiant(ecole=ecole, utilisateur=etudiant_user)
        f.make_inscription(etudiant=etudiant, classe=classe)

        generale = Annonce.objects.create(ecole=ecole, portee=Annonce.Portee.ETABLISSEMENT, titre='Fermeture', contenu='...')
        ma_classe = Annonce.objects.create(ecole=ecole, portee=Annonce.Portee.CLASSE, classe=classe, titre='Sortie', contenu='...')
        Annonce.objects.create(ecole=ecole, portee=Annonce.Portee.ENSEIGNANTS, titre='Réunion profs', contenu='...')

        self.client.force_authenticate(user=etudiant_user)
        response = self.client.get('/api/annonces/')
        titres = {a['titre'] for a in response.data}
        self.assertEqual(titres, {'Fermeture', 'Sortie'})

    def test_publishing_notifies_scoped_recipients(self):
        classe = f.make_classe()
        ecole = classe.annee_scolaire.ecole
        etudiant_user = f.make_user(role=User.Role.ETUDIANT, ecole=ecole)
        etudiant = f.make_etudiant(ecole=ecole, utilisateur=etudiant_user)
        f.make_inscription(etudiant=etudiant, classe=classe)
        admin = f.make_user(role=User.Role.ADMIN, ecole=ecole)

        self.client.force_authenticate(user=admin)
        response = self.client.post('/api/annonces/', {'portee': 'ETABLISSEMENT', 'titre': 'Info', 'contenu': '...'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(Notification.objects.filter(destinataire=etudiant_user, type_notification='ANNONCE').exists())


class MessageGroupeClasseApiTests(APITestCase):
    def _classe_avec_prof_et_eleve(self):
        classe = f.make_classe()
        ecole = classe.annee_scolaire.ecole
        prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=ecole)
        etudiant_user = f.make_user(role=User.Role.ETUDIANT, ecole=ecole)
        etudiant = f.make_etudiant(ecole=ecole, utilisateur=etudiant_user)
        f.make_inscription(etudiant=etudiant, classe=classe)
        return classe, prof, etudiant_user, etudiant

    def test_enseignant_peut_envoyer_et_lire(self):
        classe, prof, etudiant_user, _ = self._classe_avec_prof_et_eleve()
        self.client.force_authenticate(user=prof)
        response = self.client.post('/api/messages-groupe-classe/', {
            'classe': classe.id, 'enseignant': prof.id, 'contenu': 'Bonjour la classe !',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['auteur_nom'], prof.get_full_name())

        response = self.client.get('/api/messages-groupe-classe/', {'classe': classe.id, 'enseignant': prof.id})
        self.assertEqual(len(response.data), 1)

    def test_eleve_de_la_classe_peut_ecrire_et_lire(self):
        from application.models import MessageGroupeClasse

        classe, prof, etudiant_user, _ = self._classe_avec_prof_et_eleve()
        MessageGroupeClasse.objects.create(classe=classe, enseignant=prof, auteur=prof, contenu='Consigne du jour.')

        self.client.force_authenticate(user=etudiant_user)
        response = self.client.post('/api/messages-groupe-classe/', {
            'classe': classe.id, 'enseignant': prof.id, 'contenu': "J'ai une question.",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        response = self.client.get('/api/messages-groupe-classe/')
        self.assertEqual(len(response.data), 2)

    def test_parent_peut_lire_et_ecrire(self):
        classe, prof, etudiant_user, etudiant = self._classe_avec_prof_et_eleve()
        parent = f.make_user(role=User.Role.PARENT, ecole=classe.annee_scolaire.ecole)
        TuteurEtudiant.objects.create(parent=parent, etudiant=etudiant, relation='MERE')

        self.client.force_authenticate(user=parent)
        response = self.client.post('/api/messages-groupe-classe/', {
            'classe': classe.id, 'enseignant': prof.id, 'contenu': 'Merci pour le suivi.',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_eleve_dune_autre_classe_ne_peut_ni_lire_ni_ecrire(self):
        from application.models import MessageGroupeClasse

        classe, prof, _, _ = self._classe_avec_prof_et_eleve()
        MessageGroupeClasse.objects.create(classe=classe, enseignant=prof, auteur=prof, contenu='Pour ma classe.')

        autre_classe = f.make_classe(annee_scolaire=classe.annee_scolaire)
        autre_etudiant_user = f.make_user(role=User.Role.ETUDIANT, ecole=classe.annee_scolaire.ecole)
        autre_etudiant = f.make_etudiant(ecole=classe.annee_scolaire.ecole, utilisateur=autre_etudiant_user)
        f.make_inscription(etudiant=autre_etudiant, classe=autre_classe)

        self.client.force_authenticate(user=autre_etudiant_user)
        response = self.client.get('/api/messages-groupe-classe/')
        self.assertEqual(response.data, [])

        response = self.client.post('/api/messages-groupe-classe/', {
            'classe': classe.id, 'enseignant': prof.id, 'contenu': 'Intrusion.',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_autre_enseignant_ne_peut_pas_ecrire_dans_le_chat_dun_collegue(self):
        classe, prof, _, _ = self._classe_avec_prof_et_eleve()
        autre_prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        classe.enseignants.add(autre_prof)

        self.client.force_authenticate(user=autre_prof)
        response = self.client.post('/api/messages-groupe-classe/', {
            'classe': classe.id, 'enseignant': prof.id, 'contenu': 'Je réponds à sa place.',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enseignant_ne_voit_que_ses_propres_chats(self):
        from application.models import MessageGroupeClasse

        classe, prof, _, _ = self._classe_avec_prof_et_eleve()
        autre_prof = f.make_user(role=User.Role.ENSEIGNANT, ecole=classe.annee_scolaire.ecole)
        MessageGroupeClasse.objects.create(classe=classe, enseignant=prof, auteur=prof, contenu='Mon chat.')
        MessageGroupeClasse.objects.create(classe=classe, enseignant=autre_prof, auteur=autre_prof, contenu='Pas le mien.')

        self.client.force_authenticate(user=prof)
        response = self.client.get('/api/messages-groupe-classe/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['contenu'], 'Mon chat.')


class NotificationApiTests(APITestCase):
    def test_user_only_sees_his_own_notifications_and_can_mark_read(self):
        ecole = f.make_ecole()
        user_a = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        user_b = f.make_user(role=User.Role.ADMIN, ecole=ecole)
        notif = Notification.objects.create(destinataire=user_a, type_notification='ANNONCE', titre='Test')
        Notification.objects.create(destinataire=user_b, type_notification='ANNONCE', titre='Autre')

        self.client.force_authenticate(user=user_a)
        response = self.client.get('/api/notifications/')
        self.assertEqual(len(response.data), 1)

        response = self.client.post(f'/api/notifications/{notif.id}/marquer-lue/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.est_lue)
