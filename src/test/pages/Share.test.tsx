import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let analysisId = 'public-report';
const single = vi.fn();
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useParams: () => ({ analysisId }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ single }) }) }) }) } }));
vi.mock('@/components/dashboard/AnalysisResultsView', () => ({ default: ({ data }: { data: { marker: string } }) => <div>{data.marker}</div> }));
vi.mock('@/components/dashboard/AnalysisProgress', () => ({ default: () => <div>Loading report</div> }));
import Share from '@/pages/Share';

it('removes the previous public report when a subsequent share is unavailable', async () => {
  single.mockResolvedValueOnce({ data: { product_name: 'Example', results: { marker: 'Previous report content' } }, error: null });
  const view = render(<MemoryRouter><Share /></MemoryRouter>);
  await screen.findByText('Previous report content');
  single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
  analysisId = 'private-report';
  view.rerender(<MemoryRouter><Share /></MemoryRouter>);
  await screen.findByText('Analysis Unavailable');
  await waitFor(() => expect(screen.queryByText('Previous report content')).not.toBeInTheDocument());
});
