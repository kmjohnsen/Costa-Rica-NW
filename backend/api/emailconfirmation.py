# emailconfirmation.py

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email.utils import formataddr
from email import encoders
import os

def send_email(receiver_email, subject, body, confirmationcode):
    # Setup
    smtp_server = "smtp.gmail.com"
    smtp_port = 587  # Gmail uses port 587 for TLS
    login = "costalirshuttletest@gmail.com"  # Your email login
    password = "muuz vqct pbtc prcx"  # Your email password or app-specific password
    sender_email = "costalirshuttletest@gmail.com" 

    # Create the email message container
    msg = MIMEMultipart('related')  # 'related' is used for including embedded images
    msg['From'] = formataddr(('Aaron Quiros', 'costalirshuttletest@gmail.com'))
    msg['To'] = receiver_email
    msg['Subject'] = subject
    
    # Create the alternative part to hold both plain text and HTML
    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)

    body_html = "".join(f"<p>{part}</p>" for part in body)

    # HTML version with embedded images
    html = f"""
    <html>
      <body>
        <img src="cid:image1" alt="Image 1" style="width:300px;"><br>
        <h1 style="color:blue;">Thank you for choosing LIR Shuttle!</h1>
        {body_html}
        <h3Your confirmation number: {confirmationcode}</h3>
        <h3>Payment</h3>
        <p><b>Cash is due at time of service, in US Dollars or Costa Rican Colones equivalent</b></p>
        <h3>Trip Modifications or Cancellations</h3>
        <p>For cancellations or modifications please write to our sales team by replying to this email.</p>
        <img src="cid:image2" alt="Image 2" style="width:300px;"><br>
        <p style="color:green;">Thank you for choosing us!</p>
      </body>
    </html>
    """

    msg_alternative.attach(MIMEText(html, 'html'))

    # ✅ Use Relative Paths for Images
    image_path1 = os.path.join(os.getcwd(), "resources", "images", "LIRShuttleLogoImage.png")
    image_path2 = os.path.join(os.getcwd(), "resources", "images", "LIRShuttleLogoImage.png")

    # Attach Image 1
    try:
        with open(image_path1, 'rb') as img_file1:
            img1 = MIMEImage(img_file1.read())
            img1.add_header('Content-ID', '<image1>')  # Matches 'cid:image1' in HTML
            msg.attach(img1)
    except FileNotFoundError:
        print(f"Error: Image not found at {image_path1}")
    except Exception as e:
        print(f"An error occurred while attaching image1: {e}")

    # Attach Image 2
    try:
        with open(image_path2, 'rb') as img_file2:
            img2 = MIMEImage(img_file2.read())
            img2.add_header('Content-ID', '<image2>')  # Matches 'cid:image2' in HTML
            msg.attach(img2)
    except FileNotFoundError:
        print(f"Error: Image not found at {image_path2}")
    except Exception as e:
        print(f"An error occurred while attaching image2: {e}")

    try:
        # Set up the SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Enable TLS (Transport Layer Security)
        
        # Log in to your email account
        server.login(login, password)

        # Send the email
        server.sendmail(sender_email, receiver_email, msg.as_string())

        print("Email sent successfully!")
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        server.quit()
