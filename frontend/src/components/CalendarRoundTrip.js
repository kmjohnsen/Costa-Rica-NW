import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-modal";
import { DateRange } from "react-date-range";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import "react-date-range/dist/styles.css"; // main style
import "react-date-range/dist/theme/default.css"; // theme style
import "./Calendars.css";
import { useIsMobile } from "./HelperFunctions";

Modal.setAppElement("#root");

function CalendarRoundTrip({ onDateChange, label }) {
  const isMobile = useIsMobile(); 
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [range, setRange] = useState([
    {
      startDate: undefined,
      endDate: undefined,
      key: "selection",
    },
  ]);

  const toggleCalendarModal = () => {
    if (!isCalendarOpen) {
      initializeTempDateRange();
    }
    setIsCalendarOpen((prev) => !prev);
  };

  const handleDateChange = ({selection}) => {
    const { startDate, endDate } = selection;
    setRange([selection]);

    if (startDate && endDate && startDate.getTime() !== endDate.getTime()) {
      onDateChange(startDate, endDate);
      setIsCalendarOpen(false); // Close only after full range is chosen
    }
  };

  const today = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(today.getFullYear() + 1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Format the display text based on the selection
  let formattedDate = label || "Select Dates";
    if (range[0].startDate && range[0].endDate) {
    formattedDate = `${range[0].startDate.toLocaleDateString()} - ${range[0].endDate.toLocaleDateString()}`;
  }

  // Below is a bit of a kluge, initializing date range so that a blue
  // circle would show on today's date, avoiding a weird effect where
  // all future dates were blue until a selection was made.
  const initializeTempDateRange  = () => {
    const today = new Date();
    if (!range[0].startDate || !range[0].endDate) {
      setRange([
        {
          startDate: today,
          endDate: today,
          key: "selection",
        },
      ]);
    }
  };
  
  return (
    <div className="date-selector-container">
      <button onClick={toggleCalendarModal} className="date-picker-button">
        <FontAwesomeIcon icon={faCalendarAlt} className="calendar-icon" />
        <span
          className={`date-text ${formattedDate === "Select Dates" ? "placeholder" : ""}`}
        >
          {formattedDate}
        </span>        <div className="chevron-container">
          <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
        </div>
      </button>

      <Modal
        isOpen={isCalendarOpen}
        onRequestClose={toggleCalendarModal}
        contentLabel="Select Dates"
        className="calendar-modal calendar-roundtrip" 
        overlayClassName="calendar-modal-overlay"
      >
        <DateRange
          editableDateInputs={false}
          showDateDisplay={false}
          onClick={initializeTempDateRange}
          onChange={handleDateChange}
          moveRangeOnFirstSelection={false}
          ranges={range}
          months={isMobile ? 2 : 2}       // 1 month on mobile, 2 on desktop
          direction={isMobile ? "vertical" : "horizontal"} // vertical on mobile
          minDate={new Date()} // no past dates
          maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
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
};

export default CalendarRoundTrip;
