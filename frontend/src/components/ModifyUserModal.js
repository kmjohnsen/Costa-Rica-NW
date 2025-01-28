// ModifyUserModal.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import './AdminModal.css'; // Import CSS for styling

function ModifyUserModal({ show, user, onClose, onModify }) {
  // State to handle edit mode
  const [editableUser, seteditableUser] = useState(user || {}); // Default to an empty object to avoid null errors
  const [selectedOption, setSelectedOption] = useState('') // Dropdown state  
  const roleoptions = ['dev', 'admin', 'driver', 'user']; // Options for the dropdown

  // Set the selected option to the user's current role when the modal opens
  useEffect(() => {
    if (user) {
      setSelectedOption(user.role || ''); // Set default role or empty string if no role exists
      // setSelectedOption(user.PhoneNumber || '');
    }
  }, [user]);

  // Update editableUser state when the dropdown value changes
  const handleDropdownChange = (e) => {
    const role = e.target.value; // Get the selected role
    setSelectedOption(role); // Update the selected option
    seteditableUser((prev) => ({
      ...prev,
      role, // Update the role in editableUser
    }));
  };
  
  // Update editableUser state when the user prop changes
  useEffect(() => {
    if (user) {
      seteditableUser(user);
    } else {
      seteditableUser({}); // Reset to an empty object if user is null
    }
  }, [user]);

  // Handle input changes for editable fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    seteditableUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Function to check differences between user and editableUser
const getUpdatedFields = (original, updated) => {
  const changedFields = {};

  // Iterate over keys in the updated object
  Object.keys(updated).forEach((key) => {
    if (updated[key] !== original[key]) {
      changedFields[key] = updated[key]; // Add the changed fields to the object
    }
  });
  console.log('Changed Fields: ', changedFields)
  return changedFields;
};

// Function to add user ID to existing object
const addUserID = (updatedFields, originaluser) => {
  updatedFields.userID = originaluser.userID;
  console.log('Added User ID: ', updatedFields)
  return updatedFields
};

// Save changes and exit editing mode
const handleSave = async () => {
  // Find which fields have been changed
  const updatedFields = getUpdatedFields(user, editableUser);
  console.log('all of editable user: ', editableUser)
  console.log('all of user: ', user)
  const updatedFieldsUserID = addUserID(updatedFields, user);


  try {
    // Make an API call to update the users in the database
    const response = await axios.put(`/api/users/save`, updatedFieldsUserID);

    if (response.status === 200) {
      // Successfully updated the user, you might want to update the UI accordingly
      onModify(updatedFieldsUserID); // Pass updated user info to parent component
    } else {
      console.error('Failed to update user:', response.data);
    }
  } catch (error) {
    console.error('Error updating user:', error);
  }

  onClose(); // Close the modal after saving
};


// Cancel editing and revert changes
const handleCancelEdit = () => {
  seteditableUser(user || {}); // Revert to original user info or an empty object
  onClose();
};

if (!show || !user) return null; // Do not render the modal if `show` is false or user is null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Modify User</h2>
        <p><strong>User ID:</strong> {user?.userID || 'N/A'}</p>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label><strong>First Name:</strong></label>
          <input
            type="text"
            name="FirstName"
            value={editableUser?.FirstName || ''}
            onChange={handleInputChange}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label><strong>Last Name:</strong></label>
          <input
            type="text"
            name="LastName"
            value={editableUser?.LastName || ''}
            onChange={handleInputChange}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label><strong>Email:</strong></label>
          <input
            type="text"
            name="Email"
            value={editableUser?.Email || ''}
            onChange={handleInputChange}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="phoneInput"><strong>Phone Number:</strong></label>
          <PhoneInput
            country={'us'} // Default country code
            value={editableUser?.PhoneNumber || ''}  // Ensure it is initialized
            onChange={(phone) => seteditableUser((prev) => ({ ...prev, PhoneNumber: phone }))} // Correctly update the phone number
            inputProps={{
              name: 'PhoneNumber',
              required: true,
              autoFocus: true,
            }}
          />
        </div>
        <label htmlFor="driverdropdown"><strong>Role:</strong></label>
        <select id="driverdropdown" value={selectedOption} onChange={handleDropdownChange}>
          <option value="" disabled>Select an option</option>
          {roleoptions.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="modal-buttons">
          <>
            <button onClick={handleSave} className="save-button">
              Save
            </button>
            <button onClick={handleCancelEdit} className="cancel-edit-button">
              Cancel
            </button>
          </>
        </div>
        <button onClick={onClose} className="close-button">X</button>
      </div>
    </div>
  );
}

// Define PropTypes for ModifyUserModal
ModifyUserModal.propTypes = {
  show: PropTypes.bool.isRequired,
  user: PropTypes.shape({
    userID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    FirstName: PropTypes.string,
    LastName: PropTypes.string,
    Email: PropTypes.string,
    PhoneNumber: PropTypes.string,
    role: PropTypes.string,
    selectedOption: PropTypes.string.isRequired,
    handleDropdownChange: PropTypes.func.isRequired
  }),
  onClose: PropTypes.func.isRequired,
  onModify: PropTypes.func.isRequired,
  onCancel: PropTypes.func, // onCancel should be a function
};

export default ModifyUserModal;
