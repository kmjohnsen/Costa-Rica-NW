// ModifyUser.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ModifyUserModal from './ModifyUserModal';
import API_BASE_URL from '../config';
import { logger } from './HelperFunctions'


function ModifyUserPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/modify`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Use useEffect to fetch users when the component mounts
  useEffect(() => {
    fetchUsers(); // Fetch users when the component loads
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  // Open the modal for user modification
  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  // Handle the save action in the modal
  const handleModify = (updatedFields) => {
    logger.debug('updated Fields: ', updatedFields);
    fetchUsers();
    setShowModal(false)
  };

    // Close the modal
    const handleCloseModal = () => {
      setShowModal(false);
      setSelectedUser(null);
    };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard | Modify Users</h1>
      {/* <div className="navigation-buttons">
        <button onClick={() => handleViewChange('allUsers')}>All Bookings</button>
        <button onClick={() => handleViewChange('dailyBookings')}>Bookings by Day</button>
        <button onClick={() => handleViewChange('monthlySummary')}>Monthly Summary</button>
        <button onClick={() => handleViewChange('driverSummary')}>Driver Summary</button>
        <button onClick={goToModifyUser}>Modify Users</button> 
      </div> */}

      <div>
        <h2>All Bookings</h2>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Phone Number</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.role}</td>
                <td>{user.FirstName}</td>
                <td>{user.LastName}</td>
                <td>{user.Email}</td>
                <td>{user.PhoneNumber}</td>
                <td>
                  <button onClick={() => handleOpenModal(user)}>Modify</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Render the modal */}
        <ModifyUserModal
          show={showModal}
          user={selectedUser}
          onClose={handleCloseModal}
          onModify={handleModify}
        />
      </div>
    </div>
  )
}

export default ModifyUserPage;
