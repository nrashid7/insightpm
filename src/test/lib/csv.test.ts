import { expect, it } from 'vitest';
import { encodeCSV } from '@/lib/csv';
it('quotes delimiters and neutralizes formulas in exported source text', () => {
  expect(encodeCSV([['A "quote", here', '=HYPERLINK("https://example.com")', ' +1', '3 items']])).toBe('"A ""quote"", here","\'=HYPERLINK(""https://example.com"")","\' +1","3 items"');
});
