import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-modal";
import Calendar from "react-calendar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import "react-calendar/dist/Calendar.css";
import "./Calendars.css";

const DateSelectorSingleDate = ({ value, onChange }) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || "");

  const toggleCalendarModal = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    onChange(date.toISOString().split("T")[0]); // Convert to "YYYY-MM-DD"
    setIsCalendarOpen(false); // Close modal after selecting a date
  };

  return (
    <div className="date-selector-container">
      <button onClick={toggleCalendarModal} className="date-picker-button">
        <FontAwesomeIcon icon={faCalendarAlt} className="calendar-icon" />
        <span className="date-text">
          {selectedDate ? selectedDate.toString().slice(0, 10) : "Select Date"}
        </span>
        <div className="chevron-container">
          <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
        </div>
      </button>

      <Modal
        isOpen={isCalendarOpen}
        onRequestClose={toggleCalendarModal}
        contentLabel="Select Date"
        className="calendar-modal"
        overlayClassName="calendar-modal-overlay"
      >
        <Calendar
          onChange={handleDateChange}
          value={selectedDate || new Date()}
          locale="en-US"
          tileDisabled={({ date }) => date < new Date()}
        />
        <button className="close-modal-btn" onClick={toggleCalendarModal}>
          Close
        </button>
      </Modal>
    </div>
  );
};

DateSelectorSingleDate.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DateSelectorSingleDate;
