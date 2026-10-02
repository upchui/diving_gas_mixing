/*
 * Blending maths for partial pressure nitrox top-ups (pure O2 first, then air).
 *
 * ideal(): classic partial pressure method, gas amount proportional to gauge pressure.
 * real():  the same balance in moles, with the compressibility factor Z of the
 *          O2/N2 mixture from the Peng–Robinson equation of state (kij = 0) plus a
 *          constant volume shift per component (Péneloux) fitted to NIST data.
 *
 * Pressures passed in and returned are gauge pressures in bar; Z() itself takes
 * the absolute pressure in Pa. Air is 21 % O2 / 79 % N2 (argon ignored).
 */
(function (root) {
  'use strict';

  const AIR_O2 = 0.21;
  const R = 8.314; // J/(mol·K)
  const ATM = 1.01325; // bar, gauge -> absolute
  const FREE_GAS_T = 288.15; // K, reference for free gas volumes (15 °C)
  const FREE_GAS_P = 101325; // Pa

  // Critical data, acentric factor and volume shift c [m³/mol]. The shifts were
  // fitted to NIST WebBook densities at 20 °C, 10–350 bar; plain Peng–Robinson
  // underestimates Z there by 2–5 %, with the shift it stays within ~1 %.
  const GASES = {
    O2: { Tc: 154.58, Pc: 50.43e5, omega: 0.022, shift: -2.52e-6 },
    N2: { Tc: 126.2, Pc: 33.98e5, omega: 0.037, shift: -3.88e-6 },
  };

  // ---------- Ideal partial pressure method ----------

  // Round tiny negatives (floating point noise) to zero
  const clean = (n) => (Math.abs(n) < 1e-9 ? 0 : n);

  /**
   * Partial pressure top-up with pure O2 then air.
   * Returns pressures in bar; `keep` is the pressure to bleed down to before filling.
   */
  function ideal({ curO2, tgtO2, curP, fillP }) {
    const f1 = curO2 / 100;
    const f2 = tgtO2 / 100;
    let keep = curP;
    let drain = null;

    let o2 = (fillP * (f2 - AIR_O2) - keep * (f1 - AIR_O2)) / (1 - AIR_O2);
    let air = fillP - keep - o2;

    if (o2 < -1e-9) {
      // Too much O2 in residual gas: bleed so that air alone reaches target
      keep = (fillP * (f2 - AIR_O2)) / (f1 - AIR_O2);
      o2 = 0;
      air = fillP - keep;
      drain = 'lean';
    } else if (air < -1e-9) {
      // Too much N2 in residual gas: bleed so that pure O2 alone reaches target
      keep = (fillP * (1 - f2)) / (1 - f1);
      o2 = fillP - keep;
      air = 0;
      drain = 'rich';
    }

    keep = Math.max(0, clean(keep));
    o2 = Math.max(0, clean(o2));
    air = Math.max(0, clean(air));

    const finalO2 = ((keep * f1 + o2 + air * AIR_O2) / fillP) * 100;
    return { keep, o2, air, drain, finalO2 };
  }

  // ---------- Real gas: Peng–Robinson ----------

  function pureParams(g, T) {
    const kappa = 0.37464 + 1.54226 * g.omega - 0.26992 * g.omega * g.omega;
    const alpha = (1 + kappa * (1 - Math.sqrt(T / g.Tc))) ** 2;
    return {
      a: ((0.45724 * R * R * g.Tc * g.Tc) / g.Pc) * alpha,
      b: (0.0778 * R * g.Tc) / g.Pc,
    };
  }

  // Largest real root of z³ + c2·z² + c1·z + c0 = 0 (analytic, then Newton-polished)
  function largestRoot(c2, c1, c0) {
    const q = (c2 * c2 - 3 * c1) / 9;
    const r = (2 * c2 ** 3 - 9 * c2 * c1 + 27 * c0) / 54;
    let z;
    if (r * r < q ** 3) {
      // Three real roots: -2·√q·cos((θ + 2πk)/3) - c2/3; the largest one is k = 1
      const theta = Math.acos(r / Math.sqrt(q ** 3));
      z = -2 * Math.sqrt(q) * Math.cos((theta + 2 * Math.PI) / 3) - c2 / 3;
    } else {
      const s = -Math.sign(r) * Math.cbrt(Math.abs(r) + Math.sqrt(r * r - q ** 3));
      z = s + (s !== 0 ? q / s : 0) - c2 / 3;
    }
    for (let i = 0; i < 3; i++) {
      const d = (3 * z + 2 * c2) * z + c1;
      if (d === 0) break;
      z -= (((z + c2) * z + c1) * z + c0) / d;
    }
    return z;
  }

  /**
   * Compressibility factor of an O2/N2 mixture.
   * @param {number} xO2 mole fraction of O2 (0–1)
   * @param {number} P   absolute pressure in Pa
   * @param {number} T   temperature in K
   */
  function Z(xO2, P, T) {
    const x = [xO2, 1 - xO2];
    const p = [pureParams(GASES.O2, T), pureParams(GASES.N2, T)];
    let am = 0;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) am += x[i] * x[j] * Math.sqrt(p[i].a * p[j].a);
    }
    const bm = x[0] * p[0].b + x[1] * p[1].b;
    const A = (am * P) / (R * T) ** 2;
    const B = (bm * P) / (R * T);
    const zPR = largestRoot(-(1 - B), A - 3 * B * B - 2 * B, -(A * B - B * B - B ** 3));
    const shift = x[0] * GASES.O2.shift + x[1] * GASES.N2.shift;
    return zPR - (shift * P) / (R * T);
  }

  const toPa = (gauge) => (gauge + ATM) * 1e5;

  /** Moles of gas with O2 fraction x at a gauge pressure (bar), T in K, V in m³. */
  function moles(x, gauge, T, V) {
    const P = toPa(gauge);
    return (P * V) / (Z(x, P, T) * R * T);
  }

  /** Gauge pressure (bar) of n moles with O2 fraction x; fixed-point iteration from the ideal value. */
  function pressure(n, x, T, V) {
    let P = (n * R * T) / V;
    for (let i = 0; i < 100; i++) {
      const next = (Z(x, P, T) * n * R * T) / V;
      const done = Math.abs(next - P) < 1e3; // 0.01 bar
      P = next;
      if (done) break;
    }
    return P / 1e5 - ATM;
  }

  /** Free gas volume in litres at 1.013 bar and 15 °C (ideal). */
  const freeLitres = (n) => ((n * R * FREE_GAS_T) / FREE_GAS_P) * 1000;

  /**
   * Real-gas top-up in a cooled cylinder at temperature T (K).
   * Same result shape as ideal(): pressures in bar gauge (o2 = rise during the O2
   * step, air = rise during the air step), plus free gas volumes in litres.
   */
  function real({ curO2, tgtO2, curP, fillP, size }, T) {
    const V = size / 1000;
    const x0 = curO2 / 100;
    const xf = tgtO2 / 100;
    const nf = moles(xf, fillP, T, V);
    // O2 balance: x0·n0 + nO2 + 0.21·nAir = xf·nf, total: n0 + nO2 + nAir = nf
    const balance = (n0) => {
      const nAir = (x0 * n0 + nf - n0 - xf * nf) / (1 - AIR_O2);
      return { nAir, nO2: nf - n0 - nAir };
    };

    let keep = curP;
    let n0 = moles(x0, keep, T, V);
    let { nAir, nO2 } = balance(n0);
    let drain = null;

    if (nO2 < -1e-9 || nAir < -1e-9) {
      // Target not reachable from the current residual gas: find the largest
      // residual amount for which both additions are >= 0, then its pressure
      drain = nO2 < 0 ? 'lean' : 'rich';
      const nMax = drain === 'lean' ? (nf * (xf - AIR_O2)) / (x0 - AIR_O2) : (nf * (1 - xf)) / (1 - x0);
      // A bled cylinder still holds 1 atm, so keep never goes below 0 bar gauge
      keep = Math.max(0, pressure(nMax, x0, T, V));
      n0 = moles(x0, keep, T, V);
      if (drain === 'lean') {
        nO2 = 0;
        nAir = nf - n0;
      } else {
        nAir = 0;
        nO2 = nf - n0;
      }
    }
    nO2 = Math.max(0, nO2);
    nAir = Math.max(0, nAir);

    // Gauge pressure after the O2 step
    let p1 = keep;
    if (nAir === 0) p1 = fillP;
    else if (nO2 > 0) p1 = pressure(n0 + nO2, (x0 * n0 + nO2) / (n0 + nO2), T, V);

    return {
      keep,
      o2: Math.max(0, p1 - keep),
      air: Math.max(0, fillP - p1),
      drain,
      finalO2: ((x0 * n0 + nO2 + AIR_O2 * nAir) / nf) * 100,
      litersO2: freeLitres(nO2),
      litersAir: freeLitres(nAir),
      litersTotal: freeLitres(nf),
    };
  }

  /**
   * O2 percentage after filling pure O2 up to pO2 and then air up to pFinal
   * (gauge bar, cooled), starting from `keep` bar of gas with O2 fraction x0.
   */
  function mixAfter(x0, keep, pO2, pFinal, T, V) {
    const fill = (s, y, gauge) => {
      const P = toPa(gauge);
      let n = (P * V) / (R * T);
      for (let i = 0; i < 100; i++) {
        const next = (P * V) / (Z((s.o + y * (n - s.n)) / n, P, T) * R * T);
        const done = Math.abs(next - n) < 1e-9 * next;
        n = next;
        if (done) break;
      }
      return { n, o: s.o + y * (n - s.n) };
    };
    const n0 = moles(x0, keep, T, V);
    let s = { n: n0, o: x0 * n0 };
    if (pO2 > keep) s = fill(s, 1, pO2);
    if (pFinal > Math.max(keep, pO2)) s = fill(s, AIR_O2, pFinal);
    return (s.o / s.n) * 100;
  }

  const api = { AIR_O2, ATM, R, GASES, Z, moles, pressure, ideal, real, mixAfter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Blend = api;
})(typeof window !== 'undefined' ? window : this);
