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
    console.log("Google Credential Response:", credentialResponse);
    
    const { credential } = credentialResponse; 
    console.log("Extracted Credential:", credential);

    try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/google`, 
            { idToken: credential }, 
            { headers: { "Content-Type": "application/json" } } // Ensure proper headers
        );

        console.log("Google Login Response:", response.data);

        localStorage.setItem('access_token', response.data.access_token);
        navigate('/admin');
    } catch (error) {
        console.error("Google Login Error:", error);
        console.error("Error Response Data:", error.response?.data);
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