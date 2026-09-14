// Structural interface lets the worker run in both Deno and database adapter tests.
interface MonitoringDatabase { rpc(name: string, args: Record<string, unknown>): PromiseLike<{data: any; error: any}>; from(table: string): any }
interface Result { analysisId?: string; totalFeedback?: number; avgSentiment?: number; ratingCount?: number; complaints?: {name: string}[] }
interface Product { id: string; user_id: string; product_name: string; website: string | null; competitors: string | null; sources?: string[]; lease_token: string; last_analysis_id?: string | null }
export function compareMonitoringResults(before: Result, after: Result) {
  const alerts: {alert_type: string; message: string; data: Record<string, unknown>}[] = [];
  if (typeof before.totalFeedback === 'number' && typeof after.totalFeedback === 'number' && before.totalFeedback !== after.totalFeedback) {
    alerts.push({ alert_type: 'volume_change', message: `Collected feedback changed from ${before.totalFeedback} to ${after.totalFeedback}. Source availability and sampling can affect this count.`, data: { before: before.totalFeedback, after: after.totalFeedback } });
  }
  if ((before.ratingCount || 0) > 0 && (after.ratingCount || 0) > 0 && typeof before.avgSentiment === 'number' && typeof after.avgSentiment === 'number' && Math.abs(after.avgSentiment - before.avgSentiment) >= 0.5) {
    alerts.push({ alert_type: 'sentiment_shift', message: `Average collected rating changed from ${before.avgSentiment.toFixed(1)} to ${after.avgSentiment.toFixed(1)}.`, data: { before: before.avgSentiment, after: after.avgSentiment } });
  }
  return alerts;
}

export async function processMonitoringBatch(supabase: MonitoringDatabase, analyze: (product: Product) => Promise<Result>) {
  const { data: products, error } = await supabase.rpc('claim_monitoring_products', { p_batch_size: 2 });
  if (error) throw new Error('Could not claim scheduled monitoring');
  let succeeded = 0; let failed = 0;
  for (const product of (products || []) as Product[]) {
    try {
      let baseline = supabase.from('analyses').select('results').eq('user_id', product.user_id).eq('product_name', product.product_name);
      baseline = product.website === null ? baseline.is('website', null) : baseline.eq('website', product.website);
      baseline = product.competitors === null ? baseline.is('competitors', null) : baseline.eq('competitors', product.competitors);
      if (product.last_analysis_id) baseline = baseline.eq('id', product.last_analysis_id);
      const { data: previous, error: baselineError } = await baseline.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (baselineError) throw new Error('Baseline unavailable');
      const result = await analyze(product);
      if (!result.analysisId) throw new Error('Analysis was not saved');
      const { error: completionError } = await supabase.rpc('complete_monitoring_product', {
        p_product_id: product.id, p_lease_token: product.lease_token, p_analysis_id: result.analysisId,
        p_alerts: previous?.results ? compareMonitoringResults(previous.results, result) : [],
      });
      if (completionError) throw new Error('Could not persist monitor completion');
      succeeded++;
    } catch {
      failed++;
      const { error: failureError } = await supabase.rpc('fail_monitoring_product', {
        p_product_id: product.id, p_lease_token: product.lease_token,
        p_error: 'Monitoring analysis could not complete. Retry is scheduled.',
      });
      if (failureError) throw new Error('Could not persist monitor failure; lease expiry will allow recovery');
    }
  }
  return { processed: succeeded + failed, succeeded, failed };
}
