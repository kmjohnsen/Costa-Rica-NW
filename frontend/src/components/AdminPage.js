// AdminPage.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Modal from 'react-modal'
import { useNavigate } from 'react-router-dom'; // Import the useNavigate hook
import './AdminPage.css'; // Ensure your CSS handles mobile responsiveness
import AdminBookingModal from './AdminBookingModal'; // Import the modal component
import BookingTimeline from './BookingTimeline';
import DateNavigation from './DateNavigation';
import PhoneInput from 'react-phone-input-2';
import Navbar from './NavBar'; // Import the top navigation bar
import Calendar from 'react-calendar'; // Calendar component for selecting dates
import 'react-calendar/dist/Calendar.css'; // Import calendar styles
import API_BASE_URL from '../config';
import { formatDateYYYYMMDD } from './HelperFunctions';

function AdminPage() {
  const [view, setView] = useState('allBookings');
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});
  const [driverSummaries, setDriverSummaries] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today's date in 'YYYY-MM-DD' format
  
  console.log("initialized date:", date)
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightedBooking, setHighlightedBooking] = useState(null); // Track the last modified booking
  const [refreshCounter, setRefreshCounter] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [pickupLocations, setPickupLocations] = useState([]);
  const [dropoffLocations, setDropoffLocations] = useState([]);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupdetailed, setPickupDetailed] = useState('');
  const [dropoffdetailed, setDropoffDetailed] = useState('');
  const [time, setTime] = useState('');
  const [prices, setPrices] = useState({});
  const [quotedPrice, setQuotedPrice] = useState();
  const [passengers, setPassengers] = useState('');
  const [airline, setAirline] = useState('');
  const [flightnumber, setFlightNumber] = useState('');
  const [questions, setQuestions] = useState('');
  const [message, setMessage] = useState('');
  const [bookingsite, setBookingSite] = useState('');
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false); // State to toggle calendar display
  const calendarRef = useRef(null); // Ref to handle calendar element

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [loading, setLoading] = useState(false); // State to track if the requests are still working
  const navigate = useNavigate(); // Use navigate to change pages

  const [pricingRules, setPricingRules] = useState([]);
  const [pricingRuleModalIsOpen, setPricingRuleModalIsOpen] = useState(false);
  const [newPricingRule, setNewPricingRule] = useState({ datestart: "", dateend: "", percentinc: "", addinc: "",})

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison

  const isPast = (bookingDate) => new Date(bookingDate) < today;
  const isUpcoming = (bookingDate) => new Date(bookingDate) >= today;

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    console.log("Stored Token:", token);  // ✅ Debugging
    if (!token) {
      console.error("No access token found, redirecting to login.");
      // If no token, redirect to login
      navigate('/login');
    } else {
      // Verify the token with your backend
      fetch("/api/auth/verify-token", {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("access_token"),
          "Content-Type": "application/json"
        }
      })
      .then(response => response.json())
      .then(data => console.log("Token verification response:", data))
      .catch(err => console.error("Error verifying token:", err));
      
      axios.get(`${API_BASE_URL}/api/auth/verify-token`, {headers: getAuthHeaders()})
      .then(response => {
        // Token is valid, proceed as needed
        console.log('Token verified:', response.data);
      })
      .catch(error => {
        console.error('Token verification failed:', error);
        // If token verification fails, redirect to login
        navigate('/login');
      });
    }
  }, [navigate]);
  
  // Fetch pickup and dropoff locations
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/pickup_locations`)
      .then(response => setPickupLocations(response.data))
      .catch(error => console.error("Error fetching pickup locations: ", error));

    axios.get(`${API_BASE_URL}/api/all_dropoff_locations`)
      .then(response => setDropoffLocations(response.data))
      .catch(error => console.error("Error fetching dropoff locations: ", error));
  }, []);
  
  // Fetch prices data
  useEffect(() => {
    // Replace with your actual data fetching logic
    if (pickup && dropoff && passengers && date) {
      fetch(`${API_BASE_URL}/api/prices_by_date?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&passengers=${encodeURIComponent(passengers)}&date=${encodeURIComponent(date)}`) 
        .then((response) => response.json())
        .then((data) => setPrices(data))
        .catch((error) => console.error("Error fetching prices: ", error));
    }
  }, [pickup, dropoff, passengers, date]); // Add passengers to the dependency array

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const handlePickupChange = (e) => {
    setPickup(e.target.value);  // Update pickup state
    setDropoff('');  // Reset dropoff state to an empty value
    setDropoffLocations([]);  // Clear dropoff locations list
  };

  const handleDropoffChange = (e) => {
    setDropoff(e.target.value);  // Update pickup state
  };

  // Handler for date selection from the calendar
  const handleDateChange = (selectedDate) => {
    const formattedDate =  formatDateYYYYMMDD(selectedDate); // Format as 'YYYY-MM-DD'
    
    addBlackoutDate(formattedDate); // Call function to post the new date
    setShowCalendar(false); // Hide the calendar after selecting a date
  };

  // Approve pending request
const handleApprove = async (groupedBookings) => {
  const invalidBookings = groupedBookings.filter((booking) => !booking.routecost);

  if (invalidBookings.length > 0) {
    // Notify the user about invalid bookings
    alert(
      `The following bookings are missing a route cost and cannot be approved:\n` +
      invalidBookings
        .map((booking) => `- ${booking.FirstName} ${booking.LastName} (${booking.booking_date})`)
        .join('\n')
    );
    return; // Exit the function
  }
  
  const confirmApprove = window.confirm(
      "Are you sure you want to approve this booking?"
    );
    if (!confirmApprove) return;
  
  try {
    // Make an API call to update the booking in the database
    const approvalPromises = groupedBookings.map(async (booking) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/approve-booking`, {
          bookingID: booking.tempbookingID,
        }, { headers: getAuthHeaders() });

        if (response.status === 200) {
          console.log(`Booking ${booking.tempbookingID} approved successfully.`);
          handleRemove(booking)
        } else {
          console.error(`Failed to approve booking ${booking.tempbookingID}:`, response.data);
        }
      } catch (error) {
        console.error(`Error approving booking ${booking.tempbookingID}:`, error);
      }
    });

    // Wait for all approval requests to complete
    await Promise.all(approvalPromises);

    // Refresh bookings to reflect changes
    await fetchPendingBookings(); // Update the state to remove the approved bookings
    handleViewChange(view); // Refresh the current view
    alert("All valid bookings have been approved.");
  } catch (error) {
    console.error("Error during approval process:", error);
  }
};


