(() => {
  'use strict';

  const STORAGE_KEY = 'nitrox-topup-v1';
  // German if the device's primary language is German, otherwise English
  const deviceLang = () => {
    const primary = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return primary.toLowerCase().startsWith('de') ? 'de' : 'en';
  };
  const DEFAULTS = {
    curO2: 21, tgtO2: 32, size: 12, curP: 50, fillP: 200, lang: deviceLang(), langChosen: false,
    realGas: true, thermoOn: true, material: 'steel', tAmb: 20, rate: 10, waterBath: false, coolPause: false, airTopUp: false, airPause: 30,
    // Trimix fill order: 'he' (helium, then O2) or 'o2' (O2, then helium); air always last
    mode: 'nitrox', curHe: 0, tgtHe: 0, fillOrder: 'he', heCoolPause: false,
    // The mixes of the mode that is not shown (nitrox and trimix keep their own)
    otherMix: { curO2: 21, curHe: 0, tgtO2: 21, tgtHe: 35 },
    bmDepth: 60, bmPpO2: 1.4, bmEnd: 30, o2Narcotic: true,
  };

  const I18N = {
    de: {
      title: 'Nitrox Top-Up Rechner',
      titleTx: 'Trimix Top-Up Rechner',
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
      disclaimer: 'Rechenhilfe nach der Partialdruck-Methode (Luft = 21 % O₂). Ersetzt keine Ausbildung als Gasblender – Gemisch nach dem Füllen immer analysieren, bei Trimix O₂ und He.',
      cylinderAria: 'Flaschen-Visualisierung',
      fillO2To: 'O₂ füllen bis',
      thenAirTo: 'Dann mit Luft auffüllen bis',
      noAirNeeded: 'Keine Luft nötig',
      gaugeFrom: 'Manometer: von',
      barPureO2: 'bar reiner O₂',
      noO2Needed: 'Kein Sauerstoff nötig – nur Luft auffüllen.',
      moreSettings: 'Weitere Einstellungen',
      helium: 'Helium',
      n2Rest: (p) => `Rest Stickstoff: ${p} % N₂`,
      fillOrder: 'Füllreihenfolge',
      heFirst: 'Helium zuerst',
      o2First: 'Sauerstoff zuerst',
      legendHe: 'Helium',
      fillHeTo: 'Helium füllen bis',
      noHeNeeded: 'Kein Helium nötig',
      addHe: 'He zugeben',
      addHeCooled: 'He-Menge (abgekühlt)',
      litersHe: 'Liter He',
      heCoolPause: 'Nach He abkühlen lassen',
      pauseHeShort: 'Pause nach He',
      evHe: 'He fertig',
      stepHe: (to, add) => `Helium zugeben, bis das Manometer <strong>${to} bar</strong> zeigt <span class="muted">(+${add} bar)</span>`,
      stepHeHot: (to, cold) => `Helium zugeben, bis das Manometer <strong>${to} bar</strong> zeigt<span class="step-note">Das Gas ist dabei warm. Nach dem Abkühlen fällt der Druck auf ${cold} bar.</span>`,
      stepNoHe: 'Kein Helium nötig',
      naiveHowHe: (p) => `He bis ${p} bar`,
      rbHe: 'He bis',
      rbNoHe: 'Kein He nötig',
      drainHelium: (keep, cur) => `Zu viel Helium in der Flasche für das Zielgemisch. Flasche erst von <strong>${cur} bar</strong> auf <strong>${keep} bar</strong> ablassen.`,
      unreachable: 'Dieses Gemisch lässt sich mit Luft als Auffüllgas nicht mischen: Es hat zu wenig Sauerstoff im Verhältnis zum Stickstoff. Mehr Helium wählen.',
      hypoxic: (d) => `Hypoxisches Gemisch: nicht an der Oberfläche atmen. Mindesttiefe ${d} m (ppO₂ 0,18).`,
      approx: (mix) => `Das Zielgemisch ist nicht genau erreichbar: Auch eine leere oder abgelassene Flasche enthält noch 1 atm Gas. Erreichbar sind ca. <strong>${mix}</strong>.`,
      minDepth: 'Mindesttiefe (ppO₂ 0,18)',
      endLabel: (pp) => `END bei MOD ${pp}`,
      densityLabel: (pp) => `Gasdichte bei MOD ${pp}`,
      mixTx: (o2, he) => `${o2} % O₂ · ${he} % He`,
      errO2RangeTx: 'Sauerstoffanteil muss zwischen 5 % und 100 % liegen.',
      errHeRange: 'Heliumanteil muss zwischen 0 % und 95 % liegen.',
      errMixSum: 'Sauerstoff und Helium zusammen dürfen höchstens 100 % sein.',
      bestMixTitle: 'Bestes Gemisch berechnen',
      bmDepth: 'Zieltiefe',
      bmPpO2: 'Max. ppO₂',
      bmEnd: 'Gewünschte END',
      o2Narcotic: 'O₂ als narkotisch rechnen',
      bestMixApply: 'Als Ziel übernehmen',
      bestMixResult: (name, depth, modM, endM, dens) => `<strong>${name}</strong>für ${depth} m: MOD ${modM} m · END ${endM} m · Dichte ${dens} g/l`,
      bestMixInvalid: 'Bitte Tiefe (10–150 m), ppO₂ (1,0–1,6) und END prüfen.',
      installApp: 'App installieren',
      installHintIOS: 'Zum Installieren unten auf <svg class="share-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11v9h12v-9"/></svg> „Teilen“ tippen und dann „Zum Home-Bildschirm“ wählen.',
      realGasTitle: 'Realgas-Korrektur',
      realGasHint: 'Genauer bei hohen Drücken: Sauerstoff lässt sich stärker zusammendrücken als ein ideales Gas, Luft weniger.',
      realGasHintTx: 'Genauer bei hohen Drücken: Sauerstoff lässt sich stärker zusammendrücken als ein ideales Gas, Luft weniger und Helium deutlich weniger.',
      idealCompare: (p) => `Ohne Realgas-Korrektur: ${p} bar`,
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
      airTopUp: 'Nach dem Luftfüllen abkühlen lassen und nachfüllen',
      airPause: 'Abkühlpause',
      evAirFirst: 'Luft fertig',
      evTopUp: 'Nachgefüllt',
      topUpShort: (m) => `Nachfüllen nach ${m} min`,
      topUpLine: (m, p, to) => `Nach ${m} min Abkühlen fällt es auf ca. ${p} bar – dann nachfüllen bis <strong>${to} bar</strong>`,
      stepAirFirst: (to) => `Mit Luft auffüllen, bis das Manometer <strong>${to} bar</strong> zeigt<span class="step-note">Erst einmal nur bis zum Zieldruck. Das Gas ist dabei warm, nach der Pause wird nachgefüllt.</span>`,
      stepAirTopUp: (to, cold) => `Mit Luft nachfüllen, bis das Manometer <strong>${to} bar</strong> zeigt<span class="step-note">Nach dem Abkühlen fällt der Druck auf ${cold} bar.</span>`,
      naiveHowTopUp: (p) => `Luft bis ${p} bar und nach der Pause wieder bis ${p} bar`,
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
      naiveText: (how, p, mix, tp, tmix) => `<strong>Ohne Korrektur</strong> – also ${how} am warmen Manometer – wären nach dem Abkühlen nur <strong>${p} bar</strong> mit <strong>${mix}</strong> in der Flasche. Soll: ${tp} bar mit ${tmix}.`,
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
      errAirPause: 'Die Abkühlpause muss zwischen 5 und 240 min liegen.',
      drainLean: (keep, cur) => `Das Restgas enthält zu viel Sauerstoff für das Zielgemisch. Flasche erst von <strong>${cur} bar</strong> auf <strong>${keep} bar</strong> ablassen.`,
      drainRich: (keep, cur) => `Zu viel Stickstoff in der Flasche – selbst reiner O₂ reicht nicht. Flasche erst von <strong>${cur} bar</strong> auf <strong>${keep} bar</strong> ablassen.`,
      stepDrain: (keep) => `Flasche auf <strong>${keep} bar</strong> ablassen`,
      stepO2: (to, add) => `Reinen O₂ zugeben, bis das Manometer <strong>${to} bar</strong> zeigt <span class="muted">(+${add} bar)</span>`,
      stepAir: (to, add) => `Mit Luft auffüllen, bis das Manometer <strong>${to} bar</strong> zeigt <span class="muted">(+${add} bar)</span>`,
      stepO2Hot: (to, cold) => `Reinen O₂ zugeben, bis das Manometer <strong>${to} bar</strong> zeigt<span class="step-note">Das Gas ist dabei warm. Nach dem Abkühlen fällt der Druck auf ${cold} bar – das ist die richtige Menge O₂.</span>`,
      stepPause: (dur, p) => `Abkühlen lassen (ca. ${dur}) – das Manometer fällt auf ca. <strong>${p} bar</strong>`,
      stepAirHot: (to, cold) => `Mit Luft auffüllen, bis das Manometer <strong>${to} bar</strong> zeigt<span class="step-note">Das Gas ist dabei warm. Nach dem Abkühlen fällt der Druck auf ${cold} bar.</span>`,
      stepCool: (dur, p, mix) => `Abkühlen lassen (ca. ${dur}) – das Manometer fällt auf ca. <strong>${p} bar</strong>. Dann analysieren – Soll: <strong>${mix}</strong>`,
      stepNoO2: 'Kein Sauerstoff nötig',
      lessThanMinute: '< 1 min',
      topUpFirstLine: (m, p) => `Erst ${m} min abkühlen lassen (fällt auf ca. ${p} bar), dann mit Luft auffüllen`,
      stepNoAir: 'Keine Luft nötig',
      stepAnalyze: (mix) => `Abkühlen lassen, Gemisch analysieren – Soll: <strong>${mix}</strong>`,
    },
    en: {
      title: 'Nitrox Top-Up Calculator',
      titleTx: 'Trimix Top-Up Calculator',
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
      disclaimer: 'Calculation aid using the partial pressure method (air = 21 % O₂). Not a substitute for gas blender training – always analyse the mix after filling, for trimix both O₂ and He.',
      cylinderAria: 'Cylinder visualisation',
      fillO2To: 'Fill O₂ up to',
      thenAirTo: 'Then top up with air to',
      noAirNeeded: 'No air needed',
      gaugeFrom: 'Gauge: from',
      barPureO2: 'bar pure O₂',
      noO2Needed: 'No oxygen needed – top up with air only.',
      moreSettings: 'More settings',
      helium: 'Helium',
      n2Rest: (p) => `Remaining nitrogen: ${p} % N₂`,
      fillOrder: 'Fill order',
      heFirst: 'Helium first',
      o2First: 'Oxygen first',
      legendHe: 'Helium',
      fillHeTo: 'Fill helium up to',
      noHeNeeded: 'No helium needed',
      addHe: 'Add He',
      addHeCooled: 'He amount (cooled)',
      litersHe: 'litres He',
      heCoolPause: 'Let cool after helium',
      pauseHeShort: 'pause after He',
      evHe: 'He done',
      stepHe: (to, add) => `Add helium until the gauge reads <strong>${to} bar</strong> <span class="muted">(+${add} bar)</span>`,
      stepHeHot: (to, cold) => `Add helium until the gauge reads <strong>${to} bar</strong><span class="step-note">The gas is warm at this point. Once it cools, the pressure drops to ${cold} bar.</span>`,
      stepNoHe: 'No helium needed',
      naiveHowHe: (p) => `helium to ${p} bar`,
      rbHe: 'He to',
      rbNoHe: 'No He needed',
      drainHelium: (keep, cur) => `Too much helium in the cylinder for the requested mix. Bleed the cylinder from <strong>${cur} bar</strong> down to <strong>${keep} bar</strong> first.`,
      unreachable: 'This mix cannot be made with air as the top-up gas: it has too little oxygen compared to nitrogen. Choose more helium.',
      hypoxic: (d) => `Hypoxic mix: do not breathe it at the surface. Minimum depth ${d} m (ppO₂ 0.18).`,
      approx: (mix) => `The requested mix cannot be reached exactly: even an empty or bled cylinder still holds 1 atm of gas. You will get about <strong>${mix}</strong>.`,
      minDepth: 'Minimum depth (ppO₂ 0.18)',
      endLabel: (pp) => `END at MOD ${pp}`,
      densityLabel: (pp) => `Gas density at MOD ${pp}`,
      mixTx: (o2, he) => `${o2} % O₂ · ${he} % He`,
      errO2RangeTx: 'Oxygen content must be between 5 % and 100 %.',
      errHeRange: 'Helium content must be between 0 % and 95 %.',
      errMixSum: 'Oxygen and helium together must not exceed 100 %.',
      bestMixTitle: 'Find the best mix',
      bmDepth: 'Target depth',
      bmPpO2: 'Max. ppO₂',
      bmEnd: 'Target END',
      o2Narcotic: 'Count O₂ as narcotic',
      bestMixApply: 'Use as target',
      bestMixResult: (name, depth, modM, endM, dens) => `<strong>${name}</strong>for ${depth} m: MOD ${modM} m · END ${endM} m · density ${dens} g/l`,
      bestMixInvalid: 'Please check depth (10–150 m), ppO₂ (1.0–1.6) and END.',
      installApp: 'Install app',
      installHintIOS: 'To install, tap <svg class="share-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11v9h12v-9"/></svg> “Share” and then “Add to Home Screen”.',
      realGasTitle: 'Real-gas correction',
      realGasHint: 'More accurate at high pressures: oxygen compresses more than an ideal gas, air less.',
      realGasHintTx: 'More accurate at high pressures: oxygen compresses more than an ideal gas, air less and helium much less.',
      idealCompare: (p) => `Without real-gas correction: ${p} bar`,
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
      airTopUp: 'Let cool after the air fill, then top up',
      airPause: 'Cooling pause',
      evAirFirst: 'Air done',
      evTopUp: 'Topped up',
      topUpShort: (m) => `top-up after ${m} min`,
      topUpLine: (m, p, to) => `After cooling for ${m} min it drops to about ${p} bar – then top up to <strong>${to} bar</strong>`,
      stepAirFirst: (to) => `Top up with air until the gauge reads <strong>${to} bar</strong><span class="step-note">Only up to the target pressure for now. The gas is warm; you top up after the pause.</span>`,
      stepAirTopUp: (to, cold) => `Top up with air again until the gauge reads <strong>${to} bar</strong><span class="step-note">Once it cools, the pressure drops to ${cold} bar.</span>`,
      naiveHowTopUp: (p) => `air to ${p} bar and again to ${p} bar after the pause`,
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
      naiveText: (how, p, mix, tp, tmix) => `<strong>Without correction</strong> – filling ${how} on the warm gauge – the cylinder would hold only <strong>${p} bar</strong> at <strong>${mix}</strong> after cooling. Target: ${tp} bar at ${tmix}.`,
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
      errAirPause: 'The cooling pause must be between 5 and 240 min.',
      drainLean: (keep, cur) => `The residual gas holds too much oxygen for the requested mix. Bleed the cylinder from <strong>${cur} bar</strong> down to <strong>${keep} bar</strong> first.`,
      drainRich: (keep, cur) => `Too much nitrogen in the cylinder – even pure O₂ won't get there. Bleed the cylinder from <strong>${cur} bar</strong> down to <strong>${keep} bar</strong> first.`,
      stepDrain: (keep) => `Bleed cylinder down to <strong>${keep} bar</strong>`,
      stepO2: (to, add) => `Add pure O₂ until the gauge reads <strong>${to} bar</strong> <span class="muted">(+${add} bar)</span>`,
      stepAir: (to, add) => `Top up with air until the gauge reads <strong>${to} bar</strong> <span class="muted">(+${add} bar)</span>`,
      stepO2Hot: (to, cold) => `Add pure O₂ until the gauge reads <strong>${to} bar</strong><span class="step-note">The gas is warm at this point. Once it cools, the pressure drops to ${cold} bar – that is the right amount of O₂.</span>`,
      stepPause: (dur, p) => `Let it cool (approx. ${dur}) – the gauge drops to about <strong>${p} bar</strong>`,
      stepAirHot: (to, cold) => `Top up with air until the gauge reads <strong>${to} bar</strong><span class="step-note">The gas is warm at this point. Once it cools, the pressure drops to ${cold} bar.</span>`,
      stepCool: (dur, p, mix) => `Let it cool (approx. ${dur}) – the gauge drops to about <strong>${p} bar</strong>. Then analyse – target: <strong>${mix}</strong>`,
      stepNoO2: 'No oxygen needed',
      lessThanMinute: '< 1 min',
      topUpFirstLine: (m, p) => `Let it cool for ${m} min first (drops to about ${p} bar), then top up with air`,
      stepNoAir: 'No air needed',
      stepAnalyze: (mix) => `Let it cool, analyse the mix – target: <strong>${mix}</strong>`,
    },
  };

  const MAT_LABEL = { steel: 'matSteel', alu: 'matAlu', carbon: 'matCarbon', steelCarbon: 'matSteelCarbon' };
  const MAT_HINT = { steel: 'hintSteel', alu: 'hintAlu', carbon: 'hintCarbon', steelCarbon: 'hintSteelCarbon' };

  // A missing element (e.g. from an older cached index.html) gets a detached stand-in
  // instead of stopping the whole app
  const $ = (id) => document.getElementById(id) || document.createElement('div');
  const FIELDS = ['curO2', 'tgtO2', 'curHe', 'tgtHe', 'size', 'curP', 'fillP', 'tAmb', 'rate', 'airPause', 'bmDepth', 'bmPpO2', 'bmEnd'];
  const TOGGLES = ['realGas', 'thermoOn', 'waterBath', 'heCoolPause', 'coolPause', 'airTopUp', 'o2Narcotic'];
  const state = { ...DEFAULTS };

  // ---------- Storage ----------
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!saved || typeof saved !== 'object') return;
      // Own keys only: a stored "toString" or "constructor" must not count as a language or material
      const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
      for (const k of Object.keys(DEFAULTS)) {
        // The real-gas correction and the thermal model always start switched on
        if (k === 'realGas' || k === 'thermoOn') continue;
        // Keep a saved language only if the user picked it; otherwise follow the device
        if (k === 'lang' && !saved.langChosen) continue;
        if (own(saved, k)) state[k] = saved[k];
      }
      if (!own(I18N, state.lang)) state.lang = DEFAULTS.lang;
      if (!own(MAT_LABEL, state.material)) state.material = DEFAULTS.material;
      if (state.mode !== 'trimix') state.mode = 'nitrox';
      if (state.fillOrder !== 'o2') state.fillOrder = 'he';
      // Only the four mix fields, whatever else a stored object holds
      const other = state.otherMix && typeof state.otherMix === 'object' ? state.otherMix : {};
      state.otherMix = Object.fromEntries(Object.keys(DEFAULTS.otherMix).map((k) => {
        const ok = own(other, k) && (typeof other[k] === 'string' || typeof other[k] === 'number');
        return [k, ok ? other[k] : DEFAULTS.otherMix[k]];
      }));
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
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const durText = (sec) => {
    if (sec == null) return t('moreThan')(240);
    if (sec < 60) return t('lessThanMinute');
    return t('minutes')(fmtInt(sec / 60));
  };

  function validate(v) {
    const trimix = state.mode === 'trimix';
    if ([v.curO2, v.tgtO2].some((x) => !Number.isFinite(x) || x < (trimix ? 5 : 21) || x > 100)) {
      return trimix ? 'errO2RangeTx' : 'errO2Range';
    }
    if (trimix) {
      if ([v.curHe, v.tgtHe].some((x) => !Number.isFinite(x) || x < 0 || x > 95)) return 'errHeRange';
      if (v.curO2 + v.curHe > 100 || v.tgtO2 + v.tgtHe > 100) return 'errMixSum';
    }
    if (!Number.isFinite(v.size) || v.size <= 0 || v.size > 100) return 'errSize';
    if ([v.curP, v.fillP].some((x) => !Number.isFinite(x) || x < 0 || x > 350)) return 'errPressure';
    if (v.fillP <= v.curP) return 'errFillLower';
    if (state.thermoOn) {
      if (!Number.isFinite(v.tAmb) || v.tAmb < -10 || v.tAmb > 45) return 'errTemp';
      if (!Number.isFinite(v.rate) || v.rate < 0.5 || v.rate > 60) return 'errRate';
      if (state.airTopUp && (!Number.isFinite(v.airPause) || v.airPause < 5 || v.airPause > 240)) return 'errAirPause';
    }
    return null;
  }

  // Helium and O2 steps that add gas, in fill order, each with its pause switch; a
  // pause only happens if more gas follows
  function gasStages(r, needed, airFollows) {
    const steps = Blend.fillSteps(r).filter((s) => s.gas !== 'air' && needed(s.gas));
    const pauseSwitch = { he: state.heCoolPause, o2: state.coolPause };
    return steps.map((s, i) => ({ gas: s.gas, value: s.to, pauseAfter: pauseSwitch[s.gas] && (i < steps.length - 1 || airFollows) }));
  }

  /**
   * Runs the thermal model twice: with correction (stop each stage at the gas
   * amount the cold calculation asks for) and without (stop when the warm gauge
   * shows the cold target value). Order: helium and O2 in fill order, then air.
   */
  function runThermo(v, r, needs) {
    const topUp = state.airTopUp && needs.air;
    const run = (stopAt) => {
      const stages = gasStages(r, (gas) => needs[gas], needs.air).map((st) => ({ ...st, stopAt }));
      if (topUp) {
        // Air up to the target on the warm gauge, cool for a while, then top up
        stages.push({ gas: 'air', stopAt: 'gauge', value: v.fillP, pauseAfter: true, pauseMinutes: v.airPause });
        stages.push({ gas: 'air', id: 'topUp', stopAt, value: v.fillP });
      } else if (needs.air) {
        stages.push({ gas: 'air', stopAt, value: v.fillP });
      }
      return Thermo.simulateFill({
        liters: v.size,
        material: state.material,
        tAmbC: v.tAmb,
        rate: v.rate,
        waterBath: state.waterBath,
        keep: r.keep,
        f1: v.curO2 / 100,
        h1: v.curHe / 100,
        stages,
      });
    };
    const ok = run('gas');
    const naive = run('gauge');
    const event = (type, stage) => ok.events.find((e) => e.type === type && (stage == null || e.stage === stage));
    // Seconds after the end of filling until the gas is within 2 K of ambient (0 when it
    // already is, e.g. a small fill or a water bath)
    const cooled = ok.samples.find((s) => s.t >= ok.fillEnd.t && s.tC - v.tAmb < 2);
    // The warm gauge can already be above the target before the air; then the first
    // fill adds nothing and the procedure is just: cool down, then fill
    let skipFirstAir = false;
    if (topUp) {
      const fills = ok.events.filter((e) => e.type === 'he' || e.type === 'o2');
      const before = fills[fills.length - 1];
      skipFirstAir = event('air').pc - (before ? before.pc : r.keep) < 0.05;
    }
    return { ok, naive, event, topUp, skipFirstAir, coolSec: cooled ? cooled.t - ok.fillEnd.t : null };
  }

  // Warm gauge readings at the end of the helium and O2 steps for the ideal-gas targets
  function idealWarm(v, rIdeal) {
    const stages = gasStages(rIdeal, (gas) => rIdeal[gas] > 0.05, false).map((st) => ({ ...st, stopAt: 'gas' }));
    const sim = Thermo.simulateFill({
      liters: v.size,
      material: state.material,
      tAmbC: v.tAmb,
      rate: v.rate,
      waterBath: state.waterBath,
      keep: rIdeal.keep,
      f1: v.curO2 / 100,
      h1: v.curHe / 100,
      stages,
      coolMinutes: 0,
    });
    const end = (type) => sim.events.find((e) => e.type === type);
    return { he: end('he') && end('he').p, o2: end('o2') && end('o2').p };
  }

  // Best mix for the depth, ppO2 and END in the "best mix" card (null if invalid)
  function currentBestMix() {
    const depth = parseFloat(state.bmDepth);
    const ppO2 = parseFloat(state.bmPpO2);
    const endTarget = parseFloat(state.bmEnd);
    if (!(depth >= 10 && depth <= 150) || !(ppO2 >= 1 && ppO2 <= 1.6) || !(endTarget >= 0 && endTarget <= 60)) return null;
    return { ...Blend.bestMix(depth, ppO2, endTarget, state.o2Narcotic), depth };
  }

  function renderBestMix(L) {
    const m = currentBestMix();
    $('bestMixApply').disabled = !m;
    if (!m) {
      $('bestMixText').textContent = L.bestMixInvalid;
      return;
    }
    const name = m.he > 0 ? `Tx ${m.o2}/${m.he}` : `EAN${m.o2}`;
    const endM = Blend.end(m.depth, m.o2 / 100, m.he / 100, state.o2Narcotic);
    const dens = Blend.density(m.depth, m.o2 / 100, m.he / 100);
    // MOD at the chosen ppO2; with the O2 rounded down it is never shallower than the depth
    const modM = Blend.mod(m.o2 / 100, parseFloat(state.bmPpO2));
    $('bestMixText').innerHTML = L.bestMixResult(name, fmtAuto(m.depth), fmt(modM), fmt(endM), fmt(dens));
  }

  // ---------- Rendering ----------
  const CYL = { top: 70, bottom: 400, x: 40, w: 110 };

  // Shows an input error or an unreachable target instead of results
  function showProblem(L, message) {
    const errBox = $('error');
    errBox.textContent = message;
    errBox.hidden = false;
    ['drainAlert', 'approxAlert', 'drainBadge', 'warmBadge', 'warmBadgeAir', 'warmBadgeHe', 'heroCold', 'airCold', 'heCold',
      'heroIdeal', 'heIdeal', 'airTopUpRow', 'hypoxicAlert', 'heroNone', 'factMinDepthBox'].forEach((id) => ($(id).hidden = true));
    // The cards show their empty state, not what the last result said
    ['heroSub', 'heroValue', 'heroHeValue', 'heroAirValue'].forEach((id) => ($(id).hidden = false));
    ['heroHe', 'heroO2', 'heroAir'].forEach((id) => $(id).classList.remove('dim'));
    $('factDensityBox').classList.remove('warn', 'danger');
    $('heroHeLabel').textContent = L.fillHeTo;
    $('heroAirLabel').textContent = L.thenAirTo;
    $('o2DeltaLabel').textContent = L.barPureO2;
    $('resultTiles').classList.add('dim');
    document.querySelector('.hero').classList.add('dim');
    ['o2Bar', 'airBar', 'heBar', 'o2L', 'airL', 'heL', 'factMix', 'factTotal', 'factMod14', 'factMod16', 'factEnd',
      'factDensity', 'factMinDepth', 'o2Target', 'o2From', 'o2TargetSub', 'o2Delta', 'airTarget', 'heTarget']
      .forEach((id) => ($(id).textContent = '–'));
    $('steps').innerHTML = '';
    setGauge(null);
    drawCylinder(null);
    renderThermo(null);
    updateResultBar({ error: message });
  }

  function render() {
    const v = {};
    FIELDS.forEach((k) => (v[k] = parseFloat(state[k])));
    const trimix = state.mode === 'trimix';
    if (!trimix) {
      v.curHe = 0;
      v.tgtHe = 0;
    }
    const L = I18N[state.lang];
    const num = (x) => (Number.isFinite(x) ? fmtAuto(x) : '–');

    $('materialHint').textContent = L[MAT_HINT[state.material]];
    $('factMod14Label').textContent = `MOD ppO₂ ${fmt(1.4)}`;
    $('factMod16Label').textContent = `MOD ppO₂ ${fmt(1.6)}`;
    $('factEndLabel').textContent = L.endLabel(fmt(1.4));
    $('factDensityLabel').textContent = L.densityLabel(fmt(1.4));
    // With the thermal model on, the small tiles show amounts after cooling, not the warm gauge rise
    $('heTileLabel').textContent = state.thermoOn ? L.addHeCooled : L.addHe;
    $('o2TileLabel').textContent = state.thermoOn ? L.addO2Cooled : L.addO2;
    $('airTileLabel').textContent = state.thermoOn ? L.addAirCooled : L.addAir;
    // No negative nitrogen while O2 + He is over 100 %; rounding removes floating point
    // dust such as 100 − 64.4 − 35.6 = −7e‑15
    const n2Rest = (o2, he) => {
      const n2 = Math.round((100 - o2 - he) * 1e6) / 1e6;
      return L.n2Rest(n2 >= 0 ? num(Math.max(0, n2)) : '–');
    };
    $('curN2').textContent = n2Rest(v.curO2, v.curHe);
    $('tgtN2').textContent = n2Rest(v.tgtO2, v.tgtHe);
    $('settingsSummary').textContent = [
      `${num(v.tAmb)} °C`, `${num(v.rate)} bar/min`, state.waterBath && L.waterBath,
      trimix && state.heCoolPause && L.pauseHeShort, state.coolPause && L.pauseShort,
      state.airTopUp && L.topUpShort(num(v.airPause)),
    ].filter(Boolean).join(' · ');
    renderBestMix(L);

    const err = validate(v);
    // Make an invalid field in the folded "More settings" visible
    if (err === 'errTemp' || err === 'errRate' || err === 'errAirPause') $('moreSettings').open = true;
    markInvalid(err, v);
    if (err) {
      showProblem(L, L[err]);
      return;
    }

    // Real gas: amounts from the compressibility factor at the (cooled) cylinder temperature
    const tK = (state.thermoOn ? v.tAmb : 20) + 273.15;
    const calc = {
      curO2: v.curO2, curHe: v.curHe, tgtO2: v.tgtO2, tgtHe: v.tgtHe, curP: v.curP, fillP: v.fillP, size: v.size,
      order: trimix ? state.fillOrder : 'he',
    };
    const r = state.realGas ? Blend.real(calc, tK) : Blend.ideal(calc);
    if (r.unreachable) {
      showProblem(L, L.unreachable);
      return;
    }
    $('error').hidden = true;
    $('resultTiles').classList.remove('dim');
    document.querySelector('.hero').classList.remove('dim');

    // 1 atm stays in an empty or bled cylinder, so the requested mix may only be nearly
    // reached; then everything about the gas in the cylinder uses the mix actually reached
    const approx = Math.abs(r.finalO2 - v.tgtO2) > 0.05 || Math.abs(r.finalHe - v.tgtHe) > 0.05;
    const mix = approx ? { o2: r.finalO2, he: r.finalHe } : { o2: v.tgtO2, he: v.tgtHe };
    const mixLabel = (o2, he) => (trimix ? L.mixTx(fmt(o2), fmt(he)) : `${fmt(o2)} % O₂`);
    const mixText = mixLabel(mix.o2, mix.he);
    $('approxAlert').hidden = !approx;
    if (approx) $('approxAlert').innerHTML = L.approx(mixText);

    const needs = { he: r.he > 0.05, o2: r.o2 > 0.05, air: r.air > 0.05 };
    // Cold gauge readings before and after each step, in fill order
    const fill = Blend.fillSteps(r);
    const step = Object.fromEntries(fill.map((st) => [st.gas, st]));
    const afterHe = step.he.to;
    const afterO2 = step.o2.to;
    // Helium (trimix only) and O2 in fill order
    const gasOrder = fill.map((st) => st.gas).filter((gas) => gas === 'o2' || (gas === 'he' && trimix));
    // No thermal model when nothing is filled (e.g. 50 -> 50.01 bar)
    const th = state.thermoOn && (needs.he || needs.o2 || needs.air) ? runThermo(v, r, needs) : null;
    // Gauge readings to fill to: warm values when the thermal model is on
    const gaugeHe = th && needs.he ? th.event('he').p : afterHe;
    const gaugeO2 = th && needs.o2 ? th.event('o2').p : afterO2;
    const gaugeEnd = th ? th.ok.fillEnd.p : v.fillP;
    // Gauge reading when the O2 step starts: after helium and its pause if helium comes first
    const heBefore = th && needs.he && gasOrder[0] === 'he' ? th.event('pause', 'he') || th.event('he') : null;
    const o2Start = heBefore ? heBefore.p : step.o2.from;

    // Comparison with the ideal-gas result, on the same basis as the big numbers
    const rIdeal = state.realGas ? Blend.ideal(calc) : null;
    const idealOk = rIdeal && !rIdeal.unreachable;
    const showIdealO2 = needs.o2 && idealOk && rIdeal.o2 > 0.05;
    const showIdealHe = trimix && needs.he && idealOk && rIdeal.he > 0.05;
    const warmIdeal = th && (showIdealO2 || showIdealHe) ? idealWarm(v, rIdeal) : null;
    const idealStep = idealOk ? Object.fromEntries(Blend.fillSteps(rIdeal).map((st) => [st.gas, st])) : null;

    // Hero: helium (trimix only)
    $('heTarget').textContent = fmt(gaugeHe);
    $('heroHeLabel').textContent = needs.he ? L.fillHeTo : L.noHeNeeded;
    $('heroHeValue').hidden = !needs.he;
    $('heroHe').classList.toggle('dim', !needs.he);
    $('warmBadgeHe').hidden = !(th && needs.he);
    $('heCold').hidden = !(th && needs.he);
    $('heHeat').textContent = L.heatDelta(fmt(gaugeHe - afterHe));
    $('heColdText').textContent = L.coldEq(fmt(afterHe));
    $('heIdeal').hidden = !showIdealHe;
    if (showIdealHe) $('heIdeal').textContent = L.idealCompare(fmt(warmIdeal ? warmIdeal.he : idealStep.he.to));

    // Hero: O2
    $('o2Target').textContent = fmt(gaugeO2);
    $('o2From').textContent = fmt(o2Start);
    $('o2TargetSub').textContent = fmt(gaugeO2);
    $('o2Delta').textContent = th ? fmtInt(r.litersO2 ?? r.o2 * v.size) : `+${fmt(r.o2)}`;
    $('o2DeltaLabel').textContent = th ? L.litersO2 : L.barPureO2;
    $('heroSub').hidden = !needs.o2;
    $('heroNone').hidden = needs.o2;
    $('heroValue').hidden = !needs.o2;
    $('heroO2').classList.toggle('dim', !needs.o2);
    $('warmBadge').hidden = !(th && needs.o2);
    $('heroCold').hidden = !(th && needs.o2);
    $('o2Heat').textContent = L.heatDelta(fmt(gaugeO2 - afterO2));
    $('o2ColdText').textContent = L.coldEq(fmt(afterO2));
    $('heroIdeal').hidden = !showIdealO2;
    if (showIdealO2) $('heroIdeal').textContent = L.idealCompare(fmt(warmIdeal ? warmIdeal.o2 : idealStep.o2.to));
    $('drainBadge').hidden = !r.drain;
    if (r.drain) $('drainBadge').textContent = L.drainFirst(fmt(r.keep));
    setGauge(r, v.fillP);

    // Hero: air
    $('heroAirLabel').textContent = needs.air ? L.thenAirTo : L.noAirNeeded;
    $('heroAirValue').hidden = !needs.air;
    $('heroAir').classList.toggle('dim', !needs.air);
    // Two-step fill: the first fill goes only up to the target, the top-up value follows
    const topUp = th && th.topUp;
    const skipFirst = topUp && th.skipFirstAir;
    $('airTarget').textContent = fmt(topUp && !skipFirst ? v.fillP : gaugeEnd);
    $('airTopUpRow').hidden = !topUp;
    $('airHeat').hidden = !!topUp;
    if (topUp) {
      const afterPause = fmt(th.event('pause', 'air').p);
      $('airTopUpRow').innerHTML = skipFirst
        ? L.topUpFirstLine(fmtAuto(v.airPause), afterPause)
        : L.topUpLine(fmtAuto(v.airPause), afterPause, fmt(gaugeEnd));
    }
    $('warmBadgeAir').hidden = !(th && needs.air);
    $('airCold').hidden = !(th && needs.air);
    $('airHeat').textContent = L.heatDelta(fmt(gaugeEnd - v.fillP));
    $('airColdText').textContent = L.coldEq(fmt(v.fillP));

    $('heBar').textContent = fmt(r.he);
    $('o2Bar').textContent = fmt(r.o2);
    $('airBar').textContent = fmt(r.air);
    $('heL').textContent = fmtInt(r.litersHe ?? r.he * v.size);
    $('o2L').textContent = fmtInt(r.litersO2 ?? r.o2 * v.size);
    $('airL').textContent = fmtInt(r.litersAir ?? r.air * v.size);

    const drainBox = $('drainAlert');
    if (r.drain) {
      const message = { lean: L.drainLean, rich: L.drainRich, helium: L.drainHelium }[r.drain];
      drainBox.innerHTML = message(fmt(r.keep), fmt(v.curP));
      drainBox.hidden = false;
    } else {
      drainBox.hidden = true;
    }

    // Steps
    const steps = [];
    if (r.drain) steps.push(['s-drain', L.stepDrain(fmt(r.keep))]);
    if (th) {
      // A pause shorter than a minute means the gas was already cool: no step for it
      const pauseStep = (stage) => {
        const pause = th.event('pause', stage);
        const start = th.event(stage);
        if (pause && pause.t - start.t >= 60) steps.push(['s-pause', L.stepPause(durText(pause.t - start.t), fmt(pause.p))]);
      };
      gasOrder.forEach((gas) => {
        if (gas === 'he') steps.push(['s-he', needs.he ? L.stepHeHot(fmt(gaugeHe), fmt(afterHe)) : L.stepNoHe]);
        else steps.push(['s-o2', needs.o2 ? L.stepO2Hot(fmt(gaugeO2), fmt(afterO2)) : L.stepNoO2]);
        if (needs[gas]) pauseStep(gas);
      });
      if (topUp) {
        const airPause = th.event('pause', 'air');
        if (!skipFirst) steps.push(['s-air', L.stepAirFirst(fmt(v.fillP))]);
        steps.push(['s-pause', L.stepPause(durText(airPause.t - th.event('air').t), fmt(airPause.p))]);
        steps.push(['s-air', (skipFirst ? L.stepAirHot : L.stepAirTopUp)(fmt(gaugeEnd), fmt(v.fillP))]);
      } else {
        steps.push(['s-air', needs.air ? L.stepAirHot(fmt(gaugeEnd), fmt(v.fillP)) : L.stepNoAir]);
      }
      steps.push(['s-analyze', L.stepCool(durText(th.coolSec), fmt(v.fillP), mixText)]);
    } else {
      gasOrder.forEach((gas) => {
        if (gas === 'he') steps.push(['s-he', needs.he ? L.stepHe(fmt(afterHe), fmt(r.he)) : L.stepNoHe]);
        else steps.push(['s-o2', needs.o2 ? L.stepO2(fmt(afterO2), fmt(r.o2)) : L.stepNoO2]);
      });
      steps.push(['s-air', needs.air ? L.stepAir(fmt(v.fillP), fmt(r.air)) : L.stepNoAir]);
      steps.push(['s-analyze', L.stepAnalyze(mixText)]);
    }
    $('steps').innerHTML = steps.map(([cls, html]) => `<li class="${cls}"><span>${html}</span></li>`).join('');

    // Facts
    const f2 = mix.o2 / 100;
    const fHe = mix.he / 100;
    $('factMix').textContent = mixLabel(r.finalO2, r.finalHe);
    $('factTotal').textContent = `${fmtInt(r.litersTotal ?? v.fillP * v.size)} L`;
    $('factMod14').textContent = `${fmt((1.4 / f2 - 1) * 10)} m`;
    $('factMod16').textContent = `${fmt((1.6 / f2 - 1) * 10)} m`;
    const hypoxic = trimix && mix.o2 < 18;
    $('hypoxicAlert').hidden = !hypoxic;
    $('factMinDepthBox').hidden = !hypoxic;
    if (trimix) {
      const mod14 = Blend.mod(f2, 1.4);
      const dens = Blend.density(mod14, f2, fHe);
      $('factEnd').textContent = `${fmt(Blend.end(mod14, f2, fHe, state.o2Narcotic))} m`;
      $('factDensity').textContent = `${fmt(dens)} g/l`;
      $('factDensityBox').classList.toggle('warn', dens > 5.2 && dens <= 6.2);
      $('factDensityBox').classList.toggle('danger', dens > 6.2);
      $('factMinDepth').textContent = `${fmt(Blend.minDepth(f2))} m`;
      if (hypoxic) $('hypoxicAlert').textContent = L.hypoxic(fmt(Blend.minDepth(f2)));
    }

    drawCylinder(r, v);
    updateResultBar({
      // Warnings screen readers must hear too: hypoxic mix, target only nearly reachable
      notes: ['hypoxicAlert', 'approxAlert'].filter((id) => !$(id).hidden).map((id) => $(id).textContent.replace(/\.$/, '')),
      drain: r.drain ? fmt(r.keep) : null, gasOrder, needs, he: fmt(gaugeHe), o2: fmt(gaugeO2),
      // On narrow phones the two-step value may wrap after the arrow, nowhere else
      air: topUp && !skipFirst ? `${fmt(v.fillP)}\u00a0→ ${fmt(gaugeEnd)}` : fmt(gaugeEnd), warm: !!th,
    });
    renderThermo(th, v, r, needs, tK, mixText);
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
      announce(s.error);
      return;
    }
    // The same targets as one sentence for screen readers
    const spoken = [...(s.notes || []), ...(s.drain ? [L.drainFirst(s.drain)] : [])];
    const item = (label, value) => {
      spoken.push(value != null ? `${label} ${value} bar` : label);
      const el = document.createElement('span');
      el.className = 'rb-item';
      const lab = document.createElement('span');
      lab.className = 'rb-label';
      lab.textContent = label.replace(/ /g, '\u00a0');
      el.append(lab);
      if (value != null) {
        const strong = document.createElement('strong');
        strong.textContent = value;
        el.append('\u00a0', strong, '\u00a0bar');
      }
      return el;
    };
    const gasItem = {
      he: () => (s.needs.he ? item(L.rbHe, s.he) : item(L.rbNoHe)),
      o2: () => (s.needs.o2 ? item(L.rbO2, s.o2) : item(L.rbNoO2)),
    };
    values.append(...s.gasOrder.map((gas) => gasItem[gas]()), s.needs.air ? item(L.rbAir, s.air) : item(L.rbNoAir));
    if (s.warm) spoken.push(L.warmRead);
    announce(spoken.join(', '));
  }

  // Screen readers hear the result once the inputs settle, not on every keystroke,
  // and not at all on page load
  let liveTimer = 0;
  let liveText = null;
  function announce(text) {
    clearTimeout(liveTimer);
    if (liveText === null) {
      liveText = text;
      return;
    }
    liveTimer = setTimeout(() => {
      if (text === liveText) return;
      liveText = text;
      $('liveSummary').textContent = text;
    }, 1000);
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
      // Out of the tab order and away from screen readers while it is hidden
      bar.inert = !below;
    }, { rootMargin: '0px 0px -72px 0px' }).observe(document.querySelector('.hero'));
  }

  function setGauge(r, fillP) {
    const pct = (p) => (r ? `${(p / fillP) * 100}%` : '0%');
    $('gaugeResidual').style.width = pct(r && r.keep);
    $('gaugeHe').style.width = pct(r && r.he);
    $('gaugeO2').style.width = pct(r && r.o2);
    $('gaugeAir').style.width = pct(r && r.air);
  }

  function markInvalid(err, v) {
    document.querySelectorAll('.num-wrap').forEach((el) => el.classList.remove('invalid'));
    document.querySelectorAll('.num-wrap input').forEach((el) => el.removeAttribute('aria-invalid'));
    // Only the fields that are actually wrong, not their valid neighbours
    const outside = (keys, min, max) => keys.filter((k) => !(v[k] >= min && v[k] <= max));
    const map = {
      errO2Range: outside(['curO2', 'tgtO2'], 21, 100),
      errO2RangeTx: outside(['curO2', 'tgtO2'], 5, 100),
      errHeRange: outside(['curHe', 'tgtHe'], 0, 95),
      errMixSum: ['cur', 'tgt'].filter((m) => v[`${m}O2`] + v[`${m}He`] > 100).flatMap((m) => [`${m}O2`, `${m}He`]),
      errSize: ['size'],
      errPressure: outside(['curP', 'fillP'], 0, 350),
      errFillLower: ['curP', 'fillP'],
      errTemp: ['tAmb'],
      errRate: ['rate'],
      errAirPause: ['airPause'],
    };
    (map[err] || []).forEach((id) => {
      const wrap = $(id).closest('.num-wrap');
      if (wrap) wrap.classList.add('invalid');
      $(id).setAttribute('aria-invalid', 'true');
    });
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
      ['layerResidual', 'layerHe', 'layerO2', 'layerAir'].forEach((id) => {
        $(id).setAttribute('y', CYL.bottom);
        $(id).setAttribute('height', 0);
      });
      drainLine.setAttribute('opacity', 0);
      return;
    }

    // Layers from the bottom in fill order
    const step = Object.fromEntries(Blend.fillSteps(r).map((st) => [st.gas, st]));
    setLayer('layerResidual', 0, r.keep);
    setLayer('layerHe', step.he.from, step.he.to);
    setLayer('layerO2', step.o2.from, step.o2.to);
    setLayer('layerAir', step.air.from, v.fillP);

    if (r.drain) {
      const y = yOf(v.curP);
      drainLine.setAttribute('y1', y);
      drainLine.setAttribute('y2', y);
      drainLine.setAttribute('opacity', 1);
    } else {
      drainLine.setAttribute('opacity', 0);
    }

    // Pressure ticks on the right side; skip ones that would overlap
    const marks = [{ p: 0 }, { p: r.keep }, { p: step.he.to }, { p: step.o2.to }, { p: v.fillP }];
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

  function evLabel(type, twoStepAir) {
    if (type === 'he') return t('evHe');
    if (type === 'o2') return t('evO2');
    if (type === 'pause') return t('evPause');
    if (type === 'topUp') return t('evTopUp');
    return t(twoStepAir ? 'evAirFirst' : 'evAir');
  }

  function renderThermo(th, v, r, needs, tK, targetText) {
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

    // The steps in fill order with their cold targets
    const how = { he: (p) => L.naiveHowHe(p), o2: (p) => L.naiveHowO2(p), air: () => (th.topUp ? L.naiveHowTopUp : L.naiveHowAir)(fmt(v.fillP)) };
    const parts = Blend.fillSteps(r).filter((st) => needs[st.gas]).map((st) => how[st.gas](fmt(st.to)));
    // "a and b", "a, b and c"
    const howText = parts.length > 2 ? `${parts.slice(0, -1).join(', ')}${L.and}${parts[parts.length - 1]}` : parts.join(L.and);
    // With the real-gas model, the mix after cooling follows from the cold pressures at the stage ends
    const fills = naive.events.filter((e) => e.type === 'he' || e.type === 'o2');
    let naiveMix = { o2: naive.o2Fraction * 100, he: naive.heFraction * 100 };
    if (state.realGas && (v.curHe > 0 || v.tgtHe > 0)) {
      const steps = [...fills.map((e) => ({ gas: e.type, to: e.pc })), { gas: 'air', to: naive.pc }];
      naiveMix = Blend.mixAfterFill({ o2: v.curO2 / 100, he: v.curHe / 100 }, r.keep, steps, tK, v.size / 1000);
    } else if (state.realGas) {
      const pO2 = fills.length ? fills[fills.length - 1].pc : r.keep;
      naiveMix = { o2: Blend.mixAfter(v.curO2 / 100, r.keep, pO2, naive.pc, tK, v.size / 1000), he: 0 };
    }
    const mixLabel = (o2, he) => (state.mode === 'trimix' ? L.mixTx(fmt(o2), fmt(he)) : `${fmt(o2)} % O₂`);
    $('naiveBox').innerHTML = L.naiveText(howText, fmt(naive.pc), mixLabel(naiveMix.o2, naiveMix.he), fmt(v.fillP), targetText);

    // Show filling plus cooling until within 2 K of ambient (10–120 min after the fill)
    const coolEnd = ok.fillEnd.t + (th.coolSec ?? 120 * 60);
    const lastT = Math.max(ok.samples[ok.samples.length - 1].t, naive.samples[naive.samples.length - 1].t);
    const xMax = Math.min(clamp(coolEnd, ok.fillEnd.t + 600, ok.fillEnd.t + 7200), lastT);

    thermoData = { ok, naive, xMax, tAmb: v.tAmb, fillP: v.fillP, topUp: th.topUp, skipFirstAir: th.skipFirstAir };
    if (hoverT != null) hoverT = clamp(hoverT, 0, xMax);

    CHART_IDS.forEach((id) => $(id).setAttribute('aria-label', `${t(id === 'chartP' ? 'chartPressure' : 'chartTemp')} – ${L.chartAria}`));
    drawThermoCharts();
    buildTable();
  }

  // Events worth showing: no first air fill that added nothing, and no pause shorter than
  // a minute (the gas was already cool; the step list leaves it out too)
  function shownEvents(d) {
    return d.ok.events.filter((e, i, all) => !(d.skipFirstAir && e.type === 'air') && !(e.type === 'pause' && i > 0 && e.t - all[i - 1].t < 60));
  }

  function drawThermoCharts() {
    const d = thermoData;
    if (!d || $('thermoSection').hidden) return;
    const L = I18N[state.lang];
    const series = [
      { cls: 's2', samples: d.naive.samples },
      { cls: 's1', samples: d.ok.samples },
    ];
    const shown = shownEvents(d);
    const events = shown.map((e) => ({ t: e.t, label: evLabel(e.type, d.topUp), minor: e.type === 'pause' }));
    const inWin = (key) => [d.ok, d.naive].flatMap((sim) => sim.samples.filter((s) => s.t <= d.xMax).map((s) => s[key]));

    // Pressure
    const ps = inWin('p');
    const pMin = Math.min(...ps);
    const pMax = Math.max(...ps, d.fillP);
    const pPad = (pMax - pMin) * 0.06 || 5;
    const pMarks = shown
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
    if (!svg) return;
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
    // As many decimals as the step has: 0.25 bar steps read 199.25, not 199.3
    const yDigits = Math.min(3, (String(+step.toFixed(6)).split('.')[1] || '').length);
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

    // Stage ends. Lines so close that one would run through the other's label share a
    // label (a pause end then needs no name of its own). Labels go into two rows above
    // the plot and never cover a line that runs up to the upper row; a label that finds
    // no free spot is left out (the table and the tooltip still name every stage).
    const groups = [];
    const layout = (g) => {
      const named = g.items.filter((it) => !it.minor);
      g.label = (named.length ? named : g.items).map((it) => it.label).join(' · ');
      g.half = g.label.length * 3.3 + 2;
      g.lx = clamp((g.xs[0] + g.xs[g.xs.length - 1]) / 2, g.half, w - g.half);
    };
    c.events.forEach((e) => {
      const ex = x(e.t);
      const prev = groups[groups.length - 1];
      if (prev && (ex < prev.lx + prev.half + 3 || ex - (e.label.length * 3.3 + 2) < prev.xs[prev.xs.length - 1] + 3)) {
        const merged = { xs: [...prev.xs, ex], items: [...prev.items, e] };
        layout(merged);
        if (merged.half * 2 <= w - 16) {
          groups[groups.length - 1] = merged;
          return;
        }
      }
      const g = { xs: [ex], items: [e] };
      layout(g);
      groups.push(g);
    });
    const rowEnds = [-Infinity, -Infinity];
    const lowerLabels = [];
    const upperLines = [];
    groups.forEach((g) => {
      // Centred in the lower, then the upper row; otherwise moved right, still starting at its line
      const moved = (row) => Math.max(g.lx, rowEnds[row] + 6.5 + g.half);
      const spots = [[0, g.lx], [1, g.lx], [0, moved(0)], [1, moved(1)]];
      const spot = spots.find(([row, lx]) => {
        const x0 = lx - g.half;
        const x1 = lx + g.half;
        if (!(x0 > rowEnds[row] + 6) || x0 > g.xs[0] || x1 > w) return false;
        return row === 0
          ? !upperLines.some((ex) => ex > x0 - 2 && ex < x1 + 2)
          : !lowerLabels.some(([a, b]) => g.xs.some((ex) => ex > a - 2 && ex < b + 2));
      });
      const row = spot ? spot[0] : -1;
      const ly = VIZ.t - 8 - Math.max(row, 0) * 14;
      g.xs.forEach((ex) => {
        out.push(`<line class="v-event" x1="${n(ex)}" x2="${n(ex)}" y1="${row < 0 ? VIZ.t : ly + 4}" y2="${VIZ.t + ih}"/>`);
      });
      if (!spot) return;
      const lx = spot[1];
      rowEnds[row] = lx + g.half;
      if (row === 0) lowerLabels.push([lx - g.half, lx + g.half]);
      else upperLines.push(...g.xs);
      out.push(`<text class="v-event-label" x="${n(lx)}" y="${ly}" text-anchor="middle">${esc(g.label)}</text>`);
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

    // Selective direct labels on the highlighted series. A label sits above its point;
    // if it would cover a neighbour, it moves to the left or right of the point.
    const dots = c.marks.map((m) => ({ x: x(m.t), y: y(m.v) }));
    const taken = dots.map((d) => ({ x0: d.x - 5, x1: d.x + 5, y0: d.y - 5, y1: d.y + 5 }));
    const free = (b) => !taken.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    const spots = [];
    // Later points first: while filling they sit higher, so the earlier labels give way
    for (let i = c.marks.length - 1; i >= 0; i--) {
      const { x: mx, y: my } = dots[i];
      const lw = c.marks[i].label.length * 7 + 2;
      const cx = clamp(mx, VIZ.l + 22, VIZ.l + iw - 22);
      const top = my - 12 < VIZ.t ? my + 20 : my - 12;
      const options = [
        { x: cx, y: top, anchor: 'middle', x0: cx - lw / 2 },
        { x: mx - 8, y: my + 4, anchor: 'end', x0: mx - 8 - lw },
        { x: mx + 8, y: my + 4, anchor: 'start', x0: mx + 8 },
      ];
      const spot = options.find((o, k) => {
        const b = { x0: o.x0, x1: o.x0 + lw, y0: o.y - 10, y1: o.y + 3 };
        return (k === 0 || (b.x0 >= VIZ.l && b.x1 <= VIZ.l + iw)) && free(b);
      }) || options[0];
      taken.push({ x0: spot.x0, x1: spot.x0 + lw, y0: spot.y - 10, y1: spot.y + 3 });
      spots[i] = spot;
    }
    c.marks.forEach((m, i) => {
      const s = spots[i];
      out.push(
        `<circle class="v-dot s1" cx="${n(dots[i].x)}" cy="${n(dots[i].y)}" r="4.5"/>`,
        `<text class="v-label" x="${n(s.x)}" y="${n(s.y)}" text-anchor="${s.anchor}">${esc(m.label)}</text>`
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
    shownEvents(d).forEach((e) => rows.set(e.t, evLabel(e.type, d.topUp)));
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

  // ---------- Offline and install as app (PWA) ----------
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* the page works without it */ });
    });
  }

  function setupInstall() {
    const btn = $('installBtn');
    const hint = $('installHint');
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone) return;
    // Safari on iPhone/iPad has no install event: the button shows instructions instead
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let installPrompt = null;
    btn.hidden = !ios;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
      btn.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      btn.hidden = true;
      hint.hidden = true;
    });
    btn.addEventListener('click', async () => {
      if (!installPrompt) {
        hint.hidden = !hint.hidden;
        return;
      }
      // A prompt can be used once; the browser fires a new event when it may ask again
      const prompt = installPrompt;
      installPrompt = null;
      btn.hidden = true;
      prompt.prompt();
      await prompt.userChoice.catch(() => {});
    });
    document.addEventListener('pointerdown', (e) => {
      if (!hint.hidden && !e.target.closest('#installHint, #installBtn')) hint.hidden = true;
    });
  }

  // ---------- Inputs ----------
  function syncControls(skipId) {
    const trimix = state.mode === 'trimix';
    document.body.classList.toggle('mode-trimix', trimix);
    applyTitle();
    // Below 21 % O2 only in trimix (hypoxic mixes)
    ['curO2', 'tgtO2'].forEach((k) => {
      $(k).min = trimix ? 5 : 21;
      const slider = document.querySelector(`.slider[data-for="${k}"]`);
      if (slider) slider.min = trimix ? 5 : 21;
    });
    FIELDS.forEach((k) => {
      const input = $(k);
      if (k !== skipId) input.value = state[k];
      const slider = document.querySelector(`.slider[data-for="${k}"]`);
      // An empty or invalid field leaves its slider where it was
      if (slider && Number.isFinite(parseFloat(state[k]))) {
        slider.value = state[k];
        const min = +slider.min, max = +slider.max;
        const pct = ((Math.min(max, Math.max(min, +state[k])) - min) / (max - min)) * 100;
        slider.style.setProperty('--p', `${pct}%`);
      }
      document.querySelectorAll(`.chips[data-for="${k}"] button`).forEach((b) => {
        const on = parseFloat(b.dataset.value) === parseFloat(state[k]);
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    });
    TOGGLES.forEach((k) => ($(k).checked = !!state[k]));
    $('thermoBody').hidden = !state.thermoOn;
    $('airPauseField').hidden = !state.airTopUp;
    const pressed = (b, on) => {
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    };
    document.querySelectorAll('.mode-switch button').forEach((b) => pressed(b, b.dataset.mode === state.mode));
    document.querySelectorAll('#fillOrderSwitch button').forEach((b) => pressed(b, b.dataset.order === state.fillOrder));
    placeInFillOrder(trimix && state.fillOrder === 'o2');
    document.querySelectorAll('.mix-chips').forEach((group) => {
      const o2 = parseFloat(state[`${group.dataset.mix}O2`]);
      const he = parseFloat(state[`${group.dataset.mix}He`]);
      group.querySelectorAll('button').forEach((b) => {
        const on = parseFloat(b.dataset.o2) === o2 && parseFloat(b.dataset.he) === he;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    });
    document.querySelectorAll('.material-picker button').forEach((b) => {
      const on = b.dataset.material === state.material;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  // Helium and O2 appear in fill order: target cards, amount tiles, gauge bar and legend.
  // In the markup helium comes right before O2.
  function placeInFillOrder(o2First) {
    const pairs = [
      [$('heroHe'), $('heroO2')],
      [document.querySelector('.tile-he'), document.querySelector('.tile-o2')],
      [$('gaugeHe'), $('gaugeO2')],
      [document.querySelector('.legend .sw-he'), document.querySelector('.legend .sw-o2')].map((sw) => sw && sw.parentElement),
    ];
    pairs.forEach(([he, o2]) => {
      if (!he || !o2 || !he.parentNode || he.parentNode !== o2.parentNode) return;
      // Moving a node restarts its CSS transitions: only move when the order is wrong
      if (o2First) {
        if (o2.nextElementSibling !== he) o2.after(he);
      } else if (he.nextElementSibling !== o2) {
        o2.before(he);
      }
    });
  }

  function setValue(key, value, sourceId) {
    state[key] = value;
    syncControls(sourceId);
    render();
    save();
  }

  function setValues(values) {
    Object.assign(state, values);
    syncControls();
    render();
    save();
  }

  // Nitrox and trimix keep their own mixes: swap the shown ones with the stored ones
  function switchMode(mode) {
    if (mode === state.mode) return;
    const shown = { curO2: state.curO2, curHe: state.curHe, tgtO2: state.tgtO2, tgtHe: state.tgtHe };
    const restored = { ...state.otherMix };
    if (mode === 'nitrox') {
      restored.curHe = 0;
      restored.tgtHe = 0;
    }
    setValues({ ...restored, otherMix: shown, mode });
  }

  // Trimix gets its own heading; nitrox keeps the original one
  function applyTitle() {
    const title = t(state.mode === 'trimix' ? 'titleTx' : 'title');
    const heading = document.querySelector('h1[data-i18n="title"]');
    if (heading) heading.textContent = title;
    document.title = title;
  }

  function applyLang() {
    const dict = I18N[state.lang];
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const val = dict[el.dataset.i18n];
      if (typeof val === 'string') el.textContent = val;
    });
    applyTitle();
    $('resultBar').title = dict.toResult;
    $('installBtn').title = dict.installApp;
    $('installBtn').setAttribute('aria-label', dict.installApp);
    $('installHint').innerHTML = dict.installHintIOS;
    $('cylinder').setAttribute('aria-label', dict.cylinderAria);
    document.querySelector('.material-picker').setAttribute('aria-label', dict.cylType);
    document.querySelectorAll('.chips[data-for="bmPpO2"] button').forEach((b) => (b.textContent = fmt(parseFloat(b.dataset.value))));
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === state.lang);
      b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang));
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
    document.querySelectorAll('.mode-switch button').forEach((b) => {
      b.addEventListener('click', () => switchMode(b.dataset.mode));
    });
    document.querySelectorAll('#fillOrderSwitch button').forEach((b) => {
      b.addEventListener('click', () => setValue('fillOrder', b.dataset.order));
    });
    document.querySelectorAll('.mix-chips').forEach((group) => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-o2]');
        if (btn) setValues({ [`${group.dataset.mix}O2`]: btn.dataset.o2, [`${group.dataset.mix}He`]: btn.dataset.he });
      });
    });
    $('bestMixApply').addEventListener('click', () => {
      const m = currentBestMix();
      if (m) setValues({ tgtO2: String(m.o2), tgtHe: String(m.he) });
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
    // The cylinder ticks are spaced for the phone layout: redraw when it switches
    const phone = window.matchMedia('(max-width: 640px)');
    if (phone.addEventListener) phone.addEventListener('change', render);
    else if (phone.addListener) phone.addListener(render);
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
  setupInstall();
  registerServiceWorker();
})();
