from urllib.parse import unquote

def fetch_booking_by_id(cursor, bookingtable, bookingIDvariable, bookingID):
    allowed_tables = ["booking_information", "temp_booking"]
    if bookingtable not in allowed_tables:
        raise ValueError("Invalid table name.")
    query =(f"""
        SELECT *
        FROM booking_database.{bookingtable}
        WHERE {bookingIDvariable} = %s
        ORDER BY booking_date ASC;""")
    print(f"query call data: {query}, bookingID {bookingID}")
    cursor.execute(query, (bookingID,))
    return cursor.fetchall()

def fetch_all_bookings(cursor):
    query = """
        SELECT b.bookingID, b.userID, b.routeID, b.startcity, b.endcity, 
               u.FirstName, u.LastName, u.email, u.PhoneNumber, 
               b.booking_date, b.pickup_time, b.routecost, b.driver, 
               b.passengers, b.flight_airline, b.flight_number, 
               b.questions, b.pickup_location, b.dropoff_location, 
               b.manualbookinginfo
        FROM booking_database.booking_information b
        INNER JOIN booking_database.user_information u 
            ON b.userID = u.userID  
        ORDER BY b.booking_date ASC;
    """
    cursor.execute(query)
    return cursor.fetchall()

def fetch_completed_bookings(cursor):
    query ="""
                SELECT b.bookingID, b.userID, b.routeID, b.startcity, b.endcity, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location, b.manualbookinginfo
                FROM booking_database.completed_bookings b
                INNER JOIN 
                    booking_database.user_information u ON b.userID = u.userID  
                ORDER BY b.booking_date DESC;"""
    cursor.execute(query)  
    return cursor.fetchall()

def fetch_bookings_for_a_day(cursor, booking_date):
    query = """SELECT * FROM booking_database.booking_information 
                 RIGHT JOIN route_information 
                 ON booking_database.booking_information.routeID = booking_database.route_information.routeID 
                 WHERE DATE(booking_date) = %s"""
    cursor.execute(query, (booking_date,))
    return cursor.fetchone()

def fetch_pending_bookings(cursor):
    query ="""
                SELECT b.tempbookingID, b.userID, b.routeID, b.startcity, b.endcity, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location, b.manualbookinginfo, b.confirmation_number
                FROM booking_database.temp_booking b
                INNER JOIN 
                    booking_database.user_information u ON b.userID = u.userID  ORDER BY b.booking_date ASC;"""
    cursor.execute(query)  
    return cursor.fetchall()

def fetch_monthly_summary(cursor, month):
    query = """SELECT COUNT(*) as trips, SUM(routecost) as money_collected
            FROM booking_database.booking_information
            WHERE booking_date LIKE %s
        """
    cursor.execute(query, (f"{month}%",))
    return cursor.fetchone()

def fetch_route_number(pickup, dropoff, cursor):
    pickup = unquote(pickup or '').strip().lower()
    dropoff = unquote(dropoff or '').strip().lower()

    try:
        # Case-insensitive search
        query = """
            SELECT routeID FROM booking_database.route_information 
            WHERE LOWER(startcity) = %s AND LOWER(endcity) = %s
        """
        cursor.execute(query, (pickup, dropoff))
        result = cursor.fetchone()
        if result:
            return result["routeID"]

        print("Trying reverse")
        cursor.execute(query, (dropoff, pickup))
        result = cursor.fetchone()
        if result:
            return result["routeID"]

        print("No route found in either direction.")
        return 9999
    except Exception as e:
        print(f"Error fetching route ID: {e}")
        return 9999
    
def fetch_or_create_user(cursor, conn, first_name, last_name, email, telephone):
    query = """
        INSERT INTO booking_database.user_information (FirstName, LastName, Email, PhoneNumber)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE userID = LAST_INSERT_ID(userID);
    """
    select_query = "SELECT userID FROM booking_database.user_information WHERE Email = %s"

    try:
        cursor.execute(query, (first_name, last_name, email, telephone))
        cursor.execute(select_query, (email,))
        user_id_row = cursor.fetchone()
        conn.commit()

        if user_id_row:
            user_id = user_id_row[0] if isinstance(user_id_row, tuple) else user_id_row.get("userID")
            print(f"User ID found: {user_id}")
            return user_id
        else:
            print("No user ID found after insert/select.")
            return None
    except Exception as e:
        print(f"Error during user fetch or creation: {e}")
        return None
    

def get_user_by_email(cursor, email):
    query = "SELECT * FROM booking_database.user_information WHERE Email = %s AND role IN ('dev','admin')"
    cursor.execute(query, (email,))
    return cursor.fetchone()


def insert_valid_phone_number(cursor, conn, phone_number):
    query = "INSERT IGNORE INTO booking_database.valid_phone_numbers (phone_number) VALUES (%s);"
    cursor.execute(query, (phone_number,))
    conn.commit()


def fetch_all_locations_long_short(cursor):
    query = "SELECT DISTINCT endcity AS long_name, endcity_shortname AS short_name FROM booking_database.route_information;"
    cursor.execute(query) 
    return cursor.fetchall()


