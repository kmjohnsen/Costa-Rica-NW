const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "http://ec2-3-94-61-214.compute-1.amazonaws.com:5000"; // Replace with your EC2 public IP or domain

export default API_BASE_URL;
