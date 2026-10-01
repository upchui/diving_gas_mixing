(() => {
  'use strict';

  const AIR_O2 = 0.21;
  const STORAGE_KEY = 'nitrox-topup-v1';
  // German if the device's primary language is German, otherwise English
  const deviceLang = () => {
    const primary = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return primary.toLowerCase().startsWith('de') ? 'de' : 'en';
  };
  const DEFAULTS = {
    curO2: 21, tgtO2: 32, size: 12, curP: 50, fillP: 200, lang: deviceLang(), langChosen: false,
    thermoOn: true, material: 'steel', tAmb: 20, rate: 10, waterBath: false, coolPause: false,
  };

  const I18N = {
    de: {
      title: 'Nitrox Top-Up Rechner',
      subtitle: 'Partialdruck-Mischen: Was muss in die Flasche?',
      inputs: 'Eingaben',
      currentMix: 'Aktuelles Gemisch',
      targetMix: 'Gewünschtes Gemisch',
      oxygen: 'Sauerstoff',
      air: 'Luft',
      cylinder: 'Flasche',
      cylSize: 'Flaschengröße',
      curPressure: 'Aktueller Druck',
      fillPressure: 'Fülldruck',
      legendResidual: 'Restgas',
      legendO2: 'Sauerstoff',
      legendAir: 'Luft',
      addO2: 'O₂ zugeben',
      addAir: 'Luft zugeben',
      addO2Cooled: 'O₂-Menge (abgekühlt)',
      addAirCooled: 'Luft-Menge (abgekühlt)',
      litersO2: 'Liter O₂',
      litersAir: 'Liter Luft',
      steps: 'Schritt für Schritt',
      finalMix: 'Endgemisch',
      totalGas: 'Gas gesamt',
      disclaimer: 'Rechenhilfe nach der Partialdruck-Methode (ideales Gas, Luft = 21 % O₂). Ersetzt keine Ausbildung als Gasblender – Gemisch nach dem Füllen immer analysieren.',
      cylinderAria: 'Flaschen-Visualisierung',
      fillO2To: 'O₂ füllen bis',
      thenAirTo: 'Dann mit Luft auffüllen bis',
      noAirNeeded: 'Keine Luft nötig',
      gaugeFrom: 'Manometer: von',
      barPureO2: 'bar reiner O₂',
      noO2Needed: 'Kein Sauerstoff nötig – nur Luft auffüllen.',
      moreSettings: 'Weitere Einstellungen',
      pauseShort: 'Pause nach O₂',
      rbO2: 'O₂ bis',
      rbAir: 'Luft bis',
      rbNoO2: 'Kein O₂ nötig',
      rbNoAir: 'Keine Luft nötig',
      toResult: 'Zum Ergebnis',
      warmShort: 'warm',
      // Thermal model
      thermoTitle: 'Erwärmung beim Füllen',
      thermoHint: 'Beim Füllen wird das Gas warm, beim Abkühlen sinkt der Druck. Berechnet die warmen Manometerwerte für den Flaschentyp.',
      cylType: 'Flaschentyp',
      matSteel: 'Stahl',
      matAlu: 'Alu',
      matCarbon: 'Carbon',
      matSteelCarbon: 'Stahl-Carbon',
      hintSteel: 'Die Stahlwand nimmt Wärme gut auf und gibt sie ab – mittlere Erwärmung.',
      hintAlu: 'Dicke Aluwand mit hoher Wärmekapazität – erwärmt sich am wenigsten.',
      hintCarbon: 'Die Carbon-Ummantelung isoliert – das Gas wird am wärmsten, der Druck fällt am stärksten.',
      hintSteelCarbon: 'Dünner Stahl-Liner mit Carbon-Ummantelung – liegt zwischen Stahl und Carbon.',
      ambientTemp: 'Umgebungstemperatur',
      fillRate: 'Füllgeschwindigkeit',
      rateSlow: 'langsam',
      rateNormal: 'normal',
      rateFast: 'schnell',
      waterBath: 'Wasserbad',
      coolPause: 'Nach O₂ abkühlen lassen',
      warmRead: 'warm ablesen',
      thermoResults: 'Thermomodell: Füllen & Abkühlen',
      kpiTmax: 'Max. Gastemperatur',
      kpiHotEnd: 'Enddruck warm',
      kpiDrop: 'Druckabfall beim Abkühlen',
      kpiCool: 'Abkühlzeit bis ±2 °C',
      withCorr: 'Mit Korrektur',
      withoutCorr: 'Ohne Korrektur',
      chartPressure: 'Manometerdruck (bar)',
      chartTemp: 'Gastemperatur (°C)',
      chartAria: 'Pfeiltasten bewegen den Cursor, alle Werte stehen auch in der Tabelle.',
      showTable: 'Werte als Tabelle',
      colTime: 'Zeit (min)',
      colEvent: 'Ereignis',
      evStart: 'Start',
      evO2: 'O₂ fertig',
      evPause: 'Pause fertig',
      evAir: 'Füllende',
      evSettled: 'abgekühlt',
      thermoNote: 'Schätzung mit vereinfachtem Modell (ideales Gas, Zulauf mit Umgebungstemperatur). Reale Werte hängen von Kompressor, Ventil, Flasche und Umgebung ab – nach dem Abkühlen Druck prüfen, ggf. nachfüllen und immer analysieren.',
      // dynamic
      coldEq: (p) => `Nach dem Abkühlen zeigt das Manometer ${p} bar`,
      heatDelta: (d) => `+${d} bar wegen Erwärmung`,
      thermoMeta: (mat, size, rate, temp, bath) => `${mat} · ${size} L · ${rate} bar/min · ${temp} °C${bath ? ' · Wasserbad' : ''}`,
      refTarget: (p) => `Ziel ${p} bar`,
      refAmbient: (t) => `Umgebung ${t} °C`,
      minutes: (m) => `${m} min`,
      moreThan: (m) => `> ${m} min`,
      naiveText: (how, p, mix, tp, tmix) => `<strong>Ohne Korrektur</strong> – also ${how} am warmen Manometer – wären nach dem Abkühlen nur <strong>${p} bar</strong> mit <strong>${mix} % O₂</strong> in der Flasche. Soll: ${tp} bar mit ${tmix} % O₂.`,
      naiveHowO2: (p) => `O₂ bis ${p} bar`,
      naiveHowAir: (p) => `Luft bis ${p} bar`,
      and: ' und ',
      drainFirst: (keep) => `Erst auf ${keep} bar ablassen`,
      errO2Range: 'Sauerstoffanteil muss zwischen 21 % und 100 % liegen.',
      errSize: 'Bitte eine gültige Flaschengröße eingeben.',
      errPressure: 'Bitte gültige Drücke eingeben (0–350 bar).',
      errFillLower: 'Der Fülldruck muss höher sein als der aktuelle Druck.',
      errTemp: 'Umgebungstemperatur muss zwischen −10 und 45 °C liegen.',
      errRate: 'Füllgeschwindigkeit muss zwischen 0,5 und 60 bar/min liegen.',
      drainLean: (keep, cur) => `Das Restgas enthält zu viel Sauerstoff für das Zielgemisch. Flasche erst von <strong>${cur} bar</strong> auf <strong>${keep} bar</strong> ablassen.`,
      drainRich: (keep, cur) => `Zu viel Stickstoff in der Flasche – selbst reiner O₂ reicht nicht. Flasche erst von <strong>${cur} bar</strong> auf <strong>${keep} bar</strong> ablassen.`,
      stepDrain: (keep) => `Flasche auf <strong>${keep} bar</strong> ablassen`,
      stepO2: (to, add) => `Reinen O₂ zugeben, bis das Manometer <strong>${to} bar</strong> zeigt <span class="muted">(+${add} bar)</span>`,
      stepAir: (to, add) => `Mit Luft auffüllen, bis das Manometer <strong>${to} bar</strong> zeigt <span class="muted">(+${add} bar)</span>`,
      stepO2Hot: (to, cold) => `Reinen O₂ zugeben, bis das Manometer <strong>${to} bar</strong> zeigt<span class="step-note">Das Gas ist dabei warm. Nach dem Abkühlen fällt der Druck auf ${cold} bar – das ist die richtige Menge O₂.</span>`,
      stepPause: (dur, p) => `Abkühlen lassen (ca. ${dur}) – das Manometer fällt auf ca. <strong>${p} bar</strong>`,
      stepAirHot: (to, cold) => `Mit Luft auffüllen, bis das Manometer <strong>${to} bar</strong> zeigt<span class="step-note">Das Gas ist dabei warm. Nach dem Abkühlen fällt der Druck auf ${cold} bar.</span>`,
      stepCool: (dur, p, mix) => `Abkühlen lassen (ca. ${dur}) – das Manometer fällt auf ca. <strong>${p} bar</strong>. Dann analysieren – Soll: <strong>${mix} % O₂</strong>`,
      stepNoO2: 'Kein Sauerstoff nötig',
      stepNoAir: 'Keine Luft nötig',
      stepAnalyze: (mix) => `Abkühlen lassen, Gemisch analysieren – Soll: <strong>${mix} % O₂</strong>`,
    },
    en: {
      title: 'Nitrox Top-Up Calculator',
      subtitle: 'Partial pressure blending: what goes into the cylinder?',
      inputs: 'Inputs',
      currentMix: 'Current Mix',
      targetMix: 'Requested Mix',
      oxygen: 'Oxygen',
      air: 'Air',
      cylinder: 'Cylinder',
      cylSize: 'Cylinder size',
      curPressure: 'Current pressure',
      fillPressure: 'Fill pressure',
      legendResidual: 'Residual gas',
      legendO2: 'Oxygen',
      legendAir: 'Air',
      addO2: 'Add O₂',
      addAir: 'Add air',
      addO2Cooled: 'O₂ amount (cooled)',
      addAirCooled: 'Air amount (cooled)',
      litersO2: 'litres O₂',
      litersAir: 'litres air',
      steps: 'Step by step',
      finalMix: 'Final mix',
      totalGas: 'Total gas',
      disclaimer: 'Calculation aid using the partial pressure method (ideal gas, air = 21 % O₂). Not a substitute for gas blender training – always analyse the mix after filling.',
      cylinderAria: 'Cylinder visualisation',
      fillO2To: 'Fill O₂ up to',
      thenAirTo: 'Then top up with air to',
      noAirNeeded: 'No air needed',
      gaugeFrom: 'Gauge: from',
      barPureO2: 'bar pure O₂',
      noO2Needed: 'No oxygen needed – top up with air only.',
      moreSettings: 'More settings',
      pauseShort: 'pause after O₂',
      rbO2: 'O₂ to',
      rbAir: 'Air to',
      rbNoO2: 'No O₂ needed',
      rbNoAir: 'No air needed',
      toResult: 'Jump to result',
      warmShort: 'warm',
      thermoTitle: 'Heating during fill',
      thermoHint: 'Gas heats up while filling and the pressure drops as it cools. Calculates the warm gauge readings for the cylinder type.',
      cylType: 'Cylinder type',
      matSteel: 'Steel',
      matAlu: 'Aluminium',
      matCarbon: 'Carbon',
      matSteelCarbon: 'Steel-carbon',
      hintSteel: 'The steel wall absorbs and releases heat well – moderate heating.',
      hintAlu: 'Thick aluminium wall with high heat capacity – heats up the least.',
      hintCarbon: 'The carbon wrap insulates – the gas gets hottest and the pressure drops the most.',
      hintSteelCarbon: 'Thin steel liner with carbon wrap – sits between steel and carbon.',
      ambientTemp: 'Ambient temperature',
      fillRate: 'Fill rate',
      rateSlow: 'slow',
      rateNormal: 'normal',
      rateFast: 'fast',
      waterBath: 'Water bath',
      coolPause: 'Let cool after O₂',
      warmRead: 'read warm',
      thermoResults: 'Thermal model: filling & cooling',
      kpiTmax: 'Peak gas temperature',
      kpiHotEnd: 'Warm end pressure',
      kpiDrop: 'Pressure drop on cooling',
      kpiCool: 'Cool-down to ±2 °C',
      withCorr: 'With correction',
      withoutCorr: 'Without correction',
      chartPressure: 'Gauge pressure (bar)',
      chartTemp: 'Gas temperature (°C)',
      chartAria: 'Arrow keys move the cursor, all values are also in the table.',
      showTable: 'Show values as table',
      colTime: 'Time (min)',
      colEvent: 'Event',
      evStart: 'Start',
      evO2: 'O₂ done',
      evPause: 'Pause done',
      evAir: 'Fill done',
      evSettled: 'cooled',
      thermoNote: 'Estimate from a simplified model (ideal gas, inflow at ambient temperature). Real values depend on compressor, valve, cylinder and surroundings – check the pressure after cooling, top up if needed and always analyse.',
      coldEq: (p) => `After cooling the gauge shows ${p} bar`,
      heatDelta: (d) => `+${d} bar due to heating`,
      thermoMeta: (mat, size, rate, temp, bath) => `${mat} · ${size} L · ${rate} bar/min · ${temp} °C${bath ? ' · water bath' : ''}`,
      refTarget: (p) => `Target ${p} bar`,
      refAmbient: (t) => `Ambient ${t} °C`,
      minutes: (m) => `${m} min`,
      moreThan: (m) => `> ${m} min`,
      naiveText: (how, p, mix, tp, tmix) => `<strong>Without correction</strong> – filling ${how} on the warm gauge – the cylinder would hold only <strong>${p} bar</strong> at <strong>${mix} % O₂</strong> after cooling. Target: ${tp} bar at ${tmix} % O₂.`,
      naiveHowO2: (p) => `O₂ to ${p} bar`,
      naiveHowAir: (p) => `air to ${p} bar`,
      and: ' and ',
      drainFirst: (keep) => `Bleed to ${keep} bar first`,
      errO2Range: 'Oxygen content must be between 21 % and 100 %.',
      errSize: 'Please enter a valid cylinder size.',
      errPressure: 'Please enter valid pressures (0–350 bar).',
      errFillLower: 'Fill pressure must be higher than current pressure.',
      errTemp: 'Ambient temperature must be between −10 and 45 °C.',
      errRate: 'Fill rate must be between 0.5 and 60 bar/min.',
      drainLean: (keep, cur) => `The residual gas holds too much oxygen for the requested mix. Bleed the cylinder from <strong>${cur} bar</strong> down to <strong>${keep} bar</strong> first.`,
      drainRich: (keep, cur) => `Too much nitrogen in the cylinder – even pure O₂ won't get there. Bleed the cylinder from <strong>${cur} bar</strong> down to <strong>${keep} bar</strong> first.`,
      stepDrain: (keep) => `Bleed cylinder down to <strong>${keep} bar</strong>`,
      stepO2: (to, add) => `Add pure O₂ until the gauge reads <strong>${to} bar</strong> <span class="muted">(+${add} bar)</span>`,
      stepAir: (to, add) => `Top up with air until the gauge reads <strong>${to} bar</strong> <span class="muted">(+${add} bar)</span>`,
      stepO2Hot: (to, cold) => `Add pure O₂ until the gauge reads <strong>${to} bar</strong><span class="step-note">The gas is warm at this point. Once it cools, the pressure drops to ${cold} bar – that is the right amount of O₂.</span>`,
      stepPause: (dur, p) => `Let it cool (approx. ${dur}) – the gauge drops to about <strong>${p} bar</strong>`,
      stepAirHot: (to, cold) => `Top up with air until the gauge reads <strong>${to} bar</strong><span class="step-note">The gas is warm at this point. Once it cools, the pressure drops to ${cold} bar.</span>`,
      stepCool: (dur, p, mix) => `Let it cool (approx. ${dur}) – the gauge drops to about <strong>${p} bar</strong>. Then analyse – target: <strong>${mix} % O₂</strong>`,
      stepNoO2: 'No oxygen needed',
      stepNoAir: 'No air needed',
      stepAnalyze: (mix) => `Let it cool, analyse the mix – target: <strong>${mix} % O₂</strong>`,
    },
  };

  const MAT_LABEL = { steel: 'matSteel', alu: 'matAlu', carbon: 'matCarbon', steelCarbon: 'matSteelCarbon' };
  const MAT_HINT = { steel: 'hintSteel', alu: 'hintAlu', carbon: 'hintCarbon', steelCarbon: 'hintSteelCarbon' };

  const $ = (id) => document.getElementById(id);
  const FIELDS = ['curO2', 'tgtO2', 'size', 'curP', 'fillP', 'tAmb', 'rate'];
  const TOGGLES = ['thermoOn', 'waterBath', 'coolPause'];
  const state = { ...DEFAULTS };

  // ---------- Storage ----------
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      for (const k of Object.keys(DEFAULTS)) {
        // The thermal model always starts switched on
        if (k === 'thermoOn') continue;
        // Keep a saved language only if the user picked it; otherwise follow the device
        if (k === 'lang' && !saved.langChosen) continue;
        if (k in saved) state[k] = saved[k];
      }
      if (!(state.lang in I18N)) state.lang = DEFAULTS.lang;
      if (!(state.material in MAT_LABEL)) state.material = DEFAULTS.material;
    } catch (_) { /* storage unavailable */ }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
  }

  // ---------- Formatting ----------
  const t = (key) => I18N[state.lang][key];
  const locale = () => (state.lang === 'de' ? 'de-DE' : 'en-GB');
  const fmt = (n, digits = 1) =>
    n.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const fmtInt = (n) => Math.round(n).toLocaleString(locale());
  const fmtAuto = (n) => fmt(n, Number.isInteger(n) ? 0 : 1);
  // Round tiny negatives (floating point noise) to zero
  const clean = (n) => (Math.abs(n) < 1e-9 ? 0 : n);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const durText = (sec) => (sec == null ? t('moreThan')(240) : t('minutes')(fmtInt(sec / 60)));

  // ---------- Calculation ----------
  /**
   * Partial pressure top-up with pure O2 then air.
   * Returns pressures in bar; `keep` is the pressure to bleed down to before filling.
   */
  function calculate({ curO2, tgtO2, curP, fillP }) {
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

  function validate(v) {
    if ([v.curO2, v.tgtO2].some((x) => !Number.isFinite(x) || x < 21 || x > 100)) return 'errO2Range';
    if (!Number.isFinite(v.size) || v.size <= 0 || v.size > 100) return 'errSize';
    if ([v.curP, v.fillP].some((x) => !Number.isFinite(x) || x < 0 || x > 350)) return 'errPressure';
    if (v.fillP <= v.curP) return 'errFillLower';
    if (state.thermoOn) {
      if (!Number.isFinite(v.tAmb) || v.tAmb < -10 || v.tAmb > 45) return 'errTemp';
      if (!Number.isFinite(v.rate) || v.rate < 0.5 || v.rate > 60) return 'errRate';
    }
    return null;
  }

  /**
   * Runs the thermal model twice: with correction (stop each stage at the gas
   * amount the cold calculation asks for) and without (stop when the warm gauge
   * shows the cold target value).
   */
  function runThermo(v, r, needsO2, needsAir) {
    const run = (stopAt) => {
      const stages = [];
      if (needsO2) {
        stages.push({ gas: 'o2', stopAt, value: r.keep + r.o2, pauseAfter: state.coolPause && needsAir });
      }
      if (needsAir) stages.push({ gas: 'air', stopAt, value: v.fillP });
      return Thermo.simulateFill({
        liters: v.size,
        material: state.material,
        tAmbC: v.tAmb,
        rate: v.rate,
        waterBath: state.waterBath,
        keep: r.keep,
        f1: v.curO2 / 100,
        stages,
      });
    };
    const ok = run('gas');
    const naive = run('gauge');
    const event = (type) => ok.events.find((e) => e.type === type);
    // Seconds after the end of filling until the gas is within 2 K of ambient
    const cooled = ok.samples.find((s) => s.t > ok.fillEnd.t && s.tC - v.tAmb < 2);
    return { ok, naive, event, coolSec: cooled ? cooled.t - ok.fillEnd.t : null };
  }

  // ---------- Rendering ----------
  const CYL = { top: 70, bottom: 400, x: 40, w: 110 };

  function render() {
    const v = {};
    FIELDS.forEach((k) => (v[k] = parseFloat(state[k])));
    const L = I18N[state.lang];

    $('materialHint').textContent = L[MAT_HINT[state.material]];
    // With the thermal model on, the small tiles show amounts after cooling, not the warm gauge rise
    $('o2TileLabel').textContent = state.thermoOn ? L.addO2Cooled : L.addO2;
    $('airTileLabel').textContent = state.thermoOn ? L.addAirCooled : L.addAir;
    const num = (x) => (Number.isFinite(x) ? fmtAuto(x) : '–');
    $('settingsSummary').textContent = [
      `${num(v.tAmb)} °C`, `${num(v.rate)} bar/min`, state.waterBath && L.waterBath, state.coolPause && L.pauseShort,
    ].filter(Boolean).join(' · ');

    const err = validate(v);
    markInvalid(err);
    const errBox = $('error');
    const tiles = $('resultTiles');
    const hero = document.querySelector('.hero');

    if (err) {
      errBox.textContent = L[err];
      errBox.hidden = false;
      ['drainAlert', 'drainBadge', 'warmBadge', 'warmBadgeAir', 'heroCold', 'airCold'].forEach((id) => ($(id).hidden = true));
      tiles.classList.add('dim');
      hero.classList.add('dim');
      ['o2Bar', 'airBar', 'o2L', 'airL', 'factMix', 'factTotal', 'factMod14', 'factMod16',
        'o2Target', 'o2From', 'o2TargetSub', 'o2Delta', 'airTarget'].forEach((id) => ($(id).textContent = '–'));
      $('steps').innerHTML = '';
      setGauge(null);
      drawCylinder(null, v);
      renderThermo(null);
      updateResultBar({ error: L[err] });
      return;
    }
    errBox.hidden = true;
    tiles.classList.remove('dim');
    hero.classList.remove('dim');

    const r = calculate(v);
    const afterO2 = r.keep + r.o2;
    const needsO2 = r.o2 > 0.05;
    const needsAir = r.air > 0.05;
    const th = state.thermoOn ? runThermo(v, r, needsO2, needsAir) : null;
    // Gauge readings to fill to: warm values when the thermal model is on
    const gaugeO2 = th && needsO2 ? th.event('o2').p : afterO2;
    const gaugeEnd = th ? th.ok.fillEnd.p : v.fillP;

    // Hero: gauge targets
    $('o2Target').textContent = fmt(gaugeO2);
    $('o2From').textContent = fmt(r.keep);
    $('o2TargetSub').textContent = fmt(gaugeO2);
    $('o2Delta').textContent = th ? fmtInt(r.o2 * v.size) : `+${fmt(r.o2)}`;
    $('o2DeltaLabel').textContent = th ? L.litersO2 : L.barPureO2;
    $('heroSub').hidden = !needsO2;
    $('heroNone').hidden = needsO2;
    $('heroValue').hidden = !needsO2;
    $('heroO2').classList.toggle('dim', !needsO2);
    $('warmBadge').hidden = !(th && needsO2);
    $('heroCold').hidden = !(th && needsO2);
    $('o2Heat').textContent = L.heatDelta(fmt(gaugeO2 - afterO2));
    $('o2ColdText').textContent = L.coldEq(fmt(afterO2));
    $('drainBadge').hidden = !r.drain;
    if (r.drain) $('drainBadge').textContent = L.drainFirst(fmt(r.keep));
    setGauge(r, v.fillP);

    $('heroAirLabel').textContent = needsAir ? L.thenAirTo : L.noAirNeeded;
    $('heroAirValue').hidden = !needsAir;
    $('heroAir').classList.toggle('dim', !needsAir);
    $('airTarget').textContent = fmt(gaugeEnd);
    $('warmBadgeAir').hidden = !(th && needsAir);
    $('airCold').hidden = !(th && needsAir);
    $('airHeat').textContent = L.heatDelta(fmt(gaugeEnd - v.fillP));
    $('airColdText').textContent = L.coldEq(fmt(v.fillP));

    $('o2Bar').textContent = fmt(r.o2);
    $('airBar').textContent = fmt(r.air);
    $('o2L').textContent = fmtInt(r.o2 * v.size);
    $('airL').textContent = fmtInt(r.air * v.size);

    const drainBox = $('drainAlert');
    if (r.drain) {
      drainBox.innerHTML = (r.drain === 'lean' ? L.drainLean : L.drainRich)(fmt(r.keep), fmt(v.curP));
      drainBox.hidden = false;
    } else {
      drainBox.hidden = true;
    }

    // Steps
    const steps = [];
    if (r.drain) steps.push(['s-drain', L.stepDrain(fmt(r.keep))]);
    if (th) {
      steps.push(['s-o2', needsO2 ? L.stepO2Hot(fmt(gaugeO2), fmt(afterO2)) : L.stepNoO2]);
      const pause = th.event('pause');
      if (pause) steps.push(['s-pause', L.stepPause(durText(pause.t - th.event('o2').t), fmt(pause.p))]);
      steps.push(['s-air', needsAir ? L.stepAirHot(fmt(gaugeEnd), fmt(v.fillP)) : L.stepNoAir]);
      steps.push(['s-analyze', L.stepCool(durText(th.coolSec), fmt(v.fillP), fmt(v.tgtO2))]);
    } else {
      steps.push(['s-o2', needsO2 ? L.stepO2(fmt(afterO2), fmt(r.o2)) : L.stepNoO2]);
      steps.push(['s-air', needsAir ? L.stepAir(fmt(v.fillP), fmt(r.air)) : L.stepNoAir]);
      steps.push(['s-analyze', L.stepAnalyze(fmt(v.tgtO2))]);
    }
    $('steps').innerHTML = steps.map(([cls, html]) => `<li class="${cls}"><span>${html}</span></li>`).join('');

    // Facts
    const f2 = v.tgtO2 / 100;
    $('factMix').textContent = `${fmt(r.finalO2)} % O₂`;
    $('factTotal').textContent = `${fmtInt(v.fillP * v.size)} L`;
    $('factMod14').textContent = `${fmt((1.4 / f2 - 1) * 10)} m`;
    $('factMod16').textContent = `${fmt((1.6 / f2 - 1) * 10)} m`;

    drawCylinder(r, v);
    updateResultBar({
      drain: r.drain ? fmt(r.keep) : null, needsO2, needsAir, o2: fmt(gaugeO2), air: fmt(gaugeEnd), warm: !!th,
    });
    renderThermo(th, v, r, needsO2, needsAir);
  }

  // Phones: compact summary of the gauge targets, pinned to the bottom of the screen
  function updateResultBar(s) {
    const L = I18N[state.lang];
    const values = $('rbValues');
    $('resultBar').classList.toggle('is-error', !!s.error);
    $('rbDrain').hidden = !s.drain;
    if (s.drain) $('rbDrain').textContent = L.drainFirst(s.drain);
    $('rbWarm').hidden = !s.warm;
    values.replaceChildren();
    if (s.error) {
      const msg = document.createElement('span');
      msg.className = 'rb-error';
      msg.textContent = s.error;
      values.append(msg);
      return;
    }
    const item = (label, value) => {
      const el = document.createElement('span');
      el.className = 'rb-item';
      const lab = document.createElement('span');
      lab.className = 'rb-label';
      lab.textContent = label;
      el.append(lab);
      if (value != null) {
        const strong = document.createElement('strong');
        strong.textContent = value;
        el.append(' ', strong, ' bar');
      }
      return el;
    };
    values.append(
      s.needsO2 ? item(L.rbO2, s.o2) : item(L.rbNoO2),
      s.needsAir ? item(L.rbAir, s.air) : item(L.rbNoAir)
    );
  }

  // Show the result bar only while the result tiles are still below the screen
  function watchResultBar() {
    const bar = $('resultBar');
    bar.addEventListener('click', () => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.querySelector('.result-card').scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    });
    if (typeof IntersectionObserver === 'undefined') return;
    new IntersectionObserver(([entry]) => {
      const below = !entry.isIntersecting && entry.boundingClientRect.top > 0;
      bar.classList.toggle('away', !below);
    }, { rootMargin: '0px 0px -72px 0px' }).observe(document.querySelector('.hero'));
  }

  function setGauge(r, fillP) {
    const pct = (p) => (r ? `${(p / fillP) * 100}%` : '0%');
    $('gaugeResidual').style.width = pct(r && r.keep);
    $('gaugeO2').style.width = pct(r && r.o2);
    $('gaugeAir').style.width = pct(r && r.air);
  }

  function markInvalid(err) {
    document.querySelectorAll('.num-wrap').forEach((el) => el.classList.remove('invalid'));
    const map = {
      errO2Range: ['curO2', 'tgtO2'],
      errSize: ['size'],
      errPressure: ['curP', 'fillP'],
      errFillLower: ['curP', 'fillP'],
      errTemp: ['tAmb'],
      errRate: ['rate'],
    };
    (map[err] || []).forEach((id) => $(id).closest('.num-wrap').classList.add('invalid'));
  }

  function drawCylinder(r, v) {
    const height = CYL.bottom - CYL.top;
    const scale = r ? Math.max(v.fillP, v.curP) : 1;
    const yOf = (p) => CYL.bottom - (p / scale) * height;

    const setLayer = (id, from, to) => {
      const el = $(id);
      const y1 = yOf(to);
      const y0 = yOf(from);
      el.setAttribute('y', y1);
      el.setAttribute('height', Math.max(0, y0 - y1));
    };

    const drainLine = $('drainLine');
    const ticks = $('ticks');
    ticks.innerHTML = '';

    if (!r) {
      ['layerResidual', 'layerO2', 'layerAir'].forEach((id) => {
        $(id).setAttribute('y', CYL.bottom);
        $(id).setAttribute('height', 0);
      });
      drainLine.setAttribute('opacity', 0);
      return;
    }

    const pO2 = r.keep + r.o2;
    setLayer('layerResidual', 0, r.keep);
    setLayer('layerO2', r.keep, pO2);
    setLayer('layerAir', pO2, v.fillP);

    if (r.drain) {
      const y = yOf(v.curP);
      drainLine.setAttribute('y1', y);
      drainLine.setAttribute('y2', y);
      drainLine.setAttribute('opacity', 1);
    } else {
      drainLine.setAttribute('opacity', 0);
    }

    // Pressure ticks on the right side; skip ones that would overlap
    const marks = [{ p: 0 }, { p: r.keep }, { p: pO2 }, { p: v.fillP }];
    if (r.drain) marks.push({ p: v.curP, drain: true });
    const minGap = window.matchMedia('(max-width: 640px)').matches ? 26 : 14;
    const placed = [];
    marks
      .sort((a, b) => a.p - b.p)
      .forEach((m) => {
        const y = yOf(m.p);
        if (placed.some((py) => Math.abs(py - y) < minGap)) return;
        placed.push(y);
        const right = CYL.x + CYL.w;
        ticks.insertAdjacentHTML(
          'beforeend',
          `<line class="tick-line" x1="${right + 2}" x2="${right + 12}" y1="${y}" y2="${y}"/>` +
            `<text class="tick-text${m.drain ? ' drain' : ''}" x="${right + 16}" y="${y + 4}">${fmtInt(m.p)}</text>`
        );
      });
  }

  // ---------- Thermal model: results card ----------
  const VIZ = { h: 214, l: 46, r: 64, t: 40, b: 28 };
  const CHART_IDS = ['chartP', 'chartT'];
  const charts = {};
  let thermoData = null;
  let hoverT = null;
  let hoverSrc = 'chartP';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function niceStep(span, count) {
    const raw = Math.max(span, 1e-6) / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw - 1e-12);
  }

  // Linear interpolation of a sample series at time t
  function valueAt(samples, time, key) {
    let lo = 0;
    let hi = samples.length - 1;
    if (time <= samples[0].t) return samples[0][key];
    if (time >= samples[hi].t) return samples[hi][key];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].t <= time) lo = mid;
      else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    return b.t === a.t ? b[key] : a[key] + ((b[key] - a[key]) * (time - a.t)) / (b.t - a.t);
  }

  function evLabel(type) {
    return t(type === 'o2' ? 'evO2' : type === 'pause' ? 'evPause' : 'evAir');
  }

  function renderThermo(th, v, r, needsO2, needsAir) {
    const sec = $('thermoSection');
    if (!th) {
      sec.hidden = true;
      thermoData = null;
      hoverT = null;
      $('vizTip').hidden = true;
      return;
    }
    const L = I18N[state.lang];
    const { ok, naive } = th;
    sec.hidden = false;

    $('thermoMeta').textContent = L.thermoMeta(
      L[MAT_LABEL[state.material]], fmtAuto(v.size), fmtAuto(v.rate), fmtAuto(v.tAmb), state.waterBath
    );
    $('kpiTmax').textContent = `${fmt(ok.tMaxC)} °C`;
    $('kpiHotEnd').textContent = `${fmt(ok.fillEnd.p)} bar`;
    $('kpiDrop').textContent = `−${fmt(Math.max(0, ok.fillEnd.p - ok.pc))} bar`;
    $('kpiCool').textContent = durText(th.coolSec);

    const how = [needsO2 && L.naiveHowO2(fmt(r.keep + r.o2)), needsAir && L.naiveHowAir(fmt(v.fillP))]
      .filter(Boolean)
      .join(L.and);
    $('naiveBox').innerHTML = L.naiveText(how, fmt(naive.pc), fmt(naive.o2Fraction * 100), fmt(v.fillP), fmt(v.tgtO2));

    // Show filling plus cooling until within 2 K of ambient (10–120 min after the fill)
    const coolEnd = ok.fillEnd.t + (th.coolSec ?? 120 * 60);
    const lastT = Math.max(ok.samples[ok.samples.length - 1].t, naive.samples[naive.samples.length - 1].t);
    const xMax = Math.min(clamp(coolEnd, ok.fillEnd.t + 600, ok.fillEnd.t + 7200), lastT);

    thermoData = { ok, naive, xMax, tAmb: v.tAmb, fillP: v.fillP };
    if (hoverT != null) hoverT = clamp(hoverT, 0, xMax);

    CHART_IDS.forEach((id) => $(id).setAttribute('aria-label', `${t(id === 'chartP' ? 'chartPressure' : 'chartTemp')} – ${L.chartAria}`));
    drawThermoCharts();
    buildTable();
  }

  function drawThermoCharts() {
    const d = thermoData;
    if (!d || $('thermoSection').hidden) return;
    const L = I18N[state.lang];
    const series = [
      { cls: 's2', samples: d.naive.samples },
      { cls: 's1', samples: d.ok.samples },
    ];
    const events = d.ok.events.map((e) => ({ t: e.t, label: evLabel(e.type) }));
    const inWin = (key) => [d.ok, d.naive].flatMap((sim) => sim.samples.filter((s) => s.t <= d.xMax).map((s) => s[key]));

    // Pressure
    const ps = inWin('p');
    const pMin = Math.min(...ps);
    const pMax = Math.max(...ps, d.fillP);
    const pPad = (pMax - pMin) * 0.06 || 5;
    const pMarks = d.ok.events
      .filter((e) => e.type !== 'pause')
      .map((e) => ({ t: e.t, v: e.p, label: fmt(e.p) }));
    drawChart('chartP', {
      key: 'p', series, xMax: d.xMax, events, marks: pMarks, digits: 1,
      yMin: Math.max(0, pMin - pPad), yMax: pMax + pPad, ref: d.fillP,
    });
    $('refP').textContent = L.refTarget(fmtAuto(d.fillP));

    // Temperature
    const ts = inWin('tC');
    const tMax = Math.max(...ts);
    const tSpan = Math.max(tMax - d.tAmb, 4);
    const peak = d.ok.samples.reduce((a, s) => (s.t <= d.xMax && s.tC > a.tC ? s : a), d.ok.samples[0]);
    drawChart('chartT', {
      key: 'tC', series, xMax: d.xMax, events, digits: 1,
      marks: [{ t: peak.t, v: peak.tC, label: `${fmt(peak.tC)} °C` }],
      yMin: d.tAmb - tSpan * 0.25, yMax: tMax + tSpan * 0.22, ref: d.tAmb,
    });
    $('refT').textContent = L.refAmbient(fmtAuto(d.tAmb));

    updateCrosshair();
  }

  function drawChart(id, c) {
    const fig = $(id);
    const svg = fig.querySelector('svg');
    const w = Math.max(300, Math.round(fig.clientWidth || 600));
    const h = VIZ.h;
    const iw = w - VIZ.l - VIZ.r;
    const ih = h - VIZ.t - VIZ.b;
    const step = niceStep(c.yMax - c.yMin, 4);
    const y0 = Math.floor(c.yMin / step) * step;
    const y1 = Math.ceil(c.yMax / step) * step;
    const x = (time) => VIZ.l + (clamp(time, 0, c.xMax) / c.xMax) * iw;
    const y = (val) => VIZ.t + (1 - (val - y0) / (y1 - y0)) * ih;
    const n = (val) => val.toFixed(1);
    const out = [];

    // Grid + y ticks
    const yDigits = Number.isInteger(step) ? 0 : 1;
    for (let g = y0; g <= y1 + 1e-9; g += step) {
      out.push(
        `<line class="${Math.abs(g - y0) < 1e-9 ? 'v-axis' : 'v-grid'}" x1="${VIZ.l}" x2="${VIZ.l + iw}" y1="${n(y(g))}" y2="${n(y(g))}"/>`,
        `<text class="v-tick" x="${VIZ.l - 8}" y="${n(y(g) + 4)}" text-anchor="end">${fmt(g, yDigits)}</text>`
      );
    }
    // X ticks in minutes
    const xs = niceStep(c.xMax / 60, 6);
    for (let m = 0; m * 60 <= c.xMax + 1e-9; m += xs) {
      out.push(`<text class="v-tick" x="${n(x(m * 60))}" y="${h - 8}" text-anchor="middle">${fmt(m, Number.isInteger(xs) ? 0 : 1)}</text>`);
    }
    out.push(`<text class="v-tick" x="${VIZ.l + iw + 18}" y="${h - 8}">min</text>`);

    // Stage ends; labels go into one of two rows above the plot so none is dropped
    const rowEnds = [-Infinity, -Infinity];
    c.events.forEach((e) => {
      const ex = x(e.t);
      const half = e.label.length * 3.3 + 2;
      const lx = clamp(ex, half, w - half);
      const row = rowEnds.findIndex((end) => lx - half > end + 6);
      const ly = VIZ.t - 8 - Math.max(row, 0) * 14;
      out.push(`<line class="v-event" x1="${n(ex)}" x2="${n(ex)}" y1="${row < 0 ? VIZ.t : ly + 4}" y2="${VIZ.t + ih}"/>`);
      if (row < 0) return;
      rowEnds[row] = lx + half;
      out.push(`<text class="v-event-label" x="${n(lx)}" y="${ly}" text-anchor="middle">${esc(e.label)}</text>`);
    });

    // Reference line (target pressure / ambient temperature); its key sits in the caption
    if (c.ref != null) {
      const ry = y(c.ref);
      out.push(`<line class="v-ref" x1="${VIZ.l}" x2="${VIZ.l + iw}" y1="${n(ry)}" y2="${n(ry)}"/>`);
    }

    // Series lines (de-emphasised first, highlighted series on top)
    c.series.forEach((s) => {
      const pts = s.samples.filter((p) => p.t <= c.xMax);
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${n(x(p.t))} ${n(y(p[c.key]))}`).join('');
      out.push(`<path class="v-line ${s.cls}" d="${path}L${n(x(c.xMax))} ${n(y(valueAt(s.samples, c.xMax, c.key)))}"/>`);
    });

    // Selective direct labels on the highlighted series
    c.marks.forEach((m) => {
      const mx = x(m.t);
      const my = y(m.v);
      const ly = my - 12 < VIZ.t ? my + 20 : my - 12;
      out.push(
        `<circle class="v-dot s1" cx="${n(mx)}" cy="${n(my)}" r="4.5"/>`,
        `<text class="v-label" x="${n(clamp(mx, VIZ.l + 22, VIZ.l + iw - 22))}" y="${n(ly)}" text-anchor="middle">${esc(m.label)}</text>`
      );
    });

    // End values; the secondary one only if it doesn't collide
    const ex = VIZ.l + iw;
    const ends = c.series.map((s) => ({ s, v: valueAt(s.samples, c.xMax, c.key) }));
    const prim = ends.find((e) => e.s.cls === 's1');
    ends.forEach((e) => {
      if (e !== prim && Math.abs(y(e.v) - y(prim.v)) < 12) return;
      out.push(
        `<circle class="v-dot ${e.s.cls}" cx="${n(ex)}" cy="${n(y(e.v))}" r="4"/>`,
        `<text class="v-label${e === prim ? '' : ' secondary'}" x="${n(ex + 9)}" y="${n(y(e.v) + 4)}">${fmt(e.v, c.digits)}</text>`
      );
    });

    // Crosshair + hit area
    out.push(
      `<g class="xhair" visibility="hidden"><line x1="0" x2="0" y1="${VIZ.t}" y2="${VIZ.t + ih}"/>` +
        c.series.map((s) => `<circle class="v-dot ${s.cls}" r="4.5" cx="0" cy="0"/>`).join('') +
        '</g>',
      `<rect class="hit" x="${VIZ.l - 10}" y="0" width="${iw + 20}" height="${h}"/>`
    );

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.innerHTML = out.join('');
    charts[id] = { fig, svg, w, iw, x, y, c };
  }

  function setHover(time, src) {
    hoverT = time;
    if (src) hoverSrc = src;
    updateCrosshair();
  }

  function updateCrosshair() {
    const tip = $('vizTip');
    const active = hoverT != null && thermoData;
    CHART_IDS.forEach((id) => {
      const ch = charts[id];
      const g = ch && ch.svg.querySelector('.xhair');
      if (!g) return;
      if (!active) {
        g.setAttribute('visibility', 'hidden');
        return;
      }
      g.setAttribute('visibility', 'visible');
      const X = ch.x(hoverT).toFixed(1);
      const line = g.querySelector('line');
      line.setAttribute('x1', X);
      line.setAttribute('x2', X);
      g.querySelectorAll('circle').forEach((dot, i) => {
        dot.setAttribute('cx', X);
        dot.setAttribute('cy', ch.y(valueAt(ch.c.series[i].samples, hoverT, ch.c.key)).toFixed(1));
      });
    });
    if (!active) {
      tip.hidden = true;
      return;
    }

    // One tooltip, both series: values lead, labels follow
    const L = I18N[state.lang];
    tip.replaceChildren();
    const head = document.createElement('div');
    head.className = 'tip-head';
    head.textContent = L.minutes(fmt(hoverT / 60));
    tip.append(head);
    [[1, thermoData.ok, L.withCorr], [2, thermoData.naive, L.withoutCorr]].forEach(([k, sim, label]) => {
      const row = document.createElement('div');
      row.className = 'tip-row';
      const key = document.createElement('i');
      key.className = `key key-${k}`;
      const val = document.createElement('strong');
      val.textContent = `${fmt(valueAt(sim.samples, hoverT, 'p'))} bar · ${fmt(valueAt(sim.samples, hoverT, 'tC'))} °C`;
      const lab = document.createElement('span');
      lab.textContent = label;
      row.append(key, val, lab);
      tip.append(row);
    });

    const ch = charts[hoverSrc] || charts.chartP;
    const secRect = $('thermoSection').getBoundingClientRect();
    const svgRect = ch.svg.getBoundingClientRect();
    const xPx = svgRect.left - secRect.left + (ch.x(hoverT) * svgRect.width) / ch.w;
    tip.hidden = false;
    let left = xPx + 14;
    if (left + tip.offsetWidth > secRect.width - 8) left = xPx - tip.offsetWidth - 14;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${svgRect.top - secRect.top + VIZ.t}px`;
  }

  function bindChart(id) {
    const fig = $(id);
    const hoverFromPointer = (e) => {
      const ch = charts[id];
      if (!ch || !thermoData) return;
      const rect = ch.svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) * ch.w) / rect.width;
      if (px < VIZ.l - 10 || px > VIZ.l + ch.iw + 10) {
        if (document.activeElement !== fig) setHover(null);
        return;
      }
      setHover(clamp((px - VIZ.l) / ch.iw, 0, 1) * ch.c.xMax, id);
    };
    fig.addEventListener('pointermove', hoverFromPointer);
    fig.addEventListener('pointerdown', hoverFromPointer);
    fig.addEventListener('pointerleave', (e) => {
      // On touch the tooltip stays after lifting the finger, until tapping elsewhere
      if (e.pointerType !== 'touch' && document.activeElement !== fig) setHover(null);
    });
    fig.addEventListener('focus', () => {
      if (thermoData) setHover(hoverT ?? thermoData.ok.fillEnd.t, id);
    });
    fig.addEventListener('blur', () => setHover(null));
    fig.addEventListener('keydown', (e) => {
      if (!thermoData) return;
      const stepSec = e.shiftKey ? 600 : 60;
      let time = hoverT ?? thermoData.ok.fillEnd.t;
      if (e.key === 'ArrowRight') time += stepSec;
      else if (e.key === 'ArrowLeft') time -= stepSec;
      else if (e.key === 'Home') time = 0;
      else if (e.key === 'End') time = thermoData.xMax;
      else if (e.key === 'Escape') return setHover(null);
      else return;
      e.preventDefault();
      setHover(clamp(time, 0, thermoData.xMax), id);
    });
  }

  // Table view: the accessible twin of both charts
  function buildTable() {
    const d = thermoData;
    const L = I18N[state.lang];
    const table = $('thermoTable');
    table.replaceChildren();
    const headRow = table.createTHead().insertRow();
    [L.colTime, L.colEvent, `${L.withCorr} · bar`, `${L.withCorr} · °C`, `${L.withoutCorr} · bar`, `${L.withoutCorr} · °C`]
      .forEach((txt) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = txt;
        headRow.append(th);
      });

    const rows = new Map([[0, L.evStart]]);
    d.ok.events.forEach((e) => rows.set(e.t, evLabel(e.type)));
    for (let time = 600; time < d.xMax; time += 600) if (!rows.has(time)) rows.set(time, '');

    const body = table.createTBody();
    const addRow = (cells) => {
      const tr = body.insertRow();
      cells.forEach((txt) => (tr.insertCell().textContent = txt));
    };
    [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([time, label]) => {
        addRow([
          fmt(time / 60), label,
          ...[d.ok, d.naive].flatMap((sim) => [fmt(valueAt(sim.samples, time, 'p')), fmt(valueAt(sim.samples, time, 'tC'))]),
        ]);
      });
    addRow(['–', L.evSettled, fmt(d.ok.pc), fmt(d.tAmb), fmt(d.naive.pc), fmt(d.tAmb)]);
  }

  // ---------- Inputs ----------
  function syncControls(skipId) {
    FIELDS.forEach((k) => {
      const input = $(k);
      if (k !== skipId) input.value = state[k];
      const slider = document.querySelector(`.slider[data-for="${k}"]`);
      if (slider) {
        slider.value = state[k];
        const min = +slider.min, max = +slider.max;
        const pct = ((Math.min(max, Math.max(min, +state[k])) - min) / (max - min)) * 100;
        slider.style.setProperty('--p', `${pct}%`);
      }
      document.querySelectorAll(`.chips[data-for="${k}"] button`).forEach((b) => {
        b.classList.toggle('active', parseFloat(b.dataset.value) === parseFloat(state[k]));
      });
    });
    TOGGLES.forEach((k) => ($(k).checked = !!state[k]));
    $('thermoBody').hidden = !state.thermoOn;
    document.querySelectorAll('.material-picker button').forEach((b) => {
      const on = b.dataset.material === state.material;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function setValue(key, value, sourceId) {
    state[key] = value;
    syncControls(sourceId);
    render();
    save();
  }

  function applyLang() {
    const dict = I18N[state.lang];
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const val = dict[el.dataset.i18n];
      if (typeof val === 'string') el.textContent = val;
    });
    document.title = dict.title;
    $('resultBar').title = dict.toResult;
    $('cylinder').setAttribute('aria-label', dict.cylinderAria);
    document.querySelector('.material-picker').setAttribute('aria-label', dict.cylType);
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === state.lang);
    });
  }

  function bind() {
    FIELDS.forEach((k) => {
      const input = $(k);
      input.addEventListener('input', (e) => setValue(k, e.target.value.replace(',', '.'), k));
      // Select the value on focus so a new one can be typed right away
      let keepSelection = false;
      input.addEventListener('pointerdown', () => (keepSelection = document.activeElement !== input));
      input.addEventListener('focus', () => {
        try { input.select(); } catch (_) { /* not supported for this input type */ }
      });
      input.addEventListener('mouseup', (e) => {
        if (keepSelection) e.preventDefault();
        keepSelection = false;
      });
    });
    TOGGLES.forEach((k) => {
      $(k).addEventListener('change', (e) => setValue(k, e.target.checked));
    });
    document.querySelectorAll('.slider').forEach((s) => {
      s.addEventListener('input', () => setValue(s.dataset.for, s.value));
    });
    document.querySelectorAll('.chips').forEach((group) => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-value]');
        if (btn) setValue(group.dataset.for, btn.dataset.value);
      });
    });
    document.querySelector('.material-picker').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-material]');
      if (btn) setValue('material', btn.dataset.material);
    });
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.addEventListener('click', () => {
        state.lang = b.dataset.lang;
        state.langChosen = true;
        applyLang();
        render();
        save();
      });
    });
    CHART_IDS.forEach(bindChart);
    document.addEventListener('pointerdown', (e) => {
      if (hoverT != null && !e.target.closest('.chart')) setHover(null);
    });
    watchResultBar();
    if (typeof ResizeObserver !== 'undefined') {
      let frame = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(drawThermoCharts);
      }).observe($('thermoSection'));
    }
  }

  load();
  // Phones start with the extra thermal settings folded away
  $('moreSettings').open = !window.matchMedia('(max-width: 900px)').matches;
  bind();
  applyLang();
  syncControls();
  render();
})();
