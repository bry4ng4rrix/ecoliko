"""Récupération des jours fériés / fêtes nationales de Madagascar depuis une source externe.

Utilise le calendrier public des jours fériés de Google Calendar (flux iCal en lecture
seule, sans authentification ni clé API) : jours fériés nationaux, fêtes religieuses et
observances. C'est la même source que Google Agenda affiche pour « Jours fériés à Madagascar ».
"""
import re
import urllib.error
import urllib.request
from datetime import date, datetime

ICS_URL_JOURS_FERIES_MADAGASCAR = (
    'https://calendar.google.com/calendar/ical/'
    'en.mg%23holiday%40group.v.calendar.google.com/public/basic.ics'
)

_TIMEOUT_SECONDES = 10

# La source (calendrier public Google) renvoie les intitulés en anglais ; l'application est
# entièrement en français, donc on les traduit vers les noms officiels utilisés à Madagascar.
_TRADUCTIONS_TITRES = {
    "New Year's Day": "Jour de l'An",
    "New Year's Eve": 'Veille du Nouvel An',
    'Independence Day': "Fête de l'Indépendance",
    "Martyrs' Day": 'Journée des Martyrs',
    'Assumption of Mary': 'Assomption',
    'Christmas Day': 'Noël',
    'Easter Sunday': 'Pâques',
    'Easter Monday': 'Lundi de Pâques',
    'Whit Sunday': 'Pentecôte',
    'Whit Monday': 'Lundi de Pentecôte',
    'Ascension Day': 'Ascension',
    "All Saints' Day": 'Toussaint',
    'Labor Day': 'Fête du Travail',
    "International Women's Day": 'Journée internationale de la femme',
    'National Day of Mourning': 'Journée nationale de deuil',
    'Eid al-Fitr': 'Aïd el-Fitr',
    'Eid al-Fitr (tentative)': 'Aïd el-Fitr (date à confirmer)',
    'Eid al-Adha': 'Aïd el-Adha',
    'Eid al-Adha (tentative)': 'Aïd el-Adha (date à confirmer)',
    'Ramadan Start': 'Début du Ramadan',
    'Ramadan Start (tentative)': 'Début du Ramadan (date à confirmer)',
    'French President Visit Holiday': 'Jour férié — visite du Président français',
}


def _traduire_titre(titre_original: str) -> str:
    return _TRADUCTIONS_TITRES.get(titre_original, titre_original)


class ErreurRecuperationJoursFeries(Exception):
    """Levée quand la source externe est injoignable ou renvoie un contenu invalide."""


def _deplier_lignes(texte: str) -> list[str]:
    """Défait le « folding » de lignes du format iCal (RFC 5545) : une ligne de continuation

    commence par un espace ou une tabulation et doit être recollée à la ligne précédente.
    """
    lignes_brutes = texte.replace('\r\n', '\n').split('\n')
    lignes = []
    for ligne in lignes_brutes:
        if ligne.startswith((' ', '\t')) and lignes:
            lignes[-1] += ligne[1:]
        else:
            lignes.append(ligne)
    return lignes


def _parser_date_ics(valeur: str) -> date | None:
    brut = valeur.strip()[:8]
    if not re.fullmatch(r'\d{8}', brut):
        return None
    try:
        return datetime.strptime(brut, '%Y%m%d').date()
    except ValueError:
        return None


def _parser_evenements_ics(texte: str) -> list[dict]:
    evenements = []
    courant = None
    for ligne in _deplier_lignes(texte):
        if ligne == 'BEGIN:VEVENT':
            courant = {}
        elif ligne == 'END:VEVENT':
            if courant and courant.get('date') and courant.get('titre'):
                evenements.append(courant)
            courant = None
        elif courant is not None:
            if ligne.startswith('DTSTART'):
                _, _, valeur = ligne.partition(':')
                courant['date'] = _parser_date_ics(valeur)
            elif ligne.startswith('SUMMARY:'):
                courant['titre'] = ligne[len('SUMMARY:'):].strip()
            elif ligne.startswith('UID:'):
                courant['uid'] = ligne[len('UID:'):].strip()
            elif ligne.startswith('DESCRIPTION:'):
                courant['description'] = ligne[len('DESCRIPTION:'):].strip()
    return evenements


def recuperer_jours_feries_madagascar(date_debut: date | None = None, date_fin: date | None = None) -> list[dict]:
    """Renvoie tous les jours fériés malgaches disponibles dans la source externe (plusieurs

    années, passées et futures), optionnellement restreints à [date_debut, date_fin] si fournis.
    Chaque entrée : {'uid': str, 'titre': str, 'date': date, 'description': str | None}.
    """
    try:
        with urllib.request.urlopen(ICS_URL_JOURS_FERIES_MADAGASCAR, timeout=_TIMEOUT_SECONDES) as reponse:
            texte = reponse.read().decode('utf-8', errors='replace')
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ErreurRecuperationJoursFeries(
            "Impossible de récupérer les jours fériés depuis la source externe."
        ) from exc

    tous = _parser_evenements_ics(texte)
    return [
        {**e, 'titre': _traduire_titre(e['titre'])}
        for e in tous
        if e['date']
        and (date_debut is None or e['date'] >= date_debut)
        and (date_fin is None or e['date'] <= date_fin)
    ]
