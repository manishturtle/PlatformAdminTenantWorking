from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
from typing import Dict, List, Optional, Union
from pathlib import Path
import os
from jinja2 import Environment, FileSystemLoader

# Email configuration
# USER = "notifications@turtleit.in"
# HOST = "smtp.zeptomail.in"
# PASSWORD = "gAAAAABoGdV4wRIVcuKVJVF7ew3O4l7MdSrxBMTSdsdSxd2cl63ZYKxq1kACo7oc7eB358LrzvMv_RmzCZ8QEVxbQjfyKYoMcs7cpz5Rew6rjZbNd3TdIY3ElKWVc0fhPoH-NXQPDHHJDCSj1KVar3gaAVJdVShQu7aYeIbodLqClIzSoz24BwRxE73659kNJuKBSM7-i3ltVnCE7xDxuiVhcBz1N8GqbOlBPtg9GA2kbWv840A1dXwPpEFNO3bUl-twwwavpXN88tnR4QhEnzdoCcscE7T4e4CxK_6xWfPhU6SC6GvJ919hk2Am-atKGM9cWQTbuEWkpFxNWLxnxtrsrV6jPQMjVA=="
# ZEPTO_PORT = 587

USER = "notifications@turtleit.in"
HOST = "smtp.zeptomail.in"
PASSWORD = "PHtE6r0FRejqjTUu9UJVs/TuEcakMth8ruNmLwBA44wTW/5VTU0Dq9ovljK3rBh+BqYUQPGam4Jst72fte7UIm67NT5KD2qyqK3sx/VYSPOZsbq6x00atV0ff0XdV4Drd9Fq0CXfudzTNA=="
ZEPTO_PORT = 587

# Template directory (create a 'templates/email' directory in your project)
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'templates')


def send_email(
    to_emails: Union[str, List[str]],
    subject: str,
    template_name: str,
    template_context: Optional[Dict] = None,
    from_email: Optional[str] = None,
    cc: Optional[Union[str, List[str]]] = None,
    bcc: Optional[Union[str, List[str]]] = None,
) -> bool:
    try:
        print("email triggered...")

        # Normalize all email inputs to lists
        if isinstance(to_emails, str):
            to_emails = [to_emails]
        if isinstance(cc, str):
            cc_emails = [cc]
        else:
            cc_emails = cc if cc else []
        if isinstance(bcc, str):
            bcc_emails = [bcc]
        else:
            bcc_emails = bcc if bcc else []

        all_recipients = to_emails + cc_emails + bcc_emails
        if not all_recipients:
            raise ValueError("No recipients provided.")

        # Set sender
        from_email = from_email or USER

        # Prepare message
        msg = MIMEMultipart("alternative")
        msg["From"] = from_email
        msg["To"] = ", ".join(to_emails)
        msg["Subject"] = subject
        if cc_emails:
            msg["Cc"] = ", ".join(cc_emails)

        # Load and render template
        env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
        template = env.get_template(f"{template_name}.html")
        html_content = template.render(**(template_context or {}))
        msg.attach(MIMEText(html_content, "html"))

        # Send email
        with smtplib.SMTP(HOST, ZEPTO_PORT) as server:
            server.starttls()
            server.login(USER, PASSWORD)
            server.sendmail(from_email, all_recipients, msg.as_string())

        return True

    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


# Example usage:
# if __name__ == "__main__":
#     # Example 1: Simple email
    # send_email(
    #     to_emails="recipient@example.com",
    #     subject="Welcome to Our Platform!",
    #     template_name="welcome",
    #     template_context={
    #         "user_name": "John Doe",
    #         "activation_link": "https://example.com/activate/12345"
    #     }
    # )
    
    