import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'react-modal';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useForm, useWatch } from 'react-hook-form';
import airlineOptions from './airlineOptions'; // Import your airline options
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './NavBar'; // Import the top navigation bar
import axios from 'axios';
import RequiredFieldsModal from './RequiredFieldsModal';
import { validateEntries } from './HelperFunctions';
import { useDebounce } from 'use-debounce';
import API_BASE_URL from '../config';
import ResponsiveTimePicker from './ResponsiveTimePicker';
import "./ButtonDropdown.css";
import LocationDropdown from './LocationDropdown'; 



function CompleteBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Scroll to top when the component loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
    
  const {
    requestType: initialRequestType,
    entries: initialEntries,
    passengers: initialPassengers,
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
  const [passengers, setPassengers] = useState(initialPassengers || false)
  const [largeGroupPassengers, setLargeGroupPassengers] = useState('');
  const [debouncedTelephone] = useDebounce(telephone, 300);
  const [successfulBooking, setSuccessfulBooking] = useState(false)
  const [successfulRequest, setSuccessfulRequest] = useState(false)
  // const [confirmation_code, setConfirmation_Code] = useState('');

  // Initialize useForm and useFieldArray
  const { control, setValue } = useForm({
    defaultValues: { entries: initialEntries, passengers: passengers }
  });

  const watchEntries = useWatch({ control, name: "entries" }) || [];

  // Fetch margin used for selecting dates
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/datemargin`)
    .then(response => setDateMargin(response.data))
    .catch(error => console.error("Error getting date margin for autobooking: ", error));
  }, []);

  // Check the country code with the backend
  useEffect(() => {
    if (requestType !== 'Alternate Route' && debouncedTelephone && debouncedTelephone.length >= 3) {
      console.log("telephone", telephone)
      axios.get(`${API_BASE_URL}/api/valid-phone`, {
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
      const response = await axios.get(`${API_BASE_URL}/api/prices`, {
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
      manualroutetext += `Trip ${index + 1}: ${entry.date}. ${entry.pickup} to ${entry.dropoff} for ${entry.passengers} passengers. `;
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
        if (entry.routenumber && passengers && entry.date) {
          fetchPrices(index, entry.routenumber, passengers, entry.date, entry.date);
        }
      });
    }
  }, [initialEntries]);

  // Check if the group is too large for auto-booking
  useEffect(() => {
    const largeGroup = (passengers === '11+');
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
      console.log("booking Date HERE:", bookingDate);

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

  // const openEditModal = (index) => {
  //   setCurrentEditIndex(index);
  //   setTempEdit({ ...watchEntries[index], routenumber: watchEntries[index?.routenumber] }); // Copy current trip values
  //   setEditModalOpen(true);
  // };

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
    }];

    console.log("fields", fields)
    console.log("time", watchEntries)
    console.log("passengers", passengers)

    // Add `largeGroupPassengers` if `isLargeGroup` is true
    if (isLargeGroup) {
        fields[0].largeGroupPassengers = largeGroupPassengers;
    }

    // Define the required fields dynamically
    const requiredFields = ['firstName', 'lastName', 'email', 'telephone', 'airline', 'flightnumber'];
    
    const passengerData = [{
      passengers: isLargeGroup ? largeGroupPassengers : passengers
    }];
    
    const { hasIncompleteFields: missingPassenger, missingFieldsMessage: passengerMsg } =
      validateEntries(passengerData, ['passengers']);
    
    console.log("Fields before validation:", fields);
    console.log("Required Fields:", requiredFields);
    const { hasIncompleteFields: hasMissingContactInfo, missingFieldsMessage: contactMissingMsg } =
      validateEntries(fields, ['firstName', 'lastName', 'email', 'telephone']);

    const { hasIncompleteFields: hasMissingFlightInfo, missingFieldsMessage: flightMissingMsg } =
      validateEntries(watchEntries, ['airline', 'flightnumber', 'time']);

    let combinedMissing = '';
    if (hasMissingContactInfo) combinedMissing += contactMissingMsg;
    if (hasMissingFlightInfo) combinedMissing += flightMissingMsg;
    if (missingPassenger) combinedMissing += passengerMsg;

    if (combinedMissing) {
      setMissingFields(combinedMissing);
      setIsRequiredFieldsModalOpen(true);
      return;
    }

    if (requestType === 'Auto') {
      // Popup the confirmation code entry
      setConfirmModalIsOpen(true);
      setIsCodeEntry(true)
      // Generate Confirmation code
      await axios.post(`${API_BASE_URL}/api/send-verification`,{
        telephone: telephone,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } else {
      try {
          let confirmationCode = generateConfirmationCode();
          setConfirmationCode(confirmationCode);
          setLoading(true);
          setIsCodeEntry(false);
          setConfirmModalIsOpen(true);
    
          const bookingData = { 
            entries: watchEntries, 
            firstName, 
            lastName, 
            email, 
            telephone, 
            questions, 
            bookingsite, 
            requestType, 
            confirmationCode, 
            manualRouteRequest, 
            passengers, 
            largeGroupPassengers 
          };
          console.log("bookingData", bookingData);
    
          const response = await axios.post(`${API_BASE_URL}/api/submit-booking`, { bookingData });
          console.log("here2");
          setLoading(false);
          if (response.status === 200) {
            setSuccessfulRequest(true);
          }
        // }
      } catch (error) {
        // Extract error message from the response and update state to display in the modal
        console.error("Booking submission error:", error);
        setErrorMessage(
          error.response && error.response.data && error.response.data.error
            ? error.response.data.error
            : "An unexpected error occurred. Please try again."
        );
        // Optionally, set the modal to show the error view
        setIsCodeEntry(true);
        setLoading(false);
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
      
      const verifyResponse = await axios.post(`${API_BASE_URL}/api/verify-code`, {
          telephone,
          code: confirmationCode,
      });

      if (verifyResponse.status === 200 && verifyResponse.data.success) {
          // Proceed to submit the booking
          const bookingData = { entries: watchEntries, firstName, lastName, email, telephone, questions, bookingsite, requestType, confirmationCode, manualRouteRequest, passengers };
          const response = await axios.post(`${API_BASE_URL}/api/submit-booking`, { bookingData });

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
        shouldCloseOnOverlayClick={false} // Prevent closing on outside click
        overlayClassName="Overlay-for-popup"
      >
        <div>
          <button
            onClick={closeBookingConfirmationModal}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'var(--accent)',
              color: 'var(--text-color)',
              borderRadius: '50%',
              height: '25px',
              width: '25px',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'translateY(0px)',
            }}
            aria-label="Close"
          >
            <span style={{ transform: 'translateY(1px)' }}>&times;</span>
          </button>
        </div>
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
            <button
              onClick={closeBookingConfirmationModal}
              className="book-button"
              style={{ marginTop: '20px', backgroundColor: 'var(--placeholder-color)' }}
            >
              CANCEL
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
                  value={passengers || "1"} 
                  onChange={(e) => setPassengers(e.target.value)}
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

      <div className='booking-container' style={{ margin: '0 auto', padding: '0px' }}>
        {requestType === 'Large Group' && (
          <>
            <div className="flex-container-completebooking">
              <h2>Submit Email Request Form</h2>
            </div>
            <div className="flex-container-completebooking">
              <p style={{ fontSize:'1.2rem' }}>Thank you for choosing us for your upcoming trip!</p>
            </div>
            <div className="flex-container-completebooking">
              <p  style={{ width:'90%', maxWidth:'850px', fontSize:'1.2rem', textAlign: 'center', margin: '0 auto', color: 'var(--accent)' }}><i>Due to the size of your party, we want to ensure that every detail is perfectly arranged. Please complete the form, and a dedicated sales associate will reach out to discuss your specific needs and ensure a seamless, enjoyable experience.</i></p>
            </div>

            <div className="flex-container-centered">
              <div className="input-container-light" style={{ width: '300px', margin: '20px 0' }}>        
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

        <div className="flex-container-completebooking">
          <div className="location-input-container" style={{ width: '300px' }}>
            <label className={`floating-label ${firstName ? "label-active" : ""}`}>
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="location-input"
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>        

        <div className="flex-container-completebooking">
          <div className="location-input-container" style={{ width: '300px' }}>
            <label className={`floating-label ${lastName ? "label-active" : ""}`}>
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="location-input"
              onFocus={(e) => e.target.select()}
            />
          </div>
          {/* <div className='flex-container-completebooking' >
            <div className="dropdown-button" style={{ width: '300px' }}>        
              <input className='input' style={{ fontSize: '1.5rem', width: '100%' }} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              placeholder='Last Name'
              required />
              <label>LAST NAME</label>
            </div>
          </div> */}
        </div>        

        <div className="flex-container-completebooking">
          <div className="location-input-container" style={{ width: '300px' }}>
            <label className={`floating-label ${email ? "label-active" : ""}`}>
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="location-input"
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>

        <div className='flex-container-completebooking' >
          <div  style={{ width: '300px' }}>
            {/* <label className={`floating-label ${email ? "label-active" : ""}`}>
              Email
            </label> */}
            <PhoneInput
              country="us"
              value={telephone}
              onChange={(phone) => setTelephone(phone)}
              autoFormat={true}
              placeholder='e.g. 123 456 7890'
              inputProps={{ 
                name: 'phone',
                required: true,
              }}
              enableAreaCodes={true}
              disableCountryCode={false}
              disableDropdown={false}
              required
              inputStyle={{
                fontSize: '1.0rem',
                padding: '12px',
                width: '100%',
                height: 'auto',
                backgroundColor: 'var(--bright-white)', // Sets custom background color
                color: 'var(--dark-text)', // Sets text color
                border: '1px solid var(--bright-white)',
                borderRadius: '8px', // Matches your desired styling
                boxShadow: '0px 2px 5px var(--shadow-for-box)',
                textAlign: 'left',
                paddingLeft: '65px',
            }}
              buttonStyle={{
                backgroundColor: 'var(--bright-white)', // Custom background color for flag dropdown
                borderRadius: '8px',
                border: '1px solid var(--accent)',
                padding: '5px', // Adjusts padding if needed
            }}
            
            containerClass="custom-phone-input" // Adds a custom class for easier styling
            />
          </div>
        </div>
        <div  className="flex-container-completebooking">
          <div style={{
            height: '4px', /* Adjust thickness */
            backgroundColor: 'var(--accent)', /* Color of the line */
            width: '20%', /* Full width */
            margin: '30px 0'
          }}></div>
        </div>
        <div  className="flex-container-completebooking">
          <h2>Complete Booking Details</h2>
        </div>
        {/* Display each entry */}
        {watchEntries.map((entry, index) => (
          entry.pickup && entry.dropoff && passengers && entry.date && (
            <React.Fragment key={index}>
              <div className="flex-container-completebooking">
                <p style={{ fontSize: '1.5rem', margin: '0' }}><u>Trip {index + 1}</u></p>
              </div>
              <div className="flex-container-completebooking" key={index}>
                <div className="trip-summary">
                  <span><strong>{entry.date}:</strong>&nbsp;
                  {entry.pickup}
                  <span className="arrow"> → </span>{entry.dropoff}, pickup for  
                    {requestType === 'Large Group'
                      ? ` ${largeGroupPassengers} Passengers.`
                      : ` ${passengers} Passenger${passengers > 1 ? 's.' : '.'}`}
                  </span>
                </div>

                {/* Display price of the trip */}
                {(requestType !== 'Large Group' && requestType !== 'Alternate Route') && (
                  <div style={{ minWidth: '100px', maxWidth: '100%', display: 'flex', alignItems: 'center' }}>
                    <p>
                      {tripPrices[index]?.[entry.date] ? (
                        <span style={{ fontSize: '1.4rem' }}><b>${tripPrices[index][entry.date]}</b> - cash due on trip completion </span>
                      ) : (
                        <span style={{ fontSize: '1.4rem', color: 'gray' }}>Fetching price...</span>
                      )}
                    </p>
                  </div>
                )}
                </div>

                {(airportLocations.includes(entry.pickup) || airportLocations.includes(entry.dropoff)) && (
                  <>
                    <div  className="flex-container-completebooking" style={{ width: '300px' }}>
                      <div className="location-input-container">
                        <label className={`floating-label-time ${entry.time ? 'label-active' : ''}`}>
                          {airportLocations.includes(entry.pickup)
                            ? "Flight Arrival Time"
                            : airportLocations.includes(entry.dropoff)
                              ? "Flight Departure Time"
                              : "Shuttle Pickup Time"}
                        </label>
                        <ResponsiveTimePicker
                          // label={airportLocations.includes(entry.pickup)
                          //   ? "Flight Arrival Time"
                          //   : airportLocations.includes(entry.dropoff)
                          //     ? "Flight Departure Time"
                          //     : "Shuttle Pickup Time"
                          //   }
                          value={entry?.time instanceof Date ? entry?.time : null}
                          onChange={(time) => {
                            if (time) {
                              const formattedTime = new Date(time).toLocaleTimeString('en-US', { hour12: false });
                              setValue(`entries.${index}.time`, formattedTime);
                            } else {
                              setValue(`entries.${index}.time`, null);
                            }
                          }}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex-container-completebooking" style={{ width: '300px' }}>
                      <LocationDropdown
                        label="Airline"
                        value={entry.airline || ""}
                        locations={airlineOptions}
                        onChange={(value) => {
                          setValue(`entries.${index}.airline`, value);
                        }}
                      />
                    </div>
                                          
                    <div className="flex-container-completebooking">
                      <div className="location-input-container" style={{ width: '300px' }}>
                        <label className={`floating-label ${entry.flightnumber ? "label-active" : ""}`}>
                          Flight Number
                        </label>
                        <input
                          type="number"
                          value={entry.flightnumber}
                          required
                          onChange={(e) => {
                            const value = e.target.value;
                            setValue(`entries.${index}.flightnumber`, value); // Update the form value
                          }} 
                          className="location-input"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </div>
                  </>
                )}
                  
                <div className="flex-container-completebooking">
                  <div className="location-input-container" style={{ width: '300px' }}>
                    <label className={`floating-label ${questions ? "label-active" : ""}`}>
                      Questions / Comments (optional)
                    </label>
                    <textarea 
                      style={{ fontSize: '1.5rem', fontFamily: 'Helvetica, Arial, sans-serif', height:'100px', alignContent: 'center' }}
                      className='location-input'
                      onChange={handleQuestionsChange} // No need for an inline function
                    />
                  </div>
                </div>
            </React.Fragment>
          )
        ))}
        <div className='input-container-light'>
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
      </div>
    </>
  );
}
                    
export default CompleteBooking;