const handleCompletedTrip = async (booking) => {
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
    } else {
      console.error('Failed to complete the trip:', response.data);
    }
  } catch (error) {
    console.error('Error completing the trip:', error);
    alert('An error occurred while marking the trip as completed. Please try again.');
  }
}

const handleRemove = async (booking) => {
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
};

  // Fetch all bookings
  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bookings`, { headers: getAuthHeaders() });
      setBookings(response.data);
      console.log('all bookings:', response.data);
      setIsPending(false);
      setIsCompleted(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (error.response && error.response.status === 401) {
        console.warn("Token likely expired or invalid, redirecting to login.");
        navigate('/login');
      }
    }
  };


  // Fetch completed bookings
  const fetchCompletedBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_completed_bookings`, { headers: getAuthHeaders() });
      setBookings(response.data);
      setIsCompleted(true);
      console.log('Completed bookings:', response.data);
    } catch (error) {
      console.error('Error fetching completed bookings:', error);
    }
  };
  

  // Function to add a new blackout date
  const addBlackoutDate = async (newDate) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/postblackoutdates`, {newDate}, { headers: getAuthHeaders() });
      
      if (response.status === 200) {
        fetchBlackoutDates(); // Refresh the list after adding a new date
      } else {
        console.error('Error adding blackout date:', response.statusText);
      }
    } catch (error) {
      console.error('Error posting blackout date:', error);
    }
  };

  // Function to remove a new blackout date
  const removeBlackoutDate = async (dateToRemove) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/removeblackoutdates`, {newDate: dateToRemove}, { headers: getAuthHeaders() });
      
      if (response.status === 200) {
        fetchBlackoutDates(); // Refresh the list after adding a new date
      } else {
        console.error('Error removing blackout date:', response.statusText);
      }
    } catch (error) {
      console.error('Error removing blackout date:', error);
    }
  };

  // Use useEffect to fetch bookings when the component mounts
  useEffect(() => {
    fetchBookings(); // Fetch bookings when the component loads
  }, []); // Empty dependency array ensures this runs only once when the component mounts


  // Fetch bookings for a specific day
  const fetchDailyBookings = async (day) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bookings/day`, { params: { date: day } }, { headers: getAuthHeaders() });
      setBookings(response.data);
      setIsPending(false);
      setIsCompleted(false);
    } catch (error) {
      console.error('Error fetching bookings for the day:', error);
    }
  };

  // Fetch monthly summary
  const fetchMonthlySummary = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bookings/monthly-summary`, { headers: getAuthHeaders() });
      setSummary(response.data);
      setIsPending(false);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
    }
  };

  // Fetch monthly summary for drivers
  const fetchDriverSummaries = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/drivers/monthly-summary`, { headers: getAuthHeaders() });
      setDriverSummaries(response.data);
      setIsPending(false);
    } catch (error) {
      console.error('Error fetching driver summaries:', error);
    }
  };

  // Fetch pending bookings
  const fetchPendingBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pendingbookings`, { headers: getAuthHeaders() });
      setBookings(response.data);
      console.log('pending bookings:', response.data);
      setIsPending(true);
      setIsCompleted(false);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
    }
  };

  // Fetch blackout dates
  const fetchBlackoutDates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/getblackoutdates`);     
      setBlackoutDates(response.data); // Update state with the formatted dates
      console.log('blackout dates:', response.data);
    } catch (error) {
      console.error('Error fetching blackout dates:', error);
    }
  };

   // Fetch pricing rules dates
   const fetchPricingRules = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/getpricingrules`);     
      setPricingRules(response.data); // Update state with the formatted dates
      console.log('pricing rules:', response.data);
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
    }
  };

   // Function to add a new blackout date
   const addPricingRule = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/postpricingrule`, {newPricingRule}, { headers: getAuthHeaders() });
      
      if (response.status === 200) {
        fetchPricingRules(); // Refresh the list after adding a new date
        closePricingRuleModal();
      } else {
        console.error('Error adding pricing rule:', response.statusText);
      }
    } catch (error) {
      console.error('Error adding pricing rule:', error);
    }
  };

  // Function to remove a new blackout date
  const removePricingRule = async (ruleID) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/removepricingrule`, {ruleID}, { headers: getAuthHeaders() });
      
      if (response.status === 200) {
        fetchPricingRules(); // Refresh the list after adding a new date
      } else {
        console.error('Error removing pricing rule:', response.statusText);
      }
    } catch (error) {
      console.error('Error removing pricing rule:', error);
    }
  };

  const openPricingRuleModal = () => setPricingRuleModalIsOpen(true);
  const closePricingRuleModal = () => {
    setPricingRuleModalIsOpen(false);
    setNewPricingRule({ datestart: "", dateend: "", percentinc: "", addinc: "",}) // reset new pricing rule
  };

  const handlePricingRuleChange = (e) => {
    const { name, value } = e.target;
    setNewPricingRule((prev) => ({ ...prev, [name]: value }));
  };

  // Handle navigation between views
  const handleViewChange = (view) => {
    setView(view);
    if (view === 'allBookings') fetchBookings();
    if (view === 'dailyBookings') fetchDailyBookings(date || '');
    if (view === 'dailyTimeline') fetchDailyBookings(date || '');
    if (view === 'monthlySummary') fetchMonthlySummary();
    if (view === 'driverSummary') fetchDriverSummaries();
    if (view === 'pendingBookings') fetchPendingBookings();
    if (view === 'blackoutdates') fetchBlackoutDates();
    if (view === 'pricingrules') fetchPricingRules();
    if (view === 'completedBookings') fetchCompletedBookings();
    if (refreshCounter === 0) {
      setRefreshCounter(1);
      setHighlightedBooking(null);
    };
  };

  // Navigate to the Modify User page
  const goToModifyUser = () => {
    navigate('/admin/modifyuser');
  };

  // Open the modal for booking modification
  const handleOpenModal = (booking) => {
    setSelectedBooking(booking);
    console.log('booking info: ', booking)
    setShowModal(true);
    setRefreshCounter(0)
  };

  // Close the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    handleViewChange(view); // Refresh the current view to show updated bookings
  };

  // Handle the save action in the modal
  const handleModify = (updatedFields) => {
    setHighlightedBooking(updatedFields); // Highlight the modified booking
    // Use a callback to ensure the state is updated before logging or using it
    setTimeout(() => {
      console.log('Updated Fields: ', updatedFields);
      console.log('Highlighted Booking after update: ', highlightedBooking);
    }, 0);
    // setRefreshCounter(0) // ensures the page will show the highlighted change
    handleViewChange(view); // Refresh the current view to show updated bookings
    console.log('updated Fields: ', updatedFields)
    console.log('Highlighted booking: ', highlightedBooking)
  };

  const handleSubmitNewBooking = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true when the request starts
    setModalIsOpen(true); // Open the modal immediately to show the loading indicator

      const bookingData = {
          firstName, lastName, email, telephone, pickup, dropoff, date, time, passengers, questions, bookingsite, pickupdetailed, dropoffdetailed,
          price: quotedPrice,
          airline: pickup === 'Liberia' ? airline : '',
          flightnumber: pickup === 'Liberia' ? flightnumber : '',
        }; 

        try {
          // Send data to backend to insert into SQL database
          await axios.post(`${API_BASE_URL}/api/submit-booking`, {bookingData });
        } catch {
          setMessage('Booking failed, please try again.');
          console.error(message)
        }
  }

  const closeModal = () => {
    setModalIsOpen(false);
    navigate('/admin'); // Navigate to home or another page after closing the modal
  };
  
  return (
    <div>
      <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          contentLabel="Booking Confirmation"
          className="Modal-for-popup"
          overlayClassName="Overlay-for-popup"
        >
          {loading? (
            <div>
              <h2>Processing your request</h2>
              <span className="loader"></span>
              <p>Please wait while we confirm your booking.</p>
            </div>
          ) : (
            <div>
              <h2>Booking Successful</h2>
                <p>Your booking was successful! Check your email for a confirmation of your booking. See you soon!</p>
                <button onClick={closeModal}>OK</button>
            </div>
          )}
        </Modal>
      <nav>
        <Navbar/>
      </nav>
      <div className="site-header"></div> {/* Here to add some spacing */}
      <div className="overlay">
        <h1>Bookings Dashboard</h1>
        <div className="navigation-buttons">
          <button onClick={() => handleViewChange('allBookings')}>All Bookings</button>
          <button onClick={() => handleViewChange('pendingBookings')}>Review Booking Requests</button>
          <button onClick={() => handleViewChange('dailyBookings')}>Bookings by Day</button>
          <button onClick={() => handleViewChange('dailyTimeline')}>Daily Timeline</button>
          <button onClick={() => handleViewChange('monthlySummary')}>Monthly Summary</button>
          <button onClick={() => handleViewChange('driverSummary')}>Driver Summary</button>
          <button onClick={() => handleViewChange('addBooking')}>Add New Booking</button>
          <button onClick={() => handleViewChange('blackoutdates')}>Blackout Dates</button>
          <button onClick={() => handleViewChange('pricingrules')}>Pricing Rules</button>
          <button onClick={() => handleViewChange('completedBookings')}>Completed Bookings</button>
          <button onClick={goToModifyUser}>Modify Users</button> 
        </div>

        {view === 'allBookings' && (
          <>
            <div className='admin-page-table past-trips'>
              <h2>Trips in the Past</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Pickup</th>
                    <th>Dropoff</th>
                    <th>Price</th>
                    <th>Driver</th>
                    <th>Passengers</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter((booking) => booking.booking_date && isPast(booking.booking_date))
                    .map((booking) => (
                      <tr key={booking.tempbookingID || booking.id}>
                        <td>{booking.booking_date}</td>
                        <td>{booking.pickup_time}</td>
                        <td>{booking.startcity}</td>
                        <td>{booking.endcity}</td>
                        <td>{booking.routecost}</td>
                        <td>{booking.driver}</td>
                        <td>{booking.passengers}</td>
                        <td><button className="view-button" onClick={() => handleOpenModal(booking)}>View</button><button className="complete-button" onClick={() => handleCompletedTrip(booking)}>Completed</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className='admin-page-table upcoming-trips'>
              <h2>Upcoming Trips</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Pickup</th>
                    <th>Dropoff</th>
                    <th>Price</th>
                    <th>Driver</th>
                    <th>Passengers</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter((booking) => booking.booking_date && isUpcoming(booking.booking_date))
                    .map((booking) => (
                      <tr key={booking.tempbookingID || booking.id}>
                        <td>{booking.booking_date}</td>
                        <td>{booking.pickup_time}</td>
                        <td>{booking.startcity}</td>
                        <td>{booking.endcity}</td>
                        <td>{booking.routecost}</td>
                        <td>{booking.driver}</td>
                        <td>{booking.passengers}</td>
                        <td><button className="view-button" onClick={() => handleOpenModal(booking)}>View</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}


        {view === 'dailyTimeline' && (
          <div>
            <h1>Bookings Timeline</h1>
        
            {/* Date Navigation Buttons */}
            <DateNavigation
              selectedDate={date}  // Pass the current selected date
              onDateChange={(newDate) => {
                const adjustedDate = new Date(newDate);
                adjustedDate.setHours(0,0,0,);
                setDate(adjustedDate.toISOString().split('T')[0]);  // Set the selected date
                fetchDailyBookings(newDate.toISOString().split('T')[0]);  // Fetch bookings for the new date
              }}
            />
            {/* Timeline showing bookings for the selected day */}
            <BookingTimeline bookings={bookings} />
          </div>
        )}

        {view === 'dailyBookings' && (
          <div>
            <h2>All Bookings</h2>

            {/* Date Navigation Buttons */}
            <DateNavigation
              selectedDate={new Date(date)}  // Pass the current selected date as a Date object
              
              onDateChange={(newDate) => {
                // const adjustedDate = new Date(newDate);
                const adjustedDate = new Date(Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate()));
                adjustedDate.setHours(0, 0, 0, 0);  // Set time to midnight in local timezone (avoids date shifts)

                const formattedDate = formatDateYYYYMMDD(adjustedDate)
                
                // Log the values for troubleshooting
                console.log('Selected Date:', newDate);
                console.log('Adjusted Date:', adjustedDate);
                console.log('Formatted Date:', formattedDate);
                console.log('State Date before update:', date);

                setDate(formattedDate);  // Update the state with the formatted date
                fetchDailyBookings(formattedDate);  // Fetch bookings for the new date

                // Log after state update
                setTimeout(() => {
                  console.log('State Date after update:', date);
                }, 0);  // This will show the value after state is updated (state update is asynchronous)
              }}
            />


            {bookings.length === 0 ? (
              <p>No bookings scheduled for this date</p>
            ) : (
              <div className='admin-page-table'>
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Pickup</th>
                      <th>Dropoff</th>
                      <th>Price</th>
                      <th>Driver</th>
                      <th>Passengers</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        style={{
                          backgroundColor: booking.bookingID === highlightedBooking?.bookingID ? 'lightgreen' : 'transparent', // Highlight the modified booking
                        }}
                      >
                        <td data-label="Time" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.pickup_time ? 'bold' : 'normal' }}>
                          {booking.pickup_time}
                        </td>
                        <td data-label="Pickup" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.startcity ? 'bold' : 'normal' }}>
                          {booking.startcity}
                        </td>
                        <td data-label="Dropoff" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.endcity ? 'bold' : 'normal' }}>
                          {booking.endcity}
                        </td>
                        <td data-label="Price" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.routecost ? 'bold' : 'normal' }}>
                          {booking.routecost}
                        </td>
                        <td data-label="Driver" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.driver ? 'bold' : 'normal' }}>
                          {booking.driver}
                        </td>
                        <td data-label="Passengers" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.passengers ? 'bold' : 'normal' }}>
                          {booking.passengers}
                        </td>
                        <td data-label="Action">
                          <button className="view-button" onClick={() => handleOpenModal(booking)}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'monthlySummary' && (
          <div>
            <h2>Monthly Summary</h2>
            <p>Number of Trips: {summary.trips}</p>
            <p>Money Collected: ${summary.money_collected}</p>
          </div>
        )}

        {view === 'driverSummary' && (
          <div>
            <h2>Driver Monthly Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Trips Taken</th>
                  <th>Money Collected</th>
                </tr>
              </thead>
              <tbody>
                {driverSummaries.map((driver) => (
                  <tr key={driver.driver_name}>
                    <td>{driver.driver_name}</td>
                    <td>{driver.trips}</td>
                    <td>${driver.money_collected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'addBooking' && (
          <div className="add-booking-form">
            <h2>Add New Booking</h2>
            <form onSubmit={handleSubmitNewBooking}> {/* Assuming you have a handleSubmit function */}
              <div className="form-group">
                <label>First Name:</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Last Name:</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label htmlFor="phoneInput">Phone Number:</label>
                <PhoneInput
                  country={'us'} // Default country code
                  value={telephone}  // Use the state variable 'telephone'
                  onChange={(phone) => setTelephone(phone)} // Correctly update the phone number
                  inputProps={{
                    name: 'PhoneNumber',
                    required: true,
                    autoFocus: true,
                  }}
                />
              </div>

              <div className="form-group">
                <label>Pickup Location: </label>
                <select
                  value={pickup}
                  onChange={handlePickupChange}
                  required
                >
                  <option value="" disabled>Select a location</option>
                  {pickupLocations.length === 0 ? (
                    <option disabled>No locations available</option>
                  ) : (
                    pickupLocations.map((location, index) => (
                      <option key={index} value={location}>
                        {location}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className='form-group'>
                <label>Detailed Pickup Info:</label>
                <input type="pickupdetailed" value={pickupdetailed} onChange={(e) => setPickupDetailed(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Dropoff Location: </label>
                <select
                  value={dropoff || ''}  // Default to empty string if no dropoff selected
                  onChange={handleDropoffChange}
                  disabled={!pickup || dropoffLocations.length === 0}  // Disable if no pickup is selected or no dropoff options
                  required
                >
                  <option value="" disabled>Select a location</option>  {/* Default dropdown option */}
                  {dropoffLocations.length === 0 ? (
                    <option disabled>No dropoff locations available</option>
                  ) : (
                    dropoffLocations.map((location, index) => (
                      <option key={index} value={location}>
                        {location}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className='form-group'>
                <label>Detailed Dropoff Info:</label>
                <input type="dropoffdetailed" value={dropoffdetailed} onChange={(e) => setDropoffDetailed(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Date:</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Time:</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Passengers:</label>
                <input type="text" value={passengers} onChange={(e) => setPassengers(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Quoted Price:</label>
                <input type="text" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} required />
                <p>For reference, the database calculated price for this date is ${prices[date]}</p>
              </div>

              <div className="form-group">
                <label>Airline (optional):</label>
                <input type="text" value={airline} onChange={(e) => setAirline(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Flight Number (optional):</label>
                <input type="text" value={flightnumber} onChange={(e) => setFlightNumber(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Optional: Questions or Comments:</label>
                <textarea
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  className="large-textarea"
                />
              </div>

              <div>
                <label htmlFor="dropdown">Booking Website: </label>
                <select id="dropdown" value={bookingsite} onChange={(e) => setBookingSite(e.target.value)}>
                  <option value="" disabled>Select an option</option> {/* Placeholder option */}
                  <option value="option1">lirshuttle.com</option>
                  <option value="option2">lirtransfers.com</option>
                  <option value="option3">costaricanorthwest.com</option>
                  <option value="option4">direct request</option>
                </select>

                {/* Display the selected option
                <p>Selected: {bookingsite || 'None'}</p> */}
              </div>

              <button type="submit">Submit Booking and Send Confirmation Email</button>
            </form>
          </div>
        )}
        
        {view === 'pendingBookings' && (
          <div className="admin-page-table">
            <h2>Pending Bookings</h2>

            {Object.entries(
              bookings
                .reduce((groups, booking) => {
                  const key = `${booking.FirstName}-${booking.LastName}-${booking.confirmation_number}-${booking.PhoneNumber}`;
                  if (!groups[key]) {
                    groups[key] = [];
                  }
                  groups[key].push(booking);
                  return groups;
                }, {})
            ).map(([key, groupedBookings]) => (
              <div key={key} className="user-booking-table">
                <h4>
                  Reservation Name: {groupedBookings[0]?.FirstName} {groupedBookings[0]?.LastName}, 
                  Confirmation Number: {groupedBookings[0]?.confirmation_number}, 
                  Phone Number: <a href={`tel:${groupedBookings[0]?.PhoneNumber.startsWith('+') ? groupedBookings[0]?.PhoneNumber : `+${groupedBookings[0]?.PhoneNumber}`}`}>
                    {groupedBookings[0]?.PhoneNumber}
                  </a>
                </h4>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Pickup</th>
                      <th>Dropoff</th>
                      <th>Price</th>
                      <th>Driver</th>
                      <th>Passengers</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedBookings
                      .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date)) // Sort by booking_date
                      .map((booking) => (
                        <tr
                          key={booking.id}
                          style={{
                            backgroundColor: booking.tempbookingID === highlightedBooking?.tempbookingID ? 'lightgreen' : 'transparent', // Highlight the modified booking
                          }}
                        >
                          <td data-label="Date" style={{ fontWeight: booking.tempbookingID === highlightedBooking?.tempbookingID && highlightedBooking?.booking_date ? 'bold' : 'normal' }}>
                            {booking.booking_date}
                          </td>
                          <td data-label="Time" style={{ fontWeight: booking.tempbookingID === highlightedBooking?.tempbookingID && highlightedBooking?.pickup_time ? 'bold' : 'normal' }}>
                            {booking.pickup_time}
                          </td>
                          <td data-label="Pickup" style={{ fontWeight: booking.tempbookingID === highlightedBooking?.tempbookingID && highlightedBooking?.startcity ? 'bold' : 'normal' }}>
                            {booking.startcity}
                          </td>
                          <td data-label="Dropoff" style={{ fontWeight: booking.tempbookingID === highlightedBooking?.tempbookingID && highlightedBooking?.endcity ? 'bold' : 'normal' }}>
                            {booking.endcity}
                          </td>
                          <td data-label="Price" style={{ fontWeight: booking.tempbookingID === highlightedBooking?.tempbookingID && highlightedBooking?.routecost ? 'bold' : 'normal' }}>
                            {booking.routecost}
                          </td>
                          <td data-label="Driver" style={{ fontWeight: booking.tempbookingID === highlightedBooking?.tempbookingID && highlightedBooking?.driver ? 'bold' : 'normal' }}>
                            {booking.driver}
                          </td>
                          <td data-label="Passengers" style={{ fontWeight: booking.tempbookingID === highlightedBooking?.tempbookingID && highlightedBooking?.passengers ? 'bold' : 'normal' }}>
                            {booking.passengers}
                          </td>
                          <td data-label="Actions">
                            <button className="view-button" onClick={() => handleOpenModal(booking)}>View</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <button onClick={() => handleApprove(groupedBookings)} className="save-button">Approve</button>
              </div>
            ))}
          </div>
          )}

        {view === 'blackoutdates' && (
          <div>
            <h1>Blackout Dates</h1>
            
            {blackoutDates.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blackoutDates.map((date, index) => (
                    <tr key={index}>
                      <td>{date}</td>
                      <td>
                        <button onClick={() => removeBlackoutDate(date)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No blackout dates available.</p>
            )}
      
            {/* Button to show the calendar */}
            <button onClick={() => setShowCalendar(true)}>Add Blackout Date</button>

            {/* Calendar popup for selecting a date */}
            {showCalendar && (
              <div ref={calendarRef} className="calendar-popup">
                <Calendar
                  onChange={handleDateChange} // Trigger when a date is selected
                  value={new Date()} // Default calendar to current date
                />
              </div>
            )}
          </div>
        )}

        {view === 'completedBookings' && (
          <div className='admin-page-table'>
            <h2>Completed Bookings</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Pickup</th>
                  <th>Dropoff</th>
                  <th>Price</th>
                  <th>Driver</th>
                  <th>Passengers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    style={{
                      backgroundColor: booking.bookingID === highlightedBooking?.bookingID ? 'lightgreen' : 'transparent', // Highlight the modified booking
                    }}
                  >
                    <td data-label="Date" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.booking_date ? 'bold' : 'normal' }}>
                      {booking.booking_date}
                    </td>
                    <td data-label="Time" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.pickup_time ? 'bold' : 'normal' }}>
                      {booking.pickup_time}
                    </td>
                    <td data-label="Pickup" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.startcity ? 'bold' : 'normal' }}>
                      {booking.startcity}
                    </td>
                    <td data-label="Dropoff" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.endcity ? 'bold' : 'normal' }}>
                      {booking.endcity}
                    </td>
                    <td data-label="Price" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.routecost ? 'bold' : 'normal' }}>
                      {booking.routecost}
                    </td>
                    <td data-label="Driver" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.driver ? 'bold' : 'normal' }}>
                      {booking.driver}
                    </td>
                    <td data-label="Passengers" style={{ fontWeight: booking.bookingID === highlightedBooking?.bookingID && highlightedBooking?.passengers ? 'bold' : 'normal' }}>
                      {booking.passengers}
                    </td>
                    <td data-label="Actions">
                      <button className="view-button" onClick={() => handleOpenModal(booking)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'pricingrules' && (
          <div>
            <h1>Pricing Rules</h1>
            <h4><i>Note: You cannot have more than one percent increase for a given day, or more than one additive increase. Only the first will show up. You CAN have a percent and additive increase on the same day. </i></h4>
            
            <button onClick={openPricingRuleModal}>Add Pricing Rule</button>

            <Modal
              isOpen={pricingRuleModalIsOpen}
              onRequestClose={closePricingRuleModal}
              contentLabel="Add Pricing Rule"
              className="Modal-for-popup"
              overlayClassName="Overlay-for-popup"
            >
              <h2>Add Pricing Rule</h2>
              <div>
                <label>Start Date:</label>
                <input
                  type="date"
                  name="datestart"
                  value={newPricingRule.datestart}
                  onChange={handlePricingRuleChange}
                />
              </div>
              <div>
                <label>End Date:</label>
                <input
                  type="date"
                  name="dateend"
                  value={newPricingRule.dateend}
                  onChange={handlePricingRuleChange}
                />
              </div>
              <div>
                <label>Percent Increase:</label>
                <input
                  type="number"
                  name="percentinc"
                  value={newPricingRule.percentinc}
                  onChange={handlePricingRuleChange}
                  placeholder="Enter percent increase"
                />
              </div>
              <div>
                <label>Additive Increase:</label>
                <input
                  type="number"
                  name="addinc"
                  value={newPricingRule.addinc}
                  onChange={handlePricingRuleChange}
                  placeholder="Enter additive increase"
                />
              </div>
              <button onClick={addPricingRule}>Save</button>
              <button onClick={closePricingRuleModal}>Cancel</button>
            </Modal>

            {pricingRules.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Percent Increase</th>
                    <th>Additive Increase</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRules.map((rule, index) => (
                    <tr key={index}>
                      <td>{rule.ruleID}</td>
                      <td>{rule.datestart}</td>
                      <td>{rule.dateend}</td>
                      <td>{rule.percentinc ?? "N/A"}</td>
                      <td>{rule.addinc ?? "N/A"}</td>
                      <td>
                        <button onClick={() => removePricingRule(rule.ruleID)}>Remove Rule</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No blackout dates available.</p>
            )}
      
          </div>
        )}
      </div>
      {/* Render the modal */}
      <AdminBookingModal
              show={showModal}
              booking={selectedBooking}
              isPending={isPending}
              isCompleted={isCompleted}
              handleRemove={handleRemove}
              onClose={handleCloseModal}
              onModify={handleModify}    
      />
    </div>
  );
}

export default AdminPage;
