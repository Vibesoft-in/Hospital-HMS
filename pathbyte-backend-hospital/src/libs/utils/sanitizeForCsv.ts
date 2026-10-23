/**
 * Sanitize value for CSV/Excel export to prevent formula injection
 * Prefixes values starting with =, +, -, @ with a single quote
 */
export function sanitizeForCsv(value: any): any {
  if (value === null || value === undefined) return value;
  
  const strValue = String(value);
  
  // Check if starts with formula trigger characters
  if (strValue.length > 0 && /^[=+\-@]/.test(strValue)) {
    return `'${strValue}`;
  }
  
  return value;
}
