# emailconfirmation.py

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email.utils import formataddr
from email import encoders
import os

def send_email(receiver_emails, subject, body, confirmationcode):
    # Setup
    smtp_server = "smtp.gmail.com"
    smtp_port = 587  # Gmail uses port 587 for TLS
    login = "costalirshuttletest@gmail.com"  # Your email login
    password = "muuz vqct pbtc prcx"  # Your email password or app-specific password
    sender_email = "costalirshuttletest@gmail.com" 

        # Ensure receiver_emails is a list
    if isinstance(receiver_emails, str):
        receiver_emails = [receiver_emails]


    # Create the email message container
    msg = MIMEMultipart('related')  # 'related' is used for including embedded images
    msg['From'] = formataddr(('Aaron Quiros', 'costalirshuttletest@gmail.com'))
    msg['Subject'] = subject
    
    # Create the alternative part to hold both plain text and HTML
    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)

    body_html = "".join(f"<p>{part}</p>" for part in body)

    # HTML version with embedded images
    html = f"""
    <html>
        <head>
            <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .email-container {{
                max-width: 600px;
                margin: 20px auto;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                padding: 20px;
            }}
            .header {{
                background-color: blue;
                text-align: center;
                padding: 20px;
                border-radius: 8px 8px 0 0;
            }}
            .header img {{
                height: 100px;
                width: auto;
            }}
            .content {{
                padding: 20px;
                text-align: center;
            }}
            .content h1 {{
                color: #333;
            }}
            .content p {{
                font-size: 16px;
                color: #555;
                line-height: 1.5;
            }}
            .confirmation-code {{
                font-size: 18px;
                font-weight: bold;
                color: #007bff;
            }}
            .cta-button {{
                background-color: #007bff;
                color: white;
                font-weight: bold;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
                margin-top: 20px;
                font-size: 16px;
            }}
            .footer {{
                text-align: center;
                padding: 20px;
                font-size: 14px;
                color: #777;
            }}
            .footer a {{
                color: blue;
                text-decoration: none;
            }}
            </style>
        </head>
        <body>
            <div class="email-container">
            <!-- HEADER -->
            <div class="header" style="background-color: #007bff; text-align: center; padding: 20px; border-radius: 8px 8px 0 0;">
                <div style="display: inline-block; background-color: #007bff; border-radius: 8px;">
                    <img src="cid:image1" alt="Company Logo" style="height: 54px; display: block; margin: 0 auto;">
                </div>
            </div>


            <!-- CONTENT -->
            <div class="content">
                <h1>Thank You for Booking with Costa Rica Northwest!</h1>
                {body_html}

                <p><strong>Your Confirmation Number:</strong></p>
                <p class="confirmation-code">{confirmationcode}</p>

                <h3>Payment Information</h3>
                <p><b>Cash is due at the time of service, payable in US Dollars or Costa Rican Colones.</b></p>

                <h3>Trip Modifications or Cancellations</h3>
                <p>If you need to cancel or modify your reservation, please reply to this email to contact our sales team.</p>

                <!-- CTA BUTTON -->
                <a href="https://www.costaricanorthwest.com" class="cta-button" style="background-color: #007bff; color: #ffffff; font-weight: bold; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; font-size: 16px;">Book another Trip</a>

            </div>

            <!-- FOOTER -->
            <div class="footer">
                <p>Thank you for choosing us! We look forward to serving you.</p>
                <p>For any assistance, reply to this email or email us at <a href="mailto:booking@costaricanorthwest.com">booking@costaricanorthwest.com</a></p>
            </div>
            <div style="display: inline-block; background-color: #007bff; padding: 10px; border-radius: 8px; text-align: center;">
                <img src="cid:image2" alt="Van" style="width: 100%; max-width: 560px; display: block; margin: 0 auto;">
            </div>
            <div class="footer">
                <p>&copy; 2025 Costa Rica Northwest. All rights reserved.</p>
            </div>
            </div>
        </body>
        </html>
    """

    msg_alternative.attach(MIMEText(html, 'html'))

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


    # ✅ Use Relative Paths for Images
    # Use relative paths for images
    image_path1 = os.path.join(os.getcwd(), "resources", "images", "CostaRicaNW_Logo.png")
    image_path2 = os.path.join(os.getcwd(), "resources", "images", "leave_airport_small.png")

    # Attach PNG images using MIMEImage
    attach_png(msg, image_path1, "image1")
    attach_png(msg, image_path2, "image2")

    try:
        # Set up the SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Enable TLS (Transport Layer Security)
        
        # Log in to your email account
        server.login(login, password)

        # Send the email
        for email in receiver_emails:
            msg['To'] = email
            server.sendmail(sender_email, email, msg.as_string())

        print("Email sent successfully!")
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        server.quit()


def send_debug_email(raw_inputs):
    """
    Sends an email with all the raw input data.
    `raw_inputs` is expected to be a dictionary containing all booking details.
    """
    subject = "Debug CostaRicaNorthWest: Raw Input Data from Booking Submission"
    # Build a plain-text message from the dictionary
    debug_message = "Raw Input Data:\n\n"
    for key, value in raw_inputs.items():
        debug_message += f"{key}: {value}\n"
    # Pass the debug message as a list so each line becomes a paragraph
    # Use your own email address to receive the debug email
    send_email("kmjohnsen@gmail.com", subject, [debug_message], "")
