# server.py
from flask import Flask, jsonify, request, send_from_directory
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
from api import locations_bp, prices_bp, authorize_bp, bookings_bp, users_bp, verification_bp

# Initialize the Flask app
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
app.config['JWT_SECRET_KEY'] = '76438521'  # Change this key for production

# Initialize extensions
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
# ✅ Allow CORS for both localhost (dev) and EC2 (prod)
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Local React frontend
    "http://3.15.17.253",      # Replace with your EC2 public IP
    "https://costaricanorthwest.com"   # Replace with your actual domain if using one
]

CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})
# CORS(app)

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

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('../frontend/resources', 'favicon.ico', mimetype='image/x-icon')

# Set debug mode based on environment
debug_mode = os.getenv("FLASK_ENV", "development") != "production"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=debug_mode)