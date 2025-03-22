import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';  // Import datepicker styles
import PropTypes from 'prop-types';

function DateNavigation({ selectedDate, onDateChange }) {
  const handleDateChange = (date) => {
    console.log("New date selected from DatePicker:", date);
    onDateChange(date); // Already a Date object
  };

  const changeDay = (offset) => {
    const newDate = new Date(selectedDate); // clone original
    newDate.setDate(newDate.getDate() + offset);
    newDate.setHours(0, 0, 0, 0); // force midnight
    onDateChange(newDate); // pass the adjusted Date object
  };

  return (
    <div className="date-navigation" style={{ display: 'flex', alignItems: 'center' }}>
      <button onClick={() => changeDay(-1)}>←</button>

      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        dateFormat="yyyy-MM-dd"
        className="fancy-datepicker"
      />

      <button onClick={() => changeDay(1)}>→</button>
    </div>
  );
}

DateNavigation.propTypes = {
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onDateChange: PropTypes.func.isRequired,
};

export default DateNavigation;
