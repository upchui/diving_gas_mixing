'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Blend = require('../blend.js');
const idealFixture = require('./fixtures/ideal-v1.json');
const nist = require('./fixtures/nist-z.json');

const T20 = 293.15;
const BAR = 1e5;
const o2Target = (r) => r.keep + r.o2;

test('Z is about 1 at 1 bar for O2, N2 and air', () => {
  for (const x of [1, 0, 0.21]) {
    const z = Blend.Z(x, 1 * BAR, T20);
    assert.ok(Math.abs(z - 1) < 0.002, `x=${x}: Z=${z}`);
  }
});

test('Z of pure O2 and N2 matches the NIST WebBook within a few per mille', () => {
  // Limits: N2 <= 5 ‰, O2 <= 10 ‰ overall, both <= 5 ‰ at 200 and 300 bar
  for (const [gas, x] of [['O2', 1], ['N2', 0]]) {
    for (const [T, rows] of Object.entries(nist.data[gas])) {
      for (const [p, zRef] of rows) {
        const z = Blend.Z(x, p * BAR, Number(T));
        const err = Math.abs(z / zRef - 1) * 1000;
        const limit = p === 200 || p === 300 ? 5 : gas === 'N2' ? 5 : 10;
        assert.ok(err <= limit, `${gas} ${T} K ${p} bar: Z=${z.toFixed(5)} NIST=${zRef} (${err.toFixed(1)} ‰)`);
      }
    }
  }
});

test('plausibility at 20 °C: air is harder, O2 easier to compress than ideal', () => {
  assert.ok(Blend.Z(0.21, 300 * BAR, T20) > 1.05);
  assert.ok(Blend.Z(1, 200 * BAR, T20) < 0.95);
});

test('pressure(moles(P)) round-trips within 0.01 bar', () => {
  const V = 0.012;
  for (const T of [263.15, T20, 318.15]) {
    for (const x of [0.21, 0.32, 1]) {
      for (const p of [0, 10, 50, 100, 200, 300, 350]) {
        const back = Blend.pressure(Blend.moles(x, p, T, V), x, T, V);
        assert.ok(Math.abs(back - p) < 0.01, `T=${T} x=${x} p=${p}: ${back}`);
      }
    }
  }
});

test('low pressures (<= 20 bar): real gas barely differs from the ideal model', () => {
  // Same balance with Z = 1 (amount proportional to absolute pressure)
  const idealAbs = ({ curO2, tgtO2, curP, fillP }) => {
    const atm = Blend.ATM;
    const n0 = curP + atm;
    const nf = fillP + atm;
    const nAir = ((curO2 / 100) * n0 + nf - n0 - (tgtO2 / 100) * nf) / 0.79;
    return curP + (nf - n0 - nAir);
  };
  const cases = [
    { curO2: 21, tgtO2: 32, curP: 0, fillP: 15 },
    { curO2: 21, tgtO2: 36, curP: 5, fillP: 20 },
    { curO2: 32, tgtO2: 40, curP: 10, fillP: 20 },
    { curO2: 21, tgtO2: 50, curP: 0, fillP: 20 },
  ];
  for (const v of cases) {
    const real = o2Target(Blend.real({ ...v, size: 12 }, T20));
    assert.ok(Math.abs(real - idealAbs(v)) < 0.1, `${JSON.stringify(v)}: ${real} vs ${idealAbs(v)}`);
    // The old method uses gauge pressures and ignores the 1 atm already in the cylinder;
    // apart from that offset the results agree
    const atmOffset = (Blend.ATM * (v.tgtO2 - v.curO2)) / 100 / 0.79;
    const old = o2Target(Blend.ideal(v));
    assert.ok(Math.abs(real - old - atmOffset) < 0.1, `${JSON.stringify(v)}: ${real} vs ${old} + ${atmOffset}`);
  }
});

test('switch off: ideal() is identical to the previous version', () => {
  assert.ok(idealFixture.cases.length > 100);
  for (const { input, output } of idealFixture.cases) {
    assert.deepStrictEqual(Blend.ideal(input), output, JSON.stringify(input));
  }
});

