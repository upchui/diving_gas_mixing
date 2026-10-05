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

test('helium heats up more than air when filled the same way', () => {
  const fill = (gas) => Thermo.simulateFill({
    liters: 12, material: 'carbon', tAmbC: 20, rate: 10, keep: 0, f1: 0.21,
    stages: [{ gas, stopAt: 'gas', value: 99 }],
  });
  const he = fill('he');
  const air = fill('air');
  assert.ok(he.tMaxC > air.tMaxC + 2, `He ${he.tMaxC} °C, air ${air.tMaxC} °C`);
  assert.ok(he.events[0].p > air.events[0].p, 'the warm gauge reads higher after the helium fill');
  assert.ok(close(he.heFraction, 1, 1e-9) && close(air.heFraction, 0, 1e-9));
});

test('trimix fill: helium, O2 and top-up gas end at the target amounts and mix', () => {
  // Empty cylinder to Tx 18/45 at 220 bar, ideal amounts: He to 99, O2 to 116.96, air to 220
  const s = Thermo.simulateFill({
    liters: 12, material: 'steel', tAmbC: 20, rate: 10, keep: 0, f1: 0.21, h1: 0,
    stages: [
      { gas: 'he', stopAt: 'gas', value: 99 },
      { gas: 'o2', stopAt: 'gas', value: 116.962 },
      { gas: 'air', stopAt: 'gas', value: 220 },
    ],
  });
  assert.deepStrictEqual(s.events.map((e) => e.type), ['he', 'o2', 'air']);
  assert.ok(close(s.pc, 220, 1e-6));
  assert.ok(close(s.o2Fraction, 0.18, 1e-4) && close(s.heFraction, 0.45, 1e-4), `${s.o2Fraction} / ${s.heFraction}`);
});

test('oxygen first: the stages run in the given order and end at the same mix', () => {
  // Same amounts as above, O2 first: O2 to 17.96, helium to 116.96, air to 220
  const run = (stages) => Thermo.simulateFill({ liters: 12, material: 'steel', tAmbC: 20, rate: 10, keep: 0, f1: 0.21, h1: 0, stages });
  const heFirst = run([
    { gas: 'he', stopAt: 'gas', value: 99 },
    { gas: 'o2', stopAt: 'gas', value: 116.962 },
    { gas: 'air', stopAt: 'gas', value: 220 },
  ]);
  const o2First = run([
    { gas: 'o2', stopAt: 'gas', value: 17.962 },
    { gas: 'he', stopAt: 'gas', value: 116.962 },
    { gas: 'air', stopAt: 'gas', value: 220 },
  ]);
  assert.deepStrictEqual(o2First.events.map((e) => e.type), ['o2', 'he', 'air']);
  assert.ok(close(o2First.pc, heFirst.pc, 1e-9));
  assert.ok(close(o2First.o2Fraction, heFirst.o2Fraction, 1e-9) && close(o2First.heFraction, heFirst.heFraction, 1e-9));
});
