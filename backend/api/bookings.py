from flask import Flask, Blueprint, jsonify, request
import mysql.connector
from datetime import datetime, timedelta, date
from decimal import Decimal
from api.emailconfirmation import send_email
# import pytz
from api.prices import calculate_route_prices
import random
import string
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
# from flask_limiter.storage import MySQLStorage
# from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
) 

# Database configuration
db_config = {
    'user': 'root',
    'password': '76438521',
    'host': 'localhost',
    'database': 'booking_database',
    'port': 3306
}

# Test route with a custom rate limit
@app.route("/api/test", methods=["GET"])
@limiter.limit("5/minute")  # Custom rate limit
def test_route():
    return jsonify({"message": "This route is rate-limited to 5 requests per minute!"})


# Define the path to your MySQL database file
DATABASE = 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data\\booking_database'

# Define a blueprint for locations
bookings_bp = Blueprint('bookings', __name__)


# Helper function to convert timedelta and handle serialization
def convert_to_serializable(obj):
    if isinstance(obj, timedelta):
                # Calculate hours and minutes from timedelta
        total_seconds = int(obj.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes = remainder // 60
        # Format as HH:MM
        return f'{hours:02}:{minutes:02}'
        #return obj.strftime('%H:%M')  # Converts timedelta to a string representation
    elif isinstance(obj, (datetime, date)):
        return obj.strftime('%Y-%m-%d')  # Converts datetime or date to 'YYYY-MM-DD' format
    elif isinstance(obj, Decimal):
        return float(obj)  # Convert Decimal to float for JSON serialization
    return obj  # Returns other types unchanged

# Endpoint to get all bookings in date order
@bookings_bp.route('/api/bookings', methods=['GET'])
@limiter.limit("10/minute")
def get_all_bookings():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        query =("""
                SELECT b.bookingID, b.userID, b.routeID, b.startcity, b.endcity, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location, b.manualbookinginfo
                FROM booking_information b
                INNER JOIN 
                    user_information u ON b.userID = u.userID  
                ORDER BY b.booking_date ASC;""")
        print(f"query: {query}")
        cursor.execute(query)  
        bookings = cursor.fetchall()

        # Debug: Print all fetched data
        # print("Fetched Bookings:", bookings)  # Helps verify what data is being retrieved

        # Convert any timedelta objects to a serializable format
        serialized_bookings = []
        for booking in bookings:
            # Create a new dictionary with serializable values
            serialized_booking = {key: convert_to_serializable(value) for key, value in booking.items()}
            serialized_bookings.append(serialized_booking)

        # Return the serialized bookings as JSON
        cursor.close()
        conn.close()
        return jsonify(serialized_bookings), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/api/get_completed_bookings', methods=['GET'])
def get_completed_bookings():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        query =("""
                SELECT b.bookingID, b.userID, b.routeID, b.startcity, b.endcity, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location, b.manualbookinginfo
                FROM completed_bookings b
                INNER JOIN 
                    user_information u ON b.userID = u.userID  
                ORDER BY b.booking_date ASC;""")
        print(f"query: {query}")
        cursor.execute(query)  
        bookings = cursor.fetchall()

        # Debug: Print all fetched data
        # print("Fetched Bookings:", bookings)  # Helps verify what data is being retrieved

        # Convert any timedelta objects to a serializable format
        serialized_bookings = []
        for booking in bookings:
            # Create a new dictionary with serializable values
            serialized_booking = {key: convert_to_serializable(value) for key, value in booking.items()}
            serialized_bookings.append(serialized_booking)

        # Return the serialized bookings as JSON
        cursor.close()
        conn.close()
        return jsonify(serialized_bookings), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint to get bookings for a specific date
@bookings_bp.route('/api/bookings/day', methods=['GET'])
def get_bookings_for_day():
    date = request.args.get('date')
    # date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))

    if not date:
        return jsonify({'error': 'Date is required'}), 400

    print(f"Received date: {date}")

    try:
        conn, cursor = get_database_connection_dictionary()
        query = ("SELECT * FROM booking_information RIGHT JOIN route_information ON booking_information.routeID = route_information.routeID WHERE DATE(booking_date) = %s")
        print(f"query: {query} date: {date}")
        cursor.execute(query, (date,))
        try:
            bookings = cursor.fetchall()
        except Exception as f:
            return jsonify({'error': 'No bookings found for this date'}), 400

        # print(f"bookings: {bookings}")

        # Serialize the bookings for JSON response (converts time, decimal object to json readable)
        serialized_bookings = [
            {key: convert_to_serializable(value) for key, value in booking.items()}
            for booking in bookings
        ]

        cursor.close()
        conn.close()
        return jsonify(serialized_bookings), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint to get a monthly summary
@bookings_bp.route('/api/bookings/monthly-summary', methods=['GET'])
def get_monthly_summary():
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    conn, cursor = get_database_connection_dictionary()
    cursor.execute("""
        SELECT COUNT(*) as trips, SUM(routecost) as money_collected
        FROM booking_information
        WHERE booking_date LIKE %s
    """, (f"{month}%",))
    summary = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(summary)

# Endpoint to get monthly summary for each driver
@bookings_bp.route('/api/drivers/monthly-summary', methods=['GET'])
def get_driver_monthly_summary():
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    conn, cursor = get_database_connection_dictionary()
    cursor.execute("""
        SELECT driver_name, COUNT(*) as trips, SUM(routecost) as money_collected
        FROM booking_information
        WHERE booking_date LIKE %s
        GROUP BY driver
    """, (f"{month}%",))
    summaries = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(summaries)

# Endpoint to modify a booking
@bookings_bp.route('/api/bookings/modify', methods=['PUT'])
@limiter.limit("10/minute")
def modify_booking():
        # Get the updated fields from the request body
    data = request.json
    print(f"data: {request.json}")
    updated_fields = data.get('updatedFields')
    is_pending = data.get('isPending')
    print(f"is pending {is_pending}")
    print(f"updated fields: {updated_fields}")

    # Check if there are any fields to update
    if not updated_fields:
        return jsonify({'error': 'No fields to update'}), 400

    # Start constructing the SQL query
    if is_pending == True:
        booking_query = "UPDATE booking_database.temp_booking SET " # Update pending booking
    else:
        booking_query = "UPDATE booking_database.booking_information SET " # Update existing booking
    user_query = "UPDATE booking_database.user_information SET "
    booking_updates = []
    booking_values = []
    user_updates = []
    user_values = []

    booking_information_values = ['startcity', 'endcity', 'routeID', 'routecost', 'confirmation_number', 'booking_date', 'pickup_time', 'flight_airline', 'flight_number', 'driver', 'passengers', 'questions', 'pickup_location', 'dropoff_location', 'manualbookinginfo' ]
    user_information_values = ['FirstName', 'LastName', 'email', 'PhoneNumber']
    # Dynamically construct the query based on updated fields
    for field, value in updated_fields.items():
        if field == 'bookingID':
            bookingIDnum = value
        if field == 'userID':
            userIDnum = value
        elif field in booking_information_values:
          booking_updates.append(f"{field} = %s")
          booking_values.append(value)
        elif field in user_information_values:
          user_updates.append(f"{field} = %s")
          user_values.append(value)

    print(f"booking updates: {booking_updates}")
    print(f"booking values: {booking_values}")
    print(f"user updates: {user_updates}")
    print(f"user values: {user_values}")


    # Add the WHERE clause to target the specific booking
    if is_pending == True:
        booking_query += ", ".join(booking_updates) + " WHERE tempbookingID = %s"
    else:
        booking_query += ", ".join(booking_updates) + " WHERE bookingID = %s"
    booking_values.append(bookingIDnum)
    user_query += ", ".join(user_updates) + "WHERE userID = %s"
    user_values.append(userIDnum)

    print(f"Modify query: {booking_query}")
    print(f"Values for modify query: {booking_values}")
    print(f"Modify query: {user_query}")
    print(f"Values for modify query: {user_values}")

    # Execute the update query
    conn = None
    cursor = None
    try:
        conn, cursor = get_database_connection()
        if booking_updates:
            cursor.execute(booking_query, booking_values)
        if user_updates:
            cursor.execute(user_query, user_values)
        conn.commit()
        return jsonify({'message': 'Booking/User Info updated successfully'}), 200
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        return jsonify({'error': f'MySQL Error: {err}'}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

# Endpoint to get all bookings in date order
@bookings_bp.route('/api/pendingbookings', methods=['GET'])
def get_pending_bookings():
    try:
        conn, cursor = get_database_connection_dictionary()
        query =("""
                SELECT b.tempbookingID, b.userID, b.routeID, b.startcity, b.endcity, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location, b.manualbookinginfo, b.confirmation_number
                FROM temp_booking b
                INNER JOIN 
                    user_information u ON b.userID = u.userID  ORDER BY b.booking_date ASC;""")
        cursor.execute(query)  
        bookings = cursor.fetchall()
        # print(f"bookings: {bookings}")

        # Debug: Print all fetched data
        # print("Fetched Bookings:", bookings)  # Helps verify what data is being retrieved

        # Convert any timedelta objects to a serializable format
        serialized_bookings = []
        for booking in bookings:
            # Create a new dictionary with serializable values
            serialized_booking = {key: convert_to_serializable(value) for key, value in booking.items()}
            serialized_bookings.append(serialized_booking)

        # Return the serialized bookings as JSON
        cursor.close()
        conn.close()
        return jsonify(serialized_bookings), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint to assign/change driver
@bookings_bp.route('/api/bookings/assign-driver', methods=['POST'])
def assign_driver():
    data = request.json
    booking_id = data.get('booking_id')
    driver_name = data.get('driver_name')
    conn, cursor = get_database_connection()
    cursor.execute("UPDATE booking_information SET driver = %s WHERE booking_id = %s", (driver_name, booking_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Driver assigned/changed successfully'})

@bookings_bp.route('/api/bookings/fetch_route_number', methods=['GET'])
def get_route_number():
    pickup = request.args.get('pickup')
    dropoff = request.args.get('dropoff')
    print(f"pickup and dropoff: {pickup}, {dropoff}")

    if not pickup or not dropoff:
        return jsonify({'error': 'Pickup and dropoff locations are required'}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        routeID = fetch_route_number(pickup, dropoff, cursor)
        print(f"Fetched route id {routeID}")
        return jsonify(routeID), 200

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@bookings_bp.route('/api/submit-booking', methods=['POST'])
@limiter.limit("10/minute")
def submit_booking():
    data = request.json
    booking_data = data.get('bookingData', {})
    print(f'booking data {booking_data}')

    # Extract personal details
    first_name, last_name, email, telephone, requestType, questions, bookingsite, confirmation_code, manualRouteRequest, largeGroupPassengers = (
        booking_data.get(key) for key in ['firstName', 'lastName', 'email', 'telephone', 'requestType', 'questions', 'bookingsite', 'confirmationCode', 'manualRouteRequest', 'largeGroupPassengers']
        )
    entries = booking_data.get('entries', [])
    print(f"personal details: {first_name}, {last_name}, {email}, {telephone}, {requestType}, {questions}, {bookingsite} {manualRouteRequest} {largeGroupPassengers}")

    # Make sure requestType is valid
    if requestType == 'Auto' or requestType == 'Large Group' or requestType == 'Upcoming' or requestType == 'Invalid Phone' or requestType == 'Alternate Route':
        print("valid requestType")
    else:
        return jsonify({'error': 'Invalid Request Type'}), 400
    
    # Make sure phone number is in valid phone list
    if requestType == 'Auto':
        query = "SELECT 1 FROM booking_database.valid_phone_numbers WHERE phone_number=(%s) LIMIT 1;"
        try:
        ## Database operation
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            cursor.execute(query, (telephone,))
            result = cursor.fetchone()
            if result:
                print("Phone number exists")
            else:
                return jsonify({'error': 'Phone number is not valid'}), 400
        except Exception as e:
            print(f"Error: {str(e)}")
            return jsonify({'error': str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    # Enter data into database
    try:
        # Start database connection
        conn, cursor = get_database_connection()
        
        user_id = fetch_or_create_user(cursor, first_name, last_name, email, telephone)
        print(f"user id: {user_id}")
        
        if requestType == 'Auto':
            confirmation_code_exists = check_valid_phonenumber(cursor, telephone)
            if not confirmation_code_exists:
                return jsonify({'error': 'Invalid confirmation code. Please try again.'}), 400
        else:
            confirmation_code_exists = False
        
        print("here")
        print(f"confirmation code exists {confirmation_code_exists}")
         
        for entry in entries:
            # Extract details for each trip
            print(f"entry {entry}")
            routeID, pickup, dropoff, pickup_detailed, dropoff_detailed, date, time, airline, flight_number, passengers = (
                entry.get(key) for key in ['routenumber', 'pickup', 'dropoff', 'pickupdetailed', 'dropoffdetailed', 'date', 'time', 'airline', 'flightnumber', 'passengers']
            )
            # if entry.get('passengers') == '11+':
            #     passengers = entry.get('largeGroupPassengers') or None
            # else:
            #     passengers = entry.get('passengers') or None
            # prices_data = {'pickup': pickup, 'dropoff': dropoff, 'passengers': passengers, 'startdate': date, 'enddate': date}
            # print(f"prices data {prices_data}")
            if requestType == 'Large Group':
                passengers = largeGroupPassengers
                prices = None
                print(f"large group passengers {passengers}")
            elif requestType == 'Alternate Route':
                passengers = passengers
                prices = None
            else:
                passengers = passengers
                print(f"routeID {routeID}, passengers {passengers}, date {date}")
                day_price = calculate_route_prices(routeID, passengers, date, date)
                print(f"day price: {day_price}")
                prices = list(day_price.values())[0]
            print(f"prices: {prices}")
                                        
            routeID = fetch_route_number(pickup, dropoff, cursor)
            # print(f"route idIDID: {routeID}")
            # print(f"user id: {user_id}, route id {routeID}, prices {prices}")
            # print(f"confirmationcode {confirmationcode}, date {date}, time {time}")
            # print(f"airline {airline}, flight {flight_number}, site {bookingsite}")
            # print(f"passengers {passengers}")
            # print(f"questions {questions}, pickup {pickup_detailed}, dropoff {dropoff_detailed}")
            
            # Create data to use in booking_information insertion
            print(f"Into Booking Information: user id: {user_id}, route id {routeID}, prices {prices}, confirmationcode {confirmation_code}, date {date}, time {time}, airline {airline}, flight {flight_number}, site {bookingsite}, passengers {passengers}, questions {questions}, pickup {pickup_detailed}, dropoff {dropoff_detailed}, manual booking {manualRouteRequest}")
            dataforbooking = compile_dataforbooking(user_id, routeID, pickup, dropoff, prices, confirmation_code, date, time, airline, flight_number, bookingsite, passengers, questions, pickup_detailed, dropoff_detailed, manualRouteRequest)
            print("here")
            try:
                insert_into_booking_database(requestType, dataforbooking, cursor)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        conn.commit()       
        
        generate_email_confirmation(entries, requestType, passengers, email, first_name, last_name, telephone, confirmation_code)
        
        return jsonify({'message': 'Confirmed!'}), 200
    except Exception as e:
        print(f"exception")
        return jsonify({'error': str(e)}), 500
    finally:
        print(f"done")
        cursor.close()
        conn.close()

@bookings_bp.route('/api/approve-booking', methods=['POST'])
@limiter.limit("10/minute")
def approve_booking():
    print("approving booking")

    data = request.json
    bookingID = data.get('bookingID')
    print(f"bookingID: {bookingID}")
    bookingtable = 'temp_booking'
    bookingIDvariable = 'tempbookingID'


    dataforbooking = call_dataforbooking(bookingtable, bookingIDvariable, bookingID)
    print(f"data for booking (call data): {dataforbooking}")
    print("data for booking (call data)")

    requestType = 'Approve'

    # Enter data into database
    try:
        # Start database connection
        conn, cursor = get_database_connection()
        
        insert_into_booking_database(requestType, dataforbooking, cursor)
        conn.commit()

        # generate_email_confirmation(entries, requestType, passengers, email, confirmationcode)
        print("did the email")

        return jsonify({'message': 'Booking successfully added to Completed Bookings table.'}), 200
    except Exception as e:
        print(f"exception")
        return jsonify({'error': str(e)}), 500
    
    finally:
        print(f"done")
        cursor.close()
        conn.close()

    # data = request.json
    # booking_data = data.get('bookingData', {})
    # print(f"data: {data}")

    # # Extract personal details
    # first_name, last_name, email, telephone, requestType, questions, bookingsite, confirmationcode, manualRouteRequest = (
    #     booking_data.get(key) for key in ['firstName', 'lastName', 'email', 'telephone', 'requestType', 'questions', 'bookingsite', 'confirmation_code', 'manualRouteRequest']
    #     )
    # entries = booking_data.get('entries', [])
    # print(f"personal details: {first_name}, {last_name}, {email}, {telephone}, {requestType}, {questions}, {bookingsite} {manualRouteRequest}")

    # # Enter data into database
    # try:
    #     # Start database connection
    #     conn, cursor = get_database_connection()
        
    #     user_id = fetch_or_create_user(cursor, first_name, last_name, email, telephone)
        
    #     print("here")        
    #     for entry in entries:
    #         # Extract details for each trip
    #         print("here2")
    #         pickup, dropoff, pickup_detailed, dropoff_detailed, date, time, airline, flight_number = (
    #             entry.get(key) for key in ['pickup', 'dropoff', 'pickupdetailed', 'dropoffdetailed', 'date', 'time', 'airline', 'flightnumber']
    #         )
    #         print("here3")
    #         if entry.get('passengers') == '11+':
    #             passengers = entry.get('largeGroupPassengers') or None
    #         else:
    #             passengers = entry.get('passengers') or None
    #         # prices_data = {'pickup': pickup, 'dropoff': dropoff, 'passengers': passengers, 'startdate': date, 'enddate': date}
    #         # print(f"prices data {prices_data}")

    #         prices = entry.get('prices') or None
    #         print(f"price1: {prices}")
                            
    #         print(f" pickup dropoff {pickup}, {dropoff}")
            
    #         routeID = fetch_route_number(pickup, dropoff, cursor)
    #         print(f"routeID {routeID}")
    #         if not confirmationcode:
    #             confirmationcode = generate_confirmation_code()
    #             print(f"confirmation code: {confirmationcode}")

    #         # Create data to use in booking_information insertion
    #         print(f"Into Booking Information: user id: {user_id}, route id {routeID}, prices {prices}, confirmationcode {confirmationcode}, date {date}, time {time}, airline {airline}, flight {flight_number}, site {bookingsite}, passengers {passengers}, questions {questions}, pickup {pickup_detailed}, dropoff {dropoff_detailed}, manual booking {manualRouteRequest}")
    #         dataforbooking = compile_dataforbooking(user_id, routeID, pickup, dropoff, prices, confirmationcode, date, time, airline, flight_number, bookingsite, passengers, questions, pickup_detailed, dropoff_detailed, manualRouteRequest)
    #         print(f"dataforbooking {dataforbooking}")
    #         try:
    #             insert_into_booking_database(requestType, dataforbooking, cursor)
    #         except Exception as e:
    #             return jsonify({'error': str(e)}), 500

    #     conn.commit()       

    #     print("did the execute")
        
    #     generate_email_confirmation(entries, requestType, passengers, email, confirmationcode)
    #     print("did the email")

    #     return jsonify({'message': 'Confirmed!'}), 200
    # except Exception as e:
    #     print(f"exception")
    #     return jsonify({'error': str(e)}), 500
    # finally:
    #     print(f"done")
    #     cursor.close()
    #     conn.close()


@bookings_bp.route('/api/completed-booking', methods=['POST'])
def completed_booking():

    data = request.json
    bookingID = data.get('bookingID')
    print(f"bookingID: {bookingID}")
    bookingtable = 'booking_information'
    bookingIDvariable = 'bookingID'

    dataforbooking = call_dataforbooking(bookingtable, bookingIDvariable, bookingID)
    print(f"data for booking (call data): {dataforbooking}")
    print("data for booking (call data)")

    requestType = 'completed_bookings'
    
    # Enter data into database
    try:
        # Start database connection
        conn, cursor = get_database_connection()
        
        insert_into_booking_database(requestType, dataforbooking, cursor)
        conn.commit()
        return jsonify({'message': 'Booking successfully added to Completed Bookings table.'}), 200
    except Exception as e:
        print(f"exception")
        return jsonify({'error': str(e)}), 500
    
    finally:
        print(f"done")
        cursor.close()
        conn.close()


def generate_confirmation_code():
    # Use string.ascii_uppercase to get uppercase letters (A-Z)
    return ''.join(random.choices(string.ascii_uppercase, k=6))

def get_database_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn, conn.cursor()
    except Exception as e:
        raise Exception(f"Database connection error: {str(e)}")
    
def get_database_connection_dictionary():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn, conn.cursor(dictionary=True)
    except Exception as e:
        raise Exception(f"Database connection error: {str(e)}")

def check_valid_phonenumber(cursor, phonenumber):
    number_query = """SELECT EXISTS(SELECT 1 FROM booking_database.valid_phone_numbers WHERE phone_number = %s);"""
    try:
        print(f"phone number: {number_query}")
        cursor.execute(number_query, (phonenumber,))
        phonenumber_exists = cursor.fetchone()[0] == 1 # will return True if exists
        print(f"phone number exists in valid phone list: {phonenumber_exists}")
        return phonenumber_exists
    except Exception as e:
        return jsonify({'e': str(e)}), 500
    
def fetch_or_create_user(cursor, first_name, last_name, email, telephone):
    # Create user information, or check if it already exists
    print("fetching user")
    query = """INSERT INTO booking_database.user_information (FirstName, LastName, Email, PhoneNumber) 
            SELECT %s, %s, %s, %s
                WHERE NOT EXISTS 
                (SELECT email FROM booking_database.user_information WHERE email=%s)"""

    select_query = "SELECT userID FROM booking_database.user_information WHERE Email = %s"

    try:
        print(f"query2: {query}, data {(first_name, last_name, email, telephone, email)}")
        cursor.execute(query, (first_name, last_name, email, telephone, email))

        cursor.execute(select_query, (email,))
        user_id = cursor.fetchone()

        # Check if user_id is found and return the actual ID
        if user_id:
            print(f"User ID found: {user_id[0]}")
            return user_id[0]
        else:
            print("No user ID found.")
            return None
    except Exception as e:
        print(f"Error during user fetch or creation: {str(e)}")
        return None

def fetch_route_number(pickup, dropoff, cursor):
    print("fetching route number")
    try:
        query = "SELECT routeID FROM booking_database.route_information WHERE startcity = %s AND endcity = %s"
        cursor.execute(query, (pickup, dropoff))
        result = cursor.fetchone()
        print(f"result of route query: {cursor.fetchone()}")
        if result:
            print(f"Found routeID: {result[0]}")
            return result[0]
        print("Route not found in the given order. Trying reverse order.")
        cursor.execute(query, (dropoff, pickup))
        result = cursor.fetchone()
        if result:
            print(f"Found routeID (reverse): {result[0]}")
            return result[0]
        print("Route ID not found for both orders. Route is not in route list.")
        return 9999
    except Exception as e:
        print(f"Error fetching route ID: {e}")
        return 9999

def compile_dataforbooking(user_id, routeID, pickup, dropoff, prices, confirmationcode, date, time, airline, flight_number, bookingsite, passengers, questions, pickup_detailed, dropoff_detailed, manualbookinginfo):
    print(f"Calling compile_dataforbooking with: {user_id}, {routeID}, {pickup}, {dropoff}, {prices}, {confirmationcode}, {date}, {time}, {airline}, {flight_number}, {bookingsite}, {passengers}, {questions}, {pickup_detailed}, {dropoff_detailed}, {manualbookinginfo}")
    dataforbooking = {
        "userID": user_id if user_id else None,
        "routeID": routeID if routeID else None,
        "startcity": pickup if pickup else None,
        "endcity": dropoff if dropoff else None,
        "confirmation_number": confirmationcode if confirmationcode else None,
        "booking_date": date if date else None,
        "pickup_time": time if time else None,
        "flight_airline": airline if airline else None,
        "flight_number": int(flight_number) if flight_number else None,  
        "booking_site": bookingsite if bookingsite else None,
        "passengers": int(passengers) if passengers else None, 
        "questions": questions if questions else None,
        "pickup_location": pickup_detailed if pickup_detailed else None,
        "dropoff_location": dropoff_detailed if dropoff_detailed else None,
        "manualbookinginfo": manualbookinginfo if manualbookinginfo else None,
    }
    print("here4")
    # Add prices to data only if it's not None
    if prices is not None:
        dataforbooking["routecost"] = prices
    else:
        dataforbooking["routecost"] = None  # Explicitly set to None if you prefer
    print(dataforbooking)
    return dataforbooking

def call_dataforbooking(bookingtable, bookingIDvariable, bookingID):
    print("Call Data for a Booking")

    # Validate the table name to prevent SQL injection
    allowed_tables = ["booking_information", "temp_booking"]
    if bookingtable not in allowed_tables:
        raise ValueError("Invalid table name.")

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        query =(f"""
                SELECT *
                FROM {bookingtable}
                WHERE {bookingIDvariable} = %s
                ORDER BY booking_date ASC;""")
        print(f"query call data: {query}, bookingID {bookingID}")
        cursor.execute(query, (bookingID,))
        data = cursor.fetchall()
        print(f"data from call3: {data}")
        # dataforbooking = {
        # "userID": data.userID if data.userID else None,
        # "routeID": data.routeID if data.routeID else None,
        # "startcity": data.startcity if data.startcity else None,
        # "endcity": data.endcity if data.endcity else None,
        # "confirmation_number": data.confirmation_number if data.confirmation_number else None,
        # "booking_date": data.booking_date if data.booking_date else None,
        # "pickup_time": data.pickup_time if data.pickup_time else None,
        # "flight_airline": data.flight_airline if data.flight_airline else None,
        # "flight_number": int(data.flight_number) if data.flight_number else None,  
        # "booking_site": data.booking_site if data.booking_site else None,
        # "passengers": int(data.passengers) if data.passengers else None, 
        # "questions": data.questions if data.questions else None,
        # "pickup_location": data.pickup_location if data.pickup_location else None,
        # "dropoff_location": data.dropoff_location if data.dropoff_location else None,
        # "manualbookinginfo": data.manualbookinginfo if data.manualbookinginfo else None,
        # }

        dataforbooking = {key: convert_to_serializable(value) for key, value in data[0].items()}
        print(f"data for booking:: {dataforbooking}")
        return dataforbooking
    except Exception as e:
            return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    
def insert_into_booking_database(requestType, dataforbooking, cursor):
    print("insert into booking database")
    print(f"data for booking: {dataforbooking}")
    print(f"request type: {requestType}")

    # Determine the correct table based on requestType
    if requestType == 'Auto' or requestType == 'Approve':
        table_name = "booking_information"
    elif requestType == 'completed_bookings':
        table_name = "completed_bookings"
    else:
        table_name = "temp_booking"

    print(f"table name: {table_name}")

    allowed_tables = ["booking_information", "temp_booking", "completed_bookings"]
    if table_name not in allowed_tables:
        raise ValueError("Invalid table name.")
    
    print("here5")

    # Build the base SQL query
    # Exclude 'tempbookingID' and 'bookingID' from columns and placeholders
    excluded_columns = {'tempbookingID', 'bookingID'}
    filtered_data = {key: value for key, value in dataforbooking.items() if key not in excluded_columns and value is not None}
    print(f"filtered data: {filtered_data}")
    # Build columns and placeholders
    columns = ", ".join(filtered_data.keys())
    placeholders = ", ".join(["%s"] * len(filtered_data))

    # Safely construct the SQL query
    query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
    print(f"query for insert into database")

    # Prepare the values to insert
    values = [value for key, value in filtered_data.items() if value is not None]
    print(f"Values: {values}")

    try:
        # Execute the query with placeholders and values
        print(f"Executing query: {query}")
        print(f"With values: {values}")
        cursor.execute(query, values)
        print("Query executed successfully")
    except Exception as e:
        print(f"Error executing query: {e}")


def generate_email_confirmation(entries, requestType, passengers, email, first_name, last_name, telephone, confirmationcode):
    print("generate email confirmation")
    print(f"request type: {requestType}")
    print(f"data: {entries}")
    emailbody = []

    if requestType == 'Auto' or requestType == 'Approve':
        emailbody.append("Your trip has been booked!")
    elif requestType == 'Large Group':
        emailbody.append("Your trip has been requested!")
        emailbody.append("Given the large size of your party, we will need to contact you directly to better understand your trip details and to give you a better quote.")
    elif requestType == 'Upcoming':
        emailbody.append("Your trip has been requested!")
        emailbody.append("Given the short notice,we will reach out directly to confirm all the details and ensure you receive the exceptional transportation experience we are known for")
    elif requestType == 'Invalid Phone':
        emailbody.append("Your trip has been requested!")
        emailbody.append("A sales associate will reach out to you soon.")
    elif requestType == 'Alternate Route':
        emailbody.append("Your trip has been requested!")
        emailbody.append("A sales associate will reach out to you soon to confirm details and share a quote.")
    else:
        raise Exception(f"Wrong requestType for generating email confirmation: {str(e)}")
    print(f"email body: {emailbody}")

    emailbody.append(f"Our information on file for you: {first_name} {last_name}, telephone number: +{telephone}")

    print(f"email body: {emailbody}")

    tripnum = 1
    for entry in entries:
        # Extract details for each trip
        routeID = entry.get('routenumber') or None
        pickup = entry.get('pickup') or None
        dropoff = entry.get('dropoff') or None
        pickup_detailed = entry.get('pickupdetailed') or None
        dropoff_detailed = entry.get('dropoffdetailed') or None
        date = entry.get('date') or None
        time = entry.get('time') or None
        airline = entry.get('airline') or None
        flight_number = entry.get('flightnumber') or None
        manualbookinginfo = entry.get('manualbookinginfo') or None


        print(f"routeID: {routeID}")     
        print(f"pickup: {pickup}")     
        print(f"dropoff: {dropoff}")
        print(f"pickup_location: {pickup_detailed}")
        print(f"dropoff_location: {dropoff_detailed}")
        print(f"booking_date: {date}")
        print(f"pickup_time: {time}")
        print(f"flight_airline: {airline}")
        print(f"flight_number: {flight_number}")
        print(f"tripnum: {tripnum}")     
        print(f"emailbody: {emailbody}")
        print(f"request type: {requestType}")
        print(f"Manual booking info: {manualbookinginfo}")

        if requestType == 'Approve':
            prices = entry.get('prices') or None
            print(f"price1: {prices}, type {type(prices)}")
        elif requestType == 'Large Group' or requestType == 'Alternate Route':
            print("prices")
            prices = 'NA'
        else:
            day_price = calculate_route_prices(routeID, passengers, date, date)
            print(f"price2: {day_price}")
            prices = list(day_price.values())[0]
            print(f"price3: {prices}, type {type(prices)}")
        # prices = entry.get('prices', {}) or None
        print(f"Price after emailbody1: {prices}")
        emailbody.append(f"Trip {str(tripnum)} details: Pickup at {pickup} on {date} at {time}, for shuttle service to {dropoff} for {str(passengers)} passengers.")
        print(f"Price after emailbody2: {prices}")
        print("hi")
        if airline and flight_number:
            print("if airline")
            print(f"{str(airline)}, type: {str(airline)}")
            print(f"{str(flight_number)}, type: {str(flight_number)}")
            emailbody.append(f" Flight information: {str(airline)}, flight number {str(flight_number)}.")
        if requestType == 'Auto' or requestType == 'Approve' or requestType == 'Upcoming':
            print("if auto")
            emailbody.append(f" Trip {str(tripnum)} cost: ${prices}")
        tripnum += 1
        print(f"email body 2: {emailbody}")


    # print(f"emailbody: {emailbody}")
    if requestType !="Auto":
        emailbody.append(" Your request requires someone to review your information to develop a detailed quote. Someone will be reaching out shortly with a price quote for your trip.")
    print(f"email body: {emailbody}")

    if requestType != 'Auto':
        emailbody.append(" Expect someone to reach out to you soon to confirm your trip!")
        # TODO make a send email for Aaron, and mark URGENT if the date is soon
        if requestType == 'Upcoming':
            send_email('kmjohnsen@gmail.com', "Urgent: New Upcoming Booking Request", emailbody, confirmationcode)        
        else:
            send_email('kmjohnsen@gmail.com', "New Booking Request", emailbody, confirmationcode)        

    # Send confirmation email
    print(emailbody)
    try:
        send_email(email, "LIR Shuttle Confirmation", emailbody, confirmationcode)
        print(f"email sent")
    except Exception as e:
        print(f"Error during email sending")

@bookings_bp.route('/api/bookings/remove-booking', methods=['DELETE'])
def remove_booking():
    print("here")
    data = request.json
    bookingID = data.get('bookingID')
    booking_type = data.get('type') # "temp" or "confirmed"
    print(f"bookingID {bookingID}, {booking_type}")

    if not bookingID:
        return jsonify({'error': 'bookingID is required'}), 400  # Return an error if ID is missing

    table_name = 'temp_booking' if booking_type == 'temp' else 'booking_information'
    variable_name = 'tempbookingID' if booking_type == 'temp' else 'bookingID'

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        query = f"DELETE FROM booking_database.{table_name} WHERE {variable_name} = %s"
        try:
            cursor.execute(query, (bookingID,))
            conn.commit()
        except Exception as e:
            print(f"Error during removal from database: {str(e)}")
            return jsonify({'error': f'Error during removal: {str(e)}'}), 500
        return jsonify({'message': 'Removal successful!'}), 200
    except Exception as e:
        print(f"exception")
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Endpoint to get all blackout dates in date order
@bookings_bp.route('/api/getblackoutdates', methods=['GET'])
def get_blackout_dates():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    query = "SELECT blackoutdate FROM booking_database.blackout_dates ORDER BY blackoutdate ASC"
    cursor.execute(query)
    blackoutdates = cursor.fetchall()

    # Convert dates to ISO format (YYYY-MM-DD) to send in the API
    formatted_dates = []
    for date_tuple in blackoutdates:
        date_str = date_tuple[0]  # Extract the date string
        # Convert the string to a datetime object
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')  # Adjust the format as necessary
        formatted_dates.append(date_obj.strftime('%Y-%m-%d'))  # Append the ISO formatted date

    # print(f"black out dates: {formatted_dates}")
    return jsonify(formatted_dates)

# Submit new blackout dates
@bookings_bp.route('/api/postblackoutdates', methods=['POST'])
def post_blackout_dates():
    data = request.json
    print(f"Received data: {data}")  # Print to console for debugging
    blackout_date = data.get('newDate', {})
    # blackout_datetime_obj = datetime.strptime(blackout_date, '%a, %d %b %Y %H:%M:%S %Z')
    # blackout_date_only = blackout_datetime_obj.strftime('%Y-%m-%d')
    
    if not blackout_date:
        return jsonify({'error': 'No date provided'}), 400  # Handle the case where no date is provided
    
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Use parameterized query to avoid SQL injection
        query = "INSERT INTO booking_database.blackout_dates (blackoutdate) VALUES (%s)"
        cursor.execute(query, (blackout_date,))
    
        conn.commit()
        
        cursor.close()
        conn.close()

        return jsonify({'message': 'Blackout date added successfully'}), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Remove blackout date
@bookings_bp.route('/api/removeblackoutdates', methods=['POST'])
def remove_blackout_dates():
    data = request.json
    blackout_date = data.get('newDate')  # Extract the date from the request
    # blackout_datetime_obj = datetime.strptime(blackout_date, '%a, %d %b %Y %H:%M:%S %Z')
    # blackout_date_only = blackout_datetime_obj.strftime('%Y-%m-%d')
    # print(f"blackout date: {blackout_date}")

    if not blackout_date:
        return jsonify({'error': 'No date provided'}), 400  # Handle the case where no date is provided

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Use a parameterized query to delete the blackout date from the database
        query = "DELETE FROM booking_database.blackout_dates WHERE blackoutdate = %s"
        cursor.execute(query, (blackout_date,))
        
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Blackout date removed successfully'}), 200
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Provide the margin for autobooking
@bookings_bp.route('/api/datemargin', methods=['GET'])
def date_margin_for_autobooking():
    datemargin = 2
    return jsonify(datemargin)

if __name__ == '__main__':
    app.run(debug=True)


