import React from 'react';
import { addDays, subDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';  // Import datepicker styles
import PropTypes from 'prop-types';

function DateNavigation({ selectedDate, onDateChange }) {
  // Function to handle moving to the previous day
  const handlePrevDay = () => {
    const prevDay = subDays(new Date(selectedDate), 1);
    console.log("Previous day selected:", prevDay);
    onDateChange(prevDay);  // Call the parent's function to update the selected date
  };

  // Function to handle moving to the next day
  const handleNextDay = () => {
    const nextDay = addDays(new Date(selectedDate), 1);
    console.log("Next day selected, selectedDate:", selectedDate)
    console.log("Next day selected, nextDay:", nextDay);
    onDateChange(nextDay);  // Call the parent's function to update the selected date
  };

  // Function to handle when the user selects a new date from the DatePicker
  const handleDateChange = (date) => {
    console.log("New date selected from DatePicker:", date);
    onDateChange(date);  // Call the parent's function to update the selected date
  };

  // Log the currently selected date for debugging
  console.log("Current selectedDate:", selectedDate);

  return (
    <div className="date-navigation" style={{ display: 'flex', alignItems: 'center' }}>
      <button onClick={handlePrevDay} style={{ marginRight: '10px' }}>←</button>
      
      {/* Use React DatePicker */}
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange} // Handle date change from the date picker
        dateFormat="yyyy-MM-dd"  // Display format
        className="fancy-datepicker"  // Optional custom class for styling
      />

      <button onClick={handleNextDay} style={{ marginLeft: '10px' }}>→</button>
    </div>
  );
}

DateNavigation.propTypes = {
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onDateChange: PropTypes.func.isRequired,
};

export default DateNavigation;
