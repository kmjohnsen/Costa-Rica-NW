from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta, timezone
from api.db import get_db_connection
from api.utils import serialize_records
from api.SQL_access_functions import (
  fetch_standardrate_and_passengertype,
  fetch_pricing_rules, 
  create_blackout_date_list, 
  fetch_booking_number_dict, 
  delete_pricing_rule, 
  create_pricing_rule,
)
from api.pricing_helpers import compute_date_based_prices, get_passenger_price_addl
from api.cache_utils import get_cached, invalidate_cache

prices_bp = Blueprint('prices', __name__)

DEMAND_BASED_QUANTITY = 4
DEMAND_BASED_PERCENT = 5


@prices_bp.route('/api/prices', methods=['GET'])
def get_route_prices():
    routenumber = request.args.get("routenumber")
    passengers = request.args.get("passengers")
    start_date = request.args.get("startdate")
    end_date = request.args.get("enddate")

    if not routenumber or not start_date or not end_date:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        data = calculate_route_prices(routenumber, passengers, start_date, end_date)
        return jsonify(data), 200 
    except Exception as e:
        print(f"Error in /api/prices: {e}")
        return jsonify({"error": str(e)}), 500

# Route to get the prices of the route for each day
def calculate_route_prices(routenumber, passengers, start_date_str, end_date_str):

    # Handle if only one date is provided (a one-way trip)
    if not end_date_str:
        end_date_str = start_date_str

    if not routenumber or not start_date_str:
        return jsonify({'error': 'Missing required parameters'}), 400

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

    with get_db_connection(dictionary=True) as (conn, cursor):        
        route_info = fetch_standardrate_and_passengertype(cursor, routenumber)
        if not route_info:
            return jsonify({"Error: Invalid route number"}), 404
        
        print(f"route_info: {route_info}, type: {type(route_info)}")
        if isinstance(route_info, dict):
            standard_rate = route_info["stdrate"]
        else:
            standard_rate = route_info[0]            

        addl_passenger_type = route_info["addlpassengertype"]
        passenger_rate_add = int(get_passenger_price_addl(passengers, addl_passenger_type))
        
        pricing_rules = get_cached("pricing_rule", lambda: fetch_pricing_rules(cursor))
        blackout_dates = get_cached("blackout_dates", lambda:create_blackout_date_list(cursor))
        booking_number_dict = get_cached("booking_numbers", lambda:fetch_booking_number_dict(cursor))
        
        prices, adjustments = compute_date_based_prices(
            start_date,
            end_date,
            standard_rate,
            passenger_rate_add,
            pricing_rules,
            booking_number_dict,
            blackout_dates,
            DEMAND_BASED_QUANTITY,
            DEMAND_BASED_PERCENT,
        )

        return {"prices": prices, "adjustments": adjustments}


# Endpoint to get all blackout dates in date order
@prices_bp.route('/api/getpricingrules', methods=['GET'])
def get_pricing_rules():
    try:
        with get_db_connection(dictionary=True) as (conn, cursor):        
            rules = fetch_pricing_rules(cursor)
            return jsonify(rules), 200
    except Exception as e:
        print(f"Error fetching pricing rules: {e}")
        return jsonify({'error': str(e)}), 500


# Remove pricing rule date
@prices_bp.route('/api/removepricingrule', methods=['POST'])
def remove_pricing_rule():
    invalidate_cache("pricing_rule")
    data = request.json
    ruleID = data.get('ruleID') 

    if not ruleID:
        return jsonify({'error': 'Rule ID is required'}), 400  # Handle the case where no date is provided

    try:
        with get_db_connection(dictionary=False) as (conn, cursor):        
            delete_pricing_rule(cursor, ruleID)
            if cursor.rowcount == 0:  # Check if any rows were affected
                return jsonify({'error': 'No pricing rule found with the provided Rule ID'}), 404
            conn.commit()
            
            return jsonify({'message': 'Pricing rule removed successfully'}), 200
    
    except Exception as e:
        print(f"MySQL Error: {str(e)}")  # Log detailed SQL errors
        return jsonify({'error': f"Database error: {str(e)}"}), 500


# Remove pricing rule date
@prices_bp.route('/api/postpricingrule', methods=['POST'])
def post_pricing_rule():
    invalidate_cache("pricing_rule")
    data = request.json
    data = data['newPricingRule']
    datestart = data.get('datestart') 
    dateend = data.get('dateend') 
    percentinc = data.get('percentinc') or None
    addinc = data.get('addinc') or None

    if not datestart or not dateend:
        return jsonify({'error': 'dates are required'}), 400  # Handle the case where no date is provided
    
    if not percentinc and not addinc:
        return jsonify({'error': 'percent increase OR additive increase required'}), 400  # Handle the case where no date is provided

    try:
        with get_db_connection(dictionary=False) as (conn, cursor):        
            create_pricing_rule(cursor, conn, datestart, dateend, percentinc, addinc)
            return jsonify({'message': 'Pricing rule added successfully'}), 200
    except Exception as e:
        print(f"Error adding pricing rule: {e}")  # Catch other unexpected errors
        return jsonify({'error': f"Failed to add pricing rule: {str(e)}"}), 500

