'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Blend = require('../blend.js');
const nist = require('./fixtures/nist-z.json');

const T20 = 293.15;
const BAR = 1e5;
const close = (a, b, tol) => Math.abs(a - b) <= tol;
// Cold gauge pressure at the end of each step, in the result's fill order
const targets = (r) => Object.fromEntries(Blend.fillSteps(r).map((s) => [s.gas, s.to]));

test('helium Z matches the NIST WebBook within 1 ‰ (0–40 °C, 10–350 bar)', () => {
  for (const [T, rows] of Object.entries(nist.data.He)) {
    for (const [p, zRef] of rows) {
      const z = Blend.Zmix(0, 1, p * BAR, Number(T));
      assert.ok(Math.abs(z / zRef - 1) * 1000 <= 1, `He ${T} K ${p} bar: ${z} vs ${zRef}`);
    }
  }
});

test('without helium the mixture model is exactly the O2/N2 model', () => {
  for (const x of [0, 0.21, 0.32, 1]) {
    for (const p of [1, 50, 200, 350]) assert.equal(Blend.Zmix(x, 0, p * BAR, T20), Blend.Z(x, p * BAR, T20));
  }
});

test('ideal trimix matches the hand calculation (empty -> Tx 18/45 at 220 bar)', () => {
  // He 0.45·220 = 99; air (0.37·220)/0.79 = 103.04; O2 0.18·220 − 0.21·103.04 = 17.96
  const r = Blend.ideal({ curO2: 21, tgtO2: 18, tgtHe: 45, curP: 0, fillP: 220 });
  assert.ok(close(targets(r).he, 99, 1e-9));
  assert.ok(close(targets(r).o2, 116.962, 1e-3));
  assert.ok(close(r.air, 103.038, 1e-3));
  assert.ok(close(r.finalO2, 18, 1e-9) && close(r.finalHe, 45, 1e-9));
});

test('regression: real-gas trimix (20 °C, 12 L)', () => {
  const a = Blend.real({ curO2: 21, tgtO2: 18, tgtHe: 45, curP: 0, fillP: 220, size: 12 }, T20);
  assert.ok(close(targets(a).he, 97.81, 0.02) && close(targets(a).o2, 114.41, 0.02), JSON.stringify(targets(a)));
  const b = Blend.real({ curO2: 18, curHe: 45, tgtO2: 18, tgtHe: 45, curP: 50, fillP: 220, size: 12 }, T20);
  assert.ok(close(targets(b).he, 125.69, 0.02) && close(targets(b).o2, 138.32, 0.02), JSON.stringify(targets(b)));
  for (const r of [a, b]) assert.ok(close(r.finalO2, 18, 0.01) && close(r.finalHe, 45, 0.01));
});

test('the general calculation agrees with the nitrox one when there is no helium', () => {
  for (const curO2 of [21, 32, 40, 100]) {
    for (const tgtO2 of [21, 32, 36, 50, 100]) {
      for (const curP of [0, 50, 150]) {
        for (const fillP of [200, 300]) {
          if (fillP <= curP) continue;
          const v = { curO2, tgtO2, curP, fillP, size: 12 };
          const [i1, i2, r1, r2] = [Blend.idealNitrox(v), Blend.idealMix(v), Blend.realNitrox(v, T20), Blend.realMix(v, T20)];
          for (const k of ['keep', 'o2', 'air', 'finalO2']) {
            assert.ok(close(i1[k], i2[k], 1e-9), `ideal ${k} ${JSON.stringify(v)}`);
            assert.ok(close(r1[k], r2[k], 1e-3), `real ${k} ${JSON.stringify(v)}`);
          }
        }
      }
    }
  }
});

