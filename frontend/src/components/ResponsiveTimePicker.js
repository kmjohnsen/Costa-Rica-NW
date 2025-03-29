import React from 'react';
import PropTypes from 'prop-types';
import { TextField, useMediaQuery, useTheme } from '@mui/material';
import { LocalizationProvider, DesktopTimePicker, MobileTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import './ResponsiveTimePicker.css';

// function ResponsiveTimePicker({ value, onChange }) {
  function ResponsiveTimePicker({ value, onChange, label }) {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const renderInput = (params) => (
    <TextField
      {...params}
      label={label}
      error={false}
      fullWidth
      sx={{ width: '300px', border: 'none', borderColor: 'var(--bright-white)' }}  // Force width to 300px
    />
  );

  return (
    <div className="responsive-time-picker" >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {isMobile ? (
          <MobileTimePicker
            label={label}
            value={value instanceof Date ? value : null} // Ensure value is Date
            onChange={(newValue) => onChange(newValue || new Date())} // Ensure Date
            renderInput={renderInput}
          />
        ) : (
          <DesktopTimePicker
            label={label}
            value={value instanceof Date ? value : null} // Ensure Date object
            onChange={(newValue) => onChange(newValue || new Date())} // Ensure Date
            renderInput={renderInput}
          />
        )}
      </LocalizationProvider>
    </div>
  );
}

ResponsiveTimePicker.propTypes = {
  value: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]).isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

export default ResponsiveTimePicker;
