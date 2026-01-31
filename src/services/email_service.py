"""
Email service for sending invitations and notifications.
Uses Gmail SMTP.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from src.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailService:
    """Service for sending emails via Gmail SMTP."""

    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = settings.smtp_email
        self.sender_password = settings.smtp_password

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """Send an email."""
        if not self.sender_email or not self.sender_password:
            logger.warning("SMTP credentials not configured, skipping email")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Family Finance <{self.sender_email}>"
            msg["To"] = to_email

            # Add text and HTML parts
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Connect and send
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, to_email, msg.as_string())

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_family_invitation(
        self,
        to_email: str,
        family_name: str,
        inviter_name: str,
        temp_password: str,
    ) -> bool:
        """Send family invitation email with temporary password."""
        subject = f"Invitacion a {family_name} - Family Finance"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .credentials {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
                .credential-item {{ margin: 10px 0; }}
                .credential-label {{ color: #6b7280; font-size: 14px; }}
                .credential-value {{ font-size: 18px; font-weight: bold; color: #111827; font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 4px; }}
                .button {{ display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Family Finance</h1>
                </div>
                <div class="content">
                    <h2>Hola!</h2>
                    <p><strong>{inviter_name}</strong> te ha invitado a unirte a la familia <strong>"{family_name}"</strong> en Family Finance.</p>

                    <p>Family Finance te ayuda a gestionar las finanzas de tu hogar, registrar gastos, establecer metas de ahorro y mucho mas.</p>

                    <div class="credentials">
                        <h3 style="margin-top: 0;">Tus credenciales de acceso:</h3>
                        <div class="credential-item">
                            <div class="credential-label">Correo electronico:</div>
                            <div class="credential-value">{to_email}</div>
                        </div>
                        <div class="credential-item">
                            <div class="credential-label">Contrasena temporal:</div>
                            <div class="credential-value">{temp_password}</div>
                        </div>
                    </div>

                    <center>
                        <a href="https://app.family-finance.scram2k.com" class="button">Iniciar Sesion</a>
                    </center>

                    <div class="warning">
                        <strong>Importante:</strong> Te recomendamos cambiar tu contrasena despues de iniciar sesion por primera vez.
                    </div>
                </div>
                <div class="footer">
                    <p>Este correo fue enviado por Family Finance.<br>
                    Si no esperabas esta invitacion, puedes ignorar este mensaje.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Hola!

        {inviter_name} te ha invitado a unirte a la familia "{family_name}" en Family Finance.

        Tus credenciales de acceso:
        - Correo: {to_email}
        - Contrasena temporal: {temp_password}

        Inicia sesion en: https://app.family-finance.scram2k.com

        Te recomendamos cambiar tu contrasena despues de iniciar sesion.

        --
        Family Finance
        """

        return self.send_email(to_email, subject, html_body, text_body)


# Singleton instance
email_service = EmailService()
