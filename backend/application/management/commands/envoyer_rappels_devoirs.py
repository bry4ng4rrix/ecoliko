from django.core.management.base import BaseCommand

from application.services.devoirs import envoyer_rappels_devoirs


class Command(BaseCommand):
    help = (
        "Envoie un rappel quotidien aux élèves/parents pour chaque devoir dont l'échéance "
        "approche (par défaut : dans les 3 prochains jours). À planifier une fois par jour "
        "(ex: cron `0 7 * * * cd /chemin/vers/backend && ./venv/bin/python manage.py "
        "envoyer_rappels_devoirs`) — idempotent, sans risque à relancer plusieurs fois le même jour."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--jours-avant', type=int, default=3,
            help="Nombre de jours avant l'échéance à partir duquel envoyer un rappel (défaut : 3).",
        )

    def handle(self, *args, **options):
        resultat = envoyer_rappels_devoirs(jours_avant=options['jours_avant'])
        self.stdout.write(self.style.SUCCESS(
            f"{resultat['rappels_envoyes']} rappel(s) envoyé(s) pour {resultat['devoirs_concernes']} devoir(s) concerné(s)."
        ))
