"""Génération de codes d'identification (QR code, code-barres) pour la carte étudiant."""
import io

import barcode
import qrcode
from barcode.writer import ImageWriter


def qrcode_etudiant_png(etudiant) -> bytes:
    """QR code encodant le matricule de l'étudiant, pour la carte d'identité scolaire."""
    payload = f"ETU:{etudiant.matricule}:{etudiant.id}"
    img = qrcode.make(payload)
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()


def codebarre_etudiant_png(etudiant) -> bytes:
    """Code-barres (Code128) du matricule de l'étudiant."""
    code128 = barcode.get('code128', etudiant.matricule, writer=ImageWriter())
    buffer = io.BytesIO()
    code128.write(buffer, options={'write_text': True, 'module_height': 10})
    return buffer.getvalue()
