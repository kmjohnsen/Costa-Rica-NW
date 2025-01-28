export function validateEntries(entries, fields) {
  console.log("entries", entries)
  console.log("fields", fields)
  const capitalizeFirstLetter = (string) => 
    `${string.charAt(0).toUpperCase()}${string.slice(1)}`;

  let missingFieldsMessage = '';
  let hasIncompleteFields = false

  entries.forEach((entry, index) => {
    let entryErrors = [];

    // Check for missing fields in the current entry
    fields.forEach(field => {
      if (!entry[field] || typeof value === 'string') {
        let uppercase_Field = capitalizeFirstLetter(field)
        entryErrors.push(uppercase_Field); // Add missing field to the error list
      }
    });

    // If there are missing fields, add a message for the current entry
    if (entryErrors.length > 0) {
      hasIncompleteFields = true;
      const entryErrorMessage = `Trip ${index + 1}: ${entryErrors.join(', ')} ${entryErrors.length > 1 ? 'fields are' : 'field is'} required.`;
      missingFieldsMessage += `${entryErrorMessage} `;
    }
  });

  // Append final message if there are any missing fields
  if (hasIncompleteFields) {
    missingFieldsMessage += ' Please fill in the missing fields before proceeding.';
  }

  console.log("incomplete fields", hasIncompleteFields)
  console.log("missing fields message", missingFieldsMessage)

  return { hasIncompleteFields, missingFieldsMessage };
}
