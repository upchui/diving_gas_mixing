# Nitrox Top-Up Calculator

A free calculator for **partial pressure nitrox blending**. It tells you how much pure oxygen and air to put into a partly filled cylinder to get the mix you want, and what your gauge should read while the cylinder is still warm from filling.

**Open the calculator:** https://upchui.github.io/diving_gas_mixing/

It runs entirely in your browser, works on a phone at the fill station, and is available in English and German. Your inputs are remembered in your browser.

## What it does

You have a cylinder with some gas left in it and want a specific nitrox mix at a specific pressure. With partial pressure blending you first add pure oxygen, then top up with air from the compressor. The calculator works out:

- **whether you need to bleed the cylinder down first**, e.g. when the leftover gas holds more oxygen than the mix you want
- **the gauge reading to fill oxygen to**
- **the gauge reading to top up with air to**
- how much oxygen and air that is in bar and litres, the final mix, the total amount of gas, and the MOD at ppO₂ 1.4 and 1.6

You enter the O₂ % of the gas currently in the cylinder, the O₂ % you want, the cylinder size, the current pressure and the fill pressure (up to 350 bar).

### Example

A 12 L cylinder with 50 bar of air left, and you want EAN32 at 200 bar:

1. Add pure O₂ up to **77.8 bar** (+27.8 bar, about 334 litres of oxygen)
2. Top up with air to **200 bar**
3. Let it cool and analyse: target 32 % O₂

If the cylinder still holds EAN40 at 150 bar and you want EAN32 at 200 bar, there is too much oxygen in it. The calculator tells you to bleed it down to **115.8 bar** first and then top up with air only.

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
| With correction | O₂ to **95.1 bar**, air to **245.7 bar** (read warm) | 220 bar, 32.0 % O₂ |
| Without correction | O₂ to 90.9 bar, air to 220 bar (read warm) | **198.5 bar, 31.7 % O₂** |

In this example the gas peaks at about 54 °C and takes about 2½ hours to cool to within 2 °C of ambient.

Typical model results when filling a 12 L cylinder from 50 bar of air to EAN32 at 200 bar (10 bar/min, 20 °C):

| Cylinder | Peak gas temperature | Gauge at end of fill |
|---|---|---|
| Aluminium | ≈ 32 °C | ≈ 208.5 bar |
| Steel | ≈ 39 °C | ≈ 212.9 bar |
| Steel-carbon | ≈ 45 °C | ≈ 217.2 bar |
| Carbon | ≈ 55 °C | ≈ 224.2 bar |

These are model estimates, not measurements. Real values depend on the compressor, valve, cylinder and surroundings. Check the pressure once the cylinder has cooled and top up if needed.

## Safety

- This is a calculation aid. It does not replace gas blender training.
- Blending with pure oxygen needs oxygen-clean cylinders, valves and fill equipment, and should only be done by trained blenders.
- Always analyse the mix after filling and label the cylinder.
- Never fill beyond what your cylinder is rated for. At high fill pressures the warm target can be well above the fill pressure, and the calculator does not know your cylinder's rating.

## Limits

- Nitrox only (oxygen and air), no helium or trimix.
- The calculation assumes ideal gas. Above roughly 250–300 bar real gas behaves differently, so results get less accurate.
- Air is taken as 21 % O₂, and incoming gas is assumed to be at ambient temperature.
- The heating model uses estimated material values.

## How it calculates

Partial pressure method, ideal gas, air = 21 % O₂. `P1`/`f1` are the current pressure and O₂ fraction, `P2`/`f2` the fill pressure and target fraction:

```
O₂ to add  = (P2·(f2 − 0.21) − P1·(f1 − 0.21)) / 0.79
Air to add = P2 − P1 − O₂ to add
```

If the O₂ to add comes out negative, bleed down to `P2·(f2 − 0.21)/(f1 − 0.21)` and add air only.
If the air to add comes out negative, bleed down to `P2·(1 − f2)/(1 − f1)` and add O₂ only.

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

Water bath: hₒ = 300 W/m²K. "With correction" stops each fill step once the amount of gas from the cold calculation is in the cylinder; "without correction" stops as soon as the warm gauge shows the cold target value.

## Run it yourself

A static page with no build step and no dependencies:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

To publish it on GitHub Pages: **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.

## License

GNU General Public License v2.0, see [LICENSE](LICENSE).