test('too much helium left: bleed down, then no helium is added', () => {
  // Tx 10/70 at 150 bar -> Tx 21/35 at 200 bar: keep 0.35·200/0.70 = 100 bar
  const i = Blend.ideal({ curO2: 10, curHe: 70, tgtO2: 21, tgtHe: 35, curP: 150, fillP: 200 });
  assert.equal(i.drain, 'helium');
  assert.ok(close(i.keep, 100, 1e-9) && i.he === 0);
  const r = Blend.real({ curO2: 10, curHe: 70, tgtO2: 21, tgtHe: 35, curP: 150, fillP: 200, size: 12 }, T20);
  assert.equal(r.drain, 'helium');
  assert.ok(r.keep > 90 && r.keep < 100 && r.he === 0, `keep ${r.keep}`);
  assert.ok(close(r.finalO2, 21, 0.02) && close(r.finalHe, 35, 0.02));
});

test('targets that air cannot reach are reported, not miscalculated', () => {
  // Air brings 0.21/0.79 O2 per N2: Tx 10/50 (40 % N2) would need at least 10.6 % O2
  assert.equal(Blend.ideal({ curO2: 21, tgtO2: 10, tgtHe: 50, curP: 0, fillP: 200 }).unreachable, true);
  assert.equal(Blend.real({ curO2: 21, tgtO2: 10, tgtHe: 50, curP: 0, fillP: 200, size: 12 }, T20).unreachable, true);
  // Tx 10/55 (35 % N2 brings 9.3 % O2) works
  assert.equal(Blend.ideal({ curO2: 21, tgtO2: 10, tgtHe: 55, curP: 0, fillP: 200 }).unreachable, false);
});

test('oxygen first (ideal): the same amounts and final mix, only the gauge targets change', () => {
  // Empty -> Tx 18/45 at 220 bar: O2 to 17.96 bar, helium to 116.96 bar, then air
  const v = { curO2: 21, tgtO2: 18, tgtHe: 45, curP: 0, fillP: 220 };
  const heFirst = Blend.ideal(v);
  const o2First = Blend.ideal({ ...v, order: 'o2' });
  assert.equal(o2First.order, 'o2');
  for (const k of ['keep', 'he', 'o2', 'air', 'finalO2', 'finalHe']) assert.equal(o2First[k], heFirst[k], k);
  assert.ok(close(targets(heFirst).he, 99, 1e-9) && close(targets(heFirst).o2, 116.962, 1e-3));
  assert.ok(close(targets(o2First).o2, 17.962, 1e-3) && close(targets(o2First).he, 116.962, 1e-3));
  assert.deepStrictEqual(Blend.fillSteps(o2First).map((s) => s.gas), ['o2', 'he', 'air']);
});

test('oxygen first (real gas): the same final mix, but other gauge targets', () => {
  for (const [v, o2To, heTo] of [
    [{ curO2: 21, curHe: 0, tgtO2: 18, tgtHe: 45, curP: 0, fillP: 220, size: 12 }, 16.68, 114.42],
    [{ curO2: 18, curHe: 45, tgtO2: 18, tgtHe: 45, curP: 50, fillP: 220, size: 12 }, 62.31, 138.32],
  ]) {
    const heFirst = Blend.real(v, T20);
    const o2First = Blend.real({ ...v, order: 'o2' }, T20);
    // Same gas amounts and final mix
    for (const k of ['keep', 'litersHe', 'litersO2', 'litersAir', 'finalO2', 'finalHe']) {
      assert.ok(close(o2First[k], heFirst[k], 1e-9), `${k} ${JSON.stringify(v)}`);
    }
    const a = targets(heFirst);
    const b = targets(o2First);
    assert.ok(close(b.o2, o2To, 0.02) && close(b.he, heTo, 0.02), JSON.stringify(b));
    // Once helium and O2 are in, the cylinder holds the same gas either way
    assert.ok(close(b.he, a.o2, 0.01));
    // but O2 added at low pressure raises the gauge differently than at high pressure
    assert.ok(Math.abs(o2First.o2 - heFirst.o2) > 0.05 && Math.abs(o2First.he - heFirst.he) > 0.05);
  }
});

