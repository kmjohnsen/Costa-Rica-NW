# auth.py - Flask authentication
import os
import logging
import mysql.connector
from functools import wraps
from flask import Blueprint, jsonify, request
from contextlib import contextmanager
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity,
    get_jwt, verify_jwt_in_request
)
from google.oauth2 import id_token
from google.auth.transport import requests

# Logging setup
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("auth")

# Blueprint
authorize_bp = Blueprint("authorize", __name__)
bcrypt = Bcrypt()

# Environment config
db_config = {
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'host': os.getenv("DB_HOST"),
    'database': os.getenv("DB_NAME"),
    'port': int(os.getenv("DB_PORT"))  # Convert port to integer
}

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")  
WHITELISTED_EMAILS = [e.strip().lower() for e in os.getenve("WHITELISTED_EMAILS", "").split(",") if e.strip()]

TABLE_USERS = "booking_database.user_information"

@contextmanager
def get_db_cursor(dictionary=False):
    """Context manager for MySQL connections."""
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield conn, cursor
    finally:
        cursor.close()
        conn.close()

def error_response(message, status=400, error="Bad Request"):
    """Standardized error JSON response."""
    return jsonify({"error": error, "message": message}), status


def generate_access_token(email, role):
    """Generates a signed JWT access token."""
    return create_access_token(identity=email, additional_claims={"role": role})


# Admin-only access decorator
def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        email = get_jwt_identity().lower()

        if email not in WHITELISTED_EMAILS or claims.get("role") not in ["admin", "dev"]:
            logger.warning(f"Unauthorized access attempt by {email}")
            return error_response("Access denied", 403, "Forbidden")

        return fn(*args, **kwargs)
    return wrapper


@authorize_bp.route('/api/auth/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        email = get_jwt_identity()
        role = get_jwt().get("role")
        if not isinstance(email, str):
            return error_response("Invalid token format", 422)

        return jsonify({"logged_in_as": {"email": email, "role": role}}), 200

    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return error_response(str(e), 500, "Token Verification Failed")


def _verify_google_token(token):
    """Verifies Google OAuth2 token and returns user info."""
    try:
        return id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)
    except ValueError as e:
        logger.warning(f"Invalid Google token: {e}")
        return None


def _get_user_by_email(email):
    """Retrieves a user record by email."""
    with get_db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            f"SELECT * FROM {TABLE_USERS} WHERE Email = %s AND role IN ('dev','admin')", (email,)
        )
        return cursor.fetchone()

# Google Authorization
@authorize_bp.route('/api/auth/google', methods=['POST'])
def google_auth():
    token = request.json.get("idToken")
    if not token:
        return error_response("Missing Google ID token")

    idinfo = _verify_google_token(token)
    if not idinfo:
        return error_response("Invalid Google token", 401)

    email = idinfo.get("email")
    if not email:
        return error_response("Email not found in token", 400)

    user = _get_user_by_email(email)
    if not user:
        return error_response("User not found or unauthorized", 403, "Forbidden")

    access_token = generate_access_token(user["Email"], user["role"])
    logger.info(f"Google login success: {email}")

    return jsonify({
        "status": "success",
        "access_token": access_token,
        "user": {"id": user["userID"], "email": user["Email"], "name": user["FirstName"]},
    }), 200


# Protected route
@authorize_bp.route('/api/protected', methods=['GET'])
@admin_required
def protected():
    email = get_jwt_identity()
    return jsonify({"logged_in_as": email}), 200