test('regression: empty cylinder to EAN32 at 232 bar (20 °C, 12 L)', () => {
  const r = Blend.real({ curO2: 21, tgtO2: 32, curP: 0, fillP: 232, size: 12 }, T20);
  assert.equal(r.drain, null);
  assert.ok(Math.abs(o2Target(r) - 30.36) < 0.02, `O2 to ${o2Target(r)}`); // ideal: 32.30 bar
  assert.ok(Math.abs(r.litersO2 - 362.7) < 1, `O2 ${r.litersO2} L`);
  assert.ok(Math.abs(r.litersAir - 2230.3) < 1, `air ${r.litersAir} L`);
  assert.ok(Math.abs(r.finalO2 - 32) < 0.01);
});

test('regression: EAN32 at 50 bar to EAN36 at 232 bar (20 °C, 12 L)', () => {
  const r = Blend.real({ curO2: 32, tgtO2: 36, curP: 50, fillP: 232, size: 12 }, T20);
  assert.equal(r.drain, null);
  assert.ok(Math.abs(o2Target(r) - 83.45) < 0.02, `O2 to ${o2Target(r)}`); // ideal: 87.09 bar
  assert.ok(Math.abs(r.litersO2 - 412.8) < 1, `O2 ${r.litersO2} L`);
  assert.ok(Math.abs(r.litersAir - 1600.0) < 1, `air ${r.litersAir} L`);
  assert.ok(Math.abs(r.finalO2 - 36) < 0.01);
});

test('unreachable targets give a bleed-down hint instead of NaN', () => {
  const lean = Blend.real({ curO2: 40, tgtO2: 32, curP: 150, fillP: 200, size: 12 }, T20);
  assert.equal(lean.drain, 'lean');
  assert.ok(lean.keep > 100 && lean.keep < 120, `keep ${lean.keep}`);
  assert.equal(lean.o2, 0);
  assert.ok(Math.abs(lean.finalO2 - 32) < 0.01);

  const rich = Blend.real({ curO2: 21, tgtO2: 40, curP: 180, fillP: 200, size: 12 }, T20);
  assert.equal(rich.drain, 'rich');
  assert.ok(rich.keep > 140 && rich.keep < 160, `keep ${rich.keep}`);
  assert.equal(rich.air, 0);
  assert.ok(Math.abs(rich.finalO2 - 40) < 0.01);

  // 100 % O2 cannot be reached: 1 atm of air stays in the cylinder
  const pure = Blend.real({ curO2: 21, tgtO2: 100, curP: 50, fillP: 200, size: 12 }, T20);
  assert.equal(pure.drain, 'rich');
  assert.equal(pure.keep, 0);
  assert.ok(pure.finalO2 > 99 && pure.finalO2 < 100);

  // Grid of edge inputs: every number stays finite
  for (const curO2 of [21, 32, 40, 100]) {
    for (const tgtO2 of [21, 32, 50, 100]) {
      for (const curP of [0, 1, 150, 349]) {
        for (const fillP of [200, 350]) {
          if (fillP <= curP) continue;
          const r = Blend.real({ curO2, tgtO2, curP, fillP, size: 12 }, T20);
          for (const [k, val] of Object.entries(r)) {
            if (k !== 'drain') assert.ok(Number.isFinite(val), `${k} for ${curO2}/${tgtO2}/${curP}/${fillP}: ${val}`);
          }
        }
      }
    }
  }
});

test('mixAfter() reproduces the target mix when filling to the real-gas targets', () => {
  for (const v of [
    { curO2: 21, tgtO2: 32, curP: 50, fillP: 232 },
    { curO2: 32, tgtO2: 36, curP: 50, fillP: 300 },
    { curO2: 21, tgtO2: 40, curP: 0, fillP: 350 },
  ]) {
    const r = Blend.real({ ...v, size: 12 }, T20);
    const mix = Blend.mixAfter(v.curO2 / 100, r.keep, o2Target(r), v.fillP, T20, 0.012);
    assert.ok(Math.abs(mix - v.tgtO2) < 0.01, `${JSON.stringify(v)}: ${mix}`);
  }
});
