from flask import Flask, Blueprint, jsonify, request
from datetime import datetime, date, timedelta
from decimal import Decimal
import mysql.connector
import os
from dotenv import load_dotenv

app = Flask(__name__)

# Define a blueprint for locations
prices_bp = Blueprint('prices', __name__)

load_dotenv()

# Database configuration using os.getenv()
db_config = {
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'host': os.getenv("DB_HOST"),
    'database': os.getenv("DB_NAME"),
    'port': int(os.getenv("DB_PORT"))  # Convert port to integer
}

# How many bookings before the price increases, and by what percentage
demand_based_quantity = 4
demand_based_percent = 5 # numbers in percent. Must be an integer
print("hi")

# Route to get the prices of the route for each day
@prices_bp.route('/api/prices', methods=['GET'])
def get_route_prices():
    print("starting prices routine")
    routenumber = request.args.get('routenumber')  # Get the 'pickup' query parameter
    passengers = request.args.get('passengers')
    start_date_str = request.args.get('startdate')
    end_date_str = request.args.get('enddate')

    output = calculate_route_prices(routenumber, passengers, start_date_str, end_date_str)
    return jsonify(output)

def calculate_route_prices(routenumber, passengers, start_date_str, end_date_str):
    current_date_str = start_date_str
    start_date_dateobj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    current_date_dateobj = start_date_dateobj
    end_date_dateobj = datetime.strptime(end_date_str, '%Y-%m-%d').date()

    # print(f"start date string: {start_date_str}, end date string: {end_date_str}, current date string: {current_date_str}, types: {type(start_date_str)}, {type(end_date_str)}, {type(current_date_str)}")
    # print(f"start date obj: {start_date_dateobj}, end date obj: {end_date_dateobj}, current date obj: {current_date_dateobj}, types: {type(start_date_dateobj)}, {type(end_date_dateobj)}, {type(current_date_dateobj)}")

    if not routenumber:
        return jsonify({'error': 'Pickup and dropoff location is required'}), 400
    
    if not passengers:
        passengers = 1
    try:
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        print(f"routenumber{routenumber}")
        
        if routenumber == '9999':
            standard_rate = 99999
            passenger_rate_add = 0
            print(f"stdrate, passenger rate: {standard_rate}, {passenger_rate_add}")
        else:
            print("here")
            # Find the route standard rate
            query = ("SELECT stdrate FROM booking_database.route_information WHERE routeID = %s")
            cursor.execute(query, (routenumber,))
            standardrate = cursor.fetchone()

            query = ("SELECT addlpassengertype FROM booking_database.route_information WHERE routeID = %s")
            cursor.execute(query, (routenumber,))
            addlpassengertype = cursor.fetchone()[0]
            print(f"addl passenger type {addlpassengertype}")
            if not standardrate:
                return jsonify({'error': 'No standard rate found for the selected route'}), 404

            standard_rate = int(standardrate[0])  # Extract the first value from the tuple
            print(f"passengers: {passengers}")
            passenger_rate_add = int(get_passenger_price_addl(passengers, addlpassengertype))
            print(f"passenger rate: {passenger_rate_add}")
            print(f"stdrate, passenger rate: {standard_rate}, {passenger_rate_add}")

        query = ("SELECT * FROM booking_database.pricing_rules")
        cursor.execute(query)
        pricing_rules = cursor.fetchall()
        # print(f"pricing rules:  {pricing_rules}")
        fields = ['ruleID', 'datestart', 'dateend', 'percentadjustment', 'priceadjustment', 'override']
        list_of_pricing_rules_dicts = [dict(zip(fields, item)) for item in pricing_rules]

        # Create a dictionary with dates as keys (in "yyyy-mm-dd" format) and None as the values
        # Start with tomorrow's date
        dates_prices_dict = {}
        price_adjust_dict = {}
        dates_prices_dict = create_dates_prices_dict(start_date_str, end_date_str, (standard_rate + passenger_rate_add))
        
        # print(f"date price dict: {dates_prices_dict}")
        # print(f"start date {start_date_str}")
        # print(f"end date {end_date_str}")

        # Look at blockout dates
        query = ("SELECT blackoutdate FROM booking_database.blackout_dates")
        cursor.execute(query)
        blackoutdates = cursor.fetchall()
        blackoutdates_list = [date_tuple[0] for date_tuple in blackoutdates]
        
        # Find the number of bookins by date
        query = ("SELECT booking_date, COUNT(*) AS number_of_bookings FROM booking_information WHERE booking_date >= CURDATE() GROUP BY booking_date ORDER BY booking_date")
        cursor.execute(query)
        bookingsbydate = cursor.fetchall()
        booking_number_dict = {date.strftime('%Y-%m-%d'): value for date, value in bookingsbydate}
        # print(f"bookings by date: {booking_number_dict}")
        
        print(f"current date, end date {current_date_dateobj} {end_date_dateobj}")
        while current_date_dateobj <= end_date_dateobj:
            # print(f"Current Date: {current_date} end date: {end_date}, types {type(current_date)} {type(end_date)}")
            adjustment_text = ""
            price = standard_rate
            # print("here now")
            # print(f"list of pricing rules: {list_of_pricing_rules_dicts}")

            for rule in list_of_pricing_rules_dicts:
                # print(f"rule {rule}")
                # print(f"date start: {(rule['datestart'])}")
                # print(f"rule number: {(rule['ruleID'])}")
                # print(f"current date: {current_date}")
                rule_start = rule['datestart']
                rule_end = rule['dateend']
                # print(f"rule start: {rule_start}, rule end: {rule_end}")
                # print(f"current date datetimeobject = {current_date_dateobj}")
                # print(f"types rule start: {type(rule_start)},  rule end: {type(rule_end)},  current date: {type(current_date_dateobj)}")
                if rule_start  <= current_date_dateobj <= rule_end:
                    # print("made it here")
                    if rule['percentadjustment'] is not None:
                        # print(f"percent {rule['percentadjustment']}")
                        # print(f"percent {int(rule['percentadjustment'])}")
                        percent_factor = ((100 + int(rule['percentadjustment'])) / 100)
                        # print(f"percent factor: {percent_factor}")
                        price = round(price * percent_factor)
                        adjustment_text = adjustment_text + str(rule['percentadjustment']) + "percent increase from rule " + str(rule)
                    elif rule['priceadjustment'] is not None:
                        # print(f"priceadjust {rule['priceadjustment']}")
                        price = price + int(rule['priceadjustment'])
                        adjustment_text = adjustment_text + "$" + str(rule['percentadjustment']) + " increase from rule " + str(rule)
                # print("next step")

            # Add per person passenger rate adjustment
            adjustment_text = adjustment_text + "Passenger Count increases rate by $" + str(passenger_rate_add)
            # print("after adjustment text")

            # Add demand-based (4 or more) price increase
            # print(f"slkdjflasdk {current_date_dateobj.strftime('%Y-%m-%d')}")
            current_date_str = current_date_dateobj.strftime('%Y-%m-%d')
            # print(f"current date string {current_date_str}")

            if current_date_str in booking_number_dict:
                booking_num = booking_number_dict[current_date_str]  # Use current_date_str for lookup
                if booking_num > demand_based_quantity:
                    demand_based_increase = 1 + (((booking_num - demand_based_quantity) * 5) / 100)  # percent increase to calculate
                    adjustment_text = adjustment_text + f" Demand-based increase in rate by {demand_based_increase}%"
                else:
                    demand_based_increase = 1.0
            else:
                # print(f"No bookings found for {current_date_str}")
                demand_based_increase = 1.0

            # print("after demand price increase")

            # print(f"blackout date: {(blackoutdates_list)}")
            # print(f"current date: {(current_date_str)}")

            if current_date_str in blackoutdates_list:
                dates_prices_dict[current_date_str] = 'N/A'
                # print("NA")
            else:
                dates_prices_dict[current_date_str] = round((price + passenger_rate_add) * demand_based_increase)
                price_adjust_dict[current_date_str] = adjustment_text                          
            
            # print(f"dates prices dict: {dates_prices_dict}")
            current_date_dateobj += timedelta(days=1)
            # print(f"Date Prices Dictionary: {dates_prices_dict}")

        print("After blackouts")
        # Convert the dictionary keys to string format (YYYY-MM-DD)
        # dates_prices_dict_str = {date.strftime("%Y-%m-%d"): price for date, price in dates_prices_dict.items()}
        # print(f"date dict: {dates_prices_dict}")
        return dates_prices_dict
    except Exception as e:
        return {'error': str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def create_dates_prices_dict(start_date, end_date, rate):
    # Ensure start_date and end_date are datetime objects
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    
    # Create the dictionary
    total_days = (end_date - start_date).days
    # print(f"total days: {total_days}")
    dates_prices_dict = {
        (start_date + timedelta(days=i)).strftime('%Y-%m-%d'): rate for i in range(total_days + 1)
    }
    # print(f"dates_prices dict {dates_prices_dict}")
    # print(f"type{type(dates_prices_dict)}")
    
    return dates_prices_dict

# Endpoint to get all blackout dates in date order
@prices_bp.route('/api/getpricingrules', methods=['GET'])
def get_pricing_rules():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    query = "SELECT * FROM booking_database.pricing_rules ORDER BY datestart ASC"
    cursor.execute(query)
    rules = cursor.fetchall()
    print(f"rules {rules}")

    columns = ["ruleID", "datestart", "dateend", "percentinc", "addinc", "override"]
    rules_dicts = [
        {
            columns[i]: (
                row[i].isoformat() if isinstance(row[i], date) else  # Convert `datetime.date` to string
                float(row[i]) if isinstance(row[i], Decimal) else   # Convert `Decimal` to float
                row[i]
            )
            for i in range(len(columns))
        }
        for row in rules
    ]
    
    cursor.close()
    conn.close()

    return jsonify(rules_dicts)


# Remove pricing rule date
@prices_bp.route('/api/removepricingrule', methods=['POST'])
def remove_pricing_rule():
    data = request.json
    ruleID = data.get('ruleID') 

    if not ruleID:
        return jsonify({'error': 'Rule ID is required'}), 400  # Handle the case where no date is provided

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        query = "DELETE FROM booking_database.pricing_rules WHERE ruleID = %s"
        cursor.execute(query, (ruleID,))

        if cursor.rowcount == 0:  # Check if any rows were affected
            return jsonify({'error': 'No pricing rule found with the provided Rule ID'}), 404
        
        conn.commit()
        return jsonify({'message': 'Pricing rule removed successfully'}), 200
    
    except mysql.connector.Error as sql_err:
        print(f"MySQL Error: {str(sql_err)}")  # Log detailed SQL errors
        return jsonify({'error': f"Database error: {str(sql_err)}"}), 500
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")  # Catch other unexpected errors
        return jsonify({'error': f"An unexpected error occurred: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Remove pricing rule date
@prices_bp.route('/api/postpricingrule', methods=['POST'])
def post_pricing_rule():
    data = request.json
    data = data['newPricingRule']
    datestart = data.get('datestart') 
    dateend = data.get('dateend') 
    percentinc = data.get('percentinc') or None
    addinc = data.get('addinc') or None
    print(f"new pricing rule {request.json}")
    print(f"datestart {datestart}")
    print(f"dateend {dateend}")
    print(f"percentinc {percentinc}")
    print(f"addinc {addinc}")

    if not datestart or not dateend:
        return jsonify({'error': 'dates are required'}), 400  # Handle the case where no date is provided
    
    if not percentinc and not addinc:
        return jsonify({'error': 'percent increase OR additive increase required'}), 400  # Handle the case where no date is provided
    print("here")

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        query = "INSERT INTO booking_database.pricing_rules (datestart, dateend, percentadjustment, priceadjustment) VALUES (%s, %s, %s, %s);"
        print(f"query {query}")
        cursor.execute(query, (datestart, dateend, percentinc, addinc))
        
        conn.commit()
        return jsonify({'message': 'Pricing rule added successfully'}), 200
    
    except mysql.connector.Error as sql_err:
        print(f"MySQL Error: {str(sql_err)}")  # Log detailed SQL errors
        return jsonify({'error': f"Database error: {str(sql_err)}"}), 500
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")  # Catch other unexpected errors
        return jsonify({'error': f"An unexpected error occurred: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@prices_bp.route('/api/prices_by_date', methods=['GET'])
def get_route_price_day():
    pickup = request.args.get('pickup')  # Get the 'pickup' query parameter
    dropoff = request.args.get('dropoff')  # Get the 'pickup' query parameter
    passengers = request.args.get('passengers')
    date = request.args.get('date')

    if not pickup or not dropoff or not passengers or not date:
        return jsonify({'error': 'Pickup and dropoff location, passengers and date are required'}), 400
    
    if not passengers:
        passengers = 1
    try:
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Find the route number
        query = ("SELECT routeID FROM booking_database.route_information WHERE startcity = %s AND endcity = %s")
        cursor.execute(query, (pickup, dropoff))
        routeIDnum = cursor.fetchone()
        
        if not routeIDnum:
            return jsonify({'error': 'No route found for the selected cities'}), 404
        
        routeID = routeIDnum[0]  # Extract the first value from the tuple
        print(f"Pickup: {pickup}, Dropoff: {dropoff}, Route ID: {routeID}, Passengers {passengers}")  # For debugging
        
        # Find the route standard rate
        query = ("SELECT stdrate FROM booking_database.route_information WHERE routeID = %s")
        cursor.execute(query, (routeID,))
        standardrate = cursor.fetchone()

        query = ("SELECT addlpassengertype FROM booking_database.route_information WHERE routeID = %s")
        cursor.execute(query, (routeID,))
        addlpassengertype = cursor.fetchone()

        # Find the route standard rate
        query = ("SELECT * FROM booking_database.pricing_rules")
        cursor.execute(query)
        pricing_rules = cursor.fetchall()
        # print(f"pricing rules:  {pricing_rules}")
        fields = ['ruleID', 'datestart', 'dateend', 'percentadjustment', 'priceadjustment', 'override']
        list_of_pricing_rules_dicts = [dict(zip(fields, item)) for item in pricing_rules]
        # print(f"dictionary: {list_of_pricing_rules_dicts}")

        # Find the number of bookins by date
        query = ("SELECT booking_date, COUNT(*) AS number_of_bookings FROM booking_information WHERE booking_date = %s")
        cursor.execute(query, (date,))
        booking_number = cursor.fetchone()
        booking_num = booking_number[1]
        # print(f"bookings by date2: {booking_number}, {booking_num}")

        if not standardrate:
            return jsonify({'error': 'No standard rate found for the selected route'}), 404

        standard_rate = int(standardrate[0])  # Extract the first value from the tuple
        # print(f"passengers: {passengers}")
        passenger_rate_add = int(get_passenger_price_addl(passengers, addlpassengertype))
        print(f"passenger rate: {passenger_rate_add}")

        current_date = datetime.strptime(date, '%Y-%m-%d')
        current_date = current_date.date()
        dates_prices_dict = {}
        price_adjust_dict = {}
        
        adjustment_text = ""
        price = standard_rate 
        for rule in list_of_pricing_rules_dicts:
            # print(f"rule {rule}")
            # print(f"date start: {(rule['datestart'])}")
            # print(f"rule number: {(rule['ruleID'])}")
            rule_start = rule['datestart']
            rule_end = rule['dateend']
            # print(f"rule start: {type(rule_start)}")
            # print(f"date {type(current_date)}")
            # print(f"rule end: {type(rule_end)}")
            if rule_start  <= current_date <= rule_end:
                print("made it here")
                if rule['percentadjustment'] is not None:
                    print(f"percent {rule['percentadjustment']}")
                    print(f"percent {int(rule['percentadjustment'])}")
                    percent_factor = ((100 + int(rule['percentadjustment'])) / 100)
                    print(f"percent factor: {percent_factor}")
                    price = round(price * percent_factor)
                    adjustment_text = adjustment_text + str(rule['percentadjustment']) + "percent increase from rule " + str(rule)
                elif rule['priceadjustment'] is not None:
                    print(f"priceadjust {rule['priceadjustment']}")
                    price = price + int(rule['priceadjustment'])
                    adjustment_text = adjustment_text + "$" + str(rule['percentadjustment']) + " increase from rule " + str(rule)
        
        # print("made it hereA")
        # Add per person passenger rate adjustment
        adjustment_text = adjustment_text + "Passenger Count increases rate by $" + str(passenger_rate_add)
        # print(f"adjustment text1: {adjustment_text}")
        # Add demand-based (4 or more) price increase
        # print(f"booking number {booking_number}")
        if booking_num > demand_based_quantity:
            demand_based_increase = 1 + (((booking_num - demand_based_quantity) * demand_based_percent) / 100)  # percent increase to calculate
            adjustment_text = adjustment_text + f" Demand-based increase in rate by {demand_based_increase}%"
        else:
            demand_based_increase = 1.0

        # Look at blockout dates

        dates_prices_dict[current_date] = round((price + passenger_rate_add) * demand_based_increase)
        price_adjust_dict[current_date] = adjustment_text    
        # print("made it here b")                                 

        # Convert the dictionary keys to string format (YYYY-MM-DD)
        dates_prices_dict_str = {date.strftime("%Y-%m-%d"): price for date, price in dates_prices_dict.items()}
        print(f"date prices dict {dates_prices_dict_str}")
        return jsonify(dates_prices_dict_str)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def get_passenger_price_addl(passengers, addlpassengertype):
    if addlpassengertype == 1:
        print(f"addl passenger type 1 CHECK passengers{passengers}")
        if passengers == "11+":
            addlprice = 9999
        elif int(passengers) < 3: # No additional for 1-2
            addlprice = 0
        elif 3 <= int(passengers) < 5: # $10 additional for 3-4
            addlprice = 10
        elif 5 <= int(passengers) < 7: # $20 additional for 5-6
            addlprice = 30
        elif 7 <= int(passengers) < 9: # $30 additional for 7-8
            addlprice = 60
        elif 9 <= int(passengers) < 11: # $30 additional for 7-8
            addlprice = 100
        elif 11 <= int(passengers):
            addlprice = 9999
        else:
            return("error in finding additional passenger rate")
        print(f"addl price {addlprice}")

    elif addlpassengertype == 2:
        print("addl passenger type 2 CHECK")
        if passengers == "11+":
            addlprice = 9999
        elif int(passengers) < 3: # No additional for 1-2
            addlprice = 0
        elif 3 <= int(passengers) < 5: # $10 additional for 3-4
            addlprice = 30
        elif 5 <= int(passengers) < 7: # $20 additional for 5-6
            addlprice = 40
        elif 7 <= int(passengers) < 9: # $30 additional for 7-8
            addlprice = 80
        elif 9 <= int(passengers) < 11: # $30 additional for 7-8
            addlprice = 120
        elif 11 <= int(passengers):
            addlprice = 9999
        else:
            return("error in finding additional passenger rate")
        print(f"addl price {addlprice}")

    return addlprice
    
