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