export function validateEntries(entries, passengers, fields) {
  const capitalizeFirstLetter = (string) => 
    `${string.charAt(0).toUpperCase()}${string.slice(1)}`;

  let missingFieldsMessage = '';
  let hasIncompleteFields = false;

  entries.forEach((entry, index) => {
    let entryErrors = []; // Reset for each entry

    // Check for missing fields in the current entry
    fields.forEach(field => {
      const fieldValue = entry[field];

      // Ensure the field is checked properly
      if (fieldValue === undefined || fieldValue === null || (typeof fieldValue === "string" && fieldValue.trim() === "")) {
        let uppercaseField = capitalizeFirstLetter(field);
        entryErrors.push(uppercaseField);
      }
    });

    // If there are missing fields, add a message for the current entry
    if (entryErrors.length > 0) {
      hasIncompleteFields = true;
      const entryErrorMessage = `Trip ${index + 1}: ${entryErrors.join(', ')} ${entryErrors.length > 1 ? 'fields are' : 'field is'} required.`;
      missingFieldsMessage += `${entryErrorMessage} `;
    }
  });

  // Check if passengers is missing
  if (!passengers || (typeof passengers === "string" && passengers.trim() === "")) {
    hasIncompleteFields = true;
    missingFieldsMessage += "Passengers field is required. ";
  }

  // Append final message if there are any missing fields
  if (hasIncompleteFields) {
    missingFieldsMessage += "Please fill in the missing fields before proceeding.";
  }

  console.log("incomplete fields:", hasIncompleteFields);
  console.log("missing fields message:", missingFieldsMessage);

  return { hasIncompleteFields, missingFieldsMessage };
}
