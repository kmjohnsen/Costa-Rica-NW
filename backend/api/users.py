from flask import Flask, Blueprint, jsonify, request
import mysql.connector
from datetime import datetime, timedelta, date

app = Flask(__name__)

# Define the path to your SQLite database file
DATABASE = 'C:\ProgramData\MySQL\MySQL Server 8.0\Data\booking_database'

# Define a blueprint for locations
users_bp = Blueprint('users', __name__)

# Database configuration
db_config = {
    'user': 'root',
    'password': '76438521',
    'host': 'localhost',
    'database': 'booking_database',
    'port': 3306
}

# Endpoint to get all bookings in date order
@users_bp.route('/api/users/modify', methods=['GET'])
def get_all_users():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    print("made it here")
    query =("""
            SELECT userID, FirstName, LastName, Email, PhoneNumber, role FROM user_information 
            ORDER BY 
              CASE role
                WHEN 'Admin' THEN 1
                WHEN 'Dev' THEN 2
                WHEN 'Driver' THEN 3
                ELSE 4
              END;
            """)
    cursor.execute(query)  
    users = cursor.fetchall()

    # Debug: Print all fetched data
    print("Fetched Bookings:", users)  # Helps verify what data is being retrieved

    # Return the serialized bookings as JSON
    return jsonify(users), 200

    cursor.close()
    conn.close()
    return jsonify(bookings)

# Register route
@users_bp.route('/api/users/save', methods=['PUT'])
def save_modified_user():
        # Get the updated fields from the request body
    updated_fields = request.json

    # Check if there are any fields to update
    if not updated_fields:
        return jsonify({'error': 'No fields to update'}), 400

    # Start constructing the SQL query
    query = "UPDATE booking_database.user_information SET "
    updates = []
    values = []

    # Dynamically construct the query based on updated fields
    for field, value in updated_fields.items():
        if field == 'userID':
            userIDnum = value
        else:
          updates.append(f"{field} = %s")
          values.append(value)

    print(f"updates: {updates}")
    print(f"values: {values}")

    # Add the WHERE clause to target the specific booking
    query += ", ".join(updates) + " WHERE userID = %s"
    values.append(userIDnum)

    print(f"Modify query: {query}")
    print(f"Values for modify query: {values}")

    # Execute the update query
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'User updated successfully'}), 200
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        return jsonify({'error': f'MySQL Error: {err}'}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()
