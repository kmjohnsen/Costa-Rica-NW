import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "react-modal";
import Calendar from "react-calendar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import "react-calendar/dist/Calendar.css";
import "./Calendars.css";

Modal.setAppElement("#root");

function useIsMobile(breakpoint = 680) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

function CalendarRoundTrip({ onDateChange, label, tileClassName }) {
  const isMobile = useIsMobile(); 
  const [value, setValue] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const toggleCalendarModal = () => {
    setIsCalendarOpen((prev) => !prev);
  };

  const handleDateChange = (newValue) => {
    setValue(newValue);
    if (Array.isArray(newValue) && newValue.length === 2 && newValue[0] && newValue[1]) {
      onDateChange(newValue[0], newValue[1]);
      setIsCalendarOpen(false);
    }
  };

  const today = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(today.getFullYear() + 1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Format the display text based on the selection
  let formattedDate = label || "Select Dates";
  if (Array.isArray(value) && value[0] && value[1]) {
    formattedDate = `${value[0].toLocaleDateString()} - ${value[1].toLocaleDateString()}`;
  } else if (value instanceof Date) {
    // Only the start date has been selected
    formattedDate = value.toLocaleDateString();
  }

  return (
    <div className="date-selector-container">
      <button onClick={toggleCalendarModal} className="date-picker-button">
        <FontAwesomeIcon icon={faCalendarAlt} className="calendar-icon" />
        <span className="date-text">{formattedDate}</span>
        <div className="chevron-container">
          <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
        </div>
      </button>

      <Modal
        isOpen={isCalendarOpen}
        onRequestClose={toggleCalendarModal}
        contentLabel="Select Dates"
        className="calendar-modal"
        overlayClassName="calendar-modal-overlay"
      >
        <Calendar
          selectRange
          onChange={handleDateChange}
          value={value}
          locale="en-US"
          tileDisabled={({ date }) => date < new Date()}
          tileClassName={tileClassName}
          showDoubleView={!isMobile} 
          maxDate={oneYearFromNow}
          // activeStartDate={new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1)}
        />
        <button className="close-modal-btn" onClick={toggleCalendarModal}>
          Close
        </button>
      </Modal>
    </div>
  );
}

CalendarRoundTrip.propTypes = {
  onDateChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  tileClassName: PropTypes.func,
};

export default CalendarRoundTrip;
