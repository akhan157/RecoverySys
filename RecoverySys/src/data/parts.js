export const CATEGORIES = [
  { id: 'main_chute',       label: 'Main Chute',            placeholder: 'No main chute selected' },
  { id: 'drogue_chute',     label: 'Drogue Chute',          placeholder: 'No drogue chute selected' },
  { id: 'shock_cord',       label: 'Shock Cord',            placeholder: 'No shock cord selected' },
  { id: 'chute_protector',  label: 'Chute Protector',       placeholder: 'No chute protector selected' },
  { id: 'quick_links',      label: 'Quick Links',           placeholder: 'No quick links selected' },
  { id: 'chute_device',     label: 'Chute-Mounted Device',  placeholder: 'No chute-mounted device selected' },
  { id: 'gps_tracker',      label: 'GPS Tracker',           placeholder: 'No GPS tracker selected' },
]

export const PARTS = [
  // ── Main Parachutes ─────────────────────────────────────────────────────────
  // packed_diam_in  = compressed diameter when stuffed for flight
  // packed_length_in = compressed length (how much bay height it occupies)
  {
    id: 'fc-36-iris',
    category: 'main_chute',
    manufacturer: 'Fruity Chutes',
    name: '36" Iris Ultra',
    specs: { diameter_in: 36, cd: 2.2, weight_g: 180, packed_diam_in: 3.5, packed_length_in: 5.5 },
  },
  {
    id: 'fc-48-iris',
    category: 'main_chute',
    manufacturer: 'Fruity Chutes',
    name: '48" Iris Ultra',
    specs: { diameter_in: 48, cd: 2.2, weight_g: 280, packed_diam_in: 4.5, packed_length_in: 7.5 },
  },
  {
    id: 'fc-60-iris',
    category: 'main_chute',
    manufacturer: 'Fruity Chutes',
    name: '60" Iris Ultra',
    specs: { diameter_in: 60, cd: 2.2, weight_g: 390, packed_diam_in: 5.5, packed_length_in: 9.0 },
  },
  {
    id: 'rm-36',
    category: 'main_chute',
    manufacturer: 'Rocketman',
    name: '36" Classic',
    specs: { diameter_in: 36, cd: 1.8, weight_g: 150, packed_diam_in: 3.0, packed_length_in: 5.0 },
  },
  {
    id: 'rm-48',
    category: 'main_chute',
    manufacturer: 'Rocketman',
    name: '48" Classic',
    specs: { diameter_in: 48, cd: 1.8, weight_g: 220, packed_diam_in: 4.0, packed_length_in: 7.0 },
  },
  {
    id: 'rm-72',
    category: 'main_chute',
    manufacturer: 'Rocketman',
    name: '72" Classic',
    specs: { diameter_in: 72, cd: 1.8, weight_g: 480, packed_diam_in: 6.5, packed_length_in: 11.0 },
  },

  // ── Drogue Parachutes ────────────────────────────────────────────────────────
  {
    id: 'fc-12-drogue',
    category: 'drogue_chute',
    manufacturer: 'Fruity Chutes',
    name: '12" Drogue',
    specs: { diameter_in: 12, cd: 1.5, weight_g: 45, packed_diam_in: 1.5, packed_length_in: 3.0 },
  },
  {
    id: 'fc-18-drogue',
    category: 'drogue_chute',
    manufacturer: 'Fruity Chutes',
    name: '18" Drogue',
    specs: { diameter_in: 18, cd: 1.5, weight_g: 75, packed_diam_in: 2.0, packed_length_in: 4.0 },
  },
  {
    id: 'rm-18-drogue',
    category: 'drogue_chute',
    manufacturer: 'Rocketman',
    name: '18" Drogue',
    specs: { diameter_in: 18, cd: 1.5, weight_g: 70, packed_diam_in: 2.0, packed_length_in: 4.0 },
  },
  {
    id: 'streamer-2x60',
    category: 'drogue_chute',
    manufacturer: 'Generic',
    name: '2"×60" Streamer',
    specs: { diameter_in: 2, cd: 0.3, weight_g: 25, packed_diam_in: 0.5, packed_length_in: 4.0 },
  },

  // ── Shock Cord ───────────────────────────────────────────────────────────────
  // packed_height_in = height of the cord bundle when Z-folded and sitting in the bay
  {
    id: 'sc-tub-half-15',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1/2" Tubular Nylon 15ft',
    specs: { strength_lbs: 1000, length_ft: 15, weight_g: 120, packed_height_in: 2.0 },
  },
  {
    id: 'sc-tub-1-10',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1" Tubular Nylon 10ft',
    specs: { strength_lbs: 2000, length_ft: 10, weight_g: 150, packed_height_in: 2.5 },
  },
  {
    id: 'sc-kev-qtr-15',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1/4" Kevlar 15ft',
    specs: { strength_lbs: 1500, length_ft: 15, weight_g: 85, packed_height_in: 1.5 },
  },
  {
    id: 'sc-kev-qtr-20',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1/4" Kevlar 20ft',
    specs: { strength_lbs: 1500, length_ft: 20, weight_g: 115, packed_height_in: 2.0 },
  },

  // ── Chute Protectors ─────────────────────────────────────────────────────────
  // Nomex blankets that wrap around the chute to shield it from ejection charge heat.
  // size_in = protector diameter; max_chute_diam_in = largest chute it safely covers.
  {
    id: 'tfr-nomex-9',
    category: 'chute_protector',
    manufacturer: 'Top Flight Recovery',
    name: 'Nomex 9"',
    specs: { size_in: 9, max_chute_diam_in: 24, weight_g: 40 },
  },
  {
    id: 'tfr-nomex-12',
    category: 'chute_protector',
    manufacturer: 'Top Flight Recovery',
    name: 'Nomex 12"',
    specs: { size_in: 12, max_chute_diam_in: 36, weight_g: 65 },
  },
  {
    id: 'tfr-nomex-18',
    category: 'chute_protector',
    manufacturer: 'Top Flight Recovery',
    name: 'Nomex 18"',
    specs: { size_in: 18, max_chute_diam_in: 54, weight_g: 110 },
  },
  {
    id: 'tfr-nomex-24',
    category: 'chute_protector',
    manufacturer: 'Top Flight Recovery',
    name: 'Nomex 24"',
    specs: { size_in: 24, max_chute_diam_in: 72, weight_g: 170 },
  },

  // ── Quick Links ──────────────────────────────────────────────────────────────
  // Rated steel quick links connecting shock cord to airframe bulkhead and chute bridle.
  // strength_lbs = working load limit; weight_g = per pair (you typically need 2–3).
  {
    id: 'ql-316-zinc',
    category: 'quick_links',
    manufacturer: 'Generic',
    name: '3/16" Zinc Quick Links (×2)',
    specs: { strength_lbs: 880, size_in: 0.1875, weight_g: 30 },
  },
  {
    id: 'ql-14-zinc',
    category: 'quick_links',
    manufacturer: 'Generic',
    name: '1/4" Zinc Quick Links (×2)',
    specs: { strength_lbs: 1540, size_in: 0.25, weight_g: 50 },
  },
  {
    id: 'ql-316-ss',
    category: 'quick_links',
    manufacturer: 'Generic',
    name: '3/16" Stainless Quick Links (×2)',
    specs: { strength_lbs: 1100, size_in: 0.1875, weight_g: 35 },
  },
  {
    id: 'ql-38-zinc',
    category: 'quick_links',
    manufacturer: 'Generic',
    name: '3/8" Zinc Quick Links (×2)',
    specs: { strength_lbs: 2640, size_in: 0.375, weight_g: 85 },
  },

  // ── Chute-Mounted Devices ────────────────────────────────────────────────────
  // Self-contained devices that clip to the parachute bridle or shock cord.
  // All have internal batteries — no separate power source required in the bay.
  // deploy_alt_min/max_ft = programmable deployment altitude range (release devices only).
  {
    id: 'jl-chute-release',
    category: 'chute_device',
    manufacturer: 'Jolly Logic',
    name: 'Chute Release',
    specs: { weight_g: 28, deploy_alt_min_ft: 100, deploy_alt_max_ft: 5000 },
  },
  {
    id: 'jl-altimeter-two',
    category: 'chute_device',
    manufacturer: 'Jolly Logic',
    name: 'AltimeterTwo',
    specs: { weight_g: 16 },
  },
  {
    id: 'jl-altimeter-three',
    category: 'chute_device',
    manufacturer: 'Jolly Logic',
    name: 'AltimeterThree',
    specs: { weight_g: 20 },
  },
  {
    id: 'pf-firefly',
    category: 'chute_device',
    manufacturer: 'Perfectflite',
    name: 'FireFly Altimeter',
    specs: { weight_g: 14 },
  },

  // ── GPS Trackers ─────────────────────────────────────────────────────────────
  // Transmit location so you can find the rocket after landing.
  // voltage_min/max = operating range; weight_g = tracker only (antenna included).
  {
    id: 'fw-gps',
    category: 'gps_tracker',
    manufacturer: 'Featherweight',
    name: 'Featherweight GPS',
    specs: { voltage_min: 3.3, voltage_max: 12.0, weight_g: 30, frequency_mhz: 915 },
  },
  {
    id: 'brb-900',
    category: 'gps_tracker',
    manufacturer: 'Big Red Bee',
    name: 'BRB900 APRS',
    specs: { voltage_min: 7.0, voltage_max: 12.6, weight_g: 56, frequency_mhz: 915 },
  },
  {
    id: 'et-quasar',
    category: 'gps_tracker',
    manufacturer: 'Eggtimer',
    name: 'Quasar WiFi Tracker',
    specs: { voltage_min: 3.3, voltage_max: 5.5, weight_g: 25, frequency_mhz: 2400 },
  },
  {
    id: 'altus-micro',
    category: 'gps_tracker',
    manufacturer: 'Altus Metrum',
    name: 'TeleMini v3',
    specs: { voltage_min: 3.2, voltage_max: 5.5, weight_g: 21, frequency_mhz: 434 },
  },
]
