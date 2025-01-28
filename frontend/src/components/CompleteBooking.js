import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'react-modal';
import PhoneInput from 'react-phone-input-2';
import { useForm, useWatch } from 'react-hook-form';
import airlineOptions from './airlineOptions'; // Import your airline options
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './NavBar'; // Import the top navigation bar
import axios from 'axios';
import RequiredFieldsModal from './RequiredFieldsModal';
import { validateEntries } from './HelperFunctions';
import { useDebounce } from 'use-debounce';


function CompleteBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    requestType: initialRequestType,
    entries: initialEntries,
    isLargeGroup: initialIsLargeGroup,
    isDateValid: initialIsDateValid,
  } = location.state || {}; // Default to {} if state is undefined

  const [confirmModalIsOpen, setConfirmModalIsOpen] = useState(false);
  const [isCodeEntry, setIsCodeEntry] = useState(true); // Flag for entering code or loading
  const [confirmationCode, setConfirmationCode] = useState(''); // State for 6-digit code 
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [validPhone, setValidPhone] = useState(null);
  const [questions, setQuestions] = useState('');
  const bookingsite = 'costaricanorthwest.com';
  const airportLocations = ['LIR - Liberia Airport', 'SJO - San Jose Airport']
  const [errorMessage, setErrorMessage] = useState('');
  const [isRequiredFieldsModalOpen, setIsRequiredFieldsModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState('')
  const [tempEdit, setTempEdit] = useState(null);
  const [tripPrices, setTripPrices] = useState({});
  const [dateMargin, setDateMargin] = useState('');
  const [isLargeGroup, setIsLargeGroup] = useState(initialIsLargeGroup || false)
  const [isDateValid, setIsDateValid] = useState(initialIsDateValid || false)
  const [requestType, setRequestType] = useState(initialRequestType || false)
  const [largeGroupPassengers, setLargeGroupPassengers] = useState('');
  const [debouncedTelephone] = useDebounce(telephone, 300);
  const [successfulBooking, setSuccessfulBooking] = useState(false)
  const [successfulRequest, setSuccessfulRequest] = useState(false)
  // const [confirmation_code, setConfirmation_Code] = useState('');

  // Initialize useForm and useFieldArray
  const { register, control, setValue } = useForm({
    defaultValues: { entries: initialEntries }
  });

  const watchEntries = useWatch({ control, name: "entries" });
    console.log("large group passenger", largeGroupPassengers)

  // Fetch margin used for selecting dates
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/datemargin')
    .then(response => setDateMargin(response.data))
    .catch(error => console.error("Error getting date margin for autobooking: ", error));
  }, []);

  // Check the country code with the backend
  useEffect(() => {
    if (requestType !== 'Alternate Route' && debouncedTelephone && debouncedTelephone.length >= 3) {
      console.log("telephone", telephone)
      axios.get(`http://127.0.0.1:5000/api/valid-phone`, {
        params: { phone: debouncedTelephone.startsWith('+') ? debouncedTelephone.slice(1) : debouncedTelephone },
      })
        .then((response) => {
        setValidPhone(response.data.valid);
        console.log("Response data", response.data.valid)
      })
      .catch((error) => {
        console.error('Error checking phone number:', error);
      })
    }
  }, [telephone, debouncedTelephone, requestType]);

  useEffect(() => {
    if (requestType === 'Alternate Route') {
      setValidPhone(true); // Treat phone validation as always valid for Alternate Route
    }
  }, [requestType]);

  useEffect(() => {
    console.debug('Current telephone:', telephone);
  }, [telephone]);

  // Fetch prices by date
  const fetchPrices = async (index, routenumber, passengers, startdate, enddate) => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/api/prices`, {
        params: { routenumber, passengers, startdate, enddate },
      });
      console.log("Fetched prices for trip:", response.data);
  
      // Update tripPrices immutably
      setTripPrices((prevPrices) => ({
        ...prevPrices,
        [index]: response.data,
      }));
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  const [manualRouteRequest, setManualRouteRequest] = useState('')
  const manualRouteTextCreate = useCallback(async () => {
    let manualroutetext = '';
    watchEntries.forEach((entry, index) => {
      manualroutetext += `Trip ${index + 1}: ${entry.date}. ${entry.pickup} to ${entry.dropoff} at ${entry.time} for ${entry.passengers} passengers. `;
      console.log("Manual route text", manualroutetext);
    });
    setManualRouteRequest(manualroutetext);
  }, [watchEntries]); // Add dependencies here
  
  useEffect(() => {
    if (requestType === 'Alternate Route') {
      manualRouteTextCreate();
      console.log("Manual route", manualRouteRequest);
    }
  }, [manualRouteTextCreate, requestType, manualRouteRequest]); // Use manualRouteTextCreate as dependency
  

  useEffect(() => {
    if (initialEntries) {
      initialEntries.forEach((entry, index) => {
        if (entry.routenumber && entry.passengers && entry.date) {
          fetchPrices(index, entry.routenumber, entry.passengers, entry.date, entry.date);
        }
      });
    }
  }, [initialEntries]);

  // Check if the group is too large for auto-booking
  useEffect(() => {
    const largeGroup = watchEntries.some(entry => entry.passengers === '11+');
    setIsLargeGroup(largeGroup);
  }, [watchEntries]);

  // Check if the date is valid for auto-booking
  useEffect(() => {
    const validDate = watchEntries.every(entry => {
      const bookingDate = new Date(entry.date);
      const currentDate = new Date();
      const dateMarginInMilliseconds = dateMargin * 24 * 60 * 60 * 1000; // Convert margin to milliseconds
      const futureDateMargin = new Date(currentDate.getTime() + dateMarginInMilliseconds); // Current date + margin
      
      console.log("current Date", currentDate);
      console.log("futureDateMargin", futureDateMargin);
      console.log("booking Date HERE:", bookingDate, futureDateMargin);

      return bookingDate > futureDateMargin; // Date valid if after margin
    });

    setIsDateValid(validDate);
  }, [watchEntries, dateMargin]);
  
  // Combine logic to determine request type
  useEffect(() => {
    if (requestType === 'Alternate Route') {
      manualRouteTextCreate()
      console.log("Manual route", manualRouteRequest)
      return; // Skip other checks for Alternate Route
    }

    if (!isDateValid) {
      setRequestType('Upcoming');
    } else if (isLargeGroup) {
      setRequestType('Large Group');
    } else if (!validPhone) {
      setRequestType('Invalid Phone');
    } else {
      setRequestType('Auto');
    }
    console.log("request type ", requestType)
  }, [isLargeGroup, isDateValid, validPhone, requestType, manualRouteRequest, manualRouteTextCreate]);

  // Function to generate a 6-digit uppercase confirmation code
  const generateConfirmationCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Allowed characters
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    return code; // Set the generated code in state
  };
    // Define the function outside the JSX
  const handleQuestionsChange = (event) => {
    const value = event.target.value;
    setQuestions(value);
  };

  const openEditModal = (index) => {
    setCurrentEditIndex(index);
    setTempEdit({ ...watchEntries[index], routenumber: watchEntries[index?.routenumber] }); // Copy current trip values
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setCurrentEditIndex(null);
    setTempEdit(null); // Discard temporary edits
  };

  const saveEditedTrip = () => {
    if (currentEditIndex !== null && tempEdit) {
      Object.keys(tempEdit).forEach((field) => {
        setValue(`entries.${currentEditIndex}.${field}`, tempEdit[field]);
      });
      console.log("temp edit", tempEdit)

      // Extract updated trip details
      const { pickup, dropoff, passengers, date } = tempEdit;

      // Fetch prices for the updated trip
      if (pickup && dropoff && passengers && date) {
        fetchPrices(currentEditIndex, tempEdit.routenumber, passengers, date, date);
      }
      
      console.log("Saved trip:", tempEdit); // Debugging
    }
    closeEditModal();
  };

  const handleSubmitBooking = async () => {
    const fields = [{
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      telephone: telephone || '',
      largeGroupPassengers: isLargeGroup ? (largeGroupPassengers || '') : undefined,
    }];

    // Add `largeGroupPassengers` if `isLargeGroup` is true
    if (isLargeGroup) {
        fields.largeGroupPassengers = largeGroupPassengers;
    }

    // Define the required fields dynamically
    const requiredFields = ['firstName', 'lastName', 'email', 'telephone'];
    if (isLargeGroup) {
        requiredFields.push('largeGroupPassengers');
    }
    
    const { hasIncompleteFields, missingFieldsMessage } = validateEntries(fields, requiredFields);
    
    if (hasIncompleteFields) {
      setMissingFields(missingFieldsMessage);
      setIsRequiredFieldsModalOpen(true);
      return;
    }
    // let result = generateConfirmationCode()
    // setConfirmation_Code(result)
    if (requestType === 'Auto') {
      // Popup the confirmation code entry
      setConfirmModalIsOpen(true);
      setIsCodeEntry(true)
      // Generate Confirmation code
      await axios.post('http://127.0.0.1:5000/api/send-verification',{
        telephone: telephone,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } else { // Not Auto requestType
      let confirmationCode = generateConfirmationCode()
      setConfirmationCode(confirmationCode)
      setLoading(true);
      setIsCodeEntry(false)
      setConfirmModalIsOpen(true);
      
      // Not auto booking, create its own confirmation code
      const bookingData = { entries: watchEntries, firstName, lastName, email, telephone, questions, bookingsite, requestType, confirmationCode, manualRouteRequest, largeGroupPassengers };
      console.log("bookingData", bookingData)
      const response = await axios.post('http://127.0.0.1:5000/api/submit-booking', { bookingData });
      console.log("here2")
      setLoading(false);
      if (response.status === 200) {
        setSuccessfulRequest(true)
      }
    }
  };

  const handleCodeSubmit = async () => {
    setLoading(true);
    setIsCodeEntry(false); // Switch to loading view

    try {
      // Ensure telephone and confirmationCode are not empty
      if (!telephone || confirmationCode.length !== 6) {
          setErrorMessage("Phone number or confirmation code is invalid.");
          setIsCodeEntry(true);
          setLoading(false);
          return;
      }

      const verifyResponse = await axios.post('http://127.0.0.1:5000/api/verify-code', {
          telephone,
          code: confirmationCode,
      });

      if (verifyResponse.status === 200 && verifyResponse.data.success) {
          // Proceed to submit the booking
          const bookingData = { entries: watchEntries, firstName, lastName, email, telephone, questions, bookingsite, requestType, confirmationCode, manualRouteRequest };
          const response = await axios.post('http://127.0.0.1:5000/api/submit-booking', { bookingData });

          setLoading(false);
          if (response.status === 200) {
            setSuccessfulBooking(true)
          }
      } else {
          // Verification failed
          setErrorMessage("The verification code is incorrect. Please try again.");
          setIsCodeEntry(true);
      }
    } catch (error) {
        setLoading(false);

        if (error.response && error.response.data && error.response.data.error) {
            // Handle error messages
            const errorMessage = error.response.data.error;

            if (errorMessage === 'Invalid verification code.') {
                setErrorMessage("The verification code is incorrect. Please try again.");
                setIsCodeEntry(true); // Show code entry modal for retry
            } else {
                setErrorMessage(errorMessage);
            }
        } else {
            console.error("Error during verification or booking:", error);
            setErrorMessage("An unexpected error occurred. Please try again.");
        }
    }
  }; 

  const closeBookingConfirmationModal = () => {
    setConfirmModalIsOpen(false);
    setIsCodeEntry(true);
    setConfirmationCode('');
    navigate('/');
    window.scrollTo(0, 0); // Scroll to the top of the page
  };

  return (
    <>
      <nav>
        <Navbar />
      </nav>
      {/* Modal for Booking Confirmation */}
      <Modal
        isOpen={confirmModalIsOpen}
        onRequestClose={closeBookingConfirmationModal}
        contentLabel="Confirmation Code Entry"
        className="Modal-for-popup"
        overlayClassName="Overlay-for-popup"
      >
        {successfulBooking ? (
          // Show "Booking Confirmed!" when successfulBooking is true
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <h2>Booking Confirmed!</h2>
            <p>Thank you for booking with us, {firstName}! Please check your email for confirmation and additional information. Your confirmation code is:</p>
            <h3>{confirmationCode}</h3>
            <button
              onClick={closeBookingConfirmationModal}
              className="book-button"
              style={{ marginTop: '20px' }}
            >
              CLOSE
            </button>
          </div>
        ) : successfulRequest ? (
          // Show "Booking Requested!" when successfulBooking is true
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <h2>Booking Requested!</h2>
            <p>Thank you for requesting your booking with us, {firstName}! While your <b><i>booking is not yet confirmed</i></b>, a dedicated sales associate will be reaching out to you soon to confirm your trip and to ensure a seamless, enjoyable experience. Please check your email for confirmation of this request. Your confirmation code is:</p>
            <h3>{confirmationCode}</h3>
            <button
              onClick={closeBookingConfirmationModal}
              className="book-button"
              style={{ marginTop: '20px' }}
            >
              CLOSE
            </button>
          </div>
        ) : isCodeEntry ? (
          // Show the confirmation code entry form
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <h3>
              To confirm your identity, we have sent a text message to +{telephone}. Please enter the
              Confirmation Code you have received to complete your booking.
            </h3>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>} {/* Display error message */}
            <input
              type="text"
              maxLength={6}
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              style={{ fontSize: '1.5rem', textAlign: 'center', padding: '10px', width: '50%' }}
            />
            <button
              onClick={handleCodeSubmit}
              disabled={confirmationCode.length !== 6}
              className="book-button"
              style={{ marginTop: '20px' }}
            >
              COMPLETE YOUR BOOKING!
            </button>
            {errorMessage && (
              <button
                onClick={closeBookingConfirmationModal}
                className="book-button"
                style={{ marginTop: '20px' }}
              >
                CLOSE
              </button>
            )}
          </div>
        ) : loading ? (
          // Show loading state
          <div>
            <>
              <h2>Sending Confirmation Email</h2>
              <div className="loader"></div>
              <p>Please wait while we process your booking.</p>
            </>
          </div>
        ) : (
          // Error
          <div>
            <>
              <h2>An error has occured</h2>
              <p>please try booking again.</p>
            </>
          </div>
        )}
      </Modal>


      {/* Modal for Editing Trip Details */}
      <Modal
        isOpen={editModalOpen}
        onRequestClose={closeEditModal}
        contentLabel="Edit Trip Details"
        className="Modal-for-popup"
        overlayClassName="Overlay-for-popup"
      >
        <h2>Edit Trip Details</h2>
        {tempEdit && (
          <>
            {requestType !== 'Large Group' && (
              <div className="input-container">
                <label>Passengers:</label>
                <select
                  value={tempEdit.passengers || "1"} // Set the value to tempEdit.passengers or default to "1"
                  onChange={(e) => setTempEdit({ ...tempEdit, passengers: e.target.value })} // Update tempEdit when the value changes
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
            <div className="input-container">
              <label>Pickup Time:</label>
              <input
                type="time"
                value={tempEdit.time || ''} // Controlled input
                onChange={(e) => setTempEdit({ ...tempEdit, time: e.target.value })}
                />
            </div>
            <div className="input-container">
              <label>Date:</label>
              <input
                type="date"
                value={tempEdit.date || ''} // Controlled input
                onChange={(e) => setTempEdit({ ...tempEdit, date: e.target.value })}
                />
            </div>
            <div style={{display: 'flex', alignContent: 'center', justifyContent: 'center', margin:'0', gap: '6px'}}>
              <button onClick={saveEditedTrip} className='book-button'>SAVE CHANGES</button>
              <button onClick={closeEditModal} className='cancel-button' style={{borderRadius: '0'}}>CANCEL</button>
            </div>
          </>
        )}
      </Modal>

      {requestType === 'Large Group' && (
        <>
          <div className="flex-container-completebooking">
            <h2>Submit Email Request Form</h2>
          </div>
          <div className="flex-container-completebooking">
            <p style={{ fontSize:'1.2rem' }}>Thank you for choosing us for your upcoming trip!</p>
          </div>
          <div className="flex-container-completebooking">
            <p  style={{ width:'90%', maxWidth:'850px', fontSize:'1.2rem', textAlign: 'center', margin: '0 auto' }}><i>Due to the size of your party, we want to ensure that every detail is perfectly arranged. Please complete the form, and a dedicated sales associate will reach out to discuss your specific needs and ensure a seamless, enjoyable experience.</i></p>
          </div>

          <div className="flex-container-completebooking">
            <div className="input-container" style={{ width: '300px', margin: '20px 0' }}>        
              <input
                type="number"
                value={largeGroupPassengers}
                style={{ fontSize: '1.5rem', width: '100%', justifyContent: 'center' }}
                onChange={(e) => setLargeGroupPassengers(e.target.value)}
                placeholder="Passengers"
                required
              />
              <label>PASSENGERS</label>
            </div>
          </div>
        </>
      )}

{requestType === 'Alternate Route' && (
        <>
          <div className="flex-container-completebooking">
            <h2>Submit Email Request Form</h2>
          </div>
          <div className="flex-container-completebooking">
            <p style={{ fontSize:'1.2rem' }}>Thank you for choosing us for your upcoming trip!</p>
          </div>
          <div className="flex-container-completebooking">
            <p  style={{ width:'90%', maxWidth:'850px', fontSize:'1.2rem', textAlign: 'center', margin: '0 auto' }}><i>We want to ensure that every detail is perfectly arranged. Please complete the form, and a dedicated sales associate will reach out to discuss your specific needs, share a quote, and ensure a seamless, enjoyable experience.</i></p>
          </div>
        </>
      )}
      
      {requestType === 'Upcoming' && (
        <>
          <div  className="flex-container-completebooking">
            <h2>Submit Email Request Form</h2>
            </div>
          <div className="flex-container-completebooking">
            <p style={{ fontSize:'1.2rem' }} >Thank you for choosing us for your upcoming trip!</p>
            </div>
          <div className="flex-container-completebooking">
            <p><i>Given the short notice, please complete the form and we will reach out directly to confirm all the details to ensure you receive the exceptional transportation experience we’re known for.</i></p>
          </div>
        </>
      )}

      <div  className="flex-container-completebooking">
        <h2>Add Personal Information</h2>
      </div>

      <div className='flex-container-completebooking' >
        <div className="input-container" style={{ width: '300px' }}>        
          <input type="text" value={firstName}  style={{ fontSize: '1.5rem', width: '100%', justifyContent: 'center' }} onChange={(e) => setFirstName(e.target.value)} 
          placeholder='First Name'
          required />
          <label>FIRST NAME</label>
        </div>
        <div className="input-container" style={{ width: '300px' }}>        
          <input className='input' style={{ fontSize: '1.5rem', width: '100%' }} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
          placeholder='Last Name'
          required />
          <label>LAST NAME</label>
        </div>
      </div>
      <div className='flex-container-completebooking' >
        <div className="input-container" style={{ width: '400px' }}>
          <input type="email" style={{ fontSize: '1.5rem', width: '100%' }} value={email} onChange={(e) => setEmail(e.target.value)} 
          placeholder='email@domain.com'
          required />
          <label>EMAIL</label>
        </div>
        <div className="input-container" style={{ width: '280px' }}>
          <PhoneInput
            country="us"
            value={telephone}
            onChange={(phone) => setTelephone(phone)}
            required
            inputStyle={{
              fontSize: '1.1rem',
              padding: '10px',
              width: '100%',
              height: 'auto',
              backgroundColor: 'var(--dark-background)', // Sets custom background color
              color: 'var(--text-color)', // Sets text color
              border: 'none', // Removes default border
              borderRadius: '8px', // Matches your desired styling
              placeholder: 'var(--placeholder-text)',
          }}
            buttonStyle={{
              backgroundColor: 'var(--dark-background)', // Custom background color for flag dropdown
              border: 'none',
              borderRadius: '8px',
              padding: '5px', // Adjusts padding if needed
          }}
          inputProps={{ required: true }}
          containerClass="custom-phone-input" // Adds a custom class for easier styling
          />
          <label>PHONE NUMBER</label>
        </div>
      </div>
      <div  className="flex-container-completebooking">
        <div style={{
          height: '4px', /* Adjust thickness */
          backgroundColor: 'var(--primary-color)', /* Color of the line */
          width: '20%', /* Full width */
          margin: '30px 0'
        }}></div>
      </div>
      <div  className="flex-container-completebooking">
        <h2>Complete Booking Details</h2>
      </div>
      {/* Display each entry */}
      {watchEntries.map((entry, index) => (
        entry.pickup && entry.dropoff && entry.passengers && entry.date && entry.time && (
          <React.Fragment key={index}>
            <div className="flex-container-completebooking">
              <p style={{ fontSize: '2.0rem', margin: '0' }}><u>Trip {index + 1}</u></p>
            </div>
            <div className="flex-container-completebooking" key={index}>
              <div className="input-container" style={{ margin: '2px 20px' }}>
                <p style={{ fontSize: '1.5rem', margin: '0' }}><b>{entry.date}</b></p>
              </div>

              <div className="input-container" style={{ minWidth: '350px', maxWidth: '90%', display: 'flex', alignItems: 'center' }}>
                <p>
                  <span style={{ fontSize: '2.0rem' }}>{entry.pickup}</span>
                  <span style={{ fontSize: '2rem', margin: '0 5px', color: 'var(--primary-color)' }}>
                    <b>&#8594;</b>
                  </span>
                  <span style={{ fontSize: '2.0rem' }}>{entry.dropoff}</span>
                  <span style={{ fontSize: '1.5rem' }}>, pickup at </span>
                  <span style={{ fontSize: '2.0rem' }}>{entry.time} </span>
                  <span style={{ fontSize: '1.5rem' }}> for </span>
                  <span style={{ fontSize: '2.0rem' }}>
                    {requestType === 'Large Group' ? (
                      `${largeGroupPassengers} Passengers`
                    ) : 
                      `${entry.passengers} Passenger${entry.passengers > 1 ? 's' : ''}`
                    }
                  </span>
                </p>
              </div>

              {/* Display price of the trip */}
              {(requestType !== 'Large Group' && requestType !== 'Alternate Route') && (
                <div className="input-container" style={{ minWidth: '100px', maxWidth: '100%', display: 'flex', alignItems: 'center' }}>
                  <p>
                    {tripPrices[index]?.[entry.date] ? (
                      <span style={{ fontSize: '2.0rem' }}> ${tripPrices[index][entry.date]} </span>
                    ) : (
                      <span style={{ fontSize: '1.5rem', color: 'gray' }}>Fetching price...</span>
                    )}
                  </p>
                </div>
              )}

              

              <div className='flex-container-completebooking'>
                {/* <div className="input-container" style={{ width: '400px' }}>
                  <input 
                    style={{ fontSize: '1.5rem', width: '400px' }}
                    placeholder="Address, Hotel Name, or Map Pin"
                    type="text"
                    defaultValue={entry.pickupdetailed || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setValue(`entries.${index}.pickupdetailed`, value); // Update the form value
                    }}
                  />
                  <label>{entry.pickup.toUpperCase()} PICKUP DETAILS (OPTIONAL)</label>
                </div> */}
                
                {/* <div className="input-container" style={{ width: '400px' }}>
                  <input 
                    style={{ fontSize: '1.5rem', width: '400px' }}
                    placeholder="Address, Hotel Name, or Map Pin"
                    type="text"
                    defaultValue={entry.dropoffdetailed || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setValue(`entries.${index}.dropoffdetailed`, value); // Update the form value
                    }}
                  />
                  <label>{entry.dropoff.toUpperCase()} DROPOFF DETAILS (OPTIONAL)</label>
                </div> */}

                {(airportLocations.includes(entry.pickup) || airportLocations.includes(entry.dropoff)) && (
                  <>
                    <div className="input-container" style={{ width: '400px' }}>
                      <input
                        style={{ fontSize: '1.5rem' }}
                        type="text"
                        defaultValue={watchEntries[index]?.airline || ''} // Default to the existing value or an empty string
                        {...register(`entries.${index}.airline`)}
                        list="airline-options"
                        placeholder='Airline Name'
                        onChange={(e) => {
                          const value = e.target.value;
                          setValue(`entries.${index}.airline`, value); // Update the form value
                        }}                      />
                      <datalist id="airline-options">
                          {airlineOptions
                            .filter(option => option.toLowerCase().includes(watchEntries[index]?.airline.toLowerCase()))
                            .map((option, index) => (
                              <option key={index} value={option} />
                            ))}
                        </datalist>
                      <label>AIRLINE (OPTIONAL)</label>
                    </div>
                    <div className="input-container" style={{ width: '400px' }}>
                      <input 
                        placeholder="Flight Number"
                        type="number"
                        style={{ fontSize: '1.5rem' }}
                        defaultValue={entry.flightnumber || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setValue(`entries.${index}.flightnumber`, value); // Update the form value
                        }}   
                      />
                      <label>FLIGHT NUMBER (OPTIONAL)</label>
                    </div>
                  </>
                )}
                <div className="input-container" style={{ width: '500px' }}>
                  <textarea 
                    style={{ fontSize: '1.5rem', width: '300px', alignContent: 'center' }}
                    placeholder="Add questions or comments"
                    className='large-textarea'
                    onChange={handleQuestionsChange} // No need for an inline function
                  />
                  <label>QUESTIONS / COMMENTS (OPTIONAL)</label>
                </div>
                <div>
                  <button className="book-button" type="button-right" style = {{ marginLeft: '40px', display: 'none' }} onClick={() => openEditModal(index)}>MODIFY TRIP {index + 1}</button>
                </div>

              </div>
            </div>
          </React.Fragment>
        )
      ))}
      <div className='input-container'>
        <button className="book-button" 
          type="button-right"
          onClick={() => handleSubmitBooking()}
          style={{ marginTop: '10px' }}
        ><b>{requestType==='Auto' ? "BOOK IT NOW!" : "REQUEST BOOKING"}</b></button>
        <RequiredFieldsModal
            isOpen={isRequiredFieldsModalOpen}
            onClose={() => setIsRequiredFieldsModalOpen(false)}
            missingFields={missingFields}            
          />
      </div>
    </>
  );
}
                    
export default CompleteBooking;
