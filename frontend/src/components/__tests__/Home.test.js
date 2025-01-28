import { isAutoBooking, isDateValid, isLargeGroup } from '../Home.js'; // Adjust the import based on your file structure

describe('Request Type Determination', () => {
  let requestType;
  const validPhone = true; // Change based on your test case
  
  const watchEntries = {
    passenger: '',
    date: ''
  };

  beforeEach(() => {
    requestType = 'Unknown'; // Initialize requestType before each test
  });

  test('should set requestType to "Auto" if isAutoBooking returns false', () => {
    jest.spyOn(global, 'isAutoBooking').mockReturnValue(false);
    jest.spyOn(global, 'isDateValid').mockReturnValue(true);
    jest.spyOn(global, 'isLargeGroup').mockReturnValue(false);

    // Set up inputs
    watchEntries.passenger = '2'; // or however you want to configure this
    watchEntries.date = '2024-11-01'; // Use a valid date for the test

    if (!isAutoBooking(watchEntries.passenger, watchEntries.date, validPhone)) {
      requestType = 'Auto';
    }

    expect(requestType).toBe('Auto');

    // Clean up mocks
    jest.restoreAllMocks();
  });

  test('should set requestType to "Upcoming" if isDateValid returns false', () => {
    jest.spyOn(global, 'isAutoBooking').mockReturnValue(true);
    jest.spyOn(global, 'isDateValid').mockReturnValue(false);
    jest.spyOn(global, 'isLargeGroup').mockReturnValue(false);

    // Set up inputs
    watchEntries.passenger = '2';
    watchEntries.date = '2024-11-01';

    if (!isAutoBooking(watchEntries.passenger, watchEntries.date, validPhone)) {
      requestType = 'Auto';
    } else if (!isDateValid(watchEntries.date)) {
      requestType = 'Upcoming';
    }

    expect(requestType).toBe('Upcoming');

    // Clean up mocks
    jest.restoreAllMocks();
  });

  test('should set requestType to "Large Group" if isLargeGroup returns true', () => {
    jest.spyOn(global, 'isAutoBooking').mockReturnValue(true);
    jest.spyOn(global, 'isDateValid').mockReturnValue(true);
    jest.spyOn(global, 'isLargeGroup').mockReturnValue(true);

    // Set up inputs
    watchEntries.passenger = '10+';
    watchEntries.date = '2024-11-01';

    if (!isAutoBooking(watchEntries.passenger, watchEntries.date, validPhone)) {
      requestType = 'Auto';
    } else if (!isDateValid(watchEntries.date)) {
      requestType = 'Upcoming';
    } else if (isLargeGroup(watchEntries.passenger)) {
      requestType = 'Large Group';
    }

    expect(requestType).toBe('Large Group');

    // Clean up mocks
    jest.restoreAllMocks();
  });

  test('should set requestType to "Invalid Phone" if validPhone is false', () => {
    jest.spyOn(global, 'isAutoBooking').mockReturnValue(true);
    jest.spyOn(global, 'isDateValid').mockReturnValue(true);
    jest.spyOn(global, 'isLargeGroup').mockReturnValue(false);

    // Set up inputs
    watchEntries.passenger = '2';
    watchEntries.date = '2024-11-01';
    
    validPhone = false; // Simulate an invalid phone

    if (!isAutoBooking(watchEntries.passenger, watchEntries.date, validPhone)) {
      requestType = 'Auto';
    } else if (!isDateValid(watchEntries.date)) {
      requestType = 'Upcoming';
    } else if (isLargeGroup(watchEntries.passenger)) {
      requestType = 'Large Group';
    } else if (!validPhone) {
      requestType = 'Invalid Phone';
    }

    expect(requestType).toBe('Invalid Phone');

    // Clean up mocks
    jest.restoreAllMocks();
  });

  test('should set requestType to "Unknown" if none of the conditions are met', () => {
    jest.spyOn(global, 'isAutoBooking').mockReturnValue(true);
    jest.spyOn(global, 'isDateValid').mockReturnValue(true);
    jest.spyOn(global, 'isLargeGroup').mockReturnValue(false);

    // Set up inputs
    watchEntries.passenger = '2';
    watchEntries.date = '2024-11-01';

    if (!isAutoBooking(watchEntries.passenger, watchEntries.date, validPhone)) {
      requestType = 'Auto';
    } else if (!isDateValid(watchEntries.date)) {
      requestType = 'Upcoming';
    } else if (isLargeGroup(watchEntries.passenger)) {
      requestType = 'Large Group';
    } else if (!validPhone) {
      requestType = 'Invalid Phone';
    } else {
      requestType = 'Unknown';
    }

    expect(requestType).toBe('Unknown');

    // Clean up mocks
    jest.restoreAllMocks();
  });
});
