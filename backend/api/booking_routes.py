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
from api.cache_utils import invalidate_cache

from api.SQL_access_functions import (
  fetch_all_bookings, 
  fetch_completed_bookings, 
  fetch_bookings_for_a_day, 
  fetch_pending_bookings, 
  fetch_route_number, 
  fetch_monthly_summary, 
  fetch_or_create_user, 
  delete_booking, 
  post_driver_name,
  check_valid_phonenumber,
  fetch_booking_by_id,
  fetch_driver_monthly_summary,
  create_blackout_date_list,
  insert_blackout_date,
  delete_blackout_date
)
from api.utils import serialize_records, sanitize_personal_fields, compile_dataforbooking

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
        with get_db_connection(dictionary=True) as (conn, cursor):        
            bookings = fetch_all_bookings(cursor)
            return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bookings_bp.route('/api/get_completed_bookings', methods=['GET'])
@limiter.limit("10/minute") 
@admin_required
def get_completed_bookings():
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            bookings = fetch_completed_bookings(cursor)
            return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        with get_db_connection(dictionary=True) as (conn, cursor):        
            bookings = fetch_bookings_for_a_day(cursor, booking_date)
            if not bookings:
                return jsonify({'error': 'No bookings found for this date'}), 404
            return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Endpoint to get a monthly summary
