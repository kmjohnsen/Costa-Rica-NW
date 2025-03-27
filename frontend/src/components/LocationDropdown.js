import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import "./ButtonDropdown.css";


const LocationDropdown = ({ 
  label, 
  value, 
  locations, 
  onChange,  
}) => {
  const [filteredLocations, setFilteredLocations] = useState(locations);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null); // Reference for search input inside dropdown

  // Handle input change (updates dropdown)
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue); // Update form state
    
    if (newValue.trim() === "") {
      setFilteredLocations(locations); // Show all locations if search is empty
    } else {
      setFilteredLocations(
        locations.filter((option) =>
          option.toLowerCase().includes(newValue.toLowerCase())
        )
      );
    }
    
    setShowDropdown(true);
  };

  // Show all locations when input is clicked or focused
  const handleDropdownOpen = () => {
    setFilteredLocations(locations); // Show full list on click
    setShowDropdown(true);
  };

  // Auto-focus on the search field inside the dropdown when it opens
  useEffect(() => {
    if (showDropdown) {
      setTimeout(() => {
        searchRef.current?.focus();
      }, 100); // Small delay to ensure UI renders first
    }
  }, [showDropdown]);

  // Detect Clicks Outside to Close Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false); // Close dropdown if clicked outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="location-dropdown" ref={dropdownRef}>
      {/* Floating Label & Input Field */} 
      <div className="location-input-container">
        <label className={`floating-label ${value ? "label-active" : ""}`}>
          {label}
        </label>

        {/* Input Field */}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleDropdownOpen}
          onClick={handleDropdownOpen}
          className="location-input"
        />
        
        <div className="chevron-container">
          <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
        </div>


        
      </div>

      {/* Dropdown with Search Bar Inside */}
      {showDropdown && (
        <ul className="dropdown-list">
          {/* Search Bar Inside Dropdown */}
          <li className="dropdown-search">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search..."
              ref={searchRef}
              onChange={handleInputChange}
              className="dropdown-search-input"
            />
          </li>

          {/* Filtered Locations List */}
          {filteredLocations.length > 0 ? (
            filteredLocations.map((option, idx) => (
              <li
                key={idx}
                className="dropdown-item"
                onClick={() => {
                  onChange(option);
                  setShowDropdown(false);
                }}
              >
                {option}
              </li>
            ))
          ) : (
            <li className="dropdown-item no-results">Not found</li>
          )}
        </ul>
      )}
    </div>
  );
};

// Define expected prop types
LocationDropdown.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  locations: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default LocationDropdown;
