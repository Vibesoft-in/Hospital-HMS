/**
 * Converts ASCII table format to HTML table
 * Detects tables by looking for lines with | characters
 * and converts them to proper HTML tables for better PDF rendering
 */
export function parseAsciiTableToHtml(footnote: string): string {
  if (!footnote) return footnote;

  // Split into lines
  const lines = footnote.split('\n');
  let result = '';
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if it's a separator line (dashes and pipes) - strong indicator of ASCII table
    const isSeparatorLine = /^[\s\-|+=]+$/.test(trimmedLine) && trimmedLine.includes('|');
    
    // Check if this line is part of a table (contains | and has table structure)
    // Must have at least 2 pipes and be reasonably structured
    const pipeCount = (trimmedLine.match(/\|/g) || []).length;
    const isTableLine = pipeCount >= 2 && trimmedLine.length > 5;

    if (isSeparatorLine) {
      // Separator line - if we're in a table, skip it; if not, start looking for table
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Skip separator lines, they're just for visual formatting
      continue;
    } else if (isTableLine && inTable) {
      // We're already in a table, add this row
      tableRows.push(line);
    } else if (isTableLine && !inTable) {
      // Might be start of table without separator - check next line
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const nextIsSeparator = /^[\s\-|+=]+$/.test(nextLine) && nextLine.includes('|');
      const nextIsTableLine = (nextLine.match(/\|/g) || []).length >= 2;
      
      if (nextIsSeparator || nextIsTableLine) {
        // Looks like a table is starting
        inTable = true;
        tableRows = [line];
      } else {
        // Just a line with pipes, not a table
        result += line + '\n';
      }
    } else {
      // Not a table line
      if (inTable) {
        // End of table - convert accumulated rows to HTML
        if (tableRows.length > 0) {
          result += convertTableRowsToHtml(tableRows);
        }
        tableRows = [];
        inTable = false;
      }
      // Add non-table line as-is
      result += line + '\n';
    }
  }

  // Handle case where table goes to end of content
  if (inTable && tableRows.length > 0) {
    result += convertTableRowsToHtml(tableRows);
  }

  return result;
}

function convertTableRowsToHtml(rows: string[]): string {
  if (rows.length === 0) return '';

  let html = '<table class="ascii-table" style="border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10px;">\n';
  
  // First row is typically header
  const isFirstRowHeader = rows.length > 1;
  
  rows.forEach((row, index) => {
    const cells = row.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0); // Remove empty cells from start/end

    if (cells.length === 0) return;

    const tag = (index === 0 && isFirstRowHeader) ? 'th' : 'td';
    const style = (index === 0 && isFirstRowHeader) 
      ? 'style="border: 1px solid #333; padding: 4px 8px; background: #f0f0f0; font-weight: bold; text-align: left;"'
      : 'style="border: 1px solid #666; padding: 4px 8px; text-align: left;"';

    html += '  <tr>\n';
    cells.forEach(cell => {
      html += `    <${tag} ${style}>${cell}</${tag}>\n`;
    });
    html += '  </tr>\n';
  });

  html += '</table>\n';
  return html;
}
