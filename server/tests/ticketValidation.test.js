import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTicket, RESULT } from '../src/services/ticketValidation.js';

const now = new Date('2026-01-01T10:00:00Z');
const tripId = '65a000000000000000000001';
const ticket = {
  ticketId: 'BB-TEST-1',
  trip: tripId,
  status: 'BOOKED',
};
const payload = {
  ticketId: 'BB-TEST-1',
  trip: 'unused',
  tripId,
  exp: Math.floor(now.getTime() / 1000) + 3600,
};

const evaluate = (overrides = {}) =>
  evaluateTicket({
    payload,
    ticket,
    trip: { status: 'scheduled' },
    selectedTripId: tripId,
    now,
    ...overrides,
  });

test('valid ticket passes', () => {
  assert.equal(evaluate().result, RESULT.VALID);
});

test('broken/missing token is invalid', () => {
  assert.equal(evaluate({ payload: null }).result, RESULT.INVALID);
  assert.equal(evaluate({ payload: { ...payload, ticketId: null } }).result, RESULT.INVALID);
});

test('cancelled ticket is invalid', () => {
  assert.equal(evaluate({ ticket: { ...ticket, status: 'CANCELLED' } }).result, RESULT.INVALID);
});

test('expired token is expired', () => {
  assert.equal(
    evaluate({ payload: { ...payload, exp: Math.floor(now.getTime() / 1000) - 1 } }).result,
    RESULT.EXPIRED,
  );
});

test('ticket from another trip is wrong bus', () => {
  assert.equal(evaluate({ selectedTripId: '65a000000000000000000099' }).result, RESULT.WRONG_BUS);
});

test('already used ticket is detected', () => {
  assert.equal(evaluate({ ticket: { ...ticket, status: 'USED' } }).result, RESULT.ALREADY_USED);
});
