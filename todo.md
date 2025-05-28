# TO DO LIST

## Important
- [ ] Other request - explanation at top
- [ ] Other request - weird shadow
- [ ] Other request - not working from AWS
- [ ] Other request - not sending email to the sender.
- [ ] Setup automated testing for the API (python portion)
- [ ] Show cost for booking a trip that is very close?
- [ ] origin destination at full screen
- [ ] Add Sentry for logging of errors
- [ ] bleach
- [ ] Use https://developer.mozilla.org/en-US/observatory for securtiy
- [ ] make a run local env variable on web server.
- [ ] Get submit booking working to have into database
- [ ] Make sure passengers gets in email, and in database
- [ ] Email lists time with date in it, remove so only the time
- [ ] Restrict to to/from the airport only
- [ ] Add a form to fill out if want something different "More than airport transportation, use this form"
- [ ] Flight Arrival Time/Flight Departure Time with note Landing: "Our driver ... " See whatsapp message
- [ ] If input a destination not in database, under the Trip 1 etc on Home.js, have it say "This trip requires you to contact customer service for a price quote by completing the form after clicking "NEXT"."
- [ ] add EMAIL_USER, EMAIL_PASSWORD, SMTP_SERVER and SMTP_PRT to .env and have those be different for local and production.
- [ ] Add back generate email for booking for approve
- [ ] modify generate email to search the database only for username and confirmation code
- [ ] for Complete Booking, Submit Booking, etc. cycle generate email on the multiple trips in the databases with same username and confirmation code
- [ ] Group Approve by all trips by that confirmation number
- [ ] Test that all inputs on complete booking (like pickup detailed) go to sql database
- [ ] CompleteBooking - add for invalid phone
- [ ] Test booking with time zones
- [ ] Test all ways to create new data with dropoff/pickup location parts.
- [ ] Make sure only admin/dev users can "POST", can't just post with like PostMan.
- [ ] Allow filters to see bookings by day, month, customer, other metrics on Admin Page
- [ ] Test to make sure price is being input to sql from the correct request (prices.py, modified - pushed input)
- [ ] Make Twilio production version

## Auth stuff
- [ ] Add check token for API requests
- [ ] Handle token invalid/expired in API requests - check out access and refresh token
- [ ] Protected routes
## Testing
- [ ] Passengers +11
- [ ] Auto
- [ ] My location not listed
- [ ] Invalid phone number
- [ ] Upcoming trip
- [ ] Pricinig rules (not working)
      - [ ] Percent increase
      - [ ] Dollar increase
- [ ] Multi trip booking for all of the above
- [ ] Remove trip in admin page has a confirmation popup that it removed what you wanted.

## Less Important - After MVP
- [ ] Logging framework for what I have in the debug email.
- [ ] Like delta website, make an expand widget arrow button that shows up under a certain screen size
- [ ] In admin page, link bookings by Confirmation Number, as they are the same across the same bookings.
- [ ] In admin page, for approve booking, add a waiting icon while the approval emails and stuff are processing, so Aaron doesn't think that nothing is happening.
- [ ] Confirmation code is getting changed for approvals. Not a big deal because it is being sent in the email...
- [ ] Create an email and text reminder to send
- [ ] make the Limiter functional
- [ ] Completed bookings table
- [ ] 'Upcoming' trip type sends a text to Aaron
- [ ] Van + info before "Book" button on Book page
- [ ] Change "routecost" in booking_information SQL database to "quotedrate"
- [ ] "I don't see my dropoff/pickup location"
- [ ] SDK date, or other nicer calendar view
- [ ] when Roundtrip is clicked, make passenger update so that if one changes, the other changes.
- [ ] unhide Modify Trip button on Complete Bookings (wasnt working so hid it using "display: 'none'")

### Questions for Aaron
- [ ] how do you want to interact with the data in the Admin area? What mods are needed
- [ ] how do you want the calendar to function with large groups? 10+

### After decide on website name and hosting stuff
- [ ] change the "lirshuttle.com" booking site hardcoding in Home.js to whatever site is.
- [ ] change JWT SECRET KEY for production (in server.py)

