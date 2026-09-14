import { describe, expect, it } from 'vitest';
import { summarizeEvidence } from '../../../supabase/functions/_shared/evidence-analysis';
import { validateAnalyzeInput } from '../../../supabase/functions/_shared/validation';

const now = new Date('2026-09-14T12:00:00Z');
const item = (id: string, text: string, date?: string) => ({ id, product_name: 'Test', source: 'custom', text, source_timestamp: date });

describe('evidence-only product analysis', () => {
  it('refuses to generate a result from no evidence', () => {
    expect(() => summarizeEvidence('Test', [], [], 30, now)).toThrow(/evidence/i);
  });
  it('derives totals and trends only from supplied dated evidence', () => {
    const result = summarizeEvidence('Test', [item('a','Search is fast and easy.','2026-09-10T00:00:00Z'), item('b','Export fails every time.')], [{source:'custom',count:2,status:'success'}], 30, now);
    expect(result.totalFeedback).toBe(2);
    expect(result.sourcesCount).toBe(1);
    expect(result.trendData).toEqual([{month:'2026-09',requests:1}]);
    expect(result.evidence.map(e => e.id)).toEqual(['a','b']);
    expect(result.analysisMode).toBe('evidence');
    expect(result.warnings.join(' ')).toMatch(/date|timestamp/i);
    expect(result.competitors).toEqual([]);
  });
  it('keeps failure status and never counts failed sources as evidence', () => {
    const result=summarizeEvidence('Test',[item('a','Please add export.')],[{source:'custom',count:1,status:'success'},{source:'reddit',count:0,status:'failed',error:'Request timed out'}],30,now);
    expect(result.sourcesCount).toBe(1);
    expect(result.sourceBreakdown?.[1].status).toBe('failed');
    expect(result.featureRequests[0].evidenceIds).toEqual(['a']);
    expect(result.trendData).toEqual([]);
  });
  it('does not invent a rating when no star ratings exist', () => {
    const result=summarizeEvidence('Test',[item('a','Export fails')],[],30,now);
    expect(result.avgSentiment).toBe(0);
    expect(result.ratingCount).toBe(0);
  });
});

describe('analysis boundary validation',()=>{
  it('normalizes omitted sources to public defaults',()=>{
    expect(validateAnalyzeInput({productName:'Test'}).sources?.length).toBeGreaterThan(0);
  });
  it('uses a custom-only source for pasted-only input',()=>{
    expect(validateAnalyzeInput({productName:'Test',customFeedback:'Please improve export.'}).sources).toEqual(['custom']);
  });
  it('rejects a private network website and non-http URL',()=>{
    for(const website of ['http://127.0.0.1','http://localhost','file:///etc/passwd','https://192.168.1.2']) {
      expect(()=>validateAnalyzeInput({productName:'Test',website})).toThrow();
    }
  });
  it('rejects invalid research window and market sources',()=>{
    expect(()=>validateAnalyzeInput({productName:'Test',days:999})).toThrow();
    expect(()=>validateAnalyzeInput({productName:'Test',marketSignalSources:['madeup']})).toThrow();
  });
});
