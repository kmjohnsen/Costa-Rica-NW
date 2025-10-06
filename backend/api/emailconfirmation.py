# emailconfirmation.py

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.utils import formataddr
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587  # Gmail uses port 587 for TLS
TEMPLATE_DIR = "templates"
IMAGE_PATHS = {
    "image1": os.path.join("resources", "images", "CostaRicaNW_Logo.png"),
    "image2": os.path.join("resources", "images", "leave_airport_small.png"),
}
DEFAULT_SENDER_NAME = "Aaron Quiros"
DEFAULT_SENDER_EMAIL = EMAIL_ADDRESS or "info@costaricanorthwest.com"


# Shared Utilities
def attach_png(msg, image_path, cid):
    try:
        with open(image_path, 'rb') as img_file:
            img_data = img_file.read()
            # Use MIMEImage for PNG images
            img_part = MIMEImage(img_data, _subtype="png")
            img_part.add_header('Content-ID', f'<{cid}>')  # Matches 'cid:image1' in HTML
            img_part.add_header("Content-Disposition", "inline", filename="logo.png")
            msg.attach(img_part)
    except FileNotFoundError:
        print(f"Error: Image not found at {image_path}")
    except Exception as e:
        print(f"An error occurred while attaching {cid}: {e}")


def load_template(template_name):
    path = os.path.join(TEMPLATE_DIR, template_name)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()
    

def create_email(subject, html_body, sender_name=DEFAULT_SENDER_NAME, sender_email=DEFAULT_SENDER_EMAIL):
    msg = MIMEMultipart("related")
    msg["From"] = formataddr((sender_name, sender_email))
    msg["Subject"] = subject

    msg_alternative = MIMEMultipart("alternative")
    msg.attach(msg_alternative)
    msg_alternative.attach(MIMEText(html_body, "html"))

    # Attach images
    for cid, path in IMAGE_PATHS.items():
        attach_png(msg, path, cid)

    return msg


def send_smtp_email(base_msg, sender_email, recipient_emails):
    if isinstance(recipient_emails, str):
        recipient_emails = [recipient_emails]

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)

            for email in recipient_emails:
                # Clone the base message
                msg = MIMEMultipart("related")
                msg["From"] = base_msg["From"]
                msg["Subject"] = base_msg["Subject"]
                msg["To"] = email

                for part in base_msg.get_payload():
                    msg.attach(part)

                print(f"Sending to: {email}")
                server.sendmail(sender_email, email, msg.as_string())
    except Exception as e:
        print(f"Email sending failed: {e}")


# Email Functions

def send_email(receiver_emails, subject, body_lines, confirmationcode):
    body_html = "".join(f"<p>{line}</p>" for line in body_lines)
    html_template = load_template("booking_confirmation.html")
    html_body = html_template.format(body_html=body_html, confirmationcode=confirmationcode)

    msg = create_email(subject, html_body)
    send_smtp_email(msg, DEFAULT_SENDER_EMAIL, receiver_emails)


def send_transport_request_email(name, phone, sender_email, details, confirmationcode):
    subject = f"New Transportation Request from {name} ({sender_email} | Confirmation: {confirmationcode})"
    html_template = load_template("transport_request.html")
    html_body = html_template.format(
        name=name,
        phone=phone,
        sender_email=sender_email,
        details=details,
        confirmationcode=confirmationcode,
    )

    msg = create_email(subject, html_body)
    to_email = "info@costaricanorthwest.com"
    cc_email = sender_email
    bcc_emails = ["kmjohnsen@gmail.com"]
    msg["To"] = to_email
    msg["Cc"] = cc_email
    recipients = [to_email, cc_email] + bcc_emails
    send_smtp_email(msg, DEFAULT_SENDER_EMAIL, recipients)


def send_debug_email(raw_inputs):
    subject = "Debug CostaRicaNorthWest: Raw Input Data from Booking Submission"
    html = "<h2>Raw Input Data</h2><pre style='font-family: monospace;'>"
    html += "\n".join(f"{key}: {value}" for key, value in raw_inputs.items())
    html += "</pre>"

    msg = create_email(subject, html, sender_name="Raw Data", sender_email="info@costaricanorthwest.com")
    send_smtp_email(msg, DEFAULT_SENDER_EMAIL, "kmjohnsen@gmail.com")