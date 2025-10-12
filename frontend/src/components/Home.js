import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from 'react-modal';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import axios from 'axios';
import Navbar from './NavBar'; // Import the top navigation bar
import RequiredFieldsModal from './RequiredFieldsModal';
import { validateEntries, formatDateYYYYMMDD, logger } from './HelperFunctions';
import API_BASE_URL from '../config';
import PassengersDropdown from './PassengersDropdown'; 
import LocationDropdown from './LocationDropdown'; 
import CalendarRoundTrip from "./CalendarRoundTrip";
import DateSelectorSingleDate from "./CalendarSingleDate";
import TripTypeDropdown from "./TripType"; 
import generateConfirmationCode from './CompleteBooking' ;


Modal.setAppElement('#root');



const heroImages = [
  "/all_photos/IMG_TOMVD.png",
  "/all_photos/IMG_7054.jpg",
  "/all_photos/to-andaz.jpg",
  "/all_photos/IMG_5187.jpg",
  "/all_photos/IMG_2680.jpg",
  "/all_photos/IMG_5047.jpg",
]

function BookingForm() {
  // Scroll to top when the component loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [loading, setLoading] = useState(false);
  const [isOtherRequiredModalOpen, setIsOtherRequiredModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [missingOtherFields, setMissingOtherFields] = useState('');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 12000); // Change every 12 seconds

    return () => clearInterval(interval);
  }, []);
  
  const [activeTab, setActiveTab] = useState("airport");
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [otherEmail, setOtherEmail] = useState("");
  const [otherDetails, setOtherDetails] = useState("");

  
  // Handler for the "Other Transport Request" form submission
  const handleOtherRequestSubmit = async (e) => {
    e.preventDefault();

    // Check for missing required fields
    const missing = [];
    if (!otherName.trim()) missing.push("Name");
    if (!otherPhone.trim()) missing.push("Phone");
    if (!otherEmail.trim()) missing.push("Email");
    if (!otherDetails.trim()) missing.push("Trip Details");

    if (missing.length > 0) {
      setMissingOtherFields(`Please complete the following fields:\n• ${missing.join("\n• ")}`);
      setIsOtherRequiredModalOpen(true);
      return;
    }

    
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?\d{7,15}$/;

  if (!emailRegex.test(otherEmail)) {
    setMissingOtherFields("Please enter a valid email address.");
    setIsOtherRequiredModalOpen(true);
    return;
  }

  if (!phoneRegex.test(otherPhone)) {
    setMissingOtherFields("Please enter a valid phone number (digits only, with optional +).");
    setIsOtherRequiredModalOpen(true);
    return;
  }
    
    const confirmationCode = generateConfirmationCode
    const payload = {
      name: otherName,
      phone: otherPhone,
      email: otherEmail,
      details: otherDetails,
      confirmationcode: confirmationCode,
    };
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/submit-booking-email-request`, payload);
      setOtherName("");
      setOtherPhone("");
      setOtherEmail("");
      setOtherDetails("");
      setActiveTab("airport");
      setIsSuccessModalOpen(true);
      scrollToTop();
    } catch (error) {
      console.error("Error submitting other transport request:", error);
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const { control, setValue, getValues } = useForm({
    // Default is for a round trip, so start with two entries
    defaultValues: {
      entries: [
        {
          pickup: '',
          dropoff: '',
          routenumber: '',
          pickupdetailed: '',
          dropoffdetailed: '',
          time: '',
          date: '',
          airline: '',
          flightnumber: '',
          prices: {},
        },
        {
          pickup: '',
          dropoff: '',
          routenumber: '',
          pickupdetailed: '',
          dropoffdetailed: '',
          time: '',
          date: '',
          airline: '',
          flightnumber: '',
          prices: {},
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries" // The name of the field array
  });

  const [pickupLocations, setPickupLocations] = useState([]);
  const [dropoffLocations, setDropoffLocations] = useState([]);
  const [destinations, setDestinations] = useState({});
  const [passengers, setPassengers] = useState('');
  const navigate = useNavigate(); // Use navigate to change pages
  const [dateMargin, setDateMargin] = useState('');
  const [requestType, setRequestType] = useState('');
  const [isLargeGroup, setIsLargeGroup] = useState(false);
  const [isDateValid, setIsDateValid] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);
  const [isRouteInDB, setIsRouteInDB] = useState(false)
  const [TripType, setTripType] = useState('roundtrip')
  const [isValues, setIsValues] = useState(false)
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Optional: adds a smooth scrolling effect
    });
  };

  // Fetch pickup and dropoff locations
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/locations`)
      .then(response => {
        const destinationsData = response.data
        logger.debug("pickup locations", response.data)

        setDestinations(destinationsData);
        const longNames = Object.values(destinationsData).map(destination => destination.long); // Extract only long names

        // Ensure "LIR - Liberia Airport" is first
        const orderedLocations = [
          "LIR - Liberia Airport", // Place it first
          ...longNames.filter(location => location !== "LIR - Liberia Airport") // Remove duplicates
        ];

        setPickupLocations(orderedLocations);
        setDropoffLocations(orderedLocations);
      })
      .catch(error => console.error("Error fetching pickup locations: ", error));
  }, []);

  useEffect(() => {
    logger.debug("Destinations:", destinations); // Debugging output
  }, [destinations]);

  // Fetch margin used for selecting dates
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/datemargin`)
    .then(response => setDateMargin(response.data))
    .catch(error => console.error("Error getting date margin for autobooking: ", error));
  }, [])

  // Watch all entries for changes
  const watchEntries = useWatch({ control, name: "entries"});

  const fetchRouteAndPrices = useCallback(async () => {
    await Promise.all(
      watchEntries.map(async (entry, index) => {
        const { pickup, dropoff, routenumber } = entry;
        logger.debug("pickup, dropoff, route num, passengers", pickup, dropoff, routenumber, passengers)
  
        // Ensure `pickup` and `dropoff` are set before making requests
        if (!pickup || !dropoff || !passengers) {
          logger.debug(`Skipping trip ${index + 1} due to missing pickup, dropoff, or passengers.`);
          return;
        }
  
        // Calculate Route Number
        let currentRouteNumber = '';
        try {
          const routeResponse = await axios.get(`${API_BASE_URL}/api/bookings/fetch_route_number`, {
            params: { pickup, dropoff },
          });
          currentRouteNumber = routeResponse.data;
          setValue(`entries.${index}.routenumber`, currentRouteNumber);
          logger.debug(`Fetched routenumber for trip ${index + 1}:`, currentRouteNumber);

          if (currentRouteNumber === 9999) {
            setIsRouteInDB(false);
          } else {
            setIsRouteInDB(true);
          }
        } catch (error) {
          console.error(`Error fetching routenumber for trip ${index + 1}:`, error);
          return;
        }
        // }
  
        // Fetch prices for the trip using the routenumber and passengers
        if (currentRouteNumber && passengers) {
          try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const nextYear = new Date(today);
            nextYear.setFullYear(today.getFullYear() + 1);
  
            const priceResponse = await axios.get(`${API_BASE_URL}/api/prices`, {
              params: {
                routenumber: currentRouteNumber,
                passengers,
                startdate: tomorrow.toISOString().slice(0, 10),
                enddate: nextYear.toISOString().slice(0, 10),
              },
            });
  
            setValue(`entries.${index}.prices`, priceResponse.data);
            logger.debug(`Fetched prices for trip ${index + 1}:`, priceResponse.data);
          } catch (error) {
            console.error(`Error fetching prices for trip ${index + 1}:`, error);
          }
        }
      })

    );
    
  }, [watchEntries, passengers, setValue]);
  
  const previousEntriesRef = useRef(watchEntries); // Track previous state

  const prevDataRef = useRef({ entries: watchEntries, passengers });

  useEffect(() => {
    const allFieldsFilled = watchEntries.every(
      (entry) => entry.pickup && entry.dropoff && entry.date && passengers
    );
  
    const currentData = { entries: watchEntries, passengers };
    // Compare the current data object with the previous data object
    const hasChanged =
      JSON.stringify(currentData) !== JSON.stringify(prevDataRef.current);
  
    if (allFieldsFilled && hasChanged) {
      prevDataRef.current = currentData; // Update the ref with the latest values
      fetchRouteAndPrices();
    }
  }, [watchEntries, passengers, fetchRouteAndPrices]);

  useEffect(() => {
    const calculateTotalPrice = () => {
      const total = watchEntries.reduce((sum, trip) => {
        const formattedDate = trip.date ? new Date(trip.date).toISOString().split('T')[0] : '';
        const tripPrice = trip.prices?.prices?.[formattedDate]
          ? parseFloat(trip.prices.prices[formattedDate])
            : 0;        return sum + tripPrice;
      }, 0);

      setTotalPrice(total);
    };

    calculateTotalPrice();
  }, [watchEntries]); // ⬅️ Runs only when `watchEntries` change

  useEffect(() => {
    const hasChangesInInputs = watchEntries.some((entry, index) => {
      const prevEntry = previousEntriesRef.current[index] || {};
      return (
        entry.pickup !== prevEntry.pickup ||
        entry.dropoff !== prevEntry.dropoff 
      );
    });
  
    if (hasChangesInInputs) {
      const updates = [];
  
      watchEntries.forEach((entry, index) => {
        const prevEntry = previousEntriesRef.current[index] || {};
        if (
          entry.pickup !== prevEntry.pickup ||
          entry.dropoff !== prevEntry.dropoff 
        ) {
          updates.push(index); // Track indices to update
        }
      });
  
      // Apply updates in bulk to minimize renders
      if (updates.length > 0) {
        updates.forEach(index => {
          setValue(`entries.${index}.prices`, {}, { shouldDirty: false });
        });
  
        fetchRouteAndPrices()
      }
    }
  
    previousEntriesRef.current = [...watchEntries]; // Update previous state
  }, [watchEntries, fetchRouteAndPrices, setValue]);

  const handleDateChangeRoundTrip = (departureDate, returnDate) => {
    const formattedDeparture = formatDateYYYYMMDD(departureDate);
    const formattedReturn = formatDateYYYYMMDD(returnDate);
    setValue("entries.0.date", formattedDeparture);
    setValue("entries.1.date", formattedReturn);
    logger.debug("return date set as:", formattedReturn);
    logger.debug("Raw returnDate:", returnDate);
  logger.debug("Local returnDate:", returnDate.toString());
  logger.debug("UTC returnDate:", returnDate.toISOString());
  };
  
  const handleTripTypeChange = (value) => {
    setTripType(value);
    if (value === "roundtrip" || value === "multi") {
      const trip = watchEntries?.[0]; // Ensure it exists before accessing properties
      if (!trip) return;
  
      setValue("entries", [
        {
          pickup: '',
          dropoff: '',
          routenumber: '',
          pickupdetailed: '',
          dropoffdetailed: '',
          time: '',
          date: '',
          airline: '',
          flightnumber: '',
          prices: {},
        },
        {
          pickup: '',
          dropoff: '',
          routenumber: '',
          pickupdetailed: '',
          dropoffdetailed: '',
          time: '',
          date: '',
          airline: '',
          flightnumber: '',
          prices: {},
        }
      ])
    }
    else if (value === "oneway") {
      setValue("entries", [
        {
          pickup: '',
          dropoff: '',
          routenumber: '',
          pickupdetailed: '',
          dropoffdetailed: '',
          time: '',
          date: '',
          airline: '',
          flightnumber: '',
          prices: {},
        }
      ])
    }
  };

  // Log values whenever they are updated
  useEffect(() => {
    watchEntries.forEach((trip, index) => {
      logger.debug("Watch Entries :", {watchEntries});
      logger.debug(`Entry ${index + 1}:`);
      logger.debug("Pickup:", trip.pickup);
      logger.debug("Dropoff:", trip.dropoff);
      logger.debug("Pickup Detailed:", trip.pickupdetailed);
      logger.debug("Dropoff Detailed:", trip.dropoffdetailed);
      logger.debug("Date:", trip.date);
      logger.debug("Passengers:", passengers);
      logger.debug("Prices:", trip.prices);
      // logger.debug("Destinations", destinations);
    });
  }, [watchEntries, passengers]);

  // See if there is any input to To / From:
  useEffect(() => {
    if (!isValues) {
      const hasValidValues = watchEntries.some(
        (entry) => entry.pickup.trim() && entry.dropoff.trim()
      );
  
      if (hasValidValues) {
        setIsValues(true);
      }
    }
  }, [watchEntries, isValues]);  

  const handleBookClick = () => {
    // Toggle the `isHeroExpanded` state when Book is clicked
    setIsHeroExpanded((prev) => !prev);
    logger.debug("hero expanded", isHeroExpanded)
    scrollToTop()
  };
  
  // TODO Update airline field when pickup changes from 'Liberia'
  
  // Check if the group is too large for auto-booking
  useEffect(() => {
    setIsLargeGroup(passengers === '11+');
  }, [passengers]); 

  // Check if the date is valid for auto-booking
  useEffect(() => {
    const validDate = watchEntries.some(entry => {
      const bookingDate = new Date(entry.date);
      const currentDate = new Date();
      const dateMarginInMilliseconds = dateMargin * 24 * 60 * 60 * 1000; // Convert margin to milliseconds
      const futureDateMargin = new Date(currentDate.getTime() + dateMarginInMilliseconds); // Current date + margin
      return bookingDate > futureDateMargin; // Date valid if after margin
    });

    setIsDateValid(validDate);
  }, [watchEntries, dateMargin]);

  const [locationNotInDBModalIsOpen, setLocationNotInDBModalIsOpen] = useState(false);
  const [alreadyOpened, setAlreadyOpened] = useState(false)

  useEffect(() => {
    const isAnyLocationUnlisted = watchEntries.some(entry => entry['unlisted-location']);
    if (isAnyLocationUnlisted && !alreadyOpened) {
      setLocationNotInDBModalIsOpen(true)
      setAlreadyOpened(true)
    }
  }, [watchEntries, alreadyOpened]);
  
  // Combine logic to determine request type
  useEffect(() => {
    if (!isDateValid) {
      setRequestType('Upcoming');
    } else if (isLargeGroup) {
      setRequestType('Large Group');
    } else if (!isRouteInDB) {
      setRequestType('Alternate Route')
    } else {
      setRequestType('Auto');
    }
  }, [isLargeGroup, isDateValid, isRouteInDB]);

  const [isRequiredFieldsModalOpen, setIsRequiredFieldsModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState('')

  const handleCompleteBooking = async () => {
    const entries = getValues('entries'); // get the entries from form state

    let { hasIncompleteFields, missingFieldsMessage } = validateEntries(entries, ['pickup', 
      'dropoff', 'date', 
    ]);

    if (!passengers) {
      if (!missingFieldsMessage) missingFieldsMessage = '';
      hasIncompleteFields = true;
      missingFieldsMessage += "\nPlease select the number of passengers.";
    }
    
    if (hasIncompleteFields) {
      setMissingFields(missingFieldsMessage);
      setIsRequiredFieldsModalOpen(true);
      return;
    }

    logger.debug("Request type:", requestType)
    navigate('/completebooking', { state: { requestType, entries, passengers, isLargeGroup, isDateValid } })
  };
  
  return (
    <div>
      <nav>
        <Navbar onBookClick={handleBookClick}/>
      </nav>

      <Modal
        isOpen={loading}
        contentLabel="Processing Request"
        className="Modal-for-popup"
        overlayClassName="Overlay-for-popup"
        shouldCloseOnOverlayClick={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2>Processing Request...</h2>
          <div className="loader"></div> {/* Add your spinner CSS */}
          <p>Please wait while your request is sent to info@costaricanorthwest.com.</p>
        </div>
      </Modal>
      <Modal
        isOpen={isSuccessModalOpen}
        onRequestClose={() => setIsSuccessModalOpen(false)}
        contentLabel="Success Modal"
        className="Modal-for-popup"
        overlayClassName="Overlay-for-popup"
      >
        <h2>Transportation Request Successfully Sent!</h2>
        <p>We will reach out shortly to confirm your trip.</p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="book-button" onClick={() => setIsSuccessModalOpen(false)}>
            <b>CLOSE</b>
          </button>
        </div>
      </Modal>
      <Modal
        isOpen={isOtherRequiredModalOpen}
        onRequestClose={() => setIsOtherRequiredModalOpen(false)}
        contentLabel="Missing Fields Modal"
        className="calendar-modal"
        overlayClassName="calendar-modal-overlay"
      >
        <h2>Missing Information</h2>
        <p>{missingOtherFields}</p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="book-button" onClick={() => setIsOtherRequiredModalOpen(false)}>
            <b>CLOSE</b>
          </button>
        </div>
      </Modal>

      {/* Hero Section with Background Image */}
      <div className="hero-container">
        {heroImages.map((src, index) => (
          <img
            key={index}
            src={src}
            alt="Travel Destination"
            className={`hero-image ${index === currentImageIndex ? "active" : ""}`}
          />
        ))}
        <div className="hero-text">
          <h1>Stress-Free Airport Transfers</h1>
          <h2>Explore Northwest Costa Rica with safe, reliable, and convenient transportation.</h2>
        </div>
      </div>

      <div className="booking-container">
        <div style={{backgroundColor: 'var(--light-grey)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px'}}>
          {/* Tab Headers */}
          <div className="tabs" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <button
              className={`tab-button ${activeTab === "airport" ? "active" : ""}`}
              onClick={() => setActiveTab("airport")}
              style={{
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}          >
              Airport Transfers
            </button>
            <button
              className={`tab-button ${activeTab === "other" ? "active" : ""}`}
              onClick={() => setActiveTab("other")}
              style={{
                borderTopRightRadius: '16px',
                borderTopLeftRadius: '16px',
              }}          
            >
              Other Transport Requests
            </button>
          </div>
        </div>

        {activeTab === "airport" ? (
          // Existing Airport Transfers Form
          <>
            <div 
              className="flex-container" 
              style={{
                maxWidth: '600px', margin: '0px' // Dynamically set maxWidth
              }}>
              
              <TripTypeDropdown handleTripTypeChange={handleTripTypeChange} />

              <PassengersDropdown
                selectedPassengers={passengers}
                onPassengerChange={(value) => setPassengers(value)}
                style={{ width: "180px", margin: '0px'}}
              />

            </div>
            
            {TripType === "roundtrip" ? (
              // Render only one set of fields when "Round Trip" is selected
              <div style={{margin: '10px'}}>
                <Modal
                  isOpen={locationNotInDBModalIsOpen}
                  onRequestClose={() => setLocationNotInDBModalIsOpen(false)}
                  contentLabel="Location not listed"
                  className="calendar-modal calendar-roundtrip"
                  overlayClassName="calendar-modal-overlay"
                >
                  <h2>Location Not Listed</h2>
                  <p>No worries! Even if you cannot find your location, we can still get you there!</p>
                  <p><b>Please manually type your location into the To/From field,</b> fill out the date and time, and click the Book button. After you complete your booking, a sales associate will reach out to confirm your details.</p>
                  <button onClick={() => setLocationNotInDBModalIsOpen(false)}>Close</button>
                </Modal>
                

                <div className="flex-container-spaced">
                  {/* Single Origin & Destination for Round Trip */}
                  <LocationDropdown
                    label="Origin"
                    value={watchEntries[0]?.pickup || ""}
                    locations={pickupLocations}
                    onChange={(value) => {
                      setValue("entries.0.pickup", value);
                      setValue("entries.1.dropoff", value);
                    }}
                  />

                  <LocationDropdown
                    label="Destination"
                    value={watchEntries[0]?.dropoff || ""}
                    locations={dropoffLocations}
                    onChange={(value) => {
                      setValue("entries.0.dropoff", value);
                      setValue("entries.1.pickup", value);
                    }}
                  />

                  <CalendarRoundTrip 
                    onDateChange={handleDateChangeRoundTrip} 
                    label={watchEntries[0]?.date ? "Dates" : "Select Dates"}
                  />
                  
                </div>
              </div>
            ) : (
              // Render trip entries for One Way & Multi
              fields.map((entry, index) => (
                <div key={entry.id} style={{margin: '10px'}}>
                  <Modal
                    isOpen={locationNotInDBModalIsOpen}
                    onRequestClose={() => setLocationNotInDBModalIsOpen(false)}
                    contentLabel="Location not listed"
                    className="calendar-modal calendar-single"
                    overlayClassName="calendar-modal-overlay"
                  >
                    <h2>Location Not Listed</h2>
                    <p>No worries! Even if you cannot find your location, we can still get you there!</p>
                    <p><b>Please manually type your location into the To/From field,</b> fill out the date and time, and click the Book button. After you complete your booking, a sales associate will reach out to confirm your details.</p>
                    <button onClick={() => setLocationNotInDBModalIsOpen(false)}>Close</button>
                  </Modal>

                  <div className="flex-container-spaced">
                    <LocationDropdown
                      label="Origin"
                      value={watchEntries[index]?.pickup || ""}
                      locations={pickupLocations}
                      onChange={(value) => {
                        setValue(`entries.${index}.pickup`, value);
                      }}
                    />

                    <LocationDropdown
                      label="Destination"
                      value={watchEntries[index]?.dropoff || ""}
                      locations={dropoffLocations}
                      onChange={(value) => {
                        setValue(`entries.${index}.dropoff`, value);
                      }}
                    />

                    <DateSelectorSingleDate
                      value={watchEntries[0]?.date || ""}
                      onChange={(date) => {
                        setValue(`entries.${index}.date`, date);
                      }}
                    />
                  </div>

                  {index >= 1 && TripType === "multi" ? (
                    <button className="book-button" onClick={() => remove(index)}>
                      <b>REMOVE TRIP</b>
                    </button>
                  ) : null}
                </div>
              ))
            )}

            <div className='flex-container'>
              <div className='input-container'>
                <table style={{ border: 'none', borderCollapse: 'collapse' }}>
                  <tbody>
                  {watchEntries.map((entry, index) => (
                    entry.pickup && entry.dropoff && passengers && entry.date && entry.time && (
                      <tr key={index}>
                        <td style={{ border: 'none', padding: '0', lineHeight: '1.0' }}>
                        <div style={{ margin: '0px 20px' }}><h4 style={{ margin: '0' }}>Trip {index + 1}</h4></div>
                        </td>
                        <td style={{ border: 'none', padding: '0', lineHeight: '1.0' }}>
                          <div style={{ margin: '0px 20px' }}><h4 style={{ margin: '0' }}>{entry.date}</h4></div>
                        </td>
                        <td style={{ border: 'none' }}>
                          <p style={{ margin: '0px 20px' }}>{entry.pickup} to {entry.dropoff} with pickup at {entry.time}, for {passengers} passengers.</p>
                          
                          {entry.airline && <p>Airline: {entry.airline}</p>}
                          {entry.flightnumber && <p>Flight Number: {entry.flightnumber}</p>}
                        </td>
                        <td style={{ border: 'none', margin: '0px 20px' }}>
                          {(passengers === '11+') || !isRouteInDB ? (
                            <></>
                          ) : (
                            <p style={{ margin: '0px 20px' }}>
                              <b>${entry.prices?.prices?.[entry.date] ?? '—'}</b>
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              {TripType === 'multi' ? (
                <div className='input-container'>
                  <button className="book-button" type="button-right" onClick={() => append({
                    pickup: '',
                    dropoff: '',
                    pickupdetailed: '',
                    dropoffdetailed: '',
                    date: '',
                    time: '',
                    airline: '',
                    flightnumber: '',
                    prices: {},
                  })}>
                    <b>ADD TRIP</b>
                  </button>
                </div>
              ) : ( 
                null
              )}
            </div>

            <div className='flex-container-centered'>
              {totalPrice > 0 && !isLargeGroup && isRouteInDB && (
                <h3><b>Total Price: ${totalPrice}</b></h3>
              )}
            </div>

            <div className='flex-container-centered'>
              <div>
                <button className="book-button" type="button-right" onClick={handleCompleteBooking}><b>BOOK NOW</b></button>
                <RequiredFieldsModal
                  isOpen={isRequiredFieldsModalOpen}
                  onClose={() => setIsRequiredFieldsModalOpen(false)}
                  missingFields={missingFields}            
                />
              </div>
            </div>
          </>
        ) : (
          
          
          <div className="booking-container" style={{ marginTop: '10px'}}>
            <form onSubmit={handleOtherRequestSubmit} style={{ margin:'20px', marginTop: '10px'}}>
              <div className="location-input-container" style={{ width: '100%', marginBottom: '10px' }}>
                <label className={`floating-label ${otherName ? "label-active" : ""}`}>
                  Name
                </label>
                <input
                  type="text"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  className="location-input"
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="location-input-container" style={{ width: '100%', marginBottom: '10px' }}>
                <label className={`floating-label ${otherEmail ? "label-active" : ""}`}>
                Email
                </label>
                <input
                  type="email"
                  value={otherEmail}
                  onChange={(e) => setOtherEmail(e.target.value)}
                  className="location-input"
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="location-input-container" style={{ width: '100%', marginBottom: '10px' }}>
                <label 
                  className={`floating-label ${
                    (isPhoneFocused || (otherPhone && otherPhone !== '+1')) ? "label-active" : ''
                  }`}
                >
                  Phone
                </label>
                <PhoneInput
                  country="us"                    // Default country (change if needed)
                  value={otherPhone}
                  onChange={(value) => setOtherPhone('+' + value)} // ensures "+" is included
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  autoFormat={true}
                  enableAreaCodes={true}
                  disableDropdown={false}
                  inputProps={{ name: 'phone', required: true }}
                  inputStyle={{
                    fontSize: '1.0rem',
                    padding: '12px',
                    width: '100%',
                    height: 'auto',
                    backgroundColor: 'var(--bright-white)',
                    color: 'var(--dark-text)',
                    border: '1px solid var(--bright-white)',
                    borderRadius: '8px',
                    boxShadow: '0px 2px 5px var(--shadow-for-box)',
                    textAlign: 'left',
                    paddingLeft: '65px',
                  }}
                  buttonStyle={{
                    backgroundColor: 'var(--bright-white)',
                    borderRadius: '8px',
                    border: '1px solid var(--text)',
                    padding: '5px',
                  }}
                />
              </div>

              <div className="flex-container-spacing">
                <div className="location-input-container" style={{ width: '100%', marginBottom: '10px' }}>
                  <label className={`floating-label ${otherDetails ? "label-active" : ""}`}>
                    Requested Trip Details
                  </label>
                  <textarea 
                    style={{ fontSize: '1.0rem', fontFamily: 'var(--font-family-main)', height:'80px', alignContent: 'center', textAlign: 'left' }}
                    className='location-input'
                    onChange={(e) => setOtherDetails(e.target.value)}
                    />
                </div>
              </div>

              <div className='flex-container-centered'>
                <button type="button-right" className="book-button">
                  <b>SUBMIT REQUEST</b>
                </button>
                <RequiredFieldsModal
                  isOpen={isRequiredFieldsModalOpen}
                  onClose={() => setIsRequiredFieldsModalOpen(false)}
                  missingFields={missingFields}            
                />
              </div>
            </form>
          </div>
        )}
      </div>

      <div className='bottom-section'>
        <div style={{ textAlign: 'center' }}><h2 style={{}}>Convenient Destinations Served</h2></div>
        <div><p>LIR Shuttle serves many of Costa Rica’s most popular destinations, including Tamarindo, Playa Conchal, the Papagayo Peninsula, and Nosara. It’s also the perfect choice for travelers headed to renowned luxury resorts such as the Four Seasons Costa Rica, Andaz Peninsula Papagayo, and Dreams Las Mareas. No matter your destination, LIR Shuttle provides dependable Liberia airport transportation with experienced drivers and comfortable vehicles, ensuring a smooth and enjoyable journey.</p></div>
        <div style={{ textAlign: 'center' }}><h2>Safe and Stress-Free Travel</h2></div>
        <div><p>Exploring Costa Rica’s roads can be daunting, but with LIR Shuttle, you can relax and enjoy the ride while experienced drivers expertly handle the journey. Offering direct routes from Liberia Airport (LIR) to your hotel or rental, LIR Shuttle ensures a seamless travel experience without the stress of unfamiliar traffic or road conditions.</p></div>
        <div><p>For travelers seeking reliable Liberia airport transportation, LIR Shuttle is a standout choice, combining comfort, affordability, and convenience. Reserve your shuttle in advance to start your Costa Rican adventure with total peace of mind.</p></div>

        <div className='input-container-bottom'>
          <button className="book-button" type="button-right" onClick={handleBookClick}><b>BOOK A TRIP NOW</b></button>
        </div>

      </div>
      
    </div>
    
  );
}



export default BookingForm;

