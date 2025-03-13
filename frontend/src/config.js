const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "https://costaricanorthwest.com"; // Replace with your EC2 public IP or domain

export default API_BASE_URL;
