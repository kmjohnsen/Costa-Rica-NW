from flask import Flask, Blueprint, request, jsonify
from twilio.rest import Client
import phonenumbers
import mysql.connector
import os
from dotenv import load_dotenv


app = Flask(__name__)

# Define a blueprint for locations
verification_bp = Blueprint('verification', __name__)

load_dotenv()

# Database configuration using os.getenv()
db_config = {
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'host': os.getenv("DB_HOST"),
    'database': os.getenv("DB_NAME"),
    'port': int(os.getenv("DB_PORT"))  # Convert port to integer
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

if __name__ == '__main__':
    app.run(debug=True)
