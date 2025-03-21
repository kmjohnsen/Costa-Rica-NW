# auth.py - Flask authentication routes
from flask import Blueprint, jsonify, request, session
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
import mysql.connector
from flask_cors import CORS
from datetime import timedelta
from google.oauth2 import id_token
from google.auth.transport import requests
import os
import logging
import json

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
gunicorn_logger = logging.getLogger("gunicorn.error")

# Define a blueprint for authentication routes
authorize_bp = Blueprint('authorize', __name__)

# Initialize Bcrypt and JWTManager here instead of importing from server.py
bcrypt = Bcrypt()

# Database configuration
db_config = {
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'host': os.getenv("DB_HOST"),
    'database': os.getenv("DB_NAME"),
    'port': int(os.getenv("DB_PORT"))  # Convert port to integer
}

# Store your CLIENT_ID and CLIENT_SECRET securely
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")  
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")  

# Token verification endpoint
@authorize_bp.route('/api/auth/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    print("LOOOOOOOOOK HERE || in verify_token step")
    try:
        auth_header = request.headers.get("Authorization")
        print(f"Authorization header received: {auth_header}")

        if not auth_header or not auth_header.startswith("Bearer "):
            print("Missing or malformed Authorization header")
            return jsonify({"error": "Missing or malformed Authorization header"}), 400

        current_email = get_jwt_identity()  # ✅ Extract email as a string
        current_role = get_jwt()["role"]  # ✅ Extract role from claims

        if not isinstance(current_email, str):
            print(f"Invalid JWT Payload: {current_email}")  # ✅ Debugging
            return jsonify({"error": "Invalid JWT format"}), 422

        current_user = {"email": current_email, "role": current_role}

        return jsonify(logged_in_as=current_user), 200

    except Exception as e:
        print(f"JWT verification error: {e}")
        return jsonify({'error': 'Token verification failed', 'message': str(e)}), 500

# Google Authorization
@authorize_bp.route('/api/auth/google', methods=['POST'])
def google_auth():
    token = request.json.get('idToken')
    print(f"Received token (first 50 chars): {token[:50]}...")

    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        print("Connected to MySQL successfully.")

        # ✅ Verify the Google token safely
        idinfo = None
        try:
            idinfo = id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)
            print(f"Google Token Verified: {idinfo}")
        except ValueError as e:
            print(f"Google token verification failed: {e}")
            return jsonify({'error': 'Invalid Google token', 'message': str(e)}), 401
        
        if not idinfo:
            return jsonify({'error': 'Google token verification failed'}), 401

        email = idinfo.get('email')
        print(f"Extracted email from Google token: {email}")

        # ✅ Check if the user exists in the database
        cursor.execute("SELECT * FROM booking_database.user_information WHERE Email = %s AND (role = 'dev' OR role = 'admin')", (email,))
        user = cursor.fetchone()

        if user:
            print(f"User found in database: {user}")
            access_token = create_access_token(
                identity=user['Email'],  # ✅ Store only the email as a string
                additional_claims={'role': user['role']}  # ✅ Store role separately
            )
            return jsonify({'status': 'success', 'access_token': access_token, 'user': {'id': user['userID'], 'email': user['Email'], 'name': user['FirstName']}}), 200
        else:
            print(f"User {email} not found or does not have admin/dev role.")
            return jsonify({'error': 'User not found'}), 404

    except mysql.connector.Error as db_err:
        print(f"Database error: {db_err}")
        return jsonify({'error': 'Database error', 'message': str(db_err)}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'Unexpected error', 'message': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Google Authorization
# @authorize_bp.route('/api/auth/google/callback', methods=['POST'])
# def google_callback():
#     # Get the token from the request parameters (Google redirects back to this endpoint)
#     token = request.json.get('id_token')

#     conn = None
#     cursor = None
#     try:
#         conn = mysql.connector.connect(**db_config)
#         cursor = conn.cursor(dictionary=True)

#         # Verify the token
#         idinfo = id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)

#         # Extract user information from the verified token
#         user_email = idinfo['email']
#         user_name = idinfo['name']
#         user_id = idinfo['sub']  # Google user ID

#         # Check if the user already exists in the database
#         cursor.execute("SELECT * FROM user_information WHERE (Email = %s && (role = 'dev' || role = 'admin'))", (user_email,))
#         user = cursor.fetchone()

#         if user:
#             # User exists, create a session for them
#             session['user_id'] = user['id']  # Store user ID in session
#             return jsonify({'status': 'success', 'user_id': user['userID'], 'email': user['Email'], 'name': user['FirstName']}), 200

#     except ValueError:
#         return jsonify({'error': 'Invalid token'}), 401


# Register route
@authorize_bp.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    firstname = data.get('firstName')
    lastname = data.get('lastName')
    phonenumber = data.get('phoneNumber')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        query = """
            INSERT INTO booking_database.user_information (Email, FirstName, LastName, UserPassword, PhoneNumber) 
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                UserPassword = VALUES(UserPassword), 
                FirstName = VALUES(FirstName), 
                LastName = VALUES(LastName), 
                PhoneNumber = VALUES(PhoneNumber);
        """
        cursor.execute(query, (email, firstname, lastname, hashed_password, phonenumber))
        conn.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        return jsonify({'error': f'MySQL Error: {err}'}), 500
    except Exception as e:
        print(f"Unexpected Error: {e}")
        return jsonify({'error': f'Unexpected Error: {e}'}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

# Login route
@authorize_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM booking_database.user_information WHERE Email = %s", (email,))
        user = cursor.fetchone()

        if user and bcrypt.check_password_hash(user['UserPassword'], password):
            access_token = create_access_token(identity={'email': user['Email']})
            return jsonify({'access_token': access_token}), 200
        else:
            return jsonify({'error': 'Invalid email or password'}), 401
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        return jsonify({'error': f'MySQL Error: {err}'}), 500
    except Exception as e:
        print(f"Unexpected Error: {e}")
        return jsonify({'error': f'Unexpected Error: {e}'}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

# Protected route
@authorize_bp.route('/api/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200
