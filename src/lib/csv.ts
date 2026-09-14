/** Quote CSV cells and prevent spreadsheet formula interpretation of source text. */
export function encodeCSV(rows: string[][]): string {
  return rows.map(row => row.map(value => {
    const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}
