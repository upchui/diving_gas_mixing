/*
 * Blending maths for partial pressure top-ups: helium and pure O2 (in either order),
 * then air. Nitrox is the special case without helium.
 *
 * ideal(): classic partial pressure method, gas amount proportional to gauge pressure.
 * real():  the same balance in moles. The compressibility factor of the O2/N2 part
 *          comes from the Peng–Robinson equation of state (kij = 0) plus a constant
 *          volume shift per component (Péneloux) fitted to NIST data; helium uses a
 *          virial fit to NIST data and is combined with the O2/N2 part by Amagat's law.
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

  // Helium: Peng–Robinson describes it poorly (1–3 % off), so it uses a virial fit
  // to NIST WebBook data, 0–40 °C and 10–350 bar, within 0.5 ‰:
  // Z = 1 + b1·P + b2·P² with P absolute in bar and b1, b2 linear in T
  const HELIUM = { T0: 293.15, b1: 4.87406e-4, b1T: -1.8314e-6, b2: -4.92813e-8, b2T: 2.2896e-10 };

  // ---------- Ideal partial pressure method ----------

  // Round tiny negatives (floating point noise) to zero
  const clean = (n) => (Math.abs(n) < 1e-9 ? 0 : n);

  /**
   * Partial pressure top-up with pure O2 then air (nitrox).
   * Returns pressures in bar; `keep` is the pressure to bleed down to before filling.
   */
  function idealNitrox({ curO2, tgtO2, curP, fillP }) {
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

  function zHelium(Pbar, T) {
    const dT = T - HELIUM.T0;
    return 1 + (HELIUM.b1 + HELIUM.b1T * dT) * Pbar + (HELIUM.b2 + HELIUM.b2T * dT) * Pbar * Pbar;
  }

  /**
   * Compressibility factor of an O2/He/N2 mixture: helium and the O2/N2 part are
   * combined by Amagat's law (additive volumes). Without helium this is exactly Z().
   */
  function Zmix(xO2, xHe, P, T) {
    if (!(xHe > 0)) return Z(xO2, P, T);
    const rest = 1 - xHe;
    const zRest = rest > 1e-12 ? Z(Math.min(1, xO2 / rest), P, T) : 1;
    return rest * zRest + xHe * zHelium(P / 1e5, T);
  }

  const toPa = (gauge) => (gauge + ATM) * 1e5;

  /** Moles of gas (O2 fraction x, helium fraction xHe) at a gauge pressure (bar), T in K, V in m³. */
  function moles(x, gauge, T, V, xHe = 0) {
    const P = toPa(gauge);
    return (P * V) / (Zmix(x, xHe, P, T) * R * T);
  }

  /** Gauge pressure (bar) of n moles; fixed-point iteration from the ideal value. */
  function pressure(n, x, T, V, xHe = 0) {
    let P = (n * R * T) / V;
    for (let i = 0; i < 100; i++) {
      const next = (Zmix(x, xHe, P, T) * n * R * T) / V;
      const done = Math.abs(next - P) < 1e3; // 0.01 bar
      P = next;
      if (done) break;
    }
    return P / 1e5 - ATM;
  }

  /** Free gas volume in litres at 1.013 bar and 15 °C (ideal). */
  const freeLitres = (n) => ((n * R * FREE_GAS_T) / FREE_GAS_P) * 1000;

  /**
   * Real-gas nitrox top-up in a cooled cylinder at temperature T (K).
   * Same result shape as idealNitrox(): pressures in bar gauge (o2 = rise during the
   * O2 step, air = rise during the air step), plus free gas volumes in litres.
   */
  function realNitrox({ curO2, tgtO2, curP, fillP, size }, T) {
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

  // ---------- Trimix: helium and O2 in either order, then air ----------

  const fractions = (o2, he = 0) => {
    const f = { o2: o2 / 100, he: (he || 0) / 100 };
    // 1 − 0.8 − 0.2 is −5.6e‑17, not 0
    f.n2 = clean(1 - f.o2 - f.he);
    return f;
  };
  // The nitrox formulas only cover mixes without helium and with at least the O2 of air
  const isPlainNitrox = (v) => !(v.curHe > 0) && !(v.tgtHe > 0) && v.curO2 >= 21 && v.tgtO2 >= 21;
  const fillOrder = (order) => (order === 'o2' ? ['o2', 'he'] : ['he', 'o2']);

  /**
   * Chooses the residual amount n0 (bar for the ideal method, mol for the real one)
   * and the amounts of helium, O2 and air. Every amount is linear in n0, so the
   * residual amounts that keep all three >= 0 form an interval; the cylinder is
   * bled down to its upper end when the current residual is too much. The amounts
   * do not depend on the fill order.
   */
  function solve(nf, n0cur, n0min, f0, ff) {
    const airN2 = 1 - AIR_O2;
    const amountsAt = (n0) => {
      const air = (nf * ff.n2 - n0 * f0.n2) / airN2;
      const he = nf * ff.he - n0 * f0.he;
      return { he, o2: nf * ff.o2 - n0 * f0.o2 - AIR_O2 * air, air };
    };
    // a - b·n0 >= 0 for each gas
    const limits = [
      { gas: 'air', a: (nf * ff.n2) / airN2, b: f0.n2 / airN2 },
      { gas: 'he', a: nf * ff.he, b: f0.he },
      { gas: 'o2', a: nf * ff.o2 - (AIR_O2 * nf * ff.n2) / airN2, b: f0.o2 - (AIR_O2 * f0.n2) / airN2 },
    ];
    let lo = 0;
    let hi = Infinity;
    let binding = null;
    for (const c of limits) {
      if (Math.abs(c.b) < 1e-12) {
        if (c.a < -1e-9) return { unreachable: true };
      } else if (c.b > 0) {
        if (c.a / c.b < hi) {
          hi = c.a / c.b;
          binding = c.gas;
        }
      } else {
        lo = Math.max(lo, c.a / c.b);
      }
    }
    const n0 = Math.min(hi, n0cur);
    // Empty interval, or more residual needed than is in the cylinder
    if (hi < lo - 1e-9 || n0 < lo - 1e-9) return { unreachable: true };
    const drain = n0 < n0cur - 1e-9 ? { o2: 'lean', air: 'rich', he: 'helium' }[binding] : null;

    if (n0 >= n0min - 1e-9) {
      const a = amountsAt(n0);
      return { n0, he: Math.max(0, a.he), o2: Math.max(0, a.o2), air: Math.max(0, a.air), drain };
    }
    // A bled cylinder still holds 1 atm: the target can only be approximated. The
    // limiting gas is left out and the others make up the total.
    const a = amountsAt(n0min);
    const rest = (x) => Math.max(0, x);
    if (binding === 'o2') {
      const he = rest(a.he);
      return { n0: n0min, he, o2: 0, air: rest(nf - n0min - he), drain };
    }
    if (binding === 'air') {
      const he = rest(a.he);
      return { n0: n0min, he, o2: rest(nf - n0min - he), air: 0, drain };
    }
    const air = rest(a.air);
    return { n0: n0min, he: 0, o2: rest(nf - n0min - air), air, drain };
  }

  function unreachableResult(curP, f0, order) {
    return {
      keep: curP, he: 0, o2: 0, air: 0, drain: null, unreachable: true, order,
      finalO2: f0.o2 * 100, finalHe: f0.he * 100,
    };
  }

  /**
   * Classic partial pressure method for trimix (gauge pressures). `order` is the fill
   * order: 'he' (helium, then O2) or 'o2' (O2, then helium); air always comes last.
   * he / o2 / air are the pressure rises of the steps; ideally they don't depend on the order.
   */
  function idealMix({ curO2, curHe = 0, tgtO2, tgtHe = 0, curP, fillP, order = 'he' }) {
    const f0 = fractions(curO2, curHe);
    const ff = fractions(tgtO2, tgtHe);
    const s = solve(fillP, curP, 0, f0, ff);
    if (s.unreachable) return unreachableResult(curP, f0, order);
    const total = s.n0 + s.he + s.o2 + s.air;
    return {
      keep: Math.max(0, s.n0),
      he: s.he,
      o2: s.o2,
      air: s.air,
      drain: s.drain,
      unreachable: false,
      order,
      finalO2: ((s.n0 * f0.o2 + s.o2 + AIR_O2 * s.air) / total) * 100,
      finalHe: ((s.n0 * f0.he + s.he) / total) * 100,
    };
  }

  /**
   * Real-gas version of idealMix() in a cooled cylinder at temperature T (K). The gas
   * amounts are the same in both orders, the gauge rises of the steps are not.
   */
  function realMix({ curO2, curHe = 0, tgtO2, tgtHe = 0, curP, fillP, size, order = 'he' }, T) {
    const V = size / 1000;
    const f0 = fractions(curO2, curHe);
    const ff = fractions(tgtO2, tgtHe);
    const nf = moles(ff.o2, fillP, T, V, ff.he);
    const n0cur = moles(f0.o2, curP, T, V, f0.he);
    const n0min = moles(f0.o2, 0, T, V, f0.he);
    const s = { ...solve(nf, n0cur, n0min, f0, ff) };
    if (s.unreachable) return unreachableResult(curP, f0, order);
    // Rounding noise (e.g. 1e-14 mol of air) must not count as a step
    for (const gas of ['he', 'o2', 'air']) if (s[gas] < 1e-9 * nf) s[gas] = 0;

    let keep = curP;
    if (s.n0 < n0cur - 1e-12) keep = s.n0 <= n0min + 1e-12 ? 0 : Math.max(0, pressure(s.n0, f0.o2, T, V, f0.he));
    // Gauge pressure after each step in fill order; without air the last step ends at the fill pressure
    const gases = fillOrder(order);
    const amount = { o2: f0.o2 * s.n0, he: f0.he * s.n0 };
    const rise = { he: 0, o2: 0 };
    let n = s.n0;
    let p = keep;
    gases.forEach((gas, i) => {
      if (!(s[gas] > 0)) return;
      n += s[gas];
      amount[gas] += s[gas];
      const last = !(s.air > 0) && (i === 1 || !(s[gases[1]] > 0));
      // Never below the previous step (pressure() is accurate to 0.01 bar) and never
      // above the fill pressure (when 1 atm of residual keeps the target out of reach)
      const next = last ? fillP : Math.min(fillP, Math.max(p, pressure(n, amount.o2 / n, T, V, amount.he / n)));
      rise[gas] = next - p;
      p = next;
    });
    const total = n + s.air;
    return {
      keep,
      he: rise.he,
      o2: rise.o2,
      air: Math.max(0, fillP - p),
      drain: s.drain,
      unreachable: false,
      order,
      finalO2: ((f0.o2 * s.n0 + s.o2 + AIR_O2 * s.air) / total) * 100,
      finalHe: ((f0.he * s.n0 + s.he) / total) * 100,
      litersHe: freeLitres(s.he),
      litersO2: freeLitres(s.o2),
      litersAir: freeLitres(s.air),
      litersTotal: freeLitres(total),
    };
  }

  /**
   * Gas amounts and gauge targets. Plain nitrox (no helium, O2 >= 21 %) keeps the
   * original calculation; everything else goes through the general one.
   */
  const withoutHelium = (r, order) => ({
    ...r, he: 0, finalHe: 0, unreachable: false, ...(order && { order }), ...(r.litersO2 != null && { litersHe: 0 }),
  });
  // A bleed-down of less than 0.05 bar (or none at all, e.g. from 0 bar) is no bleed-down
  const finish = (r, curP) => (r.drain && r.keep < curP - 0.05 ? r : { ...r, drain: null, keep: Math.min(r.keep, curP) });
  const ideal = (v) => finish(isPlainNitrox(v) ? withoutHelium(idealNitrox(v), v.order) : idealMix(v), v.curP);
  const real = (v, T) => finish(isPlainNitrox(v) ? withoutHelium(realNitrox(v, T), v.order) : realMix(v, T), v.curP);

  /**
   * The fill steps of a result in order, with the gauge pressure (cold) before and after
   * each: [{ gas: 'he'|'o2'|'air', from, to }]. Nitrox results count as helium first.
   */
  function fillSteps(r) {
    let p = r.keep;
    return [...fillOrder(r.order), 'air'].map((gas) => {
      const step = { gas, from: p, to: p + r[gas] };
      p = step.to;
      return step;
    });
  }

  /**
   * O2 and helium percentage after the fill steps [{ gas: 'he'|'o2'|'air', to }] in their
   * order (gauge bar, cooled), starting from `keep` bar of gas with the fractions x0.
   */
  function mixAfterFill(x0, keep, steps, T, V) {
    const ADD = { he: { o2: 0, he: 1 }, o2: { o2: 1, he: 0 }, air: { o2: AIR_O2, he: 0 } };
    const fill = (s, add, gauge) => {
      const P = toPa(gauge);
      let n = (P * V) / (R * T);
      for (let i = 0; i < 100; i++) {
        const dn = n - s.n;
        const next = (P * V) / (Zmix((s.o + add.o2 * dn) / n, (s.h + add.he * dn) / n, P, T) * R * T);
        const done = Math.abs(next - n) < 1e-9 * next;
        n = next;
        if (done) break;
      }
      const dn = n - s.n;
      return { n, o: s.o + add.o2 * dn, h: s.h + add.he * dn };
    };
    const n0 = moles(x0.o2, keep, T, V, x0.he);
    let s = { n: n0, o: x0.o2 * n0, h: x0.he * n0 };
    let p = keep;
    for (const step of steps) {
      if (step.to > p) {
        s = fill(s, ADD[step.gas], step.to);
        p = step.to;
      }
    }
    return { o2: (s.o / s.n) * 100, he: (s.h / s.n) * 100 };
  }

  // ---------- Dive values (sea water: 10 m per bar, 1 bar at the surface) ----------

  const ambientBar = (depth) => depth / 10 + 1;
  const MOLAR_MASS = { o2: 31.998, he: 4.0026, n2: 28.014 }; // g/mol

  /** Maximum operating depth in m for a ppO2 limit. */
  const mod = (fO2, ppO2) => (ppO2 / fO2 - 1) * 10;

  /**
   * Equivalent narcotic depth in m; with o2Narcotic, oxygen counts as narcotic like
   * nitrogen. A mix less narcotic than air at the surface gives 0, not a negative depth.
   */
  function end(depth, fO2, fHe, o2Narcotic) {
    const narcotic = o2Narcotic ? 1 - fHe : (1 - fO2 - fHe) / (1 - AIR_O2);
    return Math.max(0, ambientBar(depth) * narcotic * 10 - 10);
  }

  /** Minimum operating depth in m for hypoxic mixes (0 when breathable at the surface). */
  const minDepth = (fO2, ppO2Min = 0.18) => Math.max(0, (ppO2Min / fO2 - 1) * 10);

  /** Gas density in g/l at a depth (ideal gas, default 20 °C). */
  function density(depth, fO2, fHe, T = 293.15) {
    const M = fO2 * MOLAR_MASS.o2 + fHe * MOLAR_MASS.he + (1 - fO2 - fHe) * MOLAR_MASS.n2;
    return (ambientBar(depth) * 1e5 * M) / (R * T) / 1000;
  }

  /**
   * Trimix for a depth, maximum ppO2 and target END, in whole percent: O2 rounded
   * down, helium rounded up (both on the safe side). The mix must also be blendable
   * with air as top-up gas: air brings 0.21/0.79 bar of O2 with every bar of N2, so
   * at least 1 − fO2/0.21 of the mix has to be helium.
   */
  function bestMix(depth, ppO2, endTarget, o2Narcotic) {
    const o2 = Math.min(100, Math.floor((ppO2 / ambientBar(depth)) * 100 + 1e-9));
    const narcotic = Math.min(1, ambientBar(endTarget) / ambientBar(depth));
    const heFraction = o2Narcotic ? 1 - narcotic : 1 - o2 / 100 - (1 - AIR_O2) * narcotic;
    const heForAir = Math.ceil((1 - o2 / 100 / AIR_O2) * 100 - 1e-9);
    const he = Math.max(0, heForAir, Math.min(100 - o2, Math.ceil(heFraction * 100 - 1e-9)));
    return { o2, he };
  }

  const api = {
    AIR_O2, ATM, R, GASES, HELIUM, Z, Zmix, moles, pressure, ideal, real, idealNitrox, realNitrox,
    idealMix, realMix, fillSteps, mixAfter, mixAfterFill, mod, end, minDepth, density, bestMix,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Blend = api;
})(typeof window !== 'undefined' ? window : this);
