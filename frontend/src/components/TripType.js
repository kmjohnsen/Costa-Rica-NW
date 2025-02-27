import React, { useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShuttleVan, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import './Dropdowns.css';

const TripTypeDropdown = ({ handleTripTypeChange }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTripType, setSelectedTripType] = useState("Round Trip"); // Track selection

  const handleSelect = (type, label) => {
    setSelectedTripType(label); // Update button text
    handleTripTypeChange(type); // Notify parent component
    setShowOptions(false); // Close dropdown
  };

  return (
    <div className="dropdown-container" style={{ width: "200px" }}>
      {/* Styled Button Acting as Dropdown */}
      <button className="dropdown-button" onClick={() => setShowOptions(!showOptions)}>
        <FontAwesomeIcon icon={faShuttleVan} />
        <span style={{ marginLeft: "8px" }}>
          {selectedTripType} {/* Updated dynamically */}
        </span>
        <FontAwesomeIcon 
          icon={faChevronDown} 
          style={{ marginLeft: "8px", fontSize: "12px" }} 
        />
      </button>

      {/* Dropdown List */}
      {showOptions && (
        <ul className="dropdown-list">
          <li onClick={() => handleSelect("roundtrip", "Round Trip")}>
            Round Trip
          </li>
          <li onClick={() => handleSelect("oneway", "One Way")}>
            One Way
          </li>
          {/* MULTI trip functionality just needs to be turned on, with some modifications in home.js*/}
          {/* <li onClick={() => handleSelect("multi", "Multi")}>
            Multi
          </li> */}
        </ul>
      )}
    </div>
  );
};

// ✅ Add PropTypes to Fix ESLint Error
TripTypeDropdown.propTypes = {
  handleTripTypeChange: PropTypes.func.isRequired,
};

export default TripTypeDropdown;
