// ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');

  // Logic to verify the token (e.g., decode and check expiration) can be added here
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired, // Validate that children is a valid React node and is required
};

export default ProtectedRoute;
