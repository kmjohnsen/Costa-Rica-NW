CREATE DATABASE booking_database;

CREATE TABLE IF NOT EXISTS route_information (routeID INT NOT NULL UNIQUE PRIMARY KEY AUTO_INCREMENT, 
startcity VARCHAR(255) NOT NULL, endcity VARCHAR(255) NOT NULL, endcity_shortname VARCHAR(225) NOT NULL, stdrate FLOAT NOT NULL, duration INT NOT NULL, addlpassengertype INT NOT NULL);

CREATE TABLE IF NOT EXISTS user_information (userID INT NOT NULL UNIQUE PRIMARY KEY AUTO_INCREMENT, 
FirstName VARCHAR(255) NOT NULL, LastName VARCHAR(255) NOT NULL, Email VARCHAR(255) NOT NULL, PhoneNumber VARCHAR(255) NOT NULL, 
UserPassword VARCHAR(255) NOT NULL, `role` ENUM('admin', 'dev', 'user', 'driver') NULL DEFAULT 'user');

CREATE TABLE IF NOT EXISTS booking_information (bookingID INT NOT NULL UNIQUE PRIMARY KEY AUTO_INCREMENT, 
userID INT NOT NULL, routeID INT NOT NULL, startcity VARCHAR(255) NOT NULL, endcity VARCHAR(255) NOT NULL, pickup_location TEXT NULL DEFAULT NULL, dropoff_location TEXT NULL DEFAULT NULL, routecost DECIMAL(10,0) NOT NULL, passengers INT NOT NULL, 
confirmation_number TEXT NOT NULL, booking_date DATE NOT NULL, pickup_time TIME NOT NULL, 
flight_airline TEXT NULL DEFAULT NULL, flight_number INT NULL DEFAULT NULL, booking_site ENUM('lirshuttle.com', 'lirtransfers.com', 'costaricanorthwest.com', 'Direct') NULL DEFAULT NULL, 
driver ENUM('Aaron', 'Carlos'), questions TEXT NULL DEFAULT NULL, manualbookinginfo TEXT NULL DEFAULT NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS completed_bookings (bookingID INT NOT NULL UNIQUE PRIMARY KEY AUTO_INCREMENT, 
userID INT NOT NULL, routeID INT NOT NULL, startcity VARCHAR(255) NOT NULL, endcity VARCHAR(255) NOT NULL, pickup_location TEXT NULL DEFAULT NULL, dropoff_location TEXT NULL DEFAULT NULL, routecost DECIMAL(10,0) NOT NULL, passengers INT NOT NULL, 
confirmation_number TEXT NOT NULL, booking_date DATE NOT NULL, pickup_time TIME NOT NULL, 
flight_airline TEXT NULL DEFAULT NULL, flight_number INT NULL DEFAULT NULL, booking_site ENUM('lirshuttle.com', 'lirtransfers.com', 'costaricanorthwest.com', 'Direct') NULL DEFAULT NULL, 
driver ENUM('Aaron', 'Carlos'), questions TEXT NULL DEFAULT NULL, manualbookinginfo TEXT NULL DEFAULT NULL, created_at TIMESTAMP NOT NULL);

CREATE TABLE IF NOT EXISTS temp_booking (tempbookingID INT NOT NULL UNIQUE PRIMARY KEY AUTO_INCREMENT, 
userID INT NOT NULL, routeID INT NOT NULL, pickup_location TEXT NULL DEFAULT NULL, dropoff_location TEXT NULL DEFAULT NULL, routecost DECIMAL(10,0) NOT NULL, passengers INT NOT NULL, 
confirmation_number TEXT NULL, booking_date DATE NOT NULL, pickup_time TIME NOT NULL, 
flight_airline TEXT NULL DEFAULT NULL, flight_number INT NULL DEFAULT NULL, booking_site ENUM('lirshuttle.com', 'lirtransfers.com', 'costaricanorthwest.com', 'Direct') NULL DEFAULT NULL, 
driver ENUM('Aaron', 'Carlos'), questions TEXT NULL DEFAULT NULL, manualbookinginfo TEXT NULL DEFAULT NULL,created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP);
# Text NULL for confirmation number because could not have confirmation number if a Large Group requestType

 CREATE TABLE IF NOT EXISTS pricing_rules (ruleID INT NOT NULL PRIMARY KEY AUTO_INCREMENT, datestart DATE NOT NULL, 
 dateend DATE NOT NULL, percentadjustment DECIMAL(10,0), priceadjustment DECIMAL(10,0), override BOOLEAN DEFAULT FALSE);
 
 CREATE TABLE IF NOT EXISTS user_information (userID INT NOT NULL PRIMARY KEY AUTO_INCREMENT, role ENUM('dev', 'admin', 'user', 'driver'), 
 FirstName VARCHAR(255) NOT NULL, LastName VARCHAR(255) NOT NULL, Email VARCHAR(255) NOT NULL, PhoneNumber VARCHAR(255) NOT NULL, 
 UserPassword VARCHAR(255)); 
 
CREATE TABLE IF NOT EXISTS blackout_dates (dateID INT NOT NULL PRIMARY KEY AUTO_INCREMENT, blackoutdate DATE NOT NULL);

CREATE TABLE IF NOT EXISTS valid_phone_numbers (phone_number VARCHAR(15) PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE DATABASE rate_limit_db;
SELECT User, Host, authentication_string FROM mysql.user;
ALTER USER 'root'@'localhost' IDENTIFIED BY '76438521';
FLUSH PRIVILEGES;
SHOW DATABASES;
CREATE TABLE IF NOT EXISTS rate_limit (`key` VARCHAR(255) NOT NULL PRIMARY KEY,
    value TEXT NOT NULL);
GRANT ALL PRIVILEGES ON rate_limit_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

SELECT * FROM booking_database.route_information LIMIT 0, 1000;
SELECT * FROM booking_database.user_information LIMIT 0, 1000;
SELECT * FROM booking_database.booking_information LIMIT 0, 1000;
SELECT * FROM booking_database.temp_booking LIMIT 0, 1000;
SELECT * FROM booking_database.blackout_dates LIMIT 0, 1000;
SELECT * FROM booking_database.pricing_rules LIMIT 0, 1000;
SELECT * FROM booking_database.confirmation_codes LIMIT 0, 1000;
SELECT * FROM booking_database.valid_phone_numbers LIMIT 0, 1000;
SELECT * FROM booking_database.completed_bookings LIMIT 0, 1000;

INSERT INTO booking_database.valid_phone_numbers (phone_number) VALUES (12066193172);

SELECT * FROM booking_database.confirmation_codes;
SELECT userID FROM booking_database.user_information WHERE Email = 'kmjohnsen@gmail.com';
INSERT INTO booking_database.user_information (FirstName, LastName, Email, PhoneNumber) 
SELECT 'Kevin', 'Johnsen', 'kmjohnsen@gmail.com', '2066193172'
WHERE NOT EXISTS 
    (SELECT email FROM booking_database.user_information WHERE email='kmjohnsen@gmail.com');

SELECT * FROM booking_information RIGHT JOIN route_information ON booking_information.routeID = route_information.routeID WHERE DATE(booking_date) = '2024-10-24';
SELECT * FROM booking_information WHERE booking_date = '2024-09-24';
SELECT * FROM booking_information ORDER BY booking_date;
SELECT * FROM booking_information WHERE booking_date = '2024-10-04';
SELECT * FROM user_information WHERE (Email = 'b.campos@hotmail.com' && (role = 'dev' || role = 'admin'));
SELECT * FROM route_information;

SELECT b.routeID, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers,
            r.routeID, r.startcity, r.endcity
            FROM route_information r INNER JOIN booking_information b ON r.routeID = b.routeID
            WHERE b.booking_date
            ORDER BY b.booking_date ASC;
            
SELECT b.bookingID, b.userID, b.routeID, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
           b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity
FROM user_information u
INNER JOIN (
    SELECT b.bookingID, b.userID, b.routeID, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
           b.flight_airline, b.flight_number, b.questions, r.startcity, r.endcity
    FROM route_information r
    INNER JOIN booking_information b ON r.routeID = b.routeID
) j ON u.userID = b.userID ORDER BY b.booking_date ASC;

SELECT b.bookingID, b.userID, b.routeID, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                    b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location
            FROM user_information u
            INNER JOIN (
                SELECT b.bookingID, b.userID, b.routeID, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, b.pickup_location, b.dropoff_location,
                    b.flight_airline, b.flight_number, b.questions, r.startcity, r.endcity
                FROM route_information r
                INNER JOIN booking_information b ON r.routeID = b.routeID
            ) j ON u.userID = b.userID ORDER BY b.booking_date ASC;
            
SELECT b.tempbookingID, b.userID, b.routeID, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location
                FROM user_information u
                INNER JOIN (
                    SELECT b.tempbookingID, b.userID, b.routeID, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, b.pickup_location, b.dropoff_location,
                        b.flight_airline, b.flight_number, b.questions, r.startcity, r.endcity
                    FROM route_information r
                    INNER JOIN temp_booking b ON r.routeID = b.routeID
                ) j ON u.userID = b.userID ORDER BY b.booking_date ASC;
                
SELECT b.bookingID, b.userID, b.routeID, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location
                FROM user_information u
                INNER JOIN (
                    SELECT b.bookingID, b.userID, b.routeID, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, b.pickup_location, b.dropoff_location,
                        b.flight_airline, b.flight_number, b.questions, r.startcity, r.endcity
                    FROM route_information r
                    INNER JOIN booking_information b ON r.routeID = b.routeID
                ) j ON u.userID = b.userID ORDER BY b.booking_date ASC;
                
SELECT b.bookingID, b.userID, b.routeID, b.startcity, b.endcity, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
		b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location, b.manualbookinginfo
FROM booking_information b
INNER JOIN 
	user_information u ON b.userID = u.userID  ORDER BY b.booking_date ASC;
                
SELECT DISTINCT startcity AS city
FROM booking_database.route_information
UNION
SELECT DISTINCT endcity AS city
FROM booking_database.route_information;

INSERT INTO booking_database.user_information (userID, role, FirstName, LastName, Email, PhoneNumber, UserPassword)
VALUES (3, 'admin', 'Chris', 'Grass', 'grasstopher@gmail.com', '+1234567890', '12345678');

UPDATE booking_database.user_information SET email = 'terraba@gmail.com' WHERE userID = 1;
UPDATE booking_database.user_information SET email = 'grasstopher@gmail.com', FirstName = 'Chris', LastName = "Grass", role = 'admin' WHERE userID = 3;

SELECT DISTINCT endcity AS long_name, endcity_shortname AS short_name
                        FROM booking_database.route_information;
                        
SELECT routeID FROM booking_database.route_information 
WHERE startcity = 'LIR - Liberia Airport' 
AND endcity = 'Dreams Las Mareas Resort';

                        
SELECT b.tempbookingID, b.userID, b.routeID, b.startcity, b.endcity, u.FirstName, u.LastName, u.email, u.PhoneNumber, b.booking_date, b.pickup_time, b.routecost, b.driver, b.passengers, 
                        b.flight_airline, b.flight_number, b.questions, b.startcity, b.endcity, b.pickup_location, b.dropoff_location, b.manualbookinginfo
                FROM temp_booking b
                INNER JOIN 
                    user_information u ON b.userID = u.userID  ORDER BY b.booking_date ASC