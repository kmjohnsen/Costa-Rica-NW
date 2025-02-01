import React from 'react';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import LoginForm from './components/LoginForm';
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


function App() {
  const navigate = useNavigate(); // Initialize the navigate function

  const CLIENTID = "1003369992304-lj9062hp21arbnnflisq30rlkes1ce9o.apps.googleusercontent.com"

  const handleLoginSuccess = async (credentialResponse) => {
    const { credential } = credentialResponse; // This is the token we need

    try {
      // Send the token to your Flask backend for verification
      const response = await axios.post(`${API_BASE_URL}/api/auth/google`, { idToken: credential });

      if (response.data.status === 'success') {
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
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/completebooking" element={<CompleteBooking />} />
          <Route path="/requestbooking" element={<RequestBooking />} />
          {/* <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} /> */}
          <Route path="/admin/modifyuser" element={<ProtectedRoute><ModifyUser /></ProtectedRoute>} />
          {/* <Route path="/admin/modifyuser" element={<ModifyUser />} /> */}
        </Routes>
      </div>
      <div className='footer-links'>
        <Link to="/">Home</Link> | <Link to="/login">Login</Link>
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
