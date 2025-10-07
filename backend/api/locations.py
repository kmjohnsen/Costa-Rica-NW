# Reviewed

from flask import Flask, Blueprint, jsonify, request
from api.SQL_access_functions import fetch_all_locations_long_short, fetch_all_distinct_start_city, fetch_all_distinct_end_city, fetch_end_city_from_start_city
from api.db import get_db_connection
from api.utils import serialize_records

app = Flask(__name__)

# Define a blueprint for locations
locations_bp = Blueprint('locations', __name__)


# Route to get the list of short name locations
@locations_bp.route('/api/locations', methods=['GET'])
def get_all_locations():
    try:
        conn, cursor = get_db_connection(dictionary=True)
        locations = fetch_all_locations_long_short(cursor)
        destinations = {
        "LIR Airport": {"short": "LIR Airport", "long": "LIR - Liberia Airport"}
        }

        # Properly update the destinations dictionary
        destinations.update({
            row[0]: {"short": row[1], "long": row[0]} for row in locations
        })

        return jsonify(serialize_records(destinations)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
        

# Route to get the list of pickup locations
@locations_bp.route('/api/pickup_locations', methods=['GET'])
def get_pickup_locations():
    try:
        conn, cursor = get_db_connection(dictionary=True)
        bookings = fetch_all_distinct_start_city(cursor)
        location_list = [location[0] for location in bookings]
        return jsonify(serialize_records(location_list)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# Route to get the list of dropoff locations - ALL locations
@locations_bp.route('/api/all_dropoff_locations', methods=['GET'])
def get_all_dropoff_locations():
    try:
        conn, cursor = get_db_connection(dictionary=True)
        bookings = fetch_all_distinct_end_city(cursor)
        location_list = [location[0] for location in bookings]
        return jsonify(serialize_records(location_list)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Route to get the list of dropoff locations, based on pickup location
@locations_bp.route('/api/dropoff_locations', methods=['GET'])
def get_dropoff_locations():
    pickup = request.args.get('pickup')  # Get the 'pickup' query parameter
    if not pickup:
        return jsonify({'error': 'Pickup location is required'}), 400

    try:
        conn, cursor = get_db_connection(dictionary=True)
        locations = fetch_end_city_from_start_city(cursor, pickup)
        dropoff_list = [location[0] for location in locations]
        return jsonify(serialize_records(dropoff_list)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()