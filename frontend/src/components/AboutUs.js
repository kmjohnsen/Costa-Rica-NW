import React from 'react';
import Navbar from './NavBar'; // Assuming you have a Navbar component

function AboutUs() {
  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>About Us</h1>
        <section>
          <h2>People love us! We hope you do to.</h2>
          <p>
            Check out our reviews on Tripadvisor:{' '}
            <a 
              href="https://www.tripadvisor.com/Attraction_Review-g309240-d5174763-Reviews-Costa_Rica_Northwest-Liberia_Province_of_Guanacaste.html" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              https://www.tripadvisor.com/
            </a>.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-around' }}>
            <div style={{ flex: '1', maxWidth: '30%', minWidth: '250px', textAlign: 'center' }}>
              <h3>Highly Recommend Aaron And Costa Rica Northwest For Family Travel</h3>
              <p>
                Our family trip to Costa Rica was fantastic, thanks to Aaron from Costa Rica Northwest. From the moment he picked us up at Liberia Airport, we felt safe and welcomed…
                <a
                  href="https://www.tripadvisor.com/Attraction_Review-g309240-d5174763-Reviews-Costa_Rica_Northwest-Liberia_Province_of_Guanacaste.html" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Reviews
                </a>
              </p>
            </div>
            
            <div style={{ flex: '1', maxWidth: '30%', minWidth: '250px', textAlign: 'center' }}>
              <h3>Clean Van And Safe Driver 🙂</h3>
              <p>
                This is our second time in Costa Rica and we booked transportation from Liberia Guanacaste Airport with Costa Rica Northwest. The service was reliable and, most important of all, the…
                <a
                  href="https://www.tripadvisor.com/Attraction_Review-g309240-d5174763-Reviews-Costa_Rica_Northwest-Liberia_Province_of_Guanacaste.html" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Reviews
                </a>
              </p>
            </div>
            
            <div style={{ flex: '1', maxWidth: '30%', minWidth: '250px', textAlign: 'center' }}>
              <h3>Amazing Weekend With The Best Tour Guide, Javier!</h3>
              <p>
                We were a group of 12 girls in Costa Rica, and we are so grateful that we found Javier. He handled our roundtrip airport transportation, all miscellaneous transportation and food…
                <a
                  href="https://www.tripadvisor.com/Attraction_Review-g309240-d5174763-Reviews-Costa_Rica_Northwest-Liberia_Province_of_Guanacaste.html" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Reviews
                </a>
              </p>
            </div>
          </div>

        </section>
        
        <section>
          <h2>Around-the-Clock Airport Transfers</h2>
          <p>
            Our airport shuttle service operates 24 hours a day, seven days a week, ready to meet every flight – whether commercial or private. Early morning and late-night pickups are no issue for us. To book a shuttle, simply fill out our quote request form, and we’ll provide you with a personalized rate based on your details. Need immediate assistance? Feel free to call us at +506 8728-8569.
          </p>
        </section>

        <section>
          <h2>Modifying Reservations</h2>
          <p>
            You can modify your reservation up to 24 hours before your scheduled arrival in Costa Rica. After that, changes are subject to availability and must be requested via email. We don’t charge for modifications unless they involve a change in destination or an increase in passenger count. Last-minute modifications due to flight delays or cancellations are free of charge.
          </p>
        </section>

        <section>
          <h2>Baggage Guidelines</h2>
          <p>
            Our shuttles have no strict baggage limit – you’re welcome to bring as much as can comfortably fit in the vehicle. For oversized or overweight luggage, please let us know in advance so we can prepare the right vehicle for your journey. If you’re bringing surfboards or other large items, advance notice is also appreciated to ensure the smoothest travel experience.
          </p>
        </section>

        <section>
          <h2>Traveling with Pets</h2>
          <p>
            Your pets are welcome aboard our airport shuttles, at no additional cost! For everyone’s safety, pets must travel in their carriers, and our drivers are more than happy to accommodate pet-friendly stops along the way.
          </p>
        </section>

        <section>
          <h2>Booking Your Liberia Airport Transportation</h2>
          <p>
            For peace of mind, we recommend booking your transportation as soon as your flight is confirmed, especially if traveling around the busy holiday season. We can accommodate last-minute bookings up to 6 hours before your arrival, and if you find yourself at the airport without a reservation, give us a call. We’ll do our best to connect you with the closest available driver and vehicle, though availability cannot be guaranteed.
          </p>
        </section>

        <section>
          <h2>Reservation & Cancellation Policies</h2>
          <ul>
            <li>Our preferred payment method is USD cash, payable directly to your driver.</li>
            <li>While we understand plans can change, we appreciate cancellation notices at least 48 hours in advance, via email. Cancellations are always free.</li>
            <li>Please note that we cannot accept USD bills with significant tears or stains.</li>
          </ul>
        </section>

        <section>
          <h2>Car Seats</h2>
          <p>
            We can provide up to two car seats per shuttle service, available at $10 USD per seat. If possible, we recommend bringing your own car seats, as not all vehicles in our fleet have 3-point seatbelts. Our drivers are happy to assist with installation, but please ensure you’re familiar with your seat model. Costa Rica regulations require only lap belts in rear seats.
          </p>
        </section>

        <section>
          <h2>Our Fleet</h2>
          <p>
            Our shuttles are operated in a fleet of modern SUVs, vans, minibuses, and coach buses, each 2021 or newer, and fully air-conditioned for your comfort. Every vehicle is meticulously maintained to exceed international safety standards, ensuring a comfortable and secure journey.
          </p>
        </section>

        <footer style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p>Thank you for considering LIR Shuttle for your Liberia Airport transportation needs. We look forward to making your journey in Costa Rica smooth, comfortable, and enjoyable.</p>
        </footer>
      </div>
    </div>
  );
}

export default AboutUs;
