# Rocket Recovery Safety Calculator

A Streamlit web app for validating high-power rocketry (HPR) recovery system hardware.
Enter your rocket's specs and recovery architecture — the app computes a **Factor of Safety (FOS)**
for every shock cord and quick link in your system.

---

## Running the App

**Requirements:** Python 3.10+

```bash
pip install streamlit
streamlit run app.py
```

The app opens at `http://localhost:8501` in your browser.

---

## Deploying to Streamlit Community Cloud (Free)

1. Push this repository to GitHub.
2. Go to [share.streamlit.io](https://share.streamlit.io) and sign in.
3. Click **New app** → select your repository → set **Main file path** to `app.py`.
4. Click **Deploy**. Your app will be live at a public URL in under a minute.

---

## How to Add a New Component to the Catalog

Open `data/components.json` in any text editor. The file is a JSON array.
Copy an existing entry of the same category and edit the fields.

**Example — adding a new shock cord:**

```json
{
  "id": "sc_my_new_cord",
  "name": "My 1\" Nylon Cord — 25 ft",
  "manufacturer": "My Supplier",
  "category": "shock_cord",
  "compatible_architectures": ["all"],
  "tensile_strength_n": 13344,
  "elongation_percentage": 15,
  "cord_length_m": 7.62,
  "packed_volume_cm3": 320,
  "mass_g": 450,
  "notes": "Custom cut from bulk spool."
}
```

**Field reference:**

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier string (no spaces) |
| `name` | Yes | Display name shown in the app |
| `manufacturer` | Yes | Manufacturer name (can be "Generic") |
| `category` | Yes | One of: `shock_cord`, `quick_link`, `parachute`, `altimeter`, `other` |
| `compatible_architectures` | Yes | Array of architecture keys, or `["all"]` |
| `tensile_strength_n` | Shock cords + quick links | Breaking strength in **Newtons** |
| `elongation_percentage` | Shock cords only | Max elongation as a percentage (e.g. `15` for 15%) |
| `cord_length_m` | Shock cords only | Natural (unstretched) length in **metres** |
| `packed_volume_cm3` | Yes | Packed/folded volume in **cm³** |
| `mass_g` | Yes | Component mass in **grams** |
| `notes` | No | Free text notes |

**Architecture keys:**
- `single_deploy`
- `dual_deploy_single_sep`
- `dual_deploy_dual_sep`
- `all` — matches every architecture

**Converting units:**
- lbs-force → Newtons: multiply by 4.448  (e.g. 3000 lbf = 13,344 N)
- feet → metres: multiply by 0.3048  (e.g. 10 ft = 3.048 m)
- cubic inches → cm³: multiply by 16.387

---

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```

---

## Project Structure

```
app.py                  — Streamlit entry point
requirements.txt        — Python dependencies (streamlit only)
config/
  architectures.py      — Architecture configuration (extension point for new configs)
models/
  rocket.py             — Rocket dataclass
  rocket_section.py     — RocketSection dataclass
  recovery_bay.py       — RecoveryBay dataclass
  component.py          — Component dataclass
  deployment_event.py   — DeploymentEvent: computes FOS from inputs
physics/
  fos_calculator.py     — Pure physics functions (unit-tested)
data/
  components.json       — Human-editable component catalog
  component_loader.py   — Loads and queries the catalog
screens/
  screen1_architecture.py
  screen2_bay_dimensions.py
  screen3_section_masses.py
  screen4_descent_profile.py
  screen5_components.py
validation/
  validator.py          — Per-screen and pre-physics input validation
results/
  results_renderer.py   — Assembles DeploymentEvents and renders result cards
utils/
  format.py             — Number formatting helpers
tests/
  test_physics.py
  test_validation.py
  test_deployment_event.py
docs/
  README.md             — This file
  physics_reference.md  — Formula documentation
```
