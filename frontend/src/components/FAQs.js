import React from 'react';
import Navbar from './NavBar'; // Assuming you have a Navbar component

function FAQs() {
  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>FAQs</h1>
        <section>
          <h2>What are your COVID-19 cleaning protocols?</h2>
          <p>
            Our vehicles are thoroughly cleaned and disinfected after each service. Further, drivers and passengers must always wear masks inside our cars. In addition, hand sanitizer is available onboard for all passengers and drivers to use.
          </p>
        </section>
        
        <section>
          <h2>Do you offer early morning and late-night transportation?</h2>
          <p>
            Yes. Our shuttles run 24/7. Therefore, booking early morning or late-night transportation to Liberia Airport is not a problem.
          </p>
        </section>
        
        <section>
          <h2>Can we stop at a grocery store on our way to our destination?</h2>
          <p>
            Yes. Our drivers will be happy to stop at a grocery store for you. There is no extra cost as long as it is on the way to your destination. We can coordinate a stop for you if there are no grocery stores on the way to your destination. But, this will incur an extra charge.
          </p>
        </section>

        <section>
          <h2>How do I modify a reservation?</h2>
          <p>
            You can modify your reservation up to 24 hours before your scheduled arrival in Costa Rica. After that, changes are subject to availability and must be requested via email. We do not charge for modifications unless they involve a change in destination or an increase in passenger count. Last-minute modifications due to flight delays or cancellations are free of charge.
          </p>
        </section>

        <section>
          <h2>What are your Reservation & Cancellation Policies?</h2>
          <ul>
            <li>Our preferred payment method is USD cash, payable directly to your driver.</li>
            <li>While we understand plans can change, we appreciate cancellation notices at least 48 hours in advance, via email. Cancellations are always free.</li>
            <li>Please note that we cannot accept USD bills with significant tears or stains.</li>
          </ul>
        </section>

        <section>
          <h2>Do you provide car seats for children?</h2>
          <p>
            We can provide up to two car seats per shuttle service, available at $10 USD per seat. If possible, we recommend bringing your own car seats, as not all vehicles in our fleet have 3-point seatbelts. Our drivers are happy to assist with installation, but please ensure you’re familiar with your seat model. Costa Rica regulations require only lap belts in rear seats.
          </p>
        </section>

        <section>
          <h2>Can we bring surfboards, golf clubs, or other oversized luggage?</h2>
          <p>
            For oversized or overweight luggage, please let us know in advance so we can prepare the right vehicle for your journey. If you’re bringing surfboards or other large items, advance notice is also appreciated to ensure the smoothest travel experience.
          </p>
        </section>
        
        <section>
          <h2>How many bags can we bring?</h2>
          <p>
            Our shuttles have no strict baggage limit – you’re welcome to bring as much as can comfortably fit in the vehicle. For oversized or overweight luggage, see above.
          </p>
        </section>

        <section>
          <h2>Can I travel with pets?</h2>
          <p>
            Your pets are welcome aboard our airport shuttles, at no additional cost! For everyone’s safety, pets must travel in their carriers, and our drivers are more than happy to accommodate pet-friendly stops along the way.
          </p>
        </section>

        <section>
          <h2>When should I book my Liberia Airport Transportation?</h2>
          <p>
            For peace of mind, we recommend booking your transportation as soon as your flight is confirmed, especially if traveling around the busy holiday season. We can accommodate last-minute bookings up to 6 hours before your arrival, and if you find yourself at the airport without a reservation, give us a call. We’ll do our best to connect you with the closest available driver and vehicle, though availability cannot be guaranteed.
          </p>
        </section>

        <section>
          <h2>Do you offer transportation to the Nicaragua border?</h2>
          <p>
            Yes. LIR Shuttle offers private transfers from Liberia Airport to Peñas Blancas (Nicaragua Border). Rates start at USD 99, and travel time is approximately 1 hour and 40 minutes. When booking this transportation, you must consider that the border closes at midnight.
          </p>
        </section>

        <footer style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p>Thank you for considering LIR Shuttle for your Liberia Airport transportation needs. We look forward to making your journey in Costa Rica smooth, comfortable, and enjoyable.</p>
        </footer>
      </div>
    </div>
  );
}

export default FAQs;
