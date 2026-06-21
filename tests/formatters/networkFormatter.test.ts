/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  getFormattedHeaderEntries,
  getShortDescriptionForRequestAsync,
  headersContainSensitiveValues,
} from '../../src/formatters/networkFormatter.js';
import type {HTTPRequest} from '../../src/third_party/index.js';

test('redacts sensitive inline header values', () => {
  const lines = getFormattedHeaderEntries([
    {name: 'Accept', value: 'application/json'},
    {name: 'Cookie', value: 'sid=abc; theme=light'},
    {name: 'Authorization', value: 'Bearer abc.def'},
    {name: 'X-CSRF-Token', value: 'secret'},
  ]);

  assert.deepEqual(lines, [
    '- Accept:application/json',
    '- Cookie:<redacted cookie header; names: sid, theme; 20 chars>',
    '- Authorization:<redacted authorization; scheme: Bearer; 14 chars>',
    '- X-CSRF-Token:<redacted sensitive header; 6 chars>',
  ]);
});

test('keeps exact header values when redaction is disabled', () => {
  const lines = getFormattedHeaderEntries(
    [{name: 'Authorization', value: 'Bearer abc.def'}],
    {redactSensitiveValues: false},
  );

  assert.deepEqual(lines, ['- Authorization:Bearer abc.def']);
});

test('does not treat Set-Cookie as a redacted generic header', () => {
  assert.equal(
    headersContainSensitiveValues([{name: 'Set-Cookie', value: 'sid=abc'}]),
    false,
  );
});

test('formats pending request list entries without waiting for a response', async () => {
  const request = {
    failure: () => null,
    method: () => 'POST',
    resourceType: () => 'xhr',
    response: () => {
      throw new Error('response() should not be called for pending requests');
    },
    timing: () => ({
      startTime: -1,
      domainLookupStart: -1,
      domainLookupEnd: -1,
      connectStart: -1,
      secureConnectionStart: -1,
      connectEnd: -1,
      requestStart: -1,
      responseStart: -1,
      responseEnd: -1,
    }),
    url: () => 'https://example.test/api',
  } as unknown as HTTPRequest;

  assert.equal(
    await getShortDescriptionForRequestAsync(request, 7, false, true),
    'reqid=7 [time unavailable, pending] [xhr] POST https://example.test/api [pending]',
  );
});
