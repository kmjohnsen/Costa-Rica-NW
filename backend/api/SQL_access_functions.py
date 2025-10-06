from urllib.parse import unquote

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