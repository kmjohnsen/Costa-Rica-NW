from flask import Flask, Blueprint, request, jsonify
from twilio.rest import Client
import phonenumbers
import random
import mysql.connector
import os

app = Flask(__name__)

# Define a blueprint for locations
verification_bp = Blueprint('verification', __name__)

# Define the path to your SQLite database file
DATABASE = 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data\\booking_database'

# Database configuration
db_config = {
    'user': 'root',
    'password': '76438521',
    'host': 'localhost',
    'database': 'booking_database',
    'port': 3306
}
# List of approved country codes
approved_country_codes = ['+1', '+44', '+31', '+33', '+34', '+45', '+46', '+47', '+61', '+64', '+49', '+41', '+43', '+27', '+351', '+353', '+354']  
# Example codes for USA/Canada, UK, Netherlands, France, Spain, Denmark, Sweden, Norway, Australia, New Zealand Germany, Switzerland, Austria, South Africa, Portugal, Ireland, Iceland

# Twilio credentials
account_sid = 'AC946ce976ec67e98370b84713517f227a'  # Replace with your Twilio Account SID
auth_token = '31003514782bbb707c50fca8e5a94705'    # Replace with your Twilio Auth Token
twilio_phone_number = '+15673161644'  # Replace with your Twilio phone number
verify_sid = 'VA33d1b6066570fb193caaaf746379ea30'

@verification_bp.route('/api/valid-phone', methods=['GET'])
def check_country_code():
    try:
        phone_number = request.args.get('phone')
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400
        

        # Ensure the phone number has a minimum length
        if len(phone_number) < 3:
            return jsonify({'error': 'Phone number is too short'}), 400
        
        print(f"Received phone number: {phone_number}")

        phone_number = '+' + phone_number
        parsed_number = phonenumbers.parse(phone_number)

        country_code = parsed_number.country_code
        country_code_with_plus = '+' + str(country_code)
        valid = country_code_with_plus in approved_country_codes

        return jsonify({'valid': valid})

    except phonenumbers.NumberParseException as e:
        return jsonify({'error': f'Invalid phone number: {str(e)}'}), 400

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@verification_bp.route('/api/send-verification', methods=['POST'])
def send_verification():
    # Get the phone number from the POST request
    data = request.get_json()
    print(f"phone {data}")
    phone_number = "+" + data.get('telephone')
    if not phone_number:
        return jsonify({'error': 'Phone number is required'}), 400

    print("here")
    try:
        client = Client(account_sid, auth_token)

        verification_check = client.verify.v2.services(verify_sid).verifications.create(to={phone_number}, channel="sms")

        print(f"verif status: {verification_check.status}")

        # Return a success response
        return jsonify({'success': True, 'message_sid': verification_check.status}), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@verification_bp.route('/api/verify-code', methods=['POST'])
def verify_code():
    try:
        data = request.get_json()
        phone_number = data.get('telephone')
        code = data.get('code')

        if not phone_number or not code:
            return jsonify({'error': 'Phone number and code are required'}), 400

        # Append '+' if missing
        if not phone_number.startswith('+'):
            phone_number_plus = '+' + phone_number
        print(f"phone number plus: {phone_number_plus}")

        # Verify the code
        client = Client(account_sid, auth_token)

        verification_check = client.verify.v2.services(verify_sid).verification_checks.create(
            to=phone_number_plus,
            code=code
        )
        print("post verif check")

        if verification_check.status == "approved":
            print("verification check: approved")
            query = "INSERT INTO booking_database.valid_phone_numbers (phone_number) VALUES (%s);"
            try:
            ## Database operation
                conn = mysql.connector.connect(**db_config)
                cursor = conn.cursor()

                # Insert confirmation code into the database
                cursor.execute(query, (phone_number,))
                print(f"made it here {query}, {phone_number}")
                conn.commit()
                
            except Exception as e:
                print(f"Error: {str(e)}")
                return jsonify({'error': str(e)}), 500
            finally:
                cursor.close()
                conn.close()
                return jsonify({'success': True, 'message': 'Phone number verified successfully'}), 200
        else:
            return jsonify({'success': False, 'message': 'Invalid code or verification failed'}), 400

    except Exception as e:
        return jsonify({'error': f'Failed to verify code: {str(e)}'}), 500



# @verification_bp.route('/api/generate-code-and-text', methods=['POST'])
# def create_confirmation_code_and_text():
#     # Create confirmation code (6-digit)
#     confirmation_code = random.randint(100000, 999999)

#     # Delete confirmation codes that are older than 1 day
#     delete_query = """
#         DELETE FROM booking_database.confirmation_codes
#         WHERE created_at < NOW() - INTERVAL 1 DAY;
#     """

#     # Add confirmation code to SQL table
#     query = "INSERT INTO booking_database.confirmation_codes (confirmation_code) VALUES (%s);"
    
#     # Get the phone number from the POST request
#     data = request.get_json()
#     print(f"phone {data}")
#     phone_number = "+" + data.get('telephone')
#     if not phone_number:
#         return jsonify({'error': 'Phone number is required'}), 400

#     # Twilio credentials
#     account_sid = 'AC946ce976ec67e98370b84713517f227a'  # Replace with your Twilio Account SID
#     auth_token = '31003514782bbb707c50fca8e5a94705'    # Replace with your Twilio Auth Token
#     twilio_phone_number = '+15673161644'  # Replace with your Twilio phone number
#     verify_sid = 'VA33d1b6066570fb193caaaf746379ea30'
#     print("here")
#     try:
#         # Send SMS via Twilio

#         # Find your Account SID and Auth Token at twilio.com/console
#         # and set the environment variables. See http://twil.io/secure
#         client = Client(account_sid, auth_token)

#         verification = client.verify.v2.services(verify_sid).verifications.create(to={phone_number}, channel="sms")

#         print(verification.sid)

#         client = Client(account_sid, auth_token)
#         message = client.messages.create(
#             body=f"Your confirmation code from costaricanorthwest.com is: {confirmation_code}",
#             from_=twilio_phone_number,
#             to=phone_number
#         )
#         print(f"Message sent successfully. SID: {message.sid}")

#         # Database operation
#         conn = mysql.connector.connect(**db_config)
#         cursor = conn.cursor()

#         # Insert confirmation code into the database
#         query = "INSERT INTO booking_database.confirmation_codes (confirmation_code) VALUES (%s);"
#         cursor.execute(query, (confirmation_code,))
#         conn.commit()

#         cursor.close()
#         conn.close()

#         # Return a success response
#         return jsonify({'success': True, 'message_sid': verification.sid}), 200

#     except Exception as e:
#         print(f"Error: {str(e)}")
#         return jsonify({'error': str(e)}), 500
#     finally:
#         cursor.close()
#         conn.close()


if __name__ == '__main__':
    app.run(debug=True)
