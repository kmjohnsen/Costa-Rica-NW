import React from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import Modal from 'react-modal';

Modal.setAppElement('#root');

function RequiredFieldsModal({ isOpen, onClose, missingFields }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="Modal-for-popup"
      overlayClassName="Overlay-for-popup"
    >
      <h2>Missing Information</h2>
      <p>{missingFields}</p>
      <button className="book-button" onClick={onClose}>
        Close
      </button>
    </Modal>
  );
}

// Define PropTypes for the component
RequiredFieldsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired, // isOpen must be a boolean and is required
  onClose: PropTypes.func.isRequired, // onClose must be a function and is required
  missingFields: PropTypes.string.isRequired, // missingFields must be a string and is required
};

export default RequiredFieldsModal;