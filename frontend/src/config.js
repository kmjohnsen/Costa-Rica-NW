const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : ""; //https://costaricanorthwest.com

export default API_BASE_URL;