def fetch_all_distinct_start_city(cursor):
    query = "SELECT DISTINCT startcity FROM booking_database.route_information"
    cursor.execute(query)
    return cursor.fetchall()


def fetch_all_distinct_end_city(cursor):
    query = "SELECT DISTINCT endcity FROM booking_database.route_information"
    cursor.execute(query)
    return cursor.fetchall()


def fetch_end_city_from_start_city(cursor, startcity):
    query = "SELECT DISTINCT endcity FROM booking_database.route_information WHERE startcity = %s"
    cursor.execute(query, (startcity,))
    return cursor.fetchall()


def fetch_standardrate_and_passengertype(cursor, routenumber):
    if routenumber == '9999':
        return int(99999)
    else:
        query = """
            SELECT stdrate, addlpassengertype
            FROM booking_database.route_information
            WHERE routeID = %s
        """        
        cursor.execute(query, (routenumber,))
        result = cursor.fetchone()
        if not result:
            return None
        return result


def fetch_pricing_rules(cursor):
    query = "SELECT ruleID, datestart, dateend, percentadjustment, priceadjustment, override FROM booking_database.pricing_rules ORDER BY datestart ASC"
    cursor.execute(query)
    rows = cursor.fetchall()
    # If dictionary cursor, just return rows as-is
    if rows and isinstance(rows[0], dict):
        return rows
    # Fallback for tuple cursor
    fields = ["ruleID", "datestart", "dateend", "percentadjustment", "priceadjustment", "override"]
    return [dict(zip(fields, row)) for row in rows]


def create_blackout_date_list(cursor):
    query = "SELECT blackoutdate FROM booking_database.blackout_dates ORDER BY blackoutdate ASC"
    cursor.execute(query)
    blackoutdates = cursor.fetchall()

    # Works whether results are tuples or dicts
    if blackoutdates and isinstance(blackoutdates[0], dict):
        return [row["blackoutdate"] for row in blackoutdates]
    else:
        return [row[0] for row in blackoutdates]


def insert_blackout_date(cursor, conn, blackout_date):
    query = "INSERT INTO booking_database.blackout_dates (blackoutdate) VALUES (%s)"
    cursor.execute(query, (blackout_date,))
    conn.commit()


def delete_blackout_date(cursor, conn, blackout_date):
    query = "DELETE FROM booking_database.blackout_dates WHERE blackoutdate = %s"
    cursor.execute(query, (blackout_date,))
    conn.commit()

def fetch_booking_number_dict(cursor):
    query = "SELECT booking_date, COUNT(*) AS number_of_bookings FROM booking_database.booking_information WHERE booking_date >= CURDATE() GROUP BY booking_date ORDER BY booking_date"
    cursor.execute(query)
    rows = cursor.fetchall()

    if rows and isinstance(rows[0], dict):
        out = {}
        for row in rows:
            d = row["booking_date"]
            cnt = row["number_of_bookings"]
            key = d.strftime('%Y-%m-%d') if hasattr(d, "strftime") else str(d)
            out[key] = cnt
        return out

    # Fallback for tuple cursor
    return {date.strftime('%Y-%m-%d'): value for date, value in rows}

def delete_pricing_rule(cursor, ruleID):
    query = "DELETE FROM booking_database.pricing_rules WHERE ruleID = %s"
    cursor.execute(query, (ruleID,))


def create_pricing_rule(cursor, conn, datestart, dateend, percentinc, addinc):
    query = "INSERT INTO booking_database.pricing_rules (datestart, dateend, percentadjustment, priceadjustment) VALUES (%s, %s, %s, %s);"
    cursor.execute(query, (datestart, dateend, percentinc, addinc))
    conn.commit()


def delete_booking(cursor, conn, bookingtable, bookingIDvariable, bookingID):
    delete_query = f"DELETE FROM booking_database.{bookingtable} WHERE {bookingIDvariable} = %s"
    cursor.execute(delete_query, (bookingID,))
    conn.commit()


def post_driver_name(cursor, conn, driver_name, booking_id):
    query = """
                UPDATE booking_database.booking_information 
                SET driver = %s 
                WHERE bookingID = %s
            """
    cursor.execute(query, (driver_name, booking_id))
    conn.commit()


def check_valid_phonenumber(cursor, phonenumber):
    try:
        number_query = "SELECT EXISTS(SELECT 1 FROM booking_database.valid_phone_numbers WHERE phone_number = %s);"
        cursor.execute(number_query, (phonenumber,))
        result = cursor.fetchone()
        if isinstance(result, dict):
            exists = result.get("exists_flag", 0) == 1
        else:
            exists = result[0] == 1
        return exists
    except Exception as e:
        print(f"Database error checking phone number: {e}")
        return None 
    

def fetch_driver_monthly_summary(cursor, month):
    query = """
        SELECT driver_name, COUNT(*) AS trips, SUM(routecost) AS money_collected
        FROM booking_database.booking_information
        WHERE booking_date LIKE %s
        GROUP BY driver_name
    """
    cursor.execute(query, (f"{month}%",))
    return cursor.fetchall()
