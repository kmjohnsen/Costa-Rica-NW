# server.py
from flask import Flask, jsonify, request, send_from_directory
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
from api import locations_bp, prices_bp, authorize_bp, bookings_bp, users_bp, verification_bp
from dotenv import load_dotenv
from datetime import timedelta
from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError
from werkzeug.exceptions import HTTPException

load_dotenv()

# Set environment mode
RUNNING_LOCAL = os.getenv("RUNNING_LOCAL", "True").lower() == "true"

# Define correct static folder based on environment
if RUNNING_LOCAL:
    STATIC_FOLDER = '../frontend/build'  # Local React build folder
else:
    STATIC_FOLDER = '/var/www/html'  # EC2 production folder

# Initialize the Flask app
app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='/')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)  # Adjust as needed
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_NAME"] = "Authorization"
app.config["JWT_HEADER_TYPE"] = "Bearer"
app.config["DEBUG"] = RUNNING_LOCAL

@app.errorhandler(NoAuthorizationError)
def handle_auth_error(e):
    print(f"JWT Error: {e}")  # ✅ Debugging JWT errors
    return jsonify({'error': 'Unauthorized, missing, or invalid token'}), 401

@app.errorhandler(InvalidHeaderError)
def handle_invalid_header(e):
    print(f"Invalid JWT Header: {e}")  # ✅ Debugging invalid headers
    return jsonify({'error': 'Invalid JWT header format'}), 401

@app.errorhandler(HTTPException)
def handle_exception(e):
    print(f"HTTP Exception: {e}")  # ✅ Debugging general HTTP errors
    return jsonify({'error': str(e)}), e.code

# Initialize extensions
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
# ✅ Allow CORS for both localhost (dev) and EC2 (prod)

if RUNNING_LOCAL:
    ALLOWED_ORIGINS = ([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000"
    ])
else:
    ALLOWED_ORIGINS = ["https://costaricanorthwest.com"]
    
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS, "supports_credentials": True}})

# Ensure the response includes Cross-Origin headers
@app.after_request
def add_security_headers(response):
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://apis.google.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self' https://costaricanorthwest.com http://localhost:5000 http://127.0.0.1:5000; "
        "http://localhost:3000 http://127.0.0.1:3000; "
    )
    response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
    return response

# Register blueprints directly
app.register_blueprint(locations_bp)
app.register_blueprint(prices_bp)
app.register_blueprint(authorize_bp)
app.register_blueprint(bookings_bp)
app.register_blueprint(users_bp)
app.register_blueprint(verification_bp)

# Serve the React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api'):
        return jsonify({"error": "Invalid API route"}), 404
    elif path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        # Serve static files (CSS, JS, images) if they exist
        return send_from_directory(app.static_folder, path)
    else:
        # Serve the React app's index.html for all other routes
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('../frontend/resources', 'favicon.ico', mimetype='image/x-icon')

debug_mode = True if RUNNING_LOCAL else False

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=RUNNING_LOCAL)