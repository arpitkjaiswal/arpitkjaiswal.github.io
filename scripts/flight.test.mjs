import test from 'node:test';
import assert from 'node:assert/strict';
import { SignalFlight } from '../signal-run.mjs';
import { parseCommand } from '../interaction-core.mjs';

const builds = ['lexa', 'terramind', 'aegisvault'].map(id => ({ id }));

test('flight assist recovers each signal once and can finish the whole route', () => {
  const flight = new SignalFlight(builds);
  flight.launch();
  const recovered = [];
  for (let frame = 0; frame < 360 && flight.status === 'flying'; frame++) {
    flight.assist = true;
    const signal = flight.step(1 / 30, 0, 0);
    if (signal !== null) recovered.push(signal);
  }
  assert.deepEqual(recovered, [0, 1, 2]);
  assert.equal(flight.status, 'complete');
  const elapsed = flight.elapsed;
  assert.equal(flight.step(10, 1, 0), null);
  assert.equal(flight.elapsed, elapsed);
  flight.launch();
  assert.equal(flight.index, 0);
  assert.equal(flight.elapsed, 0);
  assert.equal(flight.charge, 1);
});

test('manual input cancels assist, pause freezes the run, and boost cannot stack', () => {
  const flight = new SignalFlight(builds);
  assert.equal(flight.boost(), false);
  flight.launch();
  flight.assist = true;
  assert.equal(flight.boost(), true);
  assert.equal(flight.boost(), false);
  const start = flight.x;
  flight.step(0.1, -1, 0);
  assert.equal(flight.assist, false);
  assert.ok(flight.x < start);
  const { elapsed, charge, x } = flight;
  flight.status = 'paused';
  assert.equal(flight.step(20, 1, 1), null);
  assert.deepEqual([flight.elapsed, flight.charge, flight.x], [elapsed, charge, x]);
});

test('flight game commands stay inside the existing typed and spoken command boundary', () => {
  const action = { type: 'deck', action: 'flight' };
  assert.deepEqual(parseCommand('play signal run', { requireWakeWord: false }), action);
  assert.deepEqual(parseCommand('Jarvis, play signal run'), action);
  assert.equal(parseCommand('play signal run'), null);
});
