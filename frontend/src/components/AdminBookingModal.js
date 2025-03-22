// AdminBookingModal.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import PhoneInput from 'react-phone-input-2';
import './AdminModal.css'; // Import CSS for styling
import API_BASE_URL from '../config';


function AdminBookingModal({ show, booking, isPending, onClose, onModify, isCompleted }) {
  // State to handle edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editableBooking, setEditableBooking] = useState(booking || {}); // Default to an empty object to avoid null errors
  const [pickupLocations, setPickupLocations] = useState([]);
  const [dropoffLocations, setDropoffLocations] = useState([]);
  const [prices, setPrices] = useState({});
  const bookingDate = new Date(editableBooking?.booking_date);
  const currentDate = new Date(); // This gives you the current date and time

  console.log("Booking Date:", bookingDate)
  console.log("Current Date", currentDate)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // Fetch the list of pickup locations from the Flask API when the component mounts
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/pickup_locations`)
      .then((response) => {
        setPickupLocations(response.data);
      })
      .catch((error) => {
        console.error("Error fetching pickup locations: ", error);
      });
  }, []);

  // Fetch dropoff locations when a valid pickup location is selected
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/dropoff_locations_all`)
      .then((response) => {
        setDropoffLocations(response.data);
      })
      .catch((error) => {
        console.error('Error fetching dropoff locations: ', error);
      });
  }, []);  // Ensure booking.pickup is not null


  // Fetch dropoff locations when a valid pickup location is changed
  useEffect(() => {
    if (editableBooking?.startcity) { // Ensure editableBooking is not null
      axios
        .get(`${API_BASE_URL}/api/dropoff_locations?pickup=${encodeURIComponent(editableBooking.startcity)}`)
        .then((response) => {
          setDropoffLocations(response.data);
        })
        .catch((error) => {
          console.error('Error fetching dropoff locations: ', error);
        });
    }
  }, [editableBooking?.startcity]);  // Ensure editableBooking is not null

  // Fetch prices data
  useEffect(() => {
    console.log("editable booking data", editableBooking)
    // Ensure valid pickup and dropoff before making the fetch call
    if ( editableBooking?.startcity || editableBooking?.endcity || editableBooking?.passengers || editableBooking?.booking_date) {
      const fetchPrices = async() => {
        // Fetch the `routenumber` if not already set
        if (editableBooking?.routeID) {
          try {
            const response = await axios.get(`${API_BASE_URL}/api/prices`, {
              params: {
                routenumber: editableBooking?.routeID,
                passengers: editableBooking?.passengers,
                startdate: editableBooking?.booking_date,
                enddate: editableBooking?.booking_date,
              }
          })
          // Set the fetched prices into the form
          setPrices(response.data);
          console.log("prices are:",response.data)
          } catch (error) {
            console.error("Error fetching prices:", error);
          }
        } else {
          try {
            const routeResponse = await axios.get(`${API_BASE_URL}/api/bookings/fetch_route_number`, {
              params: { 
                pickup: editableBooking?.startcity, 
                dropoff: editableBooking?.endcity },
            });
            let currentRouteNumber = routeResponse.data;

            if (currentRouteNumber === 9999) {
              setPrices("N/A")
            } else {
              try {
                const response = await axios.get(`${API_BASE_URL}/api/prices`, {
                  params: {
                    routenumber: currentRouteNumber,
                    passengers: editableBooking?.passengers,
                    startdate: editableBooking?.booking_date,
                    enddate: editableBooking?.booking_date,
                  },
                });
                // Set the fetched prices into the form
                setPrices(response.data);
                console.log("Fetched prices for trip:", response.data);
              } catch (error) {
                console.error("Error fetching prices:", error);
              }
            }
  
          } catch (error) {
            console.error(`Error fetching routenumber for trip:`, error);
            return;
          }
        }
      };
    fetchPrices();
    }
  }, [editableBooking?.startcity, editableBooking?.endcity, editableBooking?.passengers, editableBooking?.booking_date]); //, editableBooking?.booking_date, booking?.endcity, booking?.startcity, booking?.passengers]);
  
  // Update editableBooking state when the booking prop changes
  useEffect(() => {
    if (booking) {
      setEditableBooking(booking);
    } else {
      setEditableBooking({}); // Reset to an empty object if booking is null
    }
  }, [booking]);

  // Handle input changes for editable fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "routecost") {
      // Convert the value to a number and handle potential NaN
      setEditableBooking((prev) => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setEditableBooking((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Toggle editing mode
  const handleModify = () => {
    console.log('prices:', {prices})
    console.log('editableBooking: ', {editableBooking})
    console.log('booking: ', {booking})
    setIsEditing(true);
  };

  // Function to check differences between booking and editableBooking
const getUpdatedFields = (original, updated) => {
  const changedFields = {};

  // Iterate over keys in the updated object
  Object.keys(updated).forEach((key) => {
    if (updated[key] !== original[key]) {
      changedFields[key] = updated[key]; // Add the changed fields to the object
    }
  });
  console.log('Changed Fields: ', changedFields)
  return changedFields;
};

// Function to add booking ID to existing object
const addBookingID = (updatedFields, originalbooking) => {
  console.log("tempbookingID", originalbooking.tempbookingID)
  console.log("bookingID", originalbooking.bookingID)
  if (!originalbooking.bookingID) {
    updatedFields.bookingID = originalbooking.tempbookingID;
  } else {
    updatedFields.bookingID = originalbooking.bookingID;
  }
  console.log('Added Booking ID: ', updatedFields)
  return updatedFields
};

// Function to add user ID to existing object
const addUserID = (updatedFields, originalbooking) => {
  updatedFields.userID = originalbooking.userID;
  return updatedFields
};

// Save changes (from Modify) and exit editing mode
const handleSave = async () => {
  // Find which fields have been changed
  let updatedFields = getUpdatedFields(booking, editableBooking);
  // If no fields are changed, do nothing
  if (Object.keys(updatedFields).length === 0 ) {
    setIsEditing(false);
    onClose(); // Close the modal without making any API call
    return; 
  } else {

    // console.log('bookingID in SAVE: ', booking.bookingID)
    // console.log('all of booking: ', booking)
    updatedFields = addBookingID(updatedFields, booking);
    updatedFields = addUserID(updatedFields, booking);

    try {
      // Make an API call to update the booking in the database
      const response = await axios.put(`${API_BASE_URL}/api/bookings/modify`, {
        updatedFields, 
        isPending
    }, { headers: getAuthHeaders() });

      if (response.status === 200) {
        // Successfully updated the booking, you might want to update the UI accordingly
        onModify(updatedFields); // Pass updated booking info to parent component
      } else {
        console.error('Failed to update booking:', response.data);
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  }

  setIsEditing(false);
  onClose(); // Close the modal after saving
};


const handleCompletedTrip = async () => {
  const confirmCompleted = window.confirm(
    "Are you sure you want to mark this trip as complete? This action will move it to the completed bookings."
  );

  if (!confirmCompleted) return;

  try {
    const response = await axios.post(`${API_BASE_URL}/api/completed-booking`, {
      bookingID: booking.bookingID,
    }, { headers: getAuthHeaders() });

    if (response.status === 200) {
      alert('Trip marked as complete successfully!');
      handleRemove() 
      onClose(); // Close the modal after completing the trip
      onModify(); // Update the parent component's state if needed
    } else {
      console.error('Failed to complete the trip:', response.data);
    }
  } catch (error) {
    console.error('Error completing the trip:', error);
    alert('An error occurred while marking the trip as completed. Please try again.');
  }
}

const handleRemove = async () => {

  // put what was in "entries" from Home.js into the same entries format:
  try {
    await axios.delete(`${API_BASE_URL}/api/bookings/remove-booking`, {
      headers: getAuthHeaders(),
      data: {
        bookingID: isPending ? booking.tempbookingID : booking.bookingID,
        type: isPending ? 'temp' : 'confirmed'
      }
    });    
  } catch {
    console.error('Error removing temporary booking')
  }

  setIsEditing(false);
  isPending=true;
  onClose(); // Close the modal after saving
};

// Cancel editing and revert changes
const handleCancelEdit = () => {
  setEditableBooking(booking || {}); // Revert to original booking or an empty object
  setIsEditing(false);
};

if (!show || !booking) return null; // Do not render the modal if `show` is false or booking is null

  return (
    <>
      <div className="modal-overlay">
        <div className="modal">
          <h2>Booking Details</h2>
          {bookingDate <= currentDate && (
            <p className='red-bold-text'>The date for this booking is either today or in the past. Price information will not work for this booking.</p>
          )}
          <div className='modal-table-container'>
            <table className="modal-table">
              <tbody>
                <tr>
                  <td className="left-column"><strong>Booking ID:</strong></td>
                  <td className="right-column">{booking?.bookingID || booking?.tempbookingID || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="left-column"><strong>Date:</strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <input
                        type="date"
                        name="booking_date"
                        value={editableBooking?.booking_date || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <>{ booking?.booking_date || 'N/A'}</>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="left-column"><strong>Time:</strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <input
                        type="time"
                        name="pickup_time"
                        value={editableBooking?.pickup_time || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <>{ booking?.pickup_time || 'N/A'}</>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="left-column"><strong>Passengers:</strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <input
                        type="text"
                        name="passengers"
                        value={editableBooking?.passengers || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <>{ booking?.passengers || 'N/A'}</>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="left-column"><strong>Pickup Location:</strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                        <>Current:{booking?.startcity || 'N/A'}</>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="text"
                            name="startcity"
                            value={editableBooking?.startcity || ''}
                            onChange={handleInputChange}
                            list="pickup-options" // Reference the datalist element
                          />
                          <datalist id="pickup-options">
                            {pickupLocations.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </>
                    ) : (
                      <>
                        <>{ booking?.startcity || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Pickup Details:</strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input className="large-textarea" type="text" name="pickup_location" value={editableBooking?.pickup_location || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <>{ booking?.pickup_location || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Dropoff Location: </strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                        <>Current:{booking?.endcity || 'N/A'}</>
                        {/* <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span>Modified:</span> */}
                          <input
                            type="text"
                            name="endcity"
                            value={editableBooking?.endcity || ''}
                            onChange={handleInputChange}
                            list="dropoff-options" // Reference the datalist element
                          />
                          <datalist id="dropoff-options">
                            {dropoffLocations
                              .filter(option =>
                                option.toLowerCase().includes((editableBooking.endcity || '').toLowerCase())
                              )
                              .map((option) => (
                                <option key={option} value={option} />
                              ))}
                          </datalist>
                        {/* </div> */}
                      </>
                    ) : (
                      <>
                        <>{ booking?.endcity || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Dropoff Details:</strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input className="large-textarea" type="text" name="dropoff_location" value={editableBooking?.dropoff_location || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <>{ booking?.dropoff_location || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Flight Information:</strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ flex: 1, marginRight: '10px' }}>
                            <p>Airline: </p>
                            <input
                              type="text"
                              name="flight_airline"
                              value={editableBooking?.flight_airline || ''}
                              onChange={handleInputChange}
                              style={{ width: '200px'}}
                            />
                            <p>No.: </p>
                            <input
                              type="text"
                              name="flight_number"
                              value={editableBooking?.flight_number || ''}
                              onChange={handleInputChange}
                              style={{ width: '200px'}}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <>{<p>{booking?.flight_airline} Flight No.: {booking?.flight_number}</p> || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Quoted Price: </strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                        {!prices[editableBooking?.booking_date] ? (
                          <>Route has not yet been modified</>
                        ) : (
                          <>For reference, current price for new route: ${prices[editableBooking?.booking_date]}</>
                        )}
                        {/* <div style={{ display: 'flex', alignItems: 'center' }}> */}
                        <input
                          type="float"
                          name="routecost"
                          min="0"
                          step="1"
                          value={editableBooking?.routecost || ''}
                          onChange={handleInputChange} // Use onChange here, NOT onInput="someString"
                        />
                        {/* </div> */}
                      </>
                    ) : (
                      <>
                        <>{ booking?.routecost || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>      
                  <td className="left-column"><strong>Driver Assigned:</strong></td>
                  <td className="right-column"><>{booking?.driver || 'N/A'}</></td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Name: </strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                        First:
                          <input
                            type="text" 
                            name="FirstName" 
                            value={editableBooking?.FirstName || ''}
                            onChange={handleInputChange}
                          /> 
                        Last:
                          <input
                            type="text" 
                            name="LastName" 
                            value={editableBooking?.LastName || ''}
                            onChange={handleInputChange}
                          />
                      </>
                    ) : (
                      <>
                        <>{ booking?.FirstName } { booking?.LastName }</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Email: </strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                          <input
                            type="text" 
                            name="email" 
                            value={editableBooking?.email || ''}
                            onChange={handleInputChange}
                          />
                      </>
                    ) : (
                      <>
                        <>{ booking?.email || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Phone Number: </strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <PhoneInput
                      // country={'us'} // Default country code
                      value={editableBooking?.PhoneNumber}  // Use the state variable 'telephone'
                      onChange={(phone) => setEditableBooking({ ...editableBooking, PhoneNumber: phone })} // Correctly update the phone number
                      inputProps={{
                        name: 'PhoneNumber',
                        // required: true,
                        // autoFocus: true,
                      }}
                      />
                    ) : (
                      <>
                        <>
                        {booking?.PhoneNumber ? (
                          <a 
                            href={`tel:${booking.PhoneNumber.startsWith('+') ? booking.PhoneNumber : `+${booking.PhoneNumber}`}`}
                            style={{ textDecoration: 'none', color: 'blue' }}
                          >
                            {booking.PhoneNumber}
                          </a>
                        ) : (
                          'N/A'
                        )}
                        </>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Questions/Notes: </strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                          <input className="large-textarea" type="text" name="questions" value={editableBooking?.questions || ''}
                            onChange={handleInputChange}
                          />
                      </>
                    ) : (
                      <>
                        <>{ booking?.questions || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="left-column"><strong>Detailed Booking Info (non-auto generated): </strong></td>
                  <td className="right-column">
                    {isEditing ? (
                      <>
                          <input className="large-textarea" type="text" name="manualbookinginfo" value={editableBooking?.manualbookinginfo || ''}
                            onChange={handleInputChange}
                          />
                      </>
                    ) : (
                      <>
                        <>{ booking?.manualbookinginfo || 'N/A'}</>
                      </>
                    )}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          <div className="modal-buttons">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-button">
                  Save
                </button>
                <button onClick={handleCancelEdit} className="cancel-edit-button">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={handleModify} className="modify-button">
                  Modify
                </button>
                <button onClick={onClose} className="cancel-button">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const confirmRemove = window.confirm(
                      "Are you sure you want to remove this booking? This action cannot be undone."
                    );
                    if (confirmRemove) {
                      handleRemove();
                    }
                  }}
                  className="remove-button"
                >
                  Remove
                </button>
                
                
                {!isCompleted ? (
                  bookingDate <= currentDate || !isPending ? (
                    <button
                      onClick={handleCompletedTrip}
                      className="complete-button"
                    >
                      Completed
                    </button>
                  ) : null
                ) : null}
              </>
            )}
          </div>
          <button onClick={onClose} className="close-button">X</button>
        </div>
      </div>
    </>
  );
}

// Define PropTypes for AdminBookingModal
AdminBookingModal.propTypes = {
  show: PropTypes.bool.isRequired,
  booking: PropTypes.shape({
    bookingID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    tempbookingID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    booking_date: PropTypes.string,
    pickup_time: PropTypes.string,
    passengers: PropTypes.number,
    startcity: PropTypes.string,
    endcity: PropTypes.string,
    pickup_location: PropTypes.string,
    dropoff_location: PropTypes.string,
    routecost: PropTypes.number,
    driver: PropTypes.string,
    FirstName: PropTypes.string,
    LastName: PropTypes.string,
    email: PropTypes.string,
    PhoneNumber: PropTypes.string,
    flight_airline: PropTypes.string,
    flight_number: PropTypes.string,
    questions: PropTypes.string,
    manualbookinginfo: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  isPending: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]).isRequired, // Change this line
  isCompleted: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]).isRequired, // Change this line
  onModify: PropTypes.func.isRequired,
  onCancel: PropTypes.func, // onCancel should be a function
  handleRemove: PropTypes.func.isRequired,
};

export default AdminBookingModal;