test('grid: every trimix result is finite and consistent', () => {
  const mixes = [[21, 0], [32, 0], [21, 35], [18, 45], [15, 55], [10, 70], [25, 25], [50, 0], [100, 0]];
  let checked = 0;
  for (const [curO2, curHe] of mixes) {
    for (const [tgtO2, tgtHe] of mixes) {
      for (const curP of [0, 50, 150]) {
        for (const fillP of [200, 300]) {
          for (const order of ['he', 'o2']) {
            for (const T of [263.15, T20, 318.15]) {
              const v = { curO2, curHe, tgtO2, tgtHe, curP, fillP, size: 12, order };
              for (const r of [Blend.ideal(v), Blend.real(v, T)]) {
                checked++;
                for (const [k, val] of Object.entries(r)) {
                  if (!['drain', 'unreachable', 'order'].includes(k)) assert.ok(Number.isFinite(val), `${k} ${JSON.stringify(v)}`);
                }
                if (r.unreachable) continue;
                assert.ok(r.keep >= -1e-9 && r.keep <= curP + 1e-6, `keep ${JSON.stringify(v)}`);
                assert.ok(r.he >= 0 && r.o2 >= 0 && r.air >= 0, `amounts ${JSON.stringify(v)}`);
                assert.ok(close(r.keep + r.he + r.o2 + r.air, fillP, 0.02), `sum ${JSON.stringify(v)}`);
                if (r.keep > 0.01) {
                  assert.ok(close(r.finalO2, tgtO2, 0.05) && close(r.finalHe, tgtHe, 0.05), `mix ${JSON.stringify(v)}`);
                }
              }
            }
          }
        }
      }
    }
  }
  assert.ok(checked > 3000);
});

test('mixAfterFill reproduces the target when filling to the real-gas targets in either order', () => {
  for (const v of [
    { curO2: 21, curHe: 0, tgtO2: 18, tgtHe: 45, curP: 0, fillP: 220 },
    { curO2: 18, curHe: 45, tgtO2: 15, tgtHe: 55, curP: 60, fillP: 300 },
    { curO2: 21, curHe: 0, tgtO2: 21, tgtHe: 35, curP: 0, fillP: 232 },
  ]) {
    for (const order of ['he', 'o2']) {
      const r = Blend.real({ ...v, size: 12, order }, T20);
      const steps = Blend.fillSteps(r).map((s) => ({ gas: s.gas, to: s.to }));
      const mix = Blend.mixAfterFill({ o2: v.curO2 / 100, he: v.curHe / 100 }, r.keep, steps, T20, 0.012);
      assert.ok(close(mix.o2, v.tgtO2, 0.02) && close(mix.he, v.tgtHe, 0.02), `${order} ${JSON.stringify(v)} -> ${JSON.stringify(mix)}`);
    }
  }
});

test('dive values: MOD, END, minimum depth, density, best mix', () => {
  assert.ok(close(Blend.mod(0.18, 1.4), 67.78, 0.01));
  assert.ok(close(Blend.end(60, 0.18, 0.45, true), 28.5, 1e-9)); // oxygen narcotic
  assert.ok(close(Blend.end(60, 0.18, 0.45, false), 22.78, 0.01)); // nitrogen only
  assert.ok(close(Blend.end(30, 0.21, 0, true), 30, 1e-9) && close(Blend.end(30, 0.21, 0, false), 30, 1e-9));
  assert.equal(Blend.minDepth(0.21), 0);
  assert.ok(close(Blend.minDepth(0.1), 8, 1e-9));
  assert.ok(close(Blend.density(30, 0.21, 0), 4.73, 0.01));
  assert.ok(Blend.density(60, 0.18, 0.45) < Blend.density(60, 0.21, 0));
  assert.deepStrictEqual(Blend.bestMix(60, 1.4, 30, true), { o2: 20, he: 43 });
  assert.deepStrictEqual(Blend.bestMix(60, 1.4, 30, false), { o2: 20, he: 35 });
  assert.deepStrictEqual(Blend.bestMix(30, 1.4, 30, true), { o2: 35, he: 0 }); // no helium needed
});