### Completed ✓
- [✓] Require whitelisted users versus just checking that a jwt is used.
- [✓] Cap on booking date
- [✓] Single month date picker - can't go beyond same month to pick end of trip
- [✓] Modify email to make it more appropriate
- [✓] Dont allow clicking off the confirm email popup, but put in a cancel button there
- [✓] Complete booking make sure times are required
- [✓] Select To, From, Date, then passengers, then show price
- [✓] Move time to CompleteBooking.js
- [✓] Calendar doesnt have price
- [✓] Change NEXT To BOOK NOW
- [✓] From / To in clear boxes
- [✓] Remove roundtrip, my location is not listed
- [✓] reference https://www.amstardmc.com/en/
- [✓] Logo - use costaricanorthwest svg van image
- [✓] Boeing blue instead of dark blue
- [✓] Fix Pricing rules
- [✓] Research hosting AWS, Dreamhost (speed and google searchability)
- [✓] Make a "completed bookings" table
- [✓] Roundtrip fix, to make work
- [✓] bookings.py requires on SQL parameterized query:
      query = "SELECT * FROM routes WHERE pickup = %s"
      cursor.execute(query, (pickup,))- [ ] Create phone texting confirmation using Twilio
- [✓] Fix how if you modify one of the trip To/From locations, it doesn't update prices
- [✓] Add ability to view manualtriptext in Admin page
- [✓] Link reviews
- [✓] Fix pricing rules
- [✓] FUTURE --> Pricing rules by route. not all
- [✓] Add "My route is not here"
- [✓] About us, terms and conditions, FAQ from Aaron
- [✓] Aaron to look at Twilio 
- [✓] Make Pricing rules work
- [✓] Tally - prices of all trips, total
- [✓] About us, terms and conditions, FAQ on menu
- [✓] 11+ - contact sales representative so they can personalize your transportation experience
- [✓] Add a "For cancellations or modifications please write to our sales team" to confirmation email.- [✓] Change 10+ to 11+
- [✓] Model after Delta website
- [✓] make NavBar spacing work for all sizes of screens
- [✓] if wrong confirmation code entered, throw an error.
- [✓] allow modify phone number if entered wrong.
- [✓] SEPARATE submit_booking and approve_booking since they come from different oauth areas
- [✓] OAuth (Google, facebook)
- [✓] Fix Review Booking Requests
- [✓] Fix add pending booking, make sure it doesn't mess up new booking
      - [✓] Fix remove pending booking- [✓] Grab price from prices.py for most bookings, but from quoted price for modify
- [✓] Add price for day API call
- [✓] Make a hard limit of 48 hours on when you can book. Within 48 hours, need HUMAN ASSISTANCE 
- [✓] Make required fields be selected before moving on
- [✓] Allow Aaron to enter new bookings from other methods
- [✓] Allow Aaron to modify bookings
- [✓] Allow Aaron to assign (and manage) drivers- [✓] Check for valid inputs to phone number, email
- [✓] Manual switch for availability --> turn of dates (black out dates)
- [✓] Multi trip bookings.
- [✓] Make it clear that payment will be in cash, unless 10+ (human assistance)
- [✓] Add a "exact location/hotel name/airbnb address" option for pickup and dropoff
- [✓] When selecting 10+, make box on calendar go "GREEN" for available dates, "N/A" in text for not available.
- [✓] Aaron modify bookings with detailed dropoff/pickup locations
- [✓] Modify role isnt working yet
- [✓] Create registration and login pages
- [✓] Favicon change (server.py)
- [✓] Make +$10 for 3-4 passengers, +$10 for 5-6, +$10 for 7-9
- [✓] Booking page - add the phone number with country code
- [✓] Change prices for routes to include date or date range as input, so we can use it in modify modal, admin page.
- [✓] Pricing
      - [✓] 10+ passengers, NEED HUMAN ASSISTANCE
      - [✓] Dynamic reservations - after 4 bookings, increase by 5%
      - [✓] Golden season - mid Dec thru mid Jan
      - [✓] Xmas eve and day have different prices
- [✓] Add waiting symbol while the email is being sent
- [✓] Catch for local numbers - simple request rather than autobook
- [✓] Make weekend days in calendar black.

## Uses Dreamhost and Wordpress, but this will be a new website