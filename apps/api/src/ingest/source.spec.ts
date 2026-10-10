import { normalizeSource } from './source';

const base = {
  unique_key: '000123',
  created_date: '2025-01-18T10:00:00.000',
  complaint_type: 'HEAT/HOT WATER',
  agency: 'HPD',
  borough: 'BRONX',
};

describe('source normalization', () => {
  it('preserves an ID as text and updates closure fields on replay', () => {
    const open = normalizeSource({ ...base, status: 'Open' });
    const closed = normalizeSource({ ...base, status: 'Closed', closed_date: '2025-01-19T11:00:00.000' });
    expect(open.id).toBe('000123');
    expect(closed.id).toBe('000123');
    expect('data' in open && open.data.status_normalized).toBe('open');
    expect('data' in closed && closed.data.status_normalized).toBe('closed');
    expect('data' in closed && closed.data.closed_at_local).toBe('2025-01-19 11:00:00');
  });
  it('flags negative duration and unknown status without silently closing it', () => {
    const result = normalizeSource({
      ...base, status: 'Unspecified', closed_date: '2025-01-17T09:00:00.000',
    });
    expect('data' in result && result.data.status_normalized).toBe('unknown');
    expect('data' in result && result.data.quality_flags).toEqual(expect.arrayContaining(['negative_duration', 'unknown_status']));
  });
  it('quarantines missing creation time', () => {
    expect(normalizeSource({ ...base, created_date: undefined })).toEqual({
      id: '000123', reason: 'missing_or_invalid_created_date',
    });
  });
});
