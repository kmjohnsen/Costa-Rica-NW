from flask import Flask, Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity, verify_jwt_in_request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta, date
from enum import Enum
from functools import wraps
import random
import string
import os
import bleach
from api.db import get_db_connection

from api.SQL_access_functions import fetch_all_bookings, fetch_completed_bookings, fetch_bookings_for_a_day, fetch_pending_bookings, fetch_route_number, fetch_monthly_summary, fetch_or_create_user
from api.utils import serialize_records, sanitize_personal_fields

from api.emailconfirmation import send_booking_confirmation_email, send_debug_email, send_transport_request_email
from api.prices import calculate_route_prices
from dotenv import load_dotenv

app = Flask(__name__)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
) 
bookings_bp = Blueprint('bookings', __name__)

ADMIN_EMAILS = [e.strip().lower() for e in os.getenv("WHITELISTED_EMAILS", "").split(",") if e.strip()]
ADMIN_ROLES = {"admin", "dev"}
CRNW_EMAIL = "kmjohnsen@gmail.com"

class RequestType(str, Enum):
    AUTO = "Auto"
    LARGE_GROUP = "Large Group"
    UPCOMING = "Upcoming"
    INVALID_PHONE = "Invalid Phone"
    ALTERNATE_ROUTE = "Alternate Route"

VALID_REQUEST_TYPES = {
    RequestType.AUTO,
    RequestType.LARGE_GROUP,
    RequestType.UPCOMING,
    RequestType.INVALID_PHONE,
    RequestType.ALTERNATE_ROUTE,
}

MAX_DAYS_AHEAD = 365
DATE_FMT = "%Y-%m-%d"

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        email = get_jwt_identity()
        if email.lower() not in ADMIN_EMAILS or claims.get("role") not in ADMIN_ROLES:
            return jsonify({'error': 'Access denied'}), 403
        return f(*args, **kwargs)
    return wrapper


# Endpoint to get all bookings in date order
@bookings_bp.route('/api/bookings', methods=['GET'])
@limiter.limit("10/minute")
@admin_required
def get_all_bookings():
    try:
        conn, cursor = get_db_connection(dictionary=True)
        bookings = fetch_all_bookings(cursor)
        return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@bookings_bp.route('/api/get_completed_bookings', methods=['GET'])
@limiter.limit("10/minute") 
@admin_required
def get_completed_bookings():
    try:
        conn, cursor = get_db_connection(dictionary=True)
        bookings = fetch_completed_bookings(cursor)
        return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Endpoint to get bookings for a specific date
@bookings_bp.route('/api/bookings/day', methods=['GET'])
@admin_required
@limiter.limit("10/minute") 
def get_bookings_for_day():
    booking_date = request.args.get('date')
    if not booking_date:
        return jsonify({'error': 'Date is required'}), 400
    print(f"Received date: {date}")

    try:
        conn, cursor = get_db_connection(dictionary=True)
        bookings = fetch_bookings_for_a_day(cursor, booking_date)
        if not bookings:
            return jsonify({'error': 'No bookings found for this date'}), 404
        return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Endpoint to get a monthly summary
