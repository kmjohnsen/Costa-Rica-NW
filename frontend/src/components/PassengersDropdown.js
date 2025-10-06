import React, { useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faUser } from "@fortawesome/free-solid-svg-icons";
import './Dropdowns.css';

const PassengersDropdown = ({ selectedPassengers, onPassengerChange }) => {
  const [showOptions, setShowOptions] = useState(false);
  const passengerOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11+"];

  return (
    <div className="dropdown-container" style={{ width: "250px" }}>
      {/* Styled Button Acting as Dropdown */}
      <button 
        className="dropdown-button"
        onClick={() => setShowOptions(!showOptions)}
      >
        <FontAwesomeIcon icon={faUser} style={{ marginRight: "8px" }} />
        <span>{selectedPassengers} {selectedPassengers === "1" ? "Passenger" : "Passengers"}</span>
        <FontAwesomeIcon 
          icon={faChevronDown} 
          style={{ marginLeft: "8px", fontSize: "12px" }} 
        />
      </button>

      {/* Dropdown List */}
      {showOptions && (
        <ul className="dropdown-list">
          {passengerOptions.map((option, idx) => (
            <li key={idx} onClick={() => { 
              onPassengerChange(option);
              setShowOptions(false);
            }}>
              {option} {option === "1" ? "Passenger" : "Passengers"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ✅ Add PropTypes to avoid ESLint errors
PassengersDropdown.propTypes = {
  selectedPassengers: PropTypes.string.isRequired,
  onPassengerChange: PropTypes.func.isRequired,
};

export default PassengersDropdown;
