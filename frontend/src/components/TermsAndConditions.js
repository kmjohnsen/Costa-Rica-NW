import React from 'react';
import Navbar from './NavBar'; // Assuming you have a Navbar component

const TermsAndConditions = () => {
  return (
    <div>
      <Navbar />
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Terms and Conditions</h1>
        <p>Welcome to Costa Rica Northwest (the “Company”). By booking and using our airport shuttle and private transfer services, you agree to the following terms and conditions:</p>

        <h2>1. Booking and Reservations</h2>
        <ol>
          <li>
            <strong>Reservation Confirmation:</strong> All reservations must be confirmed via phone. A confirmation code will be sent to you at the time of your booking.
          </li>
          <li>
            <strong>Booking Information:</strong> It is the customer’s responsibility to provide accurate information, including flight details, pick-up/drop-off locations, and contact information.
          </li>
          <li>
            <strong>Advance Bookings:</strong> We recommend booking at least 72 hours in advance, especially during peak travel seasons.
          </li>
          <li>
            <strong>Last-Minute Bookings:</strong> Reservations made less than 48 hours in advance are subject to availability and additional charges.
          </li>
        </ol>

        <h2>2. Payment Policy</h2>
        <ol>
          <li>
            <strong>Payment Methods:</strong> Payments must be made with USD cash at the time of your first transfer.
          </li>
          <li>
            <strong>Currency:</strong> All prices are quoted in US dollars (USD).
          </li>
          <li>
            <strong>Deposits:</strong> Some bookings may require a non-refundable deposit at the time of reservation.
          </li>
          <li>
            <strong>Outstanding Balances:</strong> Any remaining balance must be paid in full 72 hours before the start of the transfer.
          </li>
        </ol>

        <h2>3. Cancellations and Refunds</h2>
        <ol>
          <li>
            <strong>Cancellation by Customer:</strong> We kindly ask that cancellations be made more than 48 hours before the scheduled pick-up.
          </li>
          <li>
            <strong>Cancellation by the Company:</strong> If the Company cancels the service due to unforeseen circumstances (e.g., severe weather, mechanical issues), you will receive a full refund or the option to reschedule.
          </li>
        </ol>

        <h2>4. Changes to Reservations</h2>
        <ol>
          <li>
            <strong>Amendments:</strong> Changes to reservations (e.g., pick-up time, destination) must be requested at least 24 hours in advance and may incur additional charges.
          </li>
          <li>
            <strong>Flight Delays:</strong> The Company will monitor your flight for delays and adjust pick-up times accordingly, free of charge. Please inform us of significant changes to your flight schedule as soon as possible.
          </li>
        </ol>

        <h2>5. Service and Liability</h2>
        <ol>
          <li>
            <strong>Service Area:</strong> The Company provides airport transportation to and from Liberia International Airport (LIR) and destinations throughout Costa Rica.
          </li>
          <li>
            <strong>Punctuality:</strong> The Company strives to maintain punctual service but is not responsible for delays caused by traffic, road conditions, or unforeseen circumstances.
          </li>
          <li>
            <strong>Passenger Conduct:</strong> Passengers are expected to behave respectfully during the transfer. The driver reserves the right to terminate the trip if passenger behavior endangers the safety of others.
          </li>
          <li>
            <strong>Luggage:</strong> The Company is not responsible for loss or damage to luggage or personal items during the transfer. Please ensure your belongings are secured.
          </li>
          <li>
            <strong>Child Safety:</strong> Toddler and up child seats are available upon request. It is the customer’s responsibility to request them in advance. We do not offer infant car seats.
          </li>
        </ol>

        <h2>6. Insurance</h2>
        <p>The Company is fully insured per Costa Rican transportation regulations. Passengers are advised to have personal travel insurance for additional coverage.</p>

        <h2>7. Privacy Policy</h2>
        <p>Your personal information is collected solely for the purpose of providing transportation services and will not be shared with third parties, except as required by law.</p>

        <h2>8. Force Majeure</h2>
        <p>The Company is not liable for delays or cancellations due to events beyond our control, including but not limited to natural disasters, strikes, or government restrictions.</p>

        <h2>9. Governing Law</h2>
        <p>The laws of Costa Rica govern these terms and conditions. Any disputes arising from these terms will be resolved in accordance with Costa Rican law.</p>

        <h2>10. Acceptance of Terms</h2>
        <p>By booking our services, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.</p>

        <h3>Contact Us</h3>
        <p>
          For further questions, please contact us:  
          <br />
          Email: info@costaricanorthwest  
          <br />
          Phone: +506 8302 2524  
          <br />
          Website: <a href="https://www.costaricanorthwest.com" target="_blank" rel="noopener noreferrer">https://www.costaricanorthwest.com</a>
        </p>
      </div>
    </div>
  );
};

export default TermsAndConditions;
