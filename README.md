# Nitrox & Trimix Top-Up Calculator

A free calculator for **partial pressure blending of nitrox and trimix**. It tells you how much helium, pure oxygen and air to put into a partly filled cylinder to get the mix you want, and what your gauge should read while the cylinder is still warm from filling.

**Open the calculator:** https://mix.alhu.at/

It runs entirely in your browser, works on a phone at the fill station, and is available in English and German (it follows your device language). Your inputs are remembered in your browser; the real-gas correction and the heating model always start switched on.

## Install as an app

The calculator can be installed like an app and then also works **offline**, for example at a fill station without reception.

- **Android, Chrome, Edge:** tap the install button (arrow icon) next to DE/EN, or use the browser menu ("Install app" / "Add to Home screen").
- **iPhone, iPad:** in Safari tap *Share* and then *Add to Home Screen*. The install button next to DE/EN shows these steps too. The installed app keeps its own storage, separate from Safari: open it once while online so it can store itself for offline use.

After the first visit everything the calculator needs is stored on the device. Whenever you are online it loads the current version and refreshes the offline copy.

## What it does

You have a cylinder with some gas left in it and want a specific nitrox mix at a specific pressure. With partial pressure blending you first add pure oxygen, then top up with air from the compressor. The calculator works out:

- **whether you need to bleed the cylinder down first**, e.g. when the leftover gas holds more oxygen than the mix you want
- **the gauge reading to fill oxygen to**
- **the gauge reading to top up with air to**
- how much oxygen and air that is in bar and litres, the final mix, the total amount of gas, and the MOD at ppO₂ 1.4 and 1.6

You enter the O₂ % of the gas currently in the cylinder, the O₂ % you want, the cylinder size, the current pressure and the fill pressure (up to 350 bar).

### Example

A 12 L cylinder with 50 bar of air left, and you want EAN32 at 200 bar (gauge readings after cooling, 20 °C):

1. Add pure O₂ up to **76.0 bar** (+26.0 bar, about 319 litres of oxygen)
2. Top up with air to **200 bar**
3. Let it cool and analyse: target 32 % O₂

