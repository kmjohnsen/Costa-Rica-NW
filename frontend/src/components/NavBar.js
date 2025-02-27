import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './NavBar.css';

const Navbar = ({ onBookClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      {/* Hamburger Menu Button (visible on small screens) */}
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>

      {/* Logo on the left */}
      <NavLink to="/" className="logo-link">
        <img src="/CRNW-Logo-SVG.svg" alt="Company Logo" className="navbar-logo" />
      </NavLink>

      
      {/* Navigation Links */}
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active-link' : 'nav-link')} onClick={onBookClick}>
          Book
        </NavLink>
        <NavLink to="/aboutus" className={({ isActive }) => (isActive ? 'active-link' : 'nav-link')}>
          About Us
        </NavLink>
        <NavLink to="/terms" className={({ isActive }) => (isActive ? 'active-link' : 'nav-link')}>
          Terms and Conditions
        </NavLink>
        <NavLink to="/faqs" className={({ isActive }) => (isActive ? 'active-link' : 'nav-link')}>
          FAQs
        </NavLink>
      </div>
    </nav>
  );
};

// Define PropTypes
Navbar.propTypes = {
  onBookClick: PropTypes.func.isRequired,
};

export default Navbar;
