# Nitrox Top-Up Calculator

A free calculator for **partial pressure nitrox blending**. It tells you how much pure oxygen and air to put into a partly filled cylinder to get the mix you want, and what your gauge should read while the cylinder is still warm from filling.

**Open the calculator:** https://mix.alhu.at/

It runs entirely in your browser, works on a phone at the fill station, and is available in English and German (it follows your device language). Your inputs are remembered in your browser.

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

## Heating during the fill

Compressing gas heats it up. A cylinder that shows 220 bar on the fill panel shows noticeably less once it has cooled down. The oxygen step is affected too: if you read the O₂ target on the gauge while the gas is warm, you have put in less oxygen than you think, so the final mix is off.

This part of the calculator is **switched on by default** and can be turned off. It estimates the heating with a simple physical model of the cylinder and gives you the **warm gauge readings** to fill to, so that pressure and mix are right once the cylinder has cooled. It asks for:

- **Cylinder type:** steel, aluminium, carbon or steel-carbon. They heat up very differently: a carbon wrap insulates, so the gas gets hottest, while a thick aluminium wall soaks up the most heat.
- **Ambient temperature**
- **Fill rate** in bar per minute
- **Water bath:** the cylinder stands in water while filling
- **Let cool after O₂:** you pause after the oxygen step before topping up with air

You get the warm targets (marked "read warm") together with how many bar of each target are due to heating, the peak gas temperature, the pressure drop and the cool-down time, charts of pressure and temperature over time, and a comparison with what you would end up with **without** the correction.

### Example

A 12 L carbon cylinder with 70 bar of EAN32, and you want EAN32 at 220 bar, filling at 10 bar/min at 20 °C:

| | Fill to (gauge) | After cooling |
|---|---|---|
| With correction | O₂ to **92.6 bar**, air to **245.7 bar** (read warm) | 220 bar, 32.0 % O₂ |
| Without correction | O₂ to 88.6 bar, air to 220 bar (read warm) | **198.5 bar, 31.6 % O₂** |

In this example the gas peaks at about 54 °C and takes about 2½ hours to cool to within 2 °C of ambient.

Typical model results when filling a 12 L cylinder from 50 bar of air to EAN32 at 200 bar (10 bar/min, 20 °C):

| Cylinder | Peak gas temperature | Gauge at end of fill |
|---|---|---|
| Aluminium | ≈ 32 °C | ≈ 208.5 bar |
| Steel | ≈ 39 °C | ≈ 212.9 bar |
| Steel-carbon | ≈ 45 °C | ≈ 217.2 bar |
| Carbon | ≈ 55 °C | ≈ 224.2 bar |

These are model estimates, not measurements. Real values depend on the compressor, valve, cylinder and surroundings. Check the pressure once the cylinder has cooled and top up if needed.

## Real-gas correction

At filling pressures, gases don't behave ideally. Oxygen squeezes together more than an ideal gas (compressibility factor Z < 1), air and nitrogen less (Z > 1). The classic partial pressure formula ignores this, so at 200–350 bar it asks for too much oxygen. Checked against NIST reference data at 20 °C, filling to the ideal targets gives:

| Fill | O₂ to: ideal | O₂ to: real gas | Mix with the ideal target |
|---|---|---|---|
| 50 bar air → EAN32 at 232 bar | 82.3 bar | 79.5 bar | 32.9 % |
| 30 bar air → EAN32 at 300 bar | 71.8 bar | 66.4 bar | 33.5 % |
| Empty → EAN40 at 300 bar | 72.2 bar | 63.8 bar | 42.2 % |

The real-gas correction is **switched on by default**. Switched off, the calculator uses the classic ideal formula exactly as before. While it is on, the O₂ tile also shows the ideal-gas value for comparison.

## Safety

- This is a calculation aid. It does not replace gas blender training.
- Blending with pure oxygen needs oxygen-clean cylinders, valves and fill equipment, and should only be done by trained blenders.
- Always analyse the mix after filling and label the cylinder.
- Never fill beyond what your cylinder is rated for. At high fill pressures the warm target can be well above the fill pressure, and the calculator does not know your cylinder's rating.

## Limits

- Nitrox only (oxygen and air), no helium or trimix.
- The real-gas model matches NIST data to about 1 % in Z (0–40 °C, up to 350 bar). Argon in air is ignored, and the heating model scales pressure with temperature like an ideal gas.
- Air is taken as 21 % O₂, and incoming gas is assumed to be at ambient temperature.
- The heating model uses estimated material values.

## How it calculates

**Ideal method** (real-gas correction off): partial pressure method, ideal gas, air = 21 % O₂. `P1`/`f1` are the current pressure and O₂ fraction, `P2`/`f2` the fill pressure and target fraction:

```
O₂ to add  = (P2·(f2 − 0.21) − P1·(f1 − 0.21)) / 0.79
Air to add = P2 − P1 − O₂ to add
```

If the O₂ to add comes out negative, bleed down to `P2·(f2 − 0.21)/(f1 − 0.21)` and add air only.
If the air to add comes out negative, bleed down to `P2·(1 − f2)/(1 − f1)` and add O₂ only.

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

Regression values (20 °C, 12 L, gauge readings after cooling):

| Fill | O₂ to | O₂ | Air |
|---|---|---|---|
| Empty → EAN32 at 232 bar | 30.4 bar (ideal: 32.3) | 363 L | 2230 L |
| 50 bar EAN32 → EAN36 at 232 bar | 83.4 bar (ideal: 87.1) | 413 L | 1600 L |

**Heating model** ([thermo.js](thermo.js)): two heat stores (the gas and the cylinder wall), ideal gas, 1-second time steps:

```
Gas:      n·cv·dTg/dt = ṅ·(cp·T_in − cv·Tg) − hᵢ·A·(Tg − Tw)
Wall:     C_w·dTw/dt  = hᵢ·A·(Tg − Tw) − hₒ·A·(Tw − T_amb)
Pressure: p = n·R·Tg / V
```

Gas flows in at ambient temperature. The cylinder geometry is derived from its volume (length/diameter ≈ 3.5). Estimated material values:

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

Or with Docker (nginx, port 8381):

```bash
docker compose up -d --build
# then open http://localhost:8381
```

Stop it with `docker compose down`.

Run the tests (Node 18 or newer, no dependencies):

```bash
npm test
# or: node --test
```

To publish it on GitHub Pages: **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.

## License

GNU General Public License v2.0, see [LICENSE](LICENSE).