The simple ideal-gas formula would say 77.8 bar for step 1, which overshoots at these pressures (see [Real-gas correction](#real-gas-correction)).

If the cylinder still holds EAN40 at 150 bar and you want EAN32 at 200 bar, there is too much oxygen in it. The calculator tells you to bleed it down to **110.5 bar** first and then top up with air only.

Even an empty or bled cylinder still holds 1 atm of gas. With the real-gas correction (on by default), the calculator takes this into account. When that 1 atm is enough to keep the target out of reach, it says so and works with the mix you will actually get. Example: pure oxygen from an empty cylinder of air gives about 99.6 % O₂ at 200 bar. MOD, END, gas density and the target for analysing then use that mix.

## Trimix

Switch to **Trimix** at the top of the page. Each mix then has an O₂ % and a He %, and nitrogen is the rest. There are quick picks for air, EAN32, 21/35, 18/45, 15/55, 12/65, 10/70 and Helitrox 25/25. Nitrox and trimix each remember their own mixes.

Under *Fill order* in the cylinder card you choose what goes in first. Air always comes last:

- **Helium first** (default): helium, then pure oxygen, then air
- **Oxygen first:** pure oxygen, then helium, then air

Helium first is the common order. The helium bank can be drained further into the empty cylinder, and the oxygen can be matched to the actual helium pressure after cooling. With oxygen first, the oxygen goes in at a lower pressure and the oxygen bank can be drained further. The amount of each gas and the final mix are the same either way, but the gauge targets in between are not.

For each step you get the gauge target, warm and after cooling. You also get the amount of each gas in bar and litres and a step-by-step list.

- **Bleed down:** if the leftover gas holds too much helium, oxygen or nitrogen for the mix you want, the calculator gives you the highest pressure to bleed down to that still works.
- **Not reachable:** some mixes cannot be made by topping up with air. Air brings 0.27 bar of oxygen with every bar of nitrogen. For Tx 10/50 the 40 % nitrogen alone would therefore bring 10.6 % oxygen, which is more than the 10 % you want. The calculator says so instead of giving wrong numbers. Choose more helium.
- **Dive values:**
  - MOD at ppO₂ 1.4 and 1.6
  - END at the MOD for ppO₂ 1.4 (switch *count O₂ as narcotic*, on by default)
  - Gas density at that depth: yellow above 5.2 g/l, red above 6.2 g/l
  - For hypoxic mixes (below 18 % O₂): the minimum depth for ppO₂ 0.18, with a warning not to breathe the mix at the surface
- **Find the best mix:** enter the depth, the maximum ppO₂ and the END you want. The calculator suggests the mix: O₂ rounded down and He rounded up, both on the safe side. It shows the MOD, END and density for that mix, and *Use as target* copies the mix into the inputs. Example: 60 m, ppO₂ 1.4, END 30 m gives Tx 20/43 (Tx 20/35 if oxygen is not counted as narcotic). The suggestion can always be blended with air. If the oxygen is so low that the air would bring too much of it with its nitrogen, enough helium is added: 40 m, ppO₂ 1.0, END 40 m gives Tx 20/5 instead of EAN20.

### Example

An empty 12 L cylinder, and you want Tx 18/45 at 220 bar (gauge readings after cooling, 20 °C):

1. Add helium up to **97.8 bar** (about 1,087 litres)
2. Add pure O₂ up to **114.4 bar** (about 197 litres)
3. Top up with air to **220 bar**
4. Let it cool and analyse oxygen and helium: target 18 % O₂, 45 % He

The ideal-gas formula would say helium to 99.0 bar and O₂ to 117.0 bar, which gives about 18.4 % O₂ and 45.5 % He.

With the heating model (steel cylinder, 10 bar/min, 20 °C), the warm gauge targets are:

- helium **103.4 bar**
- O₂ **121.4 bar**
- air **238.5 bar**

If you read the cold targets on the warm gauge instead, you end up with only 203.5 bar of about 17.8 % O₂ and 45.8 % He once the cylinder is cold.

With **oxygen first**, the same fill goes:

1. O₂ to **16.7 bar** (warm: 17.0 bar)
2. helium to **114.4 bar** (warm: 121.5 bar)
3. air to **220 bar** (warm: 238.5 bar)

If the cylinder still holds Tx 10/70 at 150 bar and you want Tx 21/35 at 200 bar, there is too much helium in it. The calculator tells you to:

1. bleed it down to **97.6 bar**
2. add no helium
3. add O₂ up to 110.7 bar
4. top up with air

## Heating during the fill

Compressing gas heats it up. A cylinder that shows 220 bar on the fill panel shows noticeably less once it has cooled down. The oxygen step is affected too: if you read the O₂ target on the gauge while the gas is warm, you have put in less oxygen than you think, so the final mix is off.

This part of the calculator is **switched on by default** and can be turned off. It estimates the heating with a simple physical model of the cylinder and gives you the **warm gauge readings** to fill to, so that pressure and mix are right once the cylinder has cooled. It asks for:

- **Cylinder type:** steel, aluminium, carbon or steel-carbon. They heat up very differently: a carbon wrap insulates, so the gas gets hottest, while a thick aluminium wall soaks up the most heat.
- **Ambient temperature**
- **Fill rate** in bar per minute
- **Water bath:** the cylinder stands in water while filling
- **Let cool after helium** (trimix): you pause after the helium step before the next gas goes in
- **Let cool after O₂:** you pause after the oxygen step before the next gas goes in

Both pauses follow their gas, whatever the fill order.
- **Let cool after the air fill, then top up:** instead of filling far above the target in one go, you fill air only up to the target pressure, let the cylinder cool for a pause you choose (5–240 min, quick picks 15, 30, 60 and 90 min), and then top up to a calculated value so it sits exactly at the target once cold

You get the warm targets (marked "read warm") together with how many bar of each target are due to heating, the peak gas temperature, the pressure drop and the cool-down time, charts of pressure and temperature over time, and a comparison with what you would end up with **without** the correction.

### Example

A 12 L carbon cylinder with 70 bar of EAN32, and you want EAN32 at 220 bar, filling at 10 bar/min at 20 °C:

| | Fill to (gauge) | After cooling |
|---|---|---|
| With correction | O₂ to **92.6 bar**, air to **245.7 bar** (read warm) | 220 bar, 32.0 % O₂ |
| Without correction | O₂ to 88.6 bar, air to 220 bar (read warm) | **198.4 bar, 31.6 % O₂** |

In this example the gas peaks at about 54 °C and takes about 2½ hours to cool to within 2 °C of ambient.

Filling in two steps instead (12 L, 50 bar of air → EAN32 at 220 bar, 10 bar/min, 20 °C, 30 min pause):

| Cylinder | One go: air to | Two steps: air to 220 bar, after 30 min | then top up to | Cold |
|---|---|---|---|---|
| Steel | 235.1 bar | 211.9 bar | **228.2 bar** | 220 bar |
| Carbon | 248.1 bar | 208.2 bar | **238.3 bar** | 220 bar |

The longer the pause, the less you need to top up. Carbon cylinders keep their heat much longer than steel.

Typical model results when filling a 12 L cylinder from 50 bar of air to EAN32 at 200 bar (10 bar/min, 20 °C):

| Cylinder | Peak gas temperature | Gauge at end of fill |
|---|---|---|
| Aluminium | ≈ 32 °C | ≈ 208.5 bar |
| Steel | ≈ 39 °C | ≈ 212.9 bar |
| Steel-carbon | ≈ 45 °C | ≈ 217.2 bar |
| Carbon | ≈ 55 °C | ≈ 224.2 bar |

Helium heats up more than air when it is compressed, because it is a monatomic gas. Filling an empty 12 L carbon cylinder to 99 bar at 10 bar/min and 20 °C peaks at about 58 °C with helium and 53 °C with air. The model takes the helium share of the gas in the cylinder into account.

These are model estimates, not measurements. Real values depend on the compressor, valve, cylinder and surroundings. Check the pressure once the cylinder has cooled and top up if needed.

## Real-gas correction

At filling pressures, gases don't behave ideally. Oxygen squeezes together more than an ideal gas (compressibility factor Z < 1), air and nitrogen less (Z > 1). The classic partial pressure formula ignores this, so at 200–350 bar it asks for too much oxygen. The last column shows what NIST reference data predict at 20 °C when you fill to the ideal targets:

| Fill | O₂ to: ideal | O₂ to: real gas (this calculator) | Mix with the ideal target (NIST data) |
|---|---|---|---|
| 50 bar air → EAN32 at 232 bar | 82.3 bar | 79.5 bar | 32.9 % |
| 30 bar air → EAN32 at 300 bar | 71.8 bar | 66.4 bar | 33.5 % |
| Empty → EAN40 at 300 bar | 72.2 bar | 63.8 bar | 42.2 % |

Helium behaves the other way round from oxygen and is much harder to compress than an ideal gas: Z ≈ 1.10 at 200 bar and 1.14 at 300 bar (20 °C). For trimix the ideal formula therefore asks for too much helium and too much oxygen:

| Fill | He to: ideal / real gas | O₂ to: ideal / real gas | Mix with the ideal targets |
|---|---|---|---|
| Empty → Tx 21/35 at 232 bar | 81.2 / 79.5 bar | 102.8 / 99.4 bar | 21.5 % O₂, 35.7 % He |
| Empty → Tx 18/45 at 220 bar | 99.0 / 97.8 bar | 117.0 / 114.4 bar | 18.4 % O₂, 45.5 % He |
| Empty → Tx 15/55 at 300 bar | 165.0 / 159.2 bar | 186.1 / 178.2 bar | 15.2 % O₂, 56.8 % He |

The real-gas correction is **switched on by default**. Switched off, the calculator uses the classic ideal formula exactly as before. While it is on, the helium and O₂ tiles also show the ideal-gas value for comparison.

## Safety

- This is a calculation aid. It does not replace gas blender training.
- Blending with pure oxygen needs oxygen-clean cylinders, valves and fill equipment, and should only be done by trained blenders.
- Always analyse the mix after filling and label the cylinder. For trimix, analyse oxygen **and** helium.
- Hypoxic mixes (below 18 % O₂) must not be breathed at the surface or in shallow water.
- Never fill beyond what your cylinder is rated for. At high fill pressures the warm target can be well above the fill pressure, and the calculator does not know your cylinder's rating.

## Limits

- The real-gas model matches NIST data to about 1 % in Z (0–40 °C, up to 350 bar). Argon in air is ignored, and the heating model scales pressure with temperature like an ideal gas.
- There are no direct NIST reference data for oxygen–helium–nitrogen mixtures. The mixture model was checked against a reference built from NIST data for the pure gases. Always analyse trimix for oxygen and helium.
- Air is taken as 21 % O₂, and incoming gas is assumed to be at ambient temperature.
- END, minimum depth and gas density use simple rules: sea water at 10 m per bar, and an ideal gas at 20 °C for the density.
- The heating model uses estimated material values.

## How it calculates

**Ideal method** (real-gas correction off): partial pressure method, ideal gas, air = 21 % O₂. `P1`/`f1` are the current pressure and O₂ fraction, `P2`/`f2` the fill pressure and target fraction:

```
O₂ to add  = (P2·(f2 − 0.21) − P1·(f1 − 0.21)) / 0.79
Air to add = P2 − P1 − O₂ to add
```

If the O₂ to add comes out negative, bleed down to `P2·(f2 − 0.21)/(f1 − 0.21)` and add air only.
If the air to add comes out negative, bleed down to `P2·(1 − f2)/(1 − f1)` and add O₂ only.

With helium, `f`, `h` and `n` are the O₂, He and N₂ fractions:

```
He to add  = P2·h2 − P1·h1
Air to add = (P2·n2 − P1·n1) / 0.79
O₂ to add  = P2·f2 − P1·f1 − 0.21·(air to add)
```

Each amount depends linearly on the leftover pressure `P1`. If one comes out negative, the calculator bleeds down to the highest pressure at which all three are zero or positive. If there is no such pressure, the mix cannot be made by topping up with air. Without helium, this is the nitrox formula above. A bleed-down of 0.05 bar or less is not shown, with either method.

The amounts do not depend on the fill order. With the ideal method, the gauge targets are simply the amounts added up in fill order. With the real-gas method, each target follows from the gas in the cylinder at that point, so the pressure rise of a gas depends on when it goes in. Example: empty → Tx 18/45 at 220 bar. The O₂ step raises the gauge by 16.6 bar after the helium and by 16.7 bar before it.

**Real-gas method** ([blend.js](blend.js)): the same balance in moles. Pressures are absolute (gauge + 1.013 bar), `V` is the cylinder volume and `T` the cooled cylinder temperature (the ambient temperature from the heating section, otherwise 20 °C). Index 0 is the gas in the cylinder, f the target:

```
n      = P·V / (Z·R·T)
n_air  = (x0·n0 + nf − n0 − xf·nf) / 0.79
n_O2   = nf − n0 − n_air
```

The gauge reading after the O₂ step follows from `P1 = Z(x1, P1)·n1·R·T / V`, solved iteratively. If `n_O2` or `n_air` comes out negative, the calculator finds the largest residual amount for which both are zero or positive and shows the pressure to bleed down to (never below 0 bar, since a bled cylinder still holds 1 atm). Litres are free gas at 1.013 bar and 15 °C.

Z comes from the Peng–Robinson equation of state for the O₂/N₂ mixture (kij = 0) with a constant volume shift per gas (Péneloux), fitted to NIST WebBook densities:

| Gas | Tc [K] | Pc [bar] | ω | Volume shift [cm³/mol] |
|---|---|---|---|---|
| O₂ | 154.58 | 50.43 | 0.022 | −2.52 |
| N₂ | 126.20 | 33.98 | 0.037 | −3.88 |

Plain Peng–Robinson is 2–5 % off at 200–350 bar; with the shift, Z stays within 3.5 ‰ (N₂) and 8.7 ‰ (O₂) of NIST between 0 and 40 °C.

Peng–Robinson fits helium poorly (more than 1 % off even with a volume shift). Helium therefore uses a virial formula fitted to NIST data. With `P` the absolute pressure in bar and `ΔT = T − 293.15 K`:

```
Z_He = 1 + b1·P + b2·P²
b1   = 4.87406e-4 − 1.8314e-6·ΔT
b2   = −4.92813e-8 + 2.2896e-10·ΔT
```

It stays within 0.5 ‰ of NIST (0–40 °C, 10–350 bar). For a mix with helium fraction `x_He`, the O₂/N₂ part and the helium are combined by volume (Amagat's rule):

```
Z = (1 − x_He)·Z_PR(O₂/N₂ part) + x_He·Z_He
```

Without helium this is exactly the O₂/N₂ model. The gauge readings after the helium and the oxygen step are found iteratively as above.

Regression values (20 °C, 12 L, gauge readings after cooling):

| Fill | O₂ to | O₂ | Air |
|---|---|---|---|
| Empty → EAN32 at 232 bar | 30.4 bar (ideal: 32.3) | 363 L | 2230 L |
| 50 bar EAN32 → EAN36 at 232 bar | 83.4 bar (ideal: 87.1) | 413 L | 1600 L |

| Fill | He to | O₂ to |
|---|---|---|
| Empty → Tx 18/45 at 220 bar | 97.8 bar (ideal: 99.0) | 114.4 bar (ideal: 117.0) |
| 50 bar Tx 18/45 → Tx 18/45 at 220 bar | 125.7 bar (ideal: 126.5) | 138.3 bar (ideal: 140.4) |
| Empty → Tx 18/45 at 220 bar, oxygen first | 114.4 bar (ideal: 117.0) | 16.7 bar (ideal: 18.0) |
| 50 bar Tx 18/45 → Tx 18/45 at 220 bar, oxygen first | 138.3 bar (ideal: 140.4) | 62.3 bar (ideal: 63.9) |

**Dive values**, with `P = depth/10 + 1` bar and the fractions of the mix:

```
MOD           = (ppO₂ / f − 1) · 10
END           = (P · (1 − h) − 1) · 10            O₂ counted as narcotic, at least 0
END           = (P · n / 0.79 − 1) · 10           only N₂ narcotic, at least 0
Minimum depth = (0.18 / f − 1) · 10               at least 0
Density       = P · M / (R · T)                   M = molar mass of the mix, T = 20 °C
```

The best mix takes the O₂ fraction from the ppO₂ (`ppO₂ / P`, rounded down) and the helium from the END. This is the reverse of the END formula, rounded up. The helium is never less than `1 − f / 0.21` (rounded up): air brings 0.21/0.79 bar of O₂ with every bar of N₂, so with less helium the mix could not be blended with air.

**Heating model** ([thermo.js](thermo.js)): two heat stores (the gas and the cylinder wall), ideal gas, 1-second time steps:

```
Gas:      n·cv·dTg/dt = ṅ·(cp·T_in − cv·Tg) − hᵢ·A·(Tg − Tw)
Wall:     C_w·dTw/dt  = hᵢ·A·(Tg − Tw) − hₒ·A·(Tw − T_amb)
Pressure: p = n·R·Tg / V
```

Gas flows in at ambient temperature. The heat capacities depend on the gas mix:

- O₂ and N₂: cv = 20.8, cp = 29.1 J/(mol·K)
- helium: cv = 12.47, cp = 20.79 J/(mol·K)

The cylinder geometry is derived from its volume (length/diameter ≈ 3.5). Estimated material values:

| Type | Wall heat capacity [J/K per litre] | hᵢ [W/m²K] | hₒ [W/m²K] |
|---|---|---|---|
| Steel | 560 | 150 | 12 |
| Aluminium | 1150 | 180 | 12 |
| Steel-carbon | 380 | 120 | 7 |
| Carbon | 250 | 40 | 5 |

Water bath: hₒ = 300 W/m²K. The heating model works on top of either method: it takes the cold gauge targets and adds the warming. "With correction" stops each fill step once the amount of gas from the cold calculation is in the cylinder; "without correction" stops as soon as the warm gauge shows the cold target value.

## Run it yourself

A static page with no build step and no dependencies:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Offline use and installing need HTTPS or `localhost`, because browsers only run the service worker ([sw.js](sw.js)) there.

Or with Docker (nginx, port 8381):

```bash
docker compose up -d --build
# then open http://localhost:8381
```

Stop it with `docker compose down`.

The Docker build adds a content hash to the script and style URLs (`app.js?v=…`). nginx marks only the current hash as unchanging, so a CDN such as Cloudflare never mixes old and new files after an update. The service worker answers versioned files from its cache and falls back to the cached copy when the server reports an error.

Behind Cloudflare:

- The scripts carry `data-cfasync="false"`, so Rocket Loader leaves them alone. Otherwise they would only run through Rocket Loader's own script, which is not stored for offline use. Turning Rocket Loader off for the site is fine too.
- Set *Browser Cache TTL* to *Respect Existing Headers*, so the cache headers from nginx reach the browser.

Run the tests (Node 18 or newer, no dependencies):

```bash
npm test
# or: node --test
```

To publish it on GitHub Pages: **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.

## License

GNU General Public License v2.0, see [LICENSE](LICENSE).