@bookings_bp.route('/api/bookings/monthly-summary', methods=['GET'])
@admin_required
def get_monthly_summary():
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    try:
        conn, cursor = get_db_connection(dictionary=True)
        bookings = fetch_monthly_summary(cursor, month)
        return jsonify(bookings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Endpoint to get monthly summary for each driver
@bookings_bp.route('/api/drivers/monthly-summary', methods=['GET'])
@admin_required
def get_driver_monthly_summary():
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    conn, cursor = get_db_connection(dictionary=True)
    cursor.execute("""
        SELECT driver_name, COUNT(*) as trips, SUM(routecost) as money_collected
        FROM booking_database.booking_information
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
@admin_required
def modify_booking():
    # Get the updated fields from the request body
    data = request.json
    updated_fields = data.get('updatedFields')
    is_pending = data.get('isPending')

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
        conn, cursor = get_db_connection(dictionary=True)
        if booking_updates:
            cursor.execute(booking_query, booking_values)
        if user_updates:
            cursor.execute(user_query, user_values)
        conn.commit()
        return jsonify({'message': 'Booking/User Info updated successfully'}), 200
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

# Endpoint to get all bookings in date order
@bookings_bp.route('/api/pendingbookings', methods=['GET'])
@admin_required
def get_pending_bookings():
    try:
        conn, cursor = get_db_connection(dictionary=True)
        bookings = fetch_pending_bookings(cursor)
        return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Endpoint to assign/change driver
@bookings_bp.route('/api/bookings/assign-driver', methods=['POST'])
@admin_required
def assign_driver():
    data = request.json
    booking_id = data.get('booking_id')
    driver_name = data.get('driver_name')
    conn, cursor = get_db_connection(dictionary=True)
    cursor.execute("UPDATE booking_database.booking_information SET driver = %s WHERE booking_id = %s", (driver_name, booking_id))
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
        conn, cursor = get_db_connection(dictionary=True)
        routeID = fetch_route_number(pickup, dropoff, cursor)
        print(f"Fetched route id {routeID}")
        return jsonify(routeID), 200

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@bookings_bp.route('/api/submit-booking-email-request', methods=['POST'])
@limiter.limit("10/minute")
def submit_booking_email_request():
    data = request.get_json()
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    details = data.get('details')
    confirmationcode = data.get('confirmationcode')
    send_transport_request_email(name, phone, email, details, confirmationcode)
    return jsonify({"message": "Other transport request received"}), 200

@bookings_bp.route('/api/submit-booking', methods=['POST'])
@limiter.limit("10/minute")
def submit_booking():
    booking_data_debug = request.json.get('bookingData')
    if not booking_data_debug:
        return jsonify({"error": "No booking data provided"}), 400
    
    # Send debug email with raw inputs
    send_debug_email(booking_data_debug)

    data = request.json
    booking_data = data.get('bookingData', {})
    print(f'booking data {booking_data}')

    # Extract personal details
    first_name, last_name, email, telephone, requestType, questions, bookingsite, confirmation_code, manualRouteRequest, passengers, largeGroupPassengers = (
        booking_data.get(key) for key in ['firstName', 'lastName', 'email', 'telephone', 'requestType', 'questions', 'bookingsite', 'confirmationCode', 'manualRouteRequest', 'passengers', 'largeGroupPassengers']
        )
    entries = booking_data.get('entries', [])

    # Sanitize before saving
    sanitize_personal_fields(entries)

    print(f"personal details: {first_name}, {last_name}, {email}, {telephone}, {requestType}, {questions}, {bookingsite} {manualRouteRequest} {largeGroupPassengers} {passengers}")

    allowed_request_types = {'Auto', 'Large Group', 'Upcoming', 'Invalid Phone', 'Alternate Route'}
    if requestType not in allowed_request_types:
        return jsonify({'error': 'Invalid Request Type'}), 400
    
    # Make sure phone number is in valid phone list
    if requestType == 'Auto':
        query = "SELECT 1 FROM booking_database.valid_phone_numbers WHERE phone_number=(%s) LIMIT 1;"
        try:
        ## Database operation
            conn, cursor = get_db_connection(dictionary=False)
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
        conn, cursor = get_db_connection(dictionary=False)
        
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
            routeID, pickup, dropoff, pickup_detailed, dropoff_detailed, date, time, airline, flight_number = (
                entry.get(key) for key in ['routenumber', 'pickup', 'dropoff', 'pickupdetailed', 'dropoffdetailed', 'date', 'time', 'airline', 'flightnumber']
            )

            # Ensure reservation is not more than one year out
            MAX_DATE = datetime.today() + timedelta(days=MAX_DAYS_AHEAD)
            # Parse string to datetime (expecting 'YYYY-MM-DD')
            try:
                date_obj = datetime.strptime(date, DATE_FMT)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

            if date_obj > MAX_DATE:
                return jsonify({"error": "Date is too far in the future"}), 400

            # Remove potentially dangerous insertions into database via bleach
            pickup_detailed = bleach.clean(entry.get('pickupdetailed', ''))
            dropoff_detailed = bleach.clean(entry.get('dropoffdetailed', ''))

            # Fetch pricing information from database, or "none" if Large Group or Alternate Route
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
            
            # print(f"Into Booking Information: user id: {user_id}, route id {routeID}, prices {prices}, confirmationcode {confirmation_code}, date {date}, time {time}, airline {airline}, flight {flight_number}, site {bookingsite}, passengers {passengers}, questions {questions}, pickup {pickup_detailed}, dropoff {dropoff_detailed}, manual booking {manualRouteRequest}")
            dataforbooking = compile_dataforbooking(user_id, routeID, pickup, dropoff, prices, confirmation_code, date, time, airline, flight_number, bookingsite, passengers, questions, pickup_detailed, dropoff_detailed, manualRouteRequest)

            try:
                insert_into_booking_database(requestType, dataforbooking, cursor)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        conn.commit()       
        
        generate_email_confirmation(entries, requestType, passengers, email, first_name, last_name, telephone, confirmation_code)
        
        return jsonify({'message': 'Confirmed!'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500
    finally:
        print(f"done")
        cursor.close()
        conn.close()

@bookings_bp.route('/api/approve-booking', methods=['POST'])
@limiter.limit("10/minute")
@admin_required
def approve_booking():
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
        conn, cursor = get_db_connection(dictionary=False)
        
        insert_into_booking_database(requestType, dataforbooking, cursor)
        conn.commit()

        # generate_email_confirmation(entries, requestType, passengers, email, confirmationcode)
        print("did the email")

        return jsonify({'message': 'Booking successfully added to Completed Bookings table.'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500
    
    finally:
        print(f"done")
        cursor.close()
        conn.close()

@bookings_bp.route('/api/completed-booking', methods=['POST'])
@limiter.limit("10/minute") 
@admin_required
def completed_booking():
    data = request.json
    bookingID = data.get('bookingID')
    print(f"bookingID: {bookingID}")
    bookingtable = 'booking_information'
    bookingIDvariable = 'bookingID'
    
    # Enter data into database
    try:
        # Start database connection
        dataforbooking = call_dataforbooking(bookingtable, bookingIDvariable, bookingID)
        print(f"data for booking (call data): {dataforbooking}")
        requestType = 'completed_bookings'

        conn, cursor = get_db_connection(dictionary=False)
        
        # Add to completed_booking table
        insert_into_booking_database(requestType, dataforbooking, cursor)

        # Delete from booking_information table
        delete_query = f"DELETE FROM booking_database.{bookingtable} WHERE {bookingIDvariable} = %s"
        cursor.execute(delete_query, (bookingID,))

        conn.commit()
        
        return jsonify({'message': 'Booking successfully added to Completed Bookings table.'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500
    
    finally:
        print(f"done")
        cursor.close()
        conn.close()


def generate_confirmation_code():
    # Use string.ascii_uppercase to get uppercase letters (A-Z)
    return ''.join(random.choices(string.ascii_uppercase, k=6))

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
    


def compile_dataforbooking(user_id, routeID, pickup, dropoff, prices, confirmationcode, date, time, airline, flight_number, bookingsite, passengers, questions, pickup_detailed, dropoff_detailed, manualbookinginfo):
    # print(f"Calling compile_dataforbooking with: {user_id}, {routeID}, {pickup}, {dropoff}, {prices}, {confirmationcode}, {date}, {time}, {airline}, {flight_number}, {bookingsite}, {passengers}, {questions}, {pickup_detailed}, {dropoff_detailed}, {manualbookinginfo}")
    
    dataforbooking = {
        "userID": user_id if user_id else None,
        "routeID": routeID if routeID else None,
        "startcity": bleach.clean(pickup) if pickup else None,
        "endcity": bleach.clean(dropoff) if dropoff else None,
        "confirmation_number": confirmationcode if confirmationcode else None,
        "booking_date": date if date else None,
        "pickup_time": time if time else None,
        "flight_airline": bleach.clean(airline) if airline else None,
        "flight_number": int(flight_number) if flight_number else None,  
        "booking_site": bookingsite if bookingsite else None,
        "passengers": int(passengers) if passengers else None, 
        "questions": bleach.clean(questions) if questions else None,
        "pickup_location": bleach.clean(pickup_detailed) if pickup_detailed else None,
        "dropoff_location": bleach.clean(dropoff_detailed) if dropoff_detailed else None,
        "manualbookinginfo":bleach.clean( manualbookinginfo) if manualbookinginfo else None,
        "routecost": prices if prices is not None else None,
    }
    return dataforbooking


def call_dataforbooking(bookingtable, bookingIDvariable, bookingID):
    print("Call Data for a Booking")

    # Validate the table name to prevent SQL injection
    allowed_tables = ["booking_information", "temp_booking"]
    if bookingtable not in allowed_tables:
        raise ValueError("Invalid table name.")
    try:
        conn, cursor = get_db_connection(dictionary=True)
        query =(f"""
                SELECT *
                FROM booking_database.{bookingtable}
                WHERE {bookingIDvariable} = %s
                ORDER BY booking_date ASC;""")
        print(f"query call data: {query}, bookingID {bookingID}")
        cursor.execute(query, (bookingID,))
        data = cursor.fetchall()
        return serialize_records(data)
    except Exception as e:
            return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    
def insert_into_booking_database(requestType, dataforbooking, cursor):

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
    
    allowed_columns = {
        "userID", "routeID", "startcity", "endcity", "confirmation_number",
        "booking_date", "pickup_time", "flight_airline", "flight_number",
        "booking_site", "passengers", "questions", "pickup_location",
        "dropoff_location", "manualbookinginfo", "routecost"
    }
    
    # Build the base SQL query
    # Exclude 'tempbookingID' and 'bookingID' from columns and placeholders
    excluded_columns = {'tempbookingID', 'bookingID'}
    filtered_data = {
        key: value for key, value in dataforbooking.items()
        if key in allowed_columns and value is not None
    }
    if not filtered_data:
        raise ValueError("No valid fields to insert.")
    
    # Build columns and placeholders
    columns = ", ".join(filtered_data.keys())
    placeholders = ", ".join(["%s"] * len(filtered_data))

    # Safely construct the SQL query
    query = f"""
        INSERT INTO booking_database.{table_name} ({columns}) 
        VALUES ({placeholders})
        """

    values = list(filtered_data.values())
    print(f"Values: {values}")

    try:
        # Execute the query with placeholders and values
        print(f"Executing query: {query}")
        print(f"With values: {values}")
        cursor.execute(query, values)
        print("Query executed successfully")
    except Exception as e:
        print(f"Error executing query: {e}")
        raise Exception(f"Error executing query: {e}")


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
    dates = ""
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
        dates = dates + " " + date
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
            send_booking_confirmation_email([email, CRNW_EMAIL], "Urgent: New Upcoming Booking Request", emailbody, confirmationcode)        
        else:
            send_booking_confirmation_email([email, CRNW_EMAIL], "New Booking Request", emailbody, confirmationcode)        

    # Send confirmation email
    print(emailbody)
    try:
        send_booking_confirmation_email(email, "Costa Rica Northwest: Shuttle Confirmation", emailbody, confirmationcode)
        subjectline = "Trip Booked: Date " + dates + ", Conf: " + confirmationcode + " " + first_name + " " + last_name
        send_booking_confirmation_email(CRNW_EMAIL, subjectline, emailbody, confirmationcode)
        print(f"email sent")
    except Exception as e:
        print(f"Error during email sending")

@bookings_bp.route('/api/bookings/remove-booking', methods=['DELETE'])
@admin_required
def remove_booking():
    data = request.json
    bookingID = data.get('bookingID')
    booking_type = data.get('type') # "temp" or "confirmed"
    print(f"bookingID {bookingID}, {booking_type}")

    if not bookingID:
        return jsonify({'error': 'bookingID is required'}), 400  # Return an error if ID is missing

    table_name = 'temp_booking' if booking_type == 'temp' else 'booking_information'
    variable_name = 'tempbookingID' if booking_type == 'temp' else 'bookingID'

    try:
        conn, cursor = get_db_connection(dictionary=True)
        
        query = f"DELETE FROM booking_database.{table_name} WHERE {variable_name} = %s"
        try:
            cursor.execute(query, (bookingID,))
            conn.commit()
        except Exception as e:
            print(f"Error during removal from database: {str(e)}")
            return jsonify({'error': f'Error during removal: {str(e)}'}), 500
        return jsonify({'message': 'Removal successful!'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Endpoint to get all blackout dates in date order
@bookings_bp.route('/api/getblackoutdates', methods=['GET'])
@admin_required
def fetch_blackout_dates():
    try:
        conn, cursor = get_db_connection(dictionary=True)
        query = "SELECT blackoutdate FROM booking_database.blackout_dates ORDER BY blackoutdate ASC"
        cursor.execute(query)
        dates = cursor.fetchall()
        formatted_dates = [
            date['blackoutdate'] if isinstance(date['blackoutdate'], str)
            else date['blackoutdate'].strftime(DATE_FMT)
            for date in dates
        ]
        return jsonify(formatted_dates), 200
    except Exception as e:
        print(f"Error fetching blackout dates: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Submit new blackout dates
@bookings_bp.route('/api/postblackoutdates', methods=['POST'])
@admin_required
def post_blackout_dates():
    data = request.json
    blackout_date = data.get('newDate', {})
    if not blackout_date:
        return jsonify({'error': 'No date provided'}), 400 
    try:
        conn, cursor = get_db_connection(dictionary=True)
        query = "INSERT INTO booking_database.blackout_dates (blackoutdate) VALUES (%s)"
        cursor.execute(query, (blackout_date,))
        conn.commit()
        return jsonify({'message': 'Blackout date added successfully'}), 200
    except Exception as e:
        print(f"Error adding blackout date: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Remove blackout date
@bookings_bp.route('/api/removeblackoutdates', methods=['POST'])
@admin_required
def remove_blackout_dates():
    data = request.json
    blackout_date = data.get('newDate')
    if not blackout_date:
        return jsonify({'error': 'No date provided'}), 400  
    try:
        conn, cursor = get_db_connection(dictionary=True)
        query = "DELETE FROM booking_database.blackout_dates WHERE blackoutdate = %s"
        cursor.execute(query, (blackout_date,))
        conn.commit()
        return jsonify({'message': 'Blackout date removed successfully'}), 200
    except Exception as e:
        print(f"Error removing blackout date: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
        

# Provide the margin for autobooking
@bookings_bp.route('/api/datemargin', methods=['GET'])
def date_margin_for_autobooking():
    datemargin = 2
    return jsonify(datemargin)

if __name__ == '__main__':
    app.run(debug=True)


