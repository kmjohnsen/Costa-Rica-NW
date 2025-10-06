import React from "react";
import PropTypes from "prop-types";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import "./TimePicker.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";


function ResponsiveTimePicker({ value, onChange, label }) {
  const handleClick = (e) => {
    if (e.target.showPicker) {
      e.target.showPicker(); // safe: only runs when user actually clicks
    }
  };

  return (
    <div className="time-dropdown">
      <label className={`floating-label ${value ? "label-active" : ""}`}>
        {label}
      </label>
      <input
        type="time"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`time-native-input ${value ? "has-value" : "is-empty"}`}
        step={300}
        min="00:00"
        max="23:55"
        onClick={handleClick}
      />      
      <div className="chevron-container">
        <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
      </div>
    </div>
  );
}

ResponsiveTimePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export default ResponsiveTimePicker;
