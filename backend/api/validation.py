import re
from datetime import datetime, timedelta
from flask import jsonify

MAX_DAYS_AHEAD = 365
DATE_FMT = "%Y-%m-%d"

VALID_REQUEST_TYPES = {
    "Auto",
    "Large Group",
    "Upcoming",
    "Invalid Phone",
    "Alternate Route",
}


def validate_booking_request(booking_data: dict):
    """
    Validate booking request fields for business rules.
    Returns (True, None) if valid, or (False, error_response) if invalid.
    """

    # Required fields
    required = ["firstName", "lastName", "email", "telephone", "requestType", "entries"]
    for field in required:
        if not booking_data.get(field):
            return False, jsonify({"error": f"Missing required field: {field}"}), 400

    # Request type
    request_type = booking_data.get("requestType")
    if request_type not in VALID_REQUEST_TYPES:
        return False, jsonify({"error": "Invalid Request Type"}), 400

    # Email format
    email = booking_data.get("email")
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return False, jsonify({"error": "Invalid email format"}), 400

    # Phone number format (basic length + digits check)
    telephone = booking_data.get("telephone")
    if not re.match(r"^\+?\d{8,15}$", telephone):
        return False, jsonify({"error": "Invalid phone number format"}), 400

    # Entries validation
    entries = booking_data.get("entries", [])
    if not entries:
        return False, jsonify({"error": "At least one trip entry is required"}), 400

    for entry in entries:
        # Date validation
        try:
            date_obj = datetime.strptime(entry.get("date", ""), DATE_FMT)
        except ValueError:
            return False, jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        max_date = datetime.today() + timedelta(days=MAX_DAYS_AHEAD)
        if date_obj > max_date:
            return False, jsonify({"error": "Date is too far in the future"}), 400

        # Time basic check
        if not re.match(r"^\d{2}:\d{2}$", entry.get("time", "")):
            return False, jsonify({"error": "Invalid time format. Use HH:MM"}), 400

    return True, None
