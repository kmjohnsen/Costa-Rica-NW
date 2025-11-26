import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import AdminPage from './components/AdminPage';
import CompleteBooking from './components/CompleteBooking';
import RequestBooking from './components/RequestBooking';
import ProtectedRoute from './components/ProtectedRoute';
import TermsConditions from './components/TermsAndConditions';
import AboutUs from './components/AboutUs';
import FAQs from './components/FAQs';
import ModifyUser from './components/ModifyUserPage';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios'
import API_BASE_URL from './config';
import './index.css'

function App() {
  const navigate = useNavigate(); // Initialize the navigate function

  const CLIENTID = "1003369992304-lj9062hp21arbnnflisq30rlkes1ce9o.apps.googleusercontent.com"

  const handleLoginSuccess = async (credentialResponse) => {
    const { credential } = credentialResponse; // This is the token we need

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/google`, 
        { idToken: credential }, 
        { withCredentials: true } 
      )
      
      console.log("Google Login Response:", response.data);

      if (response.data.status === 'success' && response.data.access_token) {
        // Save the token to local storage or state management
        localStorage.setItem('access_token', response.data.access_token);
        console.log('User info:', response.data.user); // Optional: handle user data if needed

        // Redirect to /admin page
        navigate('/admin');
      } else {
        console.error('Login failed:', response.data.error);
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const handleLoginError = () => {
    console.log('Login Failed');
  };
  
  return (
    <GoogleOAuthProvider clientId={CLIENTID}>
    {/* <div className="background-container"> */}
      <div className="content">
      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/aboutus" element={<ProtectedRoute><AboutUs /></ProtectedRoute>} />
        <Route path="/terms" element={<ProtectedRoute><TermsConditions /></ProtectedRoute>} />
        <Route path="/faqs" element={<ProtectedRoute><FAQs /></ProtectedRoute>} />
        <Route path="/completebooking" element={<ProtectedRoute><CompleteBooking /></ProtectedRoute>} />
        <Route path="/requestbooking" element={<ProtectedRoute><RequestBooking /></ProtectedRoute>} />
        <Route path="/admin/modifyuser" element={<ProtectedRoute><ModifyUser /></ProtectedRoute>} />
        <Route path="/login" element={
          <div className="login-page" style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2>Please sign in to continue</h2>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
          </div>
        } />
      </Routes>

      </div>
      <div className='footer-links'>
        <div className="google-login">
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
          />
        </div>
      </div>
    {/* </div> */}
    </GoogleOAuthProvider>
  );
}

export default App;