from datetime import datetime, timedelta, date
from decimal import Decimal
import bleach

def serialize_records(records):
    return [
        {key: convert_to_serializable(value) for key, value in record.items()}
        for record in records
    ]

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

def sanitize_text(value: str) -> str:
    return bleach.clean(value or "")

def sanitize_personal_fields(booking_data):
    if isinstance(booking_data, list):
        return [sanitize_personal_fields(entry) for entry in booking_data]
    return {
        "first_name": sanitize_text(booking_data.get("firstName")),
        "last_name": sanitize_text(booking_data.get("lastName")),
        "email": sanitize_text(booking_data.get("email")),
        "telephone": sanitize_text(booking_data.get("telephone")),
        "questions": sanitize_text(booking_data.get("questions")),
        "manualRouteRequest": sanitize_text(booking_data.get("manualRouteRequest")),
        "requestType": booking_data.get("requestType"),
        "bookingSite": booking_data.get("bookingsite"),
        "confirmationCode": booking_data.get("confirmationCode"),
        "passengers": booking_data.get("passengers"),
        "largeGroupPassengers": booking_data.get("largeGroupPassengers"),
    }

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