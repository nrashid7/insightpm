import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarketSignals from '@/components/dashboard/MarketSignals';
it('shows provider failures even when collection returns no signals', () => {
  render(<MarketSignals signals={{ signals: [], predictionMarkets: [], githubVelocity: [], totalSignals: 0, sourceBreakdown: [{ source: 'reddit_top', count: 0, status: 'failed', duration_ms: 20, error: 'HTTP 403' }] }} />);
  expect(screen.getByText('No matching market signals were collected.')).toBeInTheDocument();
  expect(screen.getByText(/Reddit: 0 signals — failed: HTTP 403/)).toBeInTheDocument();
});
