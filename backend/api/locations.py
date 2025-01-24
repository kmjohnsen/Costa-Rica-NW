from flask import Flask, Blueprint, jsonify, request
import mysql.connector

app = Flask(__name__)

# Define the path to your SQLite database file
DATABASE = 'C:\ProgramData\MySQL\MySQL Server 8.0\Data\booking_database'

# Define a blueprint for locations
locations_bp = Blueprint('locations', __name__)

# Database connection configuration
db_config = {
    'user': 'root',
    'password': '76438521',
    'host': 'localhost',
    'database': 'booking_database',
    'port': 3306
}

# Route to get the list of pickup locations
@locations_bp.route('/api/locations', methods=['GET'])
def get_all_locations():
    try:
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Execute the query to get locations
        cursor.execute("""SELECT DISTINCT endcity AS long_name, endcity_shortname AS short_name
                        FROM booking_database.route_information;""")
        locations = cursor.fetchall()
        # print(f"locations {locations}")

        # Create a dictionary of destinations with short and long names
        # Start with start cities (LIR only so far)
        destinations = {
            "LIR Airport": {"short": "LIR Airport", "long": "LIR - Liberia Airport"}
        }
        # print(f"destinations 1: {destinations}")

        # Properly update the destinations dictionary
        destinations.update({
            row[0]: {"short": row[1], "long": row[0]} for row in locations
        })
        # print(f"destinations 2: {destinations}")

        return jsonify(destinations)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Route to get the list of pickup locations
@locations_bp.route('/api/pickup_locations', methods=['GET'])
def get_pickup_locations():
    try:
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Execute the query to get locations
        cursor.execute("SELECT DISTINCT startcity FROM booking_database.route_information")
        locations = cursor.fetchall()

        # Convert the result to a list of strings
        location_list = [location[0] for location in locations]
        print("locations: {location_list}")

        return jsonify(location_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Route to get the list of dropoff locations - ALL locations
@locations_bp.route('/api/all_dropoff_locations', methods=['GET'])
def get_all_dropoff_locations():
    try:
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Execute the query to get locations
        cursor.execute("SELECT DISTINCT endcity FROM booking_database.route_information")
        locations = cursor.fetchall()

        # Convert the result to a list of strings
        location_list = [location[0] for location in locations]

        return jsonify(location_list)
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
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Execute the query to get dropoff locations based on the selected pickup location
        query = "SELECT DISTINCT endcity FROM booking_database.route_information WHERE startcity = %s"
        cursor.execute(query, (pickup,))
        locations = cursor.fetchall()

        # Convert the result to a list of strings
        dropoff_list = [location[0] for location in locations]

        return jsonify(dropoff_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Route to get the list of ALL dropoff locations, regardless of start location
@locations_bp.route('/api/dropoff_locations_all', methods=['GET'])
def get_dropoff_locations_all():
    # Connect to the database
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Execute the query to get dropoff locations based on the selected pickup location
        query = "SELECT DISTINCT endcity FROM booking_database.route_information"
        cursor.execute(query)
        locations = cursor.fetchall()

        # Convert the result to a list of strings
        dropoff_list = [location[0] for location in locations]

        return jsonify(dropoff_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()