import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styles
import './calendarStyles.css'; // Import custom styles
import PropTypes from 'prop-types'; // Make sure you import PropTypes for validation
import Modal from 'react-modal';

Modal.setAppElement('#root'); // Set the app root element to avoid issues with accessibility

const CalendarWithPrices = ({ prices, passengers, onDateChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedDate, setSelectedDate] = useState(''); // Store the selected unavailable date

  // Custom tile content function to show prices below the date
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0]; // Format the date
      const price = prices[dateString]; // Get the price for the date

      let priceElement;
      if (price === 'N/A') {
        priceElement = <div className="na-tag">{price}</div>;
      } else if (price > 9999 ) {
        priceElement = <div className="price-tag"> </div>;
      } else if (price > 0 ) {
        priceElement = <div className="price-tag">${price}</div>;
      } else {
        priceElement = <div className="price-tag"> </div>
        // console.log("no price", price);
      }

      return (
        <div className="tile-content">
          {priceElement}
        </div>
      );
    }
    return null;
  };

  // Function to apply a class to the tile (for background color) based on the price
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      const price = prices[dateString];

      if (passengers === '10+' && price > 0) {
        return 'green-tile'; // Apply a green background for large groups and valid price
      } else if (price === 'N/A') {
        return 'na-tile'; // Apply a red background for "N/A"
      }
    }
    return null;
  };

  // Function to disable tiles with "N/A" price or null price
  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      const price = prices[dateString];

      return price === 'N/A' || (price == null);
    }
    return false;
  };

  // Function to handle date click (modal popup)
  const handleClickOnDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    const price = prices[dateString];
    console.log("DATE string", dateString);

    if (price === 'N/A') {
        setSelectedDate(dateString);
        setIsModalOpen(true); // Open the modal
    } else {
        onDateChange(dateString); // Pass only the formatted date string
        console.log("formatted date", dateString);
    }
  };

  return (
    <div>
      {/* Modal for unavailable dates */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)} // Close the modal when clicking outside
        contentLabel="Unavailable Date"
        className="Modal-for-popup"
        overlayClassName="Overlay-for-popup"
      >
        <h2>Date Unavailable</h2>
        <p>The date {selectedDate} is unavailable for booking.</p>
        <button onClick={() => setIsModalOpen(false)}>Close</button>
      </Modal>
      
      <Calendar
        onClickDay={handleClickOnDate} // Handle date selection, including unavailable ones
        tileContent={tileContent} // Pass the custom tile content function
        tileClassName={tileClassName} // Apply custom class for background color
        tileDisabled={tileDisabled} // Disable tiles with "N/A" or null prices
      />
    </div>
  );
};

CalendarWithPrices.propTypes = {
  date: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]).isRequired,
  prices: PropTypes.object.isRequired,
  passengers: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onDateChange: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};

export default CalendarWithPrices;
