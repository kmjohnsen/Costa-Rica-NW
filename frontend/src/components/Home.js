import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from 'react-modal';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import CalendarWithPrices from './Calendars';
import axios from 'axios';
import Navbar from './NavBar'; // Import the top navigation bar
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import RequiredFieldsModal from './RequiredFieldsModal';
import { validateEntries } from './HelperFunctions';
import API_BASE_URL from '../config';


Modal.setAppElement('#root');

function BookingForm() {
  // Scroll to top when the component loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const { register, control, setValue, getValues, formState: { errors} } = useForm({
    defaultValues: {
      entries: [{
        pickup: '',
        dropoff: '',
        routenumber: '',
        pickupdetailed: '',
        dropoffdetailed: '',
        date: '',
        time: '',
        passengers: '1',
        airline: '',
        flightnumber: '',
        prices: {},
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries" // The name of the field array
  });

  const [pickupLocations, setPickupLocations] = useState([]);
  const [dropoffLocations, setDropoffLocations] = useState([]);
  const [destinations, setDestinations] = useState({});

  // const [step, setStep] = useState(1); // Step state to track current booking step
  
  const navigate = useNavigate(); // Use navigate to change pages
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateMargin, setDateMargin] = useState('');
  const [requestType, setRequestType] = useState('');
  const [isLargeGroup, setIsLargeGroup] = useState(false);
  const [isDateValid, setIsDateValid] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);
  const [isRouteInDB, setIsRouteInDB] = useState(false)
  const [isRoundTrip, setIsRoundTrip] = useState(false)
  const [isValues, setIsValues] = useState(false)
  const [filteredPickupLocations, setFilteredPickupLocations] = useState([]);
  const [filteredDropoffLocations, setFilteredDropoffLocations] = useState([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);



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
        console.log("pickup locations", response.data)

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
    console.log("Destinations:", destinations); // Debugging output
  }, [destinations]);

  // Fetch margin used for selecting dates
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/datemargin`)
    .then(response => setDateMargin(response.data))
    .catch(error => console.error("Error getting date margin for autobooking: ", error));
  }, [])

  // Watch all entries for changes
  const watchEntries = useWatch({ control, name: "entries"});
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleCalendarModal = (index) => {
    setActiveIndex(index); // Set the active index for the calendar modal
    setIsCalendarOpen(!isCalendarOpen);
  };
  

  const fetchRouteAndPrices = useCallback(async () => {
    await Promise.all(
      watchEntries.map(async (entry, index) => {
        const { pickup, dropoff, routenumber, passengers } = entry;
        console.log("pickup, dropoff, route num, passengers", pickup, dropoff, routenumber, passengers)
  
        // Ensure `pickup` and `dropoff` are set before making requests
        if (!pickup || !dropoff || !passengers) {
          console.log(`Skipping trip ${index + 1} due to missing pickup, dropoff, or passengers.`);
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
          console.log(`Fetched routenumber for trip ${index + 1}:`, currentRouteNumber);

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
            console.log(`Fetched prices for trip ${index + 1}:`, priceResponse.data);
          } catch (error) {
            console.error(`Error fetching prices for trip ${index + 1}:`, error);
          }
        }
      })
    );
  }, [watchEntries, setValue]);
  
  // TODO collect prices for all trips
  useEffect(() => {
    // Calculate total price whenever watchEntries changes
    const calculateTotalPrice = () => {
      const total = watchEntries.reduce((sum, trip) => {
        const tripPrice = trip.prices?.[trip.date]; // Get price for the selected date
        return tripPrice ? sum + parseFloat(tripPrice) : sum; // Add price if it exists
      }, 0);
      setTotalPrice(total); // Update total price state
    };

    calculateTotalPrice(); // Run the calculation
  }, [watchEntries]); // Re-run whenever watchEntries changes

  
  const previousEntriesRef = useRef(watchEntries); // Track previous state

  useEffect(() => {
    const hasChangesInInputs = watchEntries.some((entry, index) => {
      const prevEntry = previousEntriesRef.current[index] || {};
      return (
        entry.pickup !== prevEntry.pickup ||
        entry.dropoff !== prevEntry.dropoff ||
        entry.passengers !== prevEntry.passengers
      );
    });
  
    if (hasChangesInInputs) {
      const updates = [];
  
      watchEntries.forEach((entry, index) => {
        const prevEntry = previousEntriesRef.current[index] || {};
        if (
          entry.pickup !== prevEntry.pickup ||
          entry.dropoff !== prevEntry.dropoff ||
          entry.passengers !== prevEntry.passengers
        ) {
          updates.push(index); // Track indices to update
        }
      });
  
      // Apply updates in bulk to minimize renders
      if (updates.length > 0) {
        updates.forEach(index => {
          setValue(`entries.${index}.date`, '', { shouldDirty: false });
          setValue(`entries.${index}.prices`, {}, { shouldDirty: false });
        });
  
        fetchRouteAndPrices()
      }
    }
  
    previousEntriesRef.current = [...watchEntries]; // Update previous state
  }, [watchEntries, fetchRouteAndPrices, setValue]);
  
  const handleRoundtripChange = async (isChecked, index, event) => {
    const checkbox = event.target; // Get the checkbox element

    if (isChecked) {
      setIsRoundTrip(true)
      const currentEntry = watchEntries[index];
      const { pickup, dropoff, passengers, routenumber, prices } = currentEntry;
  
      // Ensure pickup and dropoff are set
      if (pickup && dropoff) {
        try {
  
          // Append the return trip
          append({
            pickup: dropoff,
            dropoff: pickup,
            pickupdetailed: '',
            dropoffdetailed: '',
            date: '', // Set default or empty date
            time: '', // Set default or empty time
            passengers,
            airline: '',
            flightnumber: '',
            prices,
            routenumber,
          });

          // Remove focus from the entire page
          if (document.activeElement) {
            document.activeElement.blur();}
          // setValue(`entries.${index}.pickup`, dropoff)
  
          // Update the active index to the new trip
          const newIndex = watchEntries.length; // New trip will be added at the end
          setActiveIndex(newIndex);
          
        } catch (error) {
          console.error("Error fetching route number for return trip:", error);
        }
      } else {
        console.error("Pickup and dropoff must be selected before adding a return trip.");
      }
    } else {
      // Remove the last trip if unchecking roundtrip
      setIsRoundTrip(false)
      const lastEntry = fields[fields.length - 1];
      const currentEntry = watchEntries[index];
      if (lastEntry.pickup === currentEntry.dropoff && lastEntry.dropoff === currentEntry.pickup) {
        remove(fields.length - 1);
      }
    }
    checkbox.blur();
  };  
  
  // Log values whenever they are updated
  useEffect(() => {
    watchEntries.forEach((trip, index) => {
      console.log("Watch Entries :", {watchEntries});
      console.log(`Entry ${index + 1}:`);
      console.log("Pickup:", trip.pickup);
      console.log("Dropoff:", trip.dropoff);
      console.log("Pickup Detailed:", trip.pickupdetailed);
      console.log("Dropoff Detailed:", trip.dropoffdetailed);
      console.log("Date:", trip.date);
      console.log("Time:", trip.time);
      console.log("Passengers:", trip.passengers);
      console.log("Prices:", trip.prices);
      // console.log("Destinations", destinations);
    });
  }, [watchEntries]);

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
    console.log("hero expanded", isHeroExpanded)
    scrollToTop()
  };
  
  // TODO Update airline field when pickup changes from 'Liberia'
  
  // Check if the group is too large for auto-booking
  useEffect(() => {
    const largeGroup = watchEntries.some(entry => entry.passengers === '11+');
    setIsLargeGroup(largeGroup);
  }, [watchEntries]);

  // Check if the date is valid for auto-booking
  useEffect(() => {
    const validDate = watchEntries.some(entry => {
      const bookingDate = new Date(entry.date);
      const currentDate = new Date();
      const dateMarginInMilliseconds = dateMargin * 24 * 60 * 60 * 1000; // Convert margin to milliseconds
      const futureDateMargin = new Date(currentDate.getTime() + dateMarginInMilliseconds); // Current date + margin
      
      // console.log("current Date", currentDate);
      // console.log("futureDateMargin", futureDateMargin);
      // console.log("booking Date HERE:", bookingDate, futureDateMargin);

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
    const { hasIncompleteFields, missingFieldsMessage } = validateEntries(entries, ['pickup', 
      'dropoff', 'date', 'time'
    ]);
    
    if (hasIncompleteFields) {
      setMissingFields(missingFieldsMessage);
      setIsRequiredFieldsModalOpen(true);
      return;
    }

    console.log("Request type:", requestType)
    // if (requestType === 'Large Group' || requestType === 'Upcoming') {
    navigate('/completebooking', { state: { requestType, entries, isLargeGroup, isDateValid } })
    // } else {
    //   navigate('/completebooking', { state: { requestType, entries } })
    // }
  };
  
  return (
    <div>
      <nav>
        <Navbar onBookClick={handleBookClick}/>
      </nav>
      <div className="hero-section">
        {fields.map((entry, index) => (
          <div key={entry.id} >
            {/* Not in DB Popup */}
            <Modal
              isOpen={locationNotInDBModalIsOpen}
              onRequestClose={() => setLocationNotInDBModalIsOpen(false)}
              contentLabel="Location not listed"
              className="calendar-modal"
              overlayClassName="calendar-modal-overlay"
            >
              <h2>Location Not Listed</h2>
              <p>No worries! Even if you cannot find your location, we can still get you there! </p>
              <p><b>Please manually type your location into the To/From field,</b> fill out the date and time, and click the Book button. After you complete your booking, a sales associate will reach out to you to confirm your details and ensure you have an excellent trip!</p>
              <button onClick={() => setLocationNotInDBModalIsOpen(false)}>Close</button>

            </Modal>
            {/* Calendar Modal Popup */}
            <Modal
              isOpen={isCalendarOpen}
              onRequestClose={() => setIsCalendarOpen(false)}
              contentLabel="Select Date"
              className="calendar-modal"
              overlayClassName="calendar-modal-overlay"
            >
              {activeIndex !== null && (
                <CalendarWithPrices
                  date={selectedDate}
                  prices={watchEntries[activeIndex]?.prices}
                  passengers={watchEntries[activeIndex]?.passengers}
                  // setDate={setSelectedDate}
                  
                  onDateChange={(dateString) => {
                    console.log("Received date string:", dateString); // Debugging output
                
                    // Validate date string format before updating the state
                    const validDate = new Date(dateString);
                    if (!isNaN(validDate.getTime())) {
                        setSelectedDate(validDate); // Update selectedDate for local state
                        setValue(`entries.${activeIndex}.date`, dateString); // Save formatted date in form
                        setIsCalendarOpen(false); // Close modal after date selection
                    } else {
                        console.error("Invalid date string received:", dateString);
                    }
                  }}
                
                  index={activeIndex}
                />
              )}

              <button onClick={() => setIsCalendarOpen(false)}>Close Calendar</button>
            </Modal>

            <div 
              className="flex-container" 
              style={{
                maxWidth: isHeroExpanded ? '600px' : '100%', // Dynamically set maxWidth
                transition: 'max-width 0.5s ease', // Smooth transition
              }}>
                  {index === 1 && isRoundTrip ? ( // If this is the second trip and roundtrip is selected
                    null
                  ) : (
                    // <div className="input-container-hero">
                    //   <input 
                    //     type="text"
                    //     value={watchEntries[index]?.pickup || ''} // Use 'value' instead of 'defaultValue'
                    //     onFocus={() => {
                    //       setValue(`entries.${index}.pickup`, ''); // Clear the input value
                    //       setValue(`entries.${index}.routenumber`, '')
                    //     }}
                    //     onChange={(e) => {
                    //       const value = e.target.value;
                    //       setValue(`entries.${index}.pickup`, value); // Update the form value
                        
                    //       // Check if the value matches a valid location and trigger fetch
                    //       if (pickupLocations.includes(value)) {
                    //         fetchRouteAndPrices(); // Explicitly fetch prices after valid selection
                    //       }
                    //     }}
                    //     onBlur={(e) => {
                    //       const value = e.target.value;
                      
                    //       if (pickupLocations.includes(value)) {
                    //         fetchRouteAndPrices();
                    //       }
                    //     }}
                    //     {...register(`entries.${index}.pickup`)}
                    //     style={{
                    //       width: '220px',
                    //       fontSize: (watchEntries[index]?.pickup || '').length < 12 ? '2.5rem' : '1.3rem',
                    //       whiteSpace: 'normal',
                    //       overflowWrap: 'break-word',
                    //       wordWrap: 'break-word',
                    //       height: '70px',
                    //       display: 'inline-block',
                    //     }}                      
                    //     list={`pickup-options-${index}`}
                    //     placeholder="From"
                    //   />
                    //   <div className='label-with-upper-line'>
                    //     <label>Your Origin</label>
                    //   </div>

                    //   <datalist id={`pickup-options-${index}`}>
                    //   {pickupLocations
                    //     .filter(option => 
                    //       option.toLowerCase().includes(
                    //         (watchEntries[index]?.pickup || '').toLowerCase() // Ensure we handle undefined
                    //       )
                    //     )
                    //     .map((option, idx) => (
                    //       <option key={idx} value={option} />
                    //     ))
                    //   }
                    //   </datalist>
                    // </div>
                    <div className="input-container-hero"  style={{ position: "relative", width: "220px" }}>
                      <input
                        type="text"
                        value={watchEntries[index]?.pickup || ""}
                        onClick={() => {
                          setFilteredPickupLocations(pickupLocations);
                          setShowPickupDropdown(true);
                        }}
                        onChange={(e) => {
                          const value = e.target.value;
                          setValue(`entries.${index}.pickup`, value);
                          setFilteredPickupLocations(
                            pickupLocations.filter((option) =>
                              option.toLowerCase().includes(value.toLowerCase())
                            )
                          );
                        }}
                        onFocus={() => {
                          setShowPickupDropdown(true);
                          setValue(`entries.${index}.routenumber`, '');
                        }}
                        onBlur={() => setTimeout(() => setShowPickupDropdown(false), 200)} // Delay to allow selection
                        style={{
                          width: '220px',
                          fontSize: (watchEntries[index]?.pickup || '').length < 12 ? '2.5rem' : '1.3rem',
                          height: '70px',
                        }}
                        placeholder="From"
                      />
                      {showPickupDropdown && (
                        <ul className="dropdown">
                          {filteredPickupLocations.map((option, idx) => (
                            <li
                              key={idx}
                              onClick={() => {
                                setValue(`entries.${index}.pickup`, option);
                                setShowPickupDropdown(false);
                                fetchRouteAndPrices();
                              }}
                            >
                              {option}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                    
                  {index === 1 && isRoundTrip ? ( // If this is the second trip and roundtrip is selected
                    null
                  ) : (
                    <div className='input-container-green'>
                      <p style={{ fontSize: '2rem' }}><b>&#8594;</b></p>
                    </div>
                  )}

                  {index === 1 && isRoundTrip ? ( // If this is the second trip and roundtrip is selected
                    null
                  ) : (
                    // <div className="input-container-hero" >
                    //   <input
                    //     type="text"
                    //     value={watchEntries[index]?.dropoff || ''} // Use 'value' instead of 'defaultValue'
                    //     onFocus={() => {
                    //       setValue(`entries.${index}.dropoff`, ''); // Clear the input value
                    //       setValue(`entries.${index}.routenumber`, '')
                    //     }}
                    //     onChange={(e) => {
                    //       console.log("Input changed"); // Debugging output
                    //       const value = e.target.value;
                    //       setValue(`entries.${index}.dropoff`, value); // Update the form value

                    //       // Check if the value matches a valid location and trigger fetch
                    //       if (dropoffLocations.includes(value)) {
                    //         fetchRouteAndPrices(); // Explicitly fetch prices after valid selection
                    //       }
                    //     }}
                    //     onBlur={(e) => {
                    //       const value = e.target.value;
                      
                    //       if (dropoffLocations.includes(value)) {
                    //         fetchRouteAndPrices();
                    //       }
                    //     }}
                    //     {...register(`entries.${index}.dropoff`)}
                    //     style={{
                    //       width: '220px',
                    //       fontSize: (watchEntries[index]?.dropoff || '').length < 12 ? '2.5rem' : '1.3rem',
                    //       whiteSpace: 'normal',
                    //       overflowWrap: 'break-word',
                    //       wordWrap: 'break-word',
                    //       height: '70px',
                    //       display: 'inline-block',
                    //     }}
                    //     list={`dropoff-options-${index}`}
                    //     placeholder="To"
                    //   />
                    //   <datalist id={`dropoff-options-${index}`}>
                    //   {dropoffLocations
                    //     .filter(option => 
                    //       option.toLowerCase().includes(
                    //         (watchEntries[index]?.dropoff || '').toLowerCase() // Ensure we handle undefined
                    //       )
                    //     )
                    //     .map((option, idx) => (
                    //       <option key={idx} value={option} />
                    //     ))
                    //   }
                    //   </datalist>

                    //   <label>Your Destination</label>
                    // </div>
                    <div className="input-container-hero"  style={{ position: "relative", width: "220px" }}>
                      <input
                        type="text"
                        value={watchEntries[index]?.dropoff || ""}
                        onClick={() => {
                          setFilteredDropoffLocations(dropoffLocations);
                          setShowDropoffDropdown(true);
                        }}
                        onChange={(e) => {
                          const value = e.target.value;
                          setValue(`entries.${index}.dropoff`, value);
                          setFilteredDropoffLocations(
                            dropoffLocations.filter((option) =>
                              option.toLowerCase().includes(value.toLowerCase())
                            )
                          );
                        }}
                        onFocus={() => {
                          setShowDropoffDropdown(true);
                          setValue(`entries.${index}.routenumber`, '');
                        }}
                        onBlur={() => setTimeout(() => setShowDropoffDropdown(false), 200)}
                        style={{
                          width: "220px",
                          fontSize: (watchEntries[index]?.dropoff || '').length < 12 ? '2.5rem' : '1.3rem',
                          height: "70px",
                        }}
                        placeholder="To"
                      />

                      {showDropoffDropdown && filteredDropoffLocations.length > 0 && (
                        <ul className="dropdown">
                          {filteredDropoffLocations.map((option, idx) => (
                            <li
                              key={idx}
                              onClick={() => {
                                setValue(`entries.${index}.dropoff`, option);
                                setShowDropoffDropdown(false);
                                fetchRouteAndPrices();
                              }}
                            >
                              {option}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="input-container"   style={{ width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} > 
                    {index === 0 && (
                      <>
                        <input
                          type="checkbox"
                          id={`roundtrip-${index}`} // Unique ID for each checkbox
                          {...register(`entries.${index}.roundtrip`)} // Register with React Hook Form
                          style={{ display: 'none' }} // Hide the native checkbox
                          // onMouseDown={(e) => e.preventDefault()}
                          onChange={(e) => handleRoundtripChange(e.target.checked, index, e)} // Handle change
                        />
                        <label
                          htmlFor={`roundtrip-${index}`}
                          style={{ fontSize: '0.9rem', fontWeight: 'normal'}}
                          className="styled-checkbox"
                        >
                          Roundtrip
                        </label>
                      </>
                    )}
                    
                    {index === 1 && isRoundTrip ? ( // If this is the second trip and roundtrip is selected
                      null
                    ) : (
                      <div>
                        <input
                          type="checkbox"
                          id={`unlisted-location-${index}`} // Unique ID for each checkbox
                          {...register(`entries.${index}.unlisted-location`)} // Register with React Hook Form
                          style={{ display: 'none' }} // Hide the native checkbox
                        />
                        <label
                          htmlFor={`unlisted-location-${index}`}
                          className="styled-checkbox"
                          style={{ fontSize: '0.9rem', fontWeight: 'normal'}}
                        >
                          My Location Is Not Listed
                        </label>
                      </div>
                    )}
                  </div>

                  {index === 1 && isRoundTrip ? ( // If this is the second trip and roundtrip is selected
                    null
                  ) : (
                    <div className="input-container"  style={{ width: '230px' }} > 
                      <select
                        {...register(`entries.${index}.passengers`, { required: true })}
                        value={watchEntries[index]?.passengers || "1"} // Default to the existing value or an empty string
                        required
                        style={{ fontSize: '1.5rem', fontFamily: 'Segoe UI' }}
                        // className={!watchEntries[index]?.passengers ? 'placeholder' : ''} // Apply class if no value is selected
                      >
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11+"].map((value) => (
                          <option key={value} value={value} >
                            {value} {value === "1" ? "Passenger" : "Passengers"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
          </div>
          <div 
            className="flex-container" 
            style={{
              maxWidth: isHeroExpanded ? '600px' : '100%', // Dynamically set maxWidth
              transition: 'max-width 0.5s ease', // Smooth transition
            }}>
                {isRoundTrip && (
                  index === 0 ? ( // If this is the second trip and roundtrip is selected
                    <p 
                      style={{
                        width: '120px', 
                        fontWeight: 'bold', 
                        // textDecoration: 'underline',
                        textAlign: 'right'}}
                    >
                      Trip 1:
                    </p>
                  ) : index === 1 ? (
                    <p 
                      style={{
                        width: '120px', 
                        fontWeight: 'bold', 
                        // textDecoration: 'underline',
                        textAlign: 'right'}}
                    >
                      Trip 2:
                    </p>                  
                  ) : null
                )}
                <div className="input-container" style={{ width: '250px' }}>
                  {watchEntries[index]?.pickup && watchEntries[index]?.dropoff && watchEntries[index]?.passengers ? (
                    <button
                      onClick={() => toggleCalendarModal(index)} // Pass index explicitly
                      className="calendar-button"
                    >
                    {watchEntries[index]?.date && watchEntries[index]?.passengers === '11+'
                      ? `${watchEntries[index].date}`
                      : watchEntries[index]?.date && !isRouteInDB
                      ? `${watchEntries[index].date}`
                      : watchEntries[index]?.date
                      ? `${watchEntries[index].date} | $${watchEntries[index].prices[watchEntries[index].date]}`
                      : (
                          <>
                            <FontAwesomeIcon icon={faCalendarAlt} />
                            <span> Select Date</span>
                          </>
                        )
                    }              
                    </button>
                  ) : (
                    <p style={{ color: 'grey' }}><i>Select From, To & Passengers</i></p>
                  )}
                  {errors.entries?.[index]?.date && (
                    <p style={{ color: 'red', fontSize: '12px' }}>Date selection is required.</p>
                  )}
                  <label>Date & Prices Calendar</label>
                  
                </div>

                <div className="input-container" style={{ width: '130px' }}>
                  <div>
                    <input
                      type="time"
                      name="pickup_time"
                      {...register(`entries.${index}.time`, { required: true })}
                      value={watchEntries[index]?.time || ""}
                      onChange={(e) => setValue(`entries.${index}.time`, e.target.value)}
                      step="300" // 5-minute increments
                      min="00:00"  // ✅ Ensures a valid time range
                      max="23:55"  // ✅ Prevents invalid times
                      required
                      className={watchEntries[index]?.time ? "time-selected" : "time-default"} // ✅ Add conditional class
                    />
                  </div>
                  <label>Pickup Time</label>
                </div>

              
              
              <div className='input-container' style={{ paddingLeft: '30px'}}>
                <div>
                  {index >= 1 && !isRoundTrip ? (
                    <button className="book-button" onClick={() => remove(index)}><b>REMOVE TRIP</b></button> //{index + 1}
                  ) : (null)}
                </div>
              </div>
              
              {isRoundTrip ? (
                null
              ) : ( 
                (isValues && (
                  <div className='input-container' style={index === 0 ? { paddingLeft: '30px'}: {}}>
                    <button className="book-button" type="button-right" onClick={() => append({
                      pickup: '',
                      dropoff: '',
                      pickupdetailed: '',
                      dropoffdetailed: '',
                      date: '',
                      time: '',
                      passengers: '1',
                      airline: '',
                      flightnumber: '',
                      prices: {},
                    })}>
                      <b>ADD TRIP</b>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
        
        <div className='flex-container'>
          <div className='input-container'>
            <table style={{ border: 'none', borderCollapse: 'collapse' }}>
              <tbody>
              {watchEntries.map((entry, index) => (
                entry.pickup && entry.dropoff && entry.passengers && entry.date && entry.time && (
                  <tr key={index}>
                    <td style={{ border: 'none', padding: '0', lineHeight: '1.0' }}>
                    <div style={{ margin: '0px 20px' }}><h4 style={{ margin: '0' }}>Trip {index + 1}</h4></div>
                    </td>
                    <td style={{ border: 'none', padding: '0', lineHeight: '1.0' }}>
                      <div style={{ margin: '0px 20px' }}><h4 style={{ margin: '0' }}>{entry.date}</h4></div>
                    </td>
                    <td style={{ border: 'none' }}>
                      <p style={{ margin: '0px 20px' }}>{entry.pickup} to {entry.dropoff} with pickup at {entry.time}, for {entry.passengers} passengers.</p>
                      
                      {entry.airline && <p>Airline: {entry.airline}</p>}
                      {entry.flightnumber && <p>Flight Number: {entry.flightnumber}</p>}
                    </td>
                    <td style={{ border: 'none', margin: '0px 20px' }}>
                      {watchEntries.some(entry => entry.passengers === '11+') || !isRouteInDB ? (
                        <></>
                      ) : (
                        <p style={{ margin: '0px 20px' }}><b>${entry.prices[entry.date]}</b></p>
                      )}
                    </td>
                  </tr>
                )
              ))}
              </tbody>
            </table>
          </div>
        </div>
        <div 
          className='flex-container-right' 
          style={{
            maxWidth: isHeroExpanded ? '600px' : '1500px', // Dynamically set maxWidth
            transition: 'max-width 0.5s ease', // Smooth transition
          }}
        >
          <div className='input-container' style={{ margin: '0px 20px', alignContent:'center', display: 'flex'}}>
            {totalPrice > 0 && !isLargeGroup && isRouteInDB && (
              <h2><b>Total: ${totalPrice}</b></h2>
            )}
          </div>
          
          {isValues && (
            <div className='input-container'>
              <button className="book-button" type="button-right" onClick={handleCompleteBooking}><b>NEXT</b></button>
              <RequiredFieldsModal
                isOpen={isRequiredFieldsModalOpen}
                onClose={() => setIsRequiredFieldsModalOpen(false)}
                missingFields={missingFields}            
              />
            </div>
          )}

        </div>
      </div>

      <div className='background-image-van'>
        <h1>Stress-Free Travel</h1>
        <h2>Explore Northwest Costa Rica with safe, reliable and convenient transportation.</h2>
      
      </div>

      <div //This is here to force a focus to this area, so that roundtrip works
        id="hidden-focus-target"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
        tabIndex="-1"
      />

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

