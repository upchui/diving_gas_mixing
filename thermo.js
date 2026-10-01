/*
 * Thermal fill model for a scuba cylinder.
 *
 * Two heat stores (gas + cylinder wall), ideal gas, 1 s steps.
 *   gas:  n·cv·dTg/dt = ṅ·(cp·T_in − cv·Tg) − hi·A·(Tg − Tw)
 *   wall: Cw·dTw/dt   = hi·A·(Tg − Tw) − ho·A·(Tw − T_amb)
 * Each step mixes the inflow in by energy balance and treats the heat exchange
 * implicitly, so it stays stable from an empty cylinder (tiny gas heat capacity).
 *
 * Gas quantity is tracked as "cold pressure" pc = n·R·T_amb / V (bar at ambient
 * temperature), so it lines up directly with the partial pressure calculation.
 * The gauge shows p = pc · Tg / T_amb.
 */
(function (root) {
  'use strict';

  const R = 8.314; // J/(mol·K)
  const CV = 20.8; // J/(mol·K), diatomic (O2, N2, air)
  const CP = 29.1;
  const ASPECT = 3.5; // cylinder length / diameter

  // Wall heat capacity per litre water volume [J/K/L], inner/outer heat transfer [W/m²K]
  const MATERIALS = {
    steel:       { cw: 560,  hi: 150, ho: 12 },
    alu:         { cw: 1150, hi: 180, ho: 12 },
    steelCarbon: { cw: 380,  hi: 120, ho: 7 },
    carbon:      { cw: 250,  hi: 40,  ho: 5 },
  };
  const WATER_BATH_HO = 300;

  function geometry(liters) {
    const v = liters / 1000;
    const d = Math.cbrt((4 * v) / (Math.PI * ASPECT));
    const len = ASPECT * d;
    return { area: Math.PI * d * len + (Math.PI * d * d) / 2 };
  }

  /**
   * @param {object} o
   *   liters, material, tAmbC, rate (bar/min), waterBath,
   *   keep (bar, residual at ambient), f1 (residual O2 fraction),
   *   stages: [{ gas: 'o2'|'air', stopAt: 'gas'|'gauge', value: bar, pauseAfter: bool }],
   *   coolMinutes (max. cooling time, stops earlier within 0.5 K of ambient)
   */
  function simulateFill(o) {
    const mat = MATERIALS[o.material] || MATERIALS.steel;
    const tAmb = o.tAmbC + 273.15;
    const vol = o.liters / 1000;
    const { area } = geometry(o.liters);
    const hiA = mat.hi * area;
    const hoA = (o.waterBath ? WATER_BATH_HO : mat.ho) * area;
    const cWall = mat.cw * o.liters;
    const molPerBar = (1e5 * vol) / (R * tAmb); // mol per bar of cold pressure
    const dpcStep = o.rate / 60; // bar per second at 1 s steps
    const dt = 1;

    let pc = o.keep;
    let o2 = o.keep * o.f1; // cold partial pressure of O2
    let tg = tAmb;
    let tw = tAmb;
    let t = 0;
    let tMax = tAmb;

    const samples = [];
    const events = [];
    const gauge = () => (pc * tg) / tAmb;
    const sample = () => samples.push({ t, p: gauge(), tC: tg - 273.15 });
    sample();

    // Advance one time step with dpc bar of gas added
    function step(dpc) {
      const n0 = pc * molPerBar;
      const n1 = n0 + dpc * molPerBar;
      if (n1 > 0) {
        // (n0 + dn)·cv·Tg' = n0·cv·Tg + dn·cp·T_in − hi·A·(Tg' − Tw)·dt
        tg = (n0 * CV * tg + dpc * molPerBar * CP * tAmb + hiA * dt * tw) / (n1 * CV + hiA * dt);
      }
      const hiGas = n1 > 0 ? hiA : 0;
      tw = (cWall * tw + hiGas * dt * tg + hoA * dt * tAmb) / (cWall + hiGas * dt + hoA * dt);
      pc += dpc;
      t += dt;
      if (tg > tMax) tMax = tg;
      if (t % 10 === 0) sample();
    }

    function cool(maxSeconds, untilWithinK) {
      const end = t + maxSeconds;
      while (t < end) {
        if (untilWithinK != null && tg - tAmb < untilWithinK) break;
        step(0);
      }
    }

    for (const st of o.stages) {
      const frac = st.gas === 'o2' ? 1 : 0.21;
      let guard = 0;
      while (guard++ < 200000) {
        let dpc = dpcStep;
        if (st.stopAt === 'gas') {
          if (pc >= st.value - 1e-9) break;
          dpc = Math.min(dpc, st.value - pc);
        } else if (gauge() >= st.value - 1e-9) {
          break;
        }
        o2 += dpc * frac;
        step(dpc);
      }
      events.push({ type: st.gas, t, p: gauge(), pc, tC: tg - 273.15 });
      sample();
      if (st.pauseAfter) {
        cool(45 * 60, 2);
        events.push({ type: 'pause', t, p: gauge(), pc, tC: tg - 273.15 });
        sample();
      }
    }

    const fillEnd = { t, p: gauge(), tC: tg - 273.15 };
    cool((o.coolMinutes || 240) * 60, 0.5);
    sample();

    return {
      samples,
      events,
      fillEnd,
      settled: { t, p: gauge(), tC: tg - 273.15 },
      tMaxC: tMax - 273.15,
      pc, // pressure once fully cooled
      o2Fraction: pc > 0 ? o2 / pc : 0,
    };
  }

  const api = { simulateFill, MATERIALS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Thermo = api;
})(typeof window !== 'undefined' ? window : this);
