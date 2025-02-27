// FleetCarousel.js
import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css"; // Import carousel styles

const FleetCarousel = () => {
  return (
    <Carousel
      showArrows={true}
      infiniteLoop={true}
      autoPlay={true}
      showThumbs={false}
      emulateTouch={true}
      dynamicHeight={false}
    >
      <div>
        <img src="/all_photos/exterior.jpg" alt="State-of-the-art Minibus" />
        <p className="legend">State-of-the-art Minibus</p>
      </div>
      <div>
        <img src="/all_photos/exterior2.jpg" alt="State-of-the-art Minibus" />
        <p className="legend">State-of-the-art Minibus</p>
      </div>
      <div>
        <img src="/all_photos/interior.jpg" alt="State-of-the-art Minibus" />
        <p className="legend">Minibus Interior</p>
      </div>
      <div>
        <img src="/all_photos/interior2.jpg" alt="State-of-the-art Minibus" />
        <p className="legend">Minibus Interior</p>
      </div>
    </Carousel>
  );
};

export default FleetCarousel;
