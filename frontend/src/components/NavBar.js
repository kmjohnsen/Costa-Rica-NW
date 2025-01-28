import PropTypes from 'prop-types';
import React from 'react';
import { NavLink } from 'react-router-dom';

const Navbar = ({ onBookClick }) => {
  return (
    <nav className="navbar">
      <NavLink
        to="/"
        className={({ isActive }) => (isActive ? 'active-link' : 'nav-link')}
        onClick={onBookClick} // Trigger callback when Book is clicked
      >        
        Book
      </NavLink>
      <NavLink to="/aboutus" className={({ isActive }) => (isActive ? "active-link" : "nav-link")}>
        About Us
      </NavLink>
      <NavLink to="/terms" className={({ isActive }) => (isActive ? "active-link" : "nav-link")}>
        Terms and Conditions
      </NavLink>
      <NavLink to="/faqs" className={({ isActive }) => (isActive ? "active-link" : "nav-link")}>
        FAQs
      </NavLink>
    </nav>
  );
};

// Define PropTypes
Navbar.propTypes = {
  onBookClick: PropTypes.func.isRequired, // `onBookClick` is a required function
};

export default Navbar;
