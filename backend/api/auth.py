# auth.py - Flask authentication routes
from flask import Blueprint, jsonify, request, session
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import mysql.connector
from flask_cors import CORS
from datetime import timedelta
from google.oauth2 import id_token
from google.auth.transport import requests
import os
import logging

logging.basicConfig(level=logging.DEBUG)
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
CLIENT_ID = "1003369992304-lj9062hp21arbnnflisq30rlkes1ce9o.apps.googleusercontent.com"  # Replace with your actual client ID
CLIENT_SECRET = "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"  # Keep this secret on the server

# Token verification endpoint
@authorize_bp.route('/api/auth/verify-token', methods=['GET'])
@jwt_required()  # This decorator ensures that a valid token is required
def verify_token():
    auth_header = request.headers.get("Authorization")
    logging.debug(f"Authorization header: {auth_header}")
    current_user = get_jwt_identity()
    logging.debug(f"Decoded JWT identity: {current_user}")
    return jsonify(logged_in_as=current_user), 200

# Google Authorization
@authorize_bp.route('/api/auth/google', methods=['POST'])
def google_auth():
    token = request.json.get('idToken')
    logging.debug(f"Full Received Token: {token}")
    logging.debug(f"Token verified successfully. idinfo: {idinfo}")

    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Verify the token
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)
        logging.debug(f"Token verified successfully. idinfo: {idinfo}")
        # user_id = idinfo['sub']
        email = idinfo['email']
        logging.debug(f"Extracted email: {email}")
        
        # Here, you can check if the user exists in your database
        cursor.execute("SELECT * FROM booking_database.user_information WHERE (Email = %s && (role = 'dev' || role = 'admin'))", (email,))
        user = cursor.fetchone()
        print(f"user data: {user}")
        logging.debug(f"User data from database: {user}")

        if user:
            # User exists, create and return a JWT token
            access_token = create_access_token(identity={'email': user['Email'], 'role': user['role']}, expires_delta=timedelta(days=30))
            logging.info("Successfully created JWT for user.")
            return jsonify({'status': 'success', 'access_token': access_token, 'user': {'id': user['userID'], 'email': user['Email'], 'name': user['FirstName']}}), 200

        else:
            logging.error("User not found in database.")
            return jsonify({'error': 'User not found'}), 404

    except ValueError as e:
        logging.exception("Invalid token exception occurred.")
        return jsonify({'error': 'Invalid token', 'message': str(e)}), 401
    except Exception as e:
        logging.exception("Unexpected error in google_auth.")
        return jsonify({'error': 'Unexpected error', 'message': str(e)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
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
