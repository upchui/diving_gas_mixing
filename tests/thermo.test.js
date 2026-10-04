'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Thermo = require('../thermo.js');

// 12 L cylinder with 50 bar of air, EAN32 at 220 bar (cold O2 target from the ideal method)
const TARGET = 220;
const O2_TO = 50 + (TARGET * (0.32 - 0.21)) / 0.79;
const base = (material) => ({ liters: 12, material, tAmbC: 20, rate: 10, keep: 50, f1: 0.21 });
const o2Stage = { gas: 'o2', stopAt: 'gas', value: O2_TO };
const close = (a, b, tol) => Math.abs(a - b) <= tol;

for (const material of ['steel', 'carbon']) {
  test(`${material}: air to the target, cool 30 min, top up to exactly the target when cold`, () => {
    const single = Thermo.simulateFill({ ...base(material), stages: [o2Stage, { gas: 'air', stopAt: 'gas', value: TARGET }] });
    const twoStep = Thermo.simulateFill({
      ...base(material),
      stages: [
        o2Stage,
        { gas: 'air', stopAt: 'gauge', value: TARGET, pauseAfter: true, pauseMinutes: 30 },
        { gas: 'air', id: 'topUp', stopAt: 'gas', value: TARGET },
      ],
    });
    const air = twoStep.events.find((e) => e.type === 'air');
    const pause = twoStep.events.find((e) => e.type === 'pause' && e.stage === 'air');
    const topUp = twoStep.events.find((e) => e.type === 'topUp');

    assert.ok(close(air.p, TARGET, 0.05), `first fill ends at ${air.p}`);
    assert.equal(pause.t - air.t, 30 * 60);
    assert.ok(pause.p < TARGET, `after the pause: ${pause.p}`);
    assert.ok(close(twoStep.pc, TARGET, 0.01), `cold end pressure ${twoStep.pc}`);
    assert.ok(topUp.p > TARGET && topUp.p < single.fillEnd.p, `top-up to ${topUp.p}, single fill to ${single.fillEnd.p}`);
  });
}

test('without correction (topping up to the target on the warm gauge) the cylinder ends low', () => {
  const naive = Thermo.simulateFill({
    ...base('steel'),
    stages: [
      { gas: 'o2', stopAt: 'gauge', value: O2_TO },
      { gas: 'air', stopAt: 'gauge', value: TARGET, pauseAfter: true, pauseMinutes: 30 },
      { gas: 'air', id: 'topUp', stopAt: 'gauge', value: TARGET },
    ],
  });
  assert.ok(naive.pc < TARGET - 1, `cold end pressure ${naive.pc}`);
});

test('a pause without pauseMinutes behaves as before (until within 2 K, max 45 min)', () => {
  // Reference values from the version before pauseMinutes existed
  const s = Thermo.simulateFill({
    ...base('steel'),
    stages: [
      { gas: 'o2', stopAt: 'gas', value: 77.85, pauseAfter: true },
      { gas: 'air', stopAt: 'gas', value: 200 },
    ],
  });
  const expected = [
    { type: 'o2', t: 168, p: 79.725334 },
    { type: 'pause', t: 1597, p: 78.381056 },
    { type: 'air', t: 2330, p: 211.950008 },
  ];
  assert.equal(s.events.length, expected.length);
  s.events.forEach((e, i) => {
    assert.equal(e.type, expected[i].type);
    assert.equal(e.t, expected[i].t);
    assert.ok(close(e.p, expected[i].p, 1e-5), `${e.type}: ${e.p}`);
  });
  assert.equal(s.events[1].stage, 'o2');
  assert.ok(close(s.tMaxC, 37.515725, 1e-5));
  assert.equal(s.settled.t, 9893);
});
