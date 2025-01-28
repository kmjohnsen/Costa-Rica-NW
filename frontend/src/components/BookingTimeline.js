import React from 'react';
import PropTypes from 'prop-types';

const drivers = ['Aaron', 'Carlos']; // Array of driver names
const minutes_in_pixels = 2; // to set size of page

const timeToPosition = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60 + minutes) / minutes_in_pixels; // Convert time to pixel position
};

const getDuration = (duration) => {
  return duration / minutes_in_pixels; // Convert duration to pixel height
};

const BookingTimeline = ({ bookings }) => {
  // Generate time labels from 00:00 to 24:00
  const timeLabels = [];
  for (let i = 0; i <= 24; i++) {
    timeLabels.push(`${i.toString().padStart(2, '0')}:00`);
  }

  return (
    <div className="timeline-container" style={{ display: 'flex' }}>
      {/* Time column */}
      <div className="time-column" style={{ width: '80px', position: 'relative' }}>
        {timeLabels.map((time, index) => (
          <div
            key={index}
            className="time-label"
            style={{
              height: `${60 / minutes_in_pixels}px`, // Each hour block takes 60 minutes
              position: 'relative',
              top: `${index * (60 / minutes_in_pixels)}px`,
            }}
          >
            {time}
          </div>
        ))}
      </div>

      {/* Driver columns */}
      <div className="drivers-columns" style={{ display: 'flex', flexGrow: 1 }}>
        {drivers.map((driver) => (
          <div key={driver} className="driver-column" style={{ flex: 1, position: 'relative', borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
            <h3 style={{ textAlign: 'center' }}>{driver}</h3>
            {/* Filter bookings by driver */}
            {bookings.filter((b) => b.driver === driver).map((booking) => {
              const top = timeToPosition(booking.pickup_time);
              const height = getDuration(booking.duration);

              return (
                <div
                  key={booking.id}
                  className="booking-block"
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundColor: '#87CEEB',
                    padding: '5px',
                    borderRadius: '4px',
                    width: '90%',
                  }}
                >
                  {booking.startcity} → {booking.endcity}
                  <br />
                  {booking.pickup_time} - {booking.duration}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingTimeline;

// Add PropTypes validation
BookingTimeline.propTypes = {
  bookings: PropTypes.arrayOf(PropTypes.shape({
    driver: PropTypes.string.isRequired,
    pickup_time: PropTypes.string.isRequired,
    duration: PropTypes.number.isRequired,
    startcity: PropTypes.string.isRequired,
    endcity: PropTypes.string.isRequired,
  })).isRequired,
};