@bookings_bp.route('/api/bookings/monthly-summary', methods=['GET'])
@admin_required
def get_monthly_summary():
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            bookings = fetch_monthly_summary(cursor, month)
            return jsonify(bookings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Endpoint to get monthly summary for each driver
@bookings_bp.route('/api/drivers/monthly-summary', methods=['GET'])
@admin_required
def get_driver_monthly_summary():

    try:
        with get_db_connection(dictionary=True) as (conn, cursor):
            month = request.args.get('month', datetime.now().strftime('%Y-%m'))
            summaries = fetch_driver_monthly_summary(cursor, month)
            return jsonify(summaries), 200

    except Exception as e:
        import traceback
        print("Error fetching driver monthly summary:", e)
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch driver monthly summary: {str(e)}'}), 500


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

    # Add the WHERE clause to target the specific booking
    if is_pending == True:
        booking_query += ", ".join(booking_updates) + " WHERE tempbookingID = %s"
    else:
        booking_query += ", ".join(booking_updates) + " WHERE bookingID = %s"
    booking_values.append(bookingIDnum)
    user_query += ", ".join(user_updates) + "WHERE userID = %s"
    user_values.append(userIDnum)

    # Execute the update query
    conn = None
    cursor = None
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            if booking_updates:
                cursor.execute(booking_query, booking_values)
            if user_updates:
                cursor.execute(user_query, user_values)
            conn.commit()
            invalidate_cache("booking_numbers") #remove cache of number of bookings per date
            return jsonify({'message': 'Booking/User Info updated successfully'}), 200
    except Exception as e:
        import traceback
        print("Error modifying booking:", e)
        traceback.print_exc()
        # Roll back if DB transaction failed
        if conn:
            conn.rollback()
        return jsonify({'error': f'Failed to modify booking: {str(e)}'}), 500


# Endpoint to get all bookings in date order
@bookings_bp.route('/api/pendingbookings', methods=['GET'])
@admin_required
def get_pending_bookings():
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            bookings = fetch_pending_bookings(cursor)
            return jsonify(serialize_records(bookings)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Endpoint to assign/change driver
@bookings_bp.route('/api/bookings/assign-driver', methods=['POST'])
@admin_required
def assign_driver():
    data = request.json
    booking_id = data.get('booking_id')
    driver_name = data.get('driver_name')
    if not booking_id or not driver_name:
        return jsonify({'error': 'Both booking_id and driver_name are required'}), 400
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):
            post_driver_name(cursor, conn, driver_name, booking_id)
            return jsonify({'message': 'Driver assigned/changed successfully'}), 200
    except Exception as e:
        import traceback
        print("Error assigning driver:", e)
        traceback.print_exc()
        # Rollback to avoid partial transaction if error occurred mid-commit
        if 'conn' in locals() and conn:
            conn.rollback()
        return jsonify({'error': f'Failed to assign driver: {str(e)}'}), 500

@bookings_bp.route('/api/bookings/fetch_route_number', methods=['GET'])
def get_route_number():
    pickup = request.args.get('pickup')
    dropoff = request.args.get('dropoff')
    if not pickup or not dropoff:
        return jsonify({'error': 'Pickup and dropoff locations are required'}), 400
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):
            routeID = fetch_route_number(pickup, dropoff, cursor)
            print(f"Fetched route id {routeID}")
            return jsonify(routeID), 200
    except Exception as e:
        import traceback
        print("Error fetching route number:", e)
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch route number: {str(e)}'}), 500

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
    # Extract personal details
    first_name, last_name, email, telephone, requestType, questions, bookingsite, confirmation_code, manualRouteRequest, passengers, largeGroupPassengers = (
        booking_data.get(key) for key in ['firstName', 'lastName', 'email', 'telephone', 'requestType', 'questions', 'bookingsite', 'confirmationCode', 'manualRouteRequest', 'passengers', 'largeGroupPassengers']
        )
    entries = booking_data.get('entries', [])
    # Sanitize before saving
    sanitize_personal_fields(entries)
    allowed_request_types = {'Auto', 'Large Group', 'Upcoming', 'Invalid Phone', 'Alternate Route'}
    if requestType not in allowed_request_types:
        return jsonify({'error': 'Invalid Request Type'}), 400
    
    # Make sure phone number is in valid phone list
    if requestType == 'Auto':
        try:
        ## Database operation
            with get_db_connection(dictionary=False) as (conn, cursor):            
                result = check_valid_phonenumber(cursor, telephone)
                print(f"result valid phone number: {result}")
                if result:
                    print("Phone number exists")
                else:
                    return jsonify({'error': 'Phone number is not valid'}), 400
        except Exception as e:
            print(f"Error: {str(e)}")
            return jsonify({'error': str(e)}), 500
    # Enter data into database
    try:
        # Start database connection
        with get_db_connection(dictionary=True) as (conn, cursor):        
            user_id = fetch_or_create_user(cursor, conn, first_name, last_name, email, telephone)
            print(f"user id: {user_id}")
            
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
                    price_map = day_price.get("prices", {})
                    prices = next(iter(price_map.values()), None)
                print(f"prices: {prices}")
                                                            
                # print(f"Into Booking Information: user id: {user_id}, route id {routeID}, prices {prices}, confirmationcode {confirmation_code}, date {date}, time {time}, airline {airline}, flight {flight_number}, site {bookingsite}, passengers {passengers}, questions {questions}, pickup {pickup_detailed}, dropoff {dropoff_detailed}, manual booking {manualRouteRequest}")
                dataforbooking = compile_dataforbooking(user_id, routeID, pickup, dropoff, prices, confirmation_code, date, time, airline, flight_number, bookingsite, passengers, questions, pickup_detailed, dropoff_detailed, manualRouteRequest)

                try:
                    insert_into_booking_database(requestType, dataforbooking, cursor)
                except Exception as e:
                    return jsonify({'error': str(e)}), 500
            
            invalidate_cache("booking_numbers") #remove cache of number of bookings per date
            conn.commit()       
            
            generate_email_confirmation(entries, requestType, passengers, email, first_name, last_name, telephone, confirmation_code)
            
            return jsonify({'message': 'Confirmed!'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500
    

@bookings_bp.route('/api/approve-booking', methods=['POST'])
@limiter.limit("10/minute")
@admin_required
def approve_booking():
    data = request.json
    bookingID = data.get('bookingID')
    print(f"bookingID: {bookingID}")
    bookingtable = 'temp_booking'
    bookingIDvariable = 'tempbookingID'
    try:
        # Start database connection
        with get_db_connection(dictionary=False) as (conn, cursor):        
            dataforbooking = fetch_booking_by_id(cursor, bookingtable, bookingIDvariable, bookingID)
            requestType = 'Approve'
            insert_into_booking_database(requestType, dataforbooking, cursor)
            invalidate_cache("booking_numbers") #remove cache of number of bookings per date
            conn.commit()

            # generate_email_confirmation(entries, requestType, passengers, email, confirmationcode)
            print("did the email")

            return jsonify({'message': 'Booking successfully added to Completed Bookings table.'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500
    

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
        with get_db_connection(dictionary=False) as (conn, cursor): 
            dataforbooking = fetch_booking_by_id(cursor, bookingtable, bookingIDvariable, bookingID)
            requestType = 'completed_bookings'       
            # Add to completed_booking table
            insert_into_booking_database(requestType, dataforbooking, cursor)

            # Delete from booking_information table
            delete_booking(cursor, conn, bookingtable, bookingIDvariable, bookingID)
            
            return jsonify({'message': 'Booking successfully added to Completed Bookings table.'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500


def generate_confirmation_code():
    # Use string.ascii_uppercase to get uppercase letters (A-Z)
    return ''.join(random.choices(string.ascii_uppercase, k=6))


def insert_into_booking_database(requestType, dataforbooking, cursor):

    # Determine the correct table based on requestType
    if requestType == 'Auto' or requestType == 'Approve':
        table_name = "booking_information"
    elif requestType == 'completed_bookings':
        table_name = "completed_bookings"
    else:
        table_name = "temp_booking"

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
        cursor.execute(query, values)
        print("Query executed successfully")
    except Exception as e:
        print(f"Error executing query: {e}")
        raise Exception(f"Error executing query: {e}")


def generate_email_confirmation(entries, requestType, passengers, email, first_name, last_name, telephone, confirmationcode):
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

    emailbody.append(f"Our information on file for you: {first_name} {last_name}, telephone number: +{telephone}")

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

    bookingtable = 'temp_booking' if booking_type == 'temp' else 'booking_information'
    bookingIDvariable = 'tempbookingID' if booking_type == 'temp' else 'bookingID'

    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            delete_booking(cursor, conn, bookingtable, bookingIDvariable, bookingID)
            return jsonify({'message': 'Booking successfully deleted.'}), 200
    except Exception as e:
        print(f"exception: {e}")  # Add this
        return jsonify({'error': str(e)}), 500


# Endpoint to get all blackout dates in date order
@bookings_bp.route('/api/getblackoutdates', methods=['GET'])
@admin_required
def fetch_blackout_dates():
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            formatted_dates = create_blackout_date_list(cursor)
            return jsonify(formatted_dates), 200
    except Exception as e:
        print(f"Error fetching blackout dates: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Submit new blackout dates
@bookings_bp.route('/api/postblackoutdates', methods=['POST'])
@admin_required
def post_blackout_dates():
    data = request.json
    blackout_date = data.get('newDate', {})
    if not blackout_date:
        return jsonify({'error': 'No date provided'}), 400 
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            insert_blackout_date(cursor, conn, blackout_date)
            invalidate_cache("blackout_dates") #remove existing blackout date cache
            return jsonify({'message': 'Blackout date added successfully'}), 200
    except Exception as e:
        print(f"Error adding blackout date: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Remove blackout date
@bookings_bp.route('/api/removeblackoutdates', methods=['POST'])
@admin_required
def remove_blackout_dates():
    data = request.json
    blackout_date = data.get('newDate')
    if not blackout_date:
        return jsonify({'error': 'No date provided'}), 400  
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            delete_blackout_date(cursor, conn, blackout_date)
            invalidate_cache("blackout_dates") #remove existing blackout date cache
            return jsonify({'message': 'Blackout date removed successfully'}), 200
    except Exception as e:
        print(f"Error removing blackout date: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Provide the margin for autobooking
@bookings_bp.route('/api/datemargin', methods=['GET'])
def date_margin_for_autobooking():
    datemargin = 2
    return jsonify(datemargin)

if __name__ == '__main__':
    app.run(debug=True)


