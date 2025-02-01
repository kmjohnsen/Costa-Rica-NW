// // LoginForm.js
// // TODO this is obsolete with Google Oauth, i think!!
// import React from 'react';
// // import axios from 'axios';
// // import { useNavigate } from 'react-router-dom';
// import { GoogleLogin } from '@react-oauth/google'
// import API_BASE_URL from './config';


// const Login = () => {
//   const responseGoogle = (response) => {
//     // Send the token to your backend for verification and to create a session
//     fetch(`${API_BASE_URL}/api/auth/google`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ idToken: response.tokenId }),
//     })
//     .then(res => res.json())
//     .then(data => {
//       // Handle success or error
//       console.log(data);
//     })
//     .catch(error => {
//       console.error('Error:', error);
//     });
//   };

//   return (
//     <div>
//       <h2>Login</h2>
//       <GoogleLogin
//         clientId="1003369992304-lj9062hp21arbnnflisq30rlkes1ce9o.apps.googleusercontent.com" // Replace with your client ID
//         buttonText="Login with Google"
//         onSuccess={responseGoogle}
//         onFailure={responseGoogle}
//         cookiePolicy={'single_host_origin'}
//       />
//     </div>
//   );
// };

// export default Login;

// // function LoginForm() {
// //   const [email, setEmail] = useState('');
// //   const [password, setPassword] = useState('');
// //   const [error, setError] = useState('');
// //   const navigate = useNavigate();

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     try {
// //       const response = await axios.post('${API_BASE_URL}/api/login', {
// //         email,
// //         password,
// //       });
// //       localStorage.setItem('accessToken', response.data.access_token);
// //       navigate('/admin'); // Redirect to admin page after successful login
// //     } catch (err) {
// //       setError('Invalid username or password');
// //     }
// //   };

// //   return (
// //     <div className='site-header'>
// //       <h2>Login</h2>
// //       {error && <p style={{ color: 'red' }}>{error}</p>}
// //       <form onSubmit={handleSubmit}>
// //         <div className='form-group'>
// //           <label>Email:</label>
// //           <input
// //             type="text"
// //             value={email}
// //             onChange={(e) => setEmail(e.target.value)}
// //             required
// //           />
// //         </div>
// //         <div className='form-group'>
// //           <label>Password:</label>
// //           <input
// //             type="password"
// //             value={password}
// //             onChange={(e) => setPassword(e.target.value)}
// //             required
// //           />
// //         </div>
// //         <button type="submit">Login</button>
// //       </form>
// //     </div>
// //   );
// // }

// // export default LoginForm;
