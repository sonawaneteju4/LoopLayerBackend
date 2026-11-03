import test from 'node:test';
import assert from 'node:assert/strict';

test('Request ID Utility - Sequential formatting pattern validation', () => {
  const formatRequestId = (year, seq) => {
    const padded = String(seq).padStart(6, '0');
    return `LLD-${year}-${padded}`;
  };

  assert.equal(formatRequestId(2026, 1), 'LLD-2026-000001');
  assert.equal(formatRequestId(2026, 2), 'LLD-2026-000002');
  assert.equal(formatRequestId(2026, 99), 'LLD-2026-000099');
  assert.equal(formatRequestId(2026, 1000), 'LLD-2026-001000');
  assert.equal(formatRequestId(2027, 1), 'LLD-2027-000001');

  // Verify pattern matches regex
  const regex = /^LLD-\d{4}-\d{6}$/;
  assert.ok(regex.test(formatRequestId(2026, 42)));
});

