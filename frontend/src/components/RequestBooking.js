import React, { useState } from 'react';
import Modal from 'react-modal';
import PhoneInput from 'react-phone-input-2';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import airlineOptions from './airlineOptions'; // Import your airline options
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './NavBar'; // Import the top navigation bar
import axios from 'axios';

function CompleteBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { requestType, entries: initialEntries } = location.state || {};

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState(''); // State for 6-digit code 
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [questions, setQuestions] = useState('');
  const bookingsite = 'lirshuttle.com';
  const airportLocations = ['Liberia', 'SJO - San Jose Airport']

  // Initialize useForm and useFieldArray
  const { register, control, setValue } = useForm({
    defaultValues: { entries: initialEntries }
  });
  const { fields } = useFieldArray({ control, name: "entries" });
  const watchEntries = useWatch({ control, name: "entries" });

    // Define the function outside the JSX
  const handleQuestionsChange = (event) => {
    const value = event.target.value;
    setQuestions(value);
  };

  const openEditModal = (index) => {
    setCurrentEditIndex(index);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setCurrentEditIndex(null);
  };

  const saveEditedTrip = () => {
    // Close modal after saving
    setEditModalOpen(false);
  };

  const handleSubmitRequest = async () => {
    console.log("Request Button Clicked")
    setLoading(true);
    let confirmationCode = 0;

    try {
      const bookingData = { entries: watchEntries, firstName, lastName, email, telephone, questions, bookingsite, requestType, confirmationCode };
      const response = await axios.post('http://127.0.0.1:5000/api/submit-booking', { bookingData });
      
      setLoading(false);
      if (response.status === 200) {
        closeBookingConfirmationModal();
      }
    } catch {
      setLoading(false);
    }
  };

  const closeBookingConfirmationModal = () => {
    setModalIsOpen(false);
    setConfirmationCode('');
    navigate('/');
  };

  return (
    <>
      <nav>
        <Navbar />
      </nav>
      {/* Modal for Booking Confirmation */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeBookingConfirmationModal}
        contentLabel="Confirmation Code Entry"
        className="Modal-for-popup"
        overlayClassName="Overlay-for-popup"
      >
        <div>
          {loading ? (
            <>
              <h2>Sending Confirmation Email</h2>
              <span className="loader"></span>
              <p>Please wait while we process your booking.</p>
            </>
          ) : (
            <>
              <h2>Booking Confirmed!</h2>
              <button
                onClick={closeBookingConfirmationModal}
                disabled={confirmationCode.length !== 6}
                className="book-button"
                style={{ marginTop: '20px' }}
              >CLOSE
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* New Modal for Editing Trip Details */}
      <Modal
        isOpen={editModalOpen}
        onRequestClose={closeEditModal}
        contentLabel="Edit Trip Details"
        className="Modal-for-popup"
        overlayClassName="Overlay-for-popup"
      >
        <h2>Edit Trip Details</h2>
        {currentEditIndex !== null && (
          <>
            <div className="input-container">
              <label>From:</label>
              <input
                type="text"
                defaultValue={watchEntries[currentEditIndex].pickup}
                {...register(`entries.${currentEditIndex}.pickup`)}
              />
            </div>
            <div className="input-container">
              <label>To:</label>
              <input
                type="text"
                defaultValue={watchEntries[currentEditIndex].dropoff}
                {...register(`entries.${currentEditIndex}.dropoff`)}
              />
            </div>
            {requestType !== 'Large Group' && (
              <div className="input-container">
              <label>Passengers:</label>
              <input
                type="number"
                defaultValue={watchEntries[currentEditIndex].passengers}
                {...register(`entries.${currentEditIndex}.passengers`)}
              />
            </div>
            )}
            <div className="input-container">
              <label>Pickup Time:</label>
              <input
                type="time"
                defaultValue={watchEntries[currentEditIndex].time}
                {...register(`entries.${currentEditIndex}.time`)}
              />
            </div>
            <div className="input-container">
              <label>Date:</label>
              <input
                type="date"
                defaultValue={watchEntries[currentEditIndex].date}
                {...register(`entries.${currentEditIndex}.date`)}
              />
            </div>
            <button onClick={saveEditedTrip}>Save Changes</button>
            <button onClick={closeEditModal}>Cancel</button>
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
      {/* <div className="flex-container-completebooking">
        <p style={{ fontSize: '2.0rem', margin: '0' }}>Personal Information</p>
      </div> */}
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
      {fields.map((entry, index) => (
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
                  {requestType !== 'Large Group' && (
                    <>
                      <span style={{ fontSize: '1.5rem' }}> for </span>
                      <span style={{ fontSize: '2.0rem' }}>
                        {entry.passengers} passenger{entry.passengers > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {requestType !== 'Large Group' && (
                <>
                  <div className="input-container" style={{ minWidth: '100px', maxWidth: '100%', display: 'flex', alignItems: 'center' }}>
                    <p>
                      <span style={{ fontSize: '2.0rem' }}> ${entry.prices[entry.date]} </span>
                    </p>
                  </div>
                </>
              )}

              <div>
                <button className="book-button" type="button-right" style = {{ marginLeft: '40px' }} onClick={() => openEditModal(index)}>MODIFY TRIP {index + 1}</button>
              </div>
              {requestType === 'Large Group' && (
                <div className='flex-container-completebooking'>
                  <div className="input-container" style={{ width: '400px' }}>
                    <input 
                      style={{ fontSize: '1.5rem', width: '400px' }}
                      placeholder="Total Passengers"
                      type="number"
                      required
                      onChange={(e) => {
                        const value = e.target.value;
                        setValue(`entries.${index}.passengers`, value);  // Update the form value
                      }}
                    />
                    <label>NUMBER OF PASSENGERS</label>
                  </div>
                </div>
              )}
              <div className='flex-container-completebooking'>
                <div className="input-container" style={{ width: '400px' }}>
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
                </div>
                
                <div className="input-container" style={{ width: '400px' }}>
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
                </div>

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
                    <div className="input-container" style={{ width: '500px' }}>
                      <textarea 
                        style={{ fontSize: '1.5rem', width: '300px', alignContent: 'center' }}
                        placeholder="Add questions or comments"
                        className='large-textarea'
                        onChange={handleQuestionsChange} // No need for an inline function
                      />
                      <label>QUESTIONS / COMMENTS (OPTIONAL)</label>
                    </div>
                  </>
                )}

              </div>
            </div>
          </React.Fragment>
        )
      ))}
      <div className='input-container'>
        <button className="book-button" 
          type="button-right"
          onClick={() => handleSubmitRequest()}
          style={{ marginTop: '10px' }}
        ><b>REQUEST BOOKING</b></button>
      </div>
    </>
  );
}
                    
export default CompleteBooking;
