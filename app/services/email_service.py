import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

def send_verification_email(email: str, username: str, token: str) -> bool:
    """Send a verification link to the newly registered user."""
    verification_link = f"{settings.APP_BASE_URL}/auth/verify?token={token}"

    subject = "Vérifiez votre compte - Zorin VM Platform"
    body = f"""Bonjour {username},

Merci de vous être inscrit sur Zorin VM Platform.
Veuillez cliquer sur le lien ci-dessous pour activer votre compte et commencer à gérer vos machines virtuelles :

{verification_link}

Ce lien est nécessaire pour finaliser votre inscription.

Cordialement,
L'équipe d'administration.
"""

    if settings.EMAIL_SIMULATION_MODE:
        log.info("=" * 60)
        log.info("SIMULATION MODE: Email would be sent to: %s", email)
        log.info("Subject: %s", subject)
        log.info("Link: %s", verification_link)
        log.info("=" * 60)
        # Also print to stdout directly to make sure it's visible in console
        print("\n" + "=" * 60)
        print(f"📧 SIMULATION EMAIL TO: {email}")
        print(f"🔗 VERIFICATION LINK: {verification_link}")
        print("=" * 60 + "\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM
        msg['To'] = email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        # Standard SMTP connection
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, email, msg.as_string())
        server.quit()
        log.info("Verification email successfully sent to %s", email)
        return True
    except Exception as e:
        log.error("Failed to send verification email to %s: %s", email, e)
        return False
