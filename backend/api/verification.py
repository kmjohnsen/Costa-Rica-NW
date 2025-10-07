from flask import Flask, Blueprint, request, jsonify
from twilio.rest import Client
import phonenumbers
import os
from api.db import get_db_connection
from api.SQL_access_functions import insert_valid_phone_number
from utils import serialize_records

app = Flask(__name__)

# Define a blueprint for locations
verification_bp = Blueprint('verification', __name__)

# List of approved country codes
approved_country_codes = ['+1', '+44', '+31', '+33', '+34', '+45', '+46', '+47', '+61', '+64', '+49', '+41', '+43', '+27', '+351', '+353', '+354']  
# Example codes for USA/Canada, UK, Netherlands, France, Spain, Denmark, Sweden, Norway, Australia, New Zealand Germany, Switzerland, Austria, South Africa, Portugal, Ireland, Iceland

# Twilio credentials
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")   
twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER")
verify_sid = os.getenv("TWILIO_VERIFY_SID")


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

        verification_check = client.verify.v2.services(verify_sid).verifications.create(to=phone_number, channel="sms")

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
            phone_number = '+' + phone_number

        # Verify the code
        client = Client(account_sid, auth_token)

        verification_check = client.verify.v2.services(verify_sid).verification_checks.create(
            to=phone_number,
            code=code
        )

        print("post verif check")

        if verification_check.status == "approved":
            try:
                conn, cursor = get_db_connection(dictionary=True)
                bookings = insert_valid_phone_number(cursor)
                return jsonify(serialize_records(bookings)), 200
            except Exception as e:
                return jsonify({'error': str(e)}), 500
            finally:
                cursor.close()
                conn.close()
        else:
            return jsonify({'success': False, 'message': 'Invalid code or verification failed'}), 400

    except Exception as e:
        return jsonify({'error': f'Failed to verify code: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
