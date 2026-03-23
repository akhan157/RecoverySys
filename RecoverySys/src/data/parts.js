export const CATEGORIES = [
  { id: 'main_chute',      label: 'Main Chute',      placeholder: 'No main chute selected' },
  { id: 'drogue_chute',    label: 'Drogue Chute',    placeholder: 'No drogue chute selected' },
  { id: 'flight_computer', label: 'Flight Computer',  placeholder: 'No flight computer selected' },
  { id: 'battery',         label: 'Battery',          placeholder: 'No battery selected' },
  { id: 'shock_cord',      label: 'Shock Cord',       placeholder: 'No shock cord selected' },
]

export const PARTS = [
  // ── Main Parachutes ─────────────────────────────────────────────────────────
  {
    id: 'fc-36-iris',
    category: 'main_chute',
    manufacturer: 'Fruity Chutes',
    name: '36" Iris Ultra',
    specs: { diameter_in: 36, cd: 2.2, weight_g: 180, packed_diam_in: 3.5 },
  },
  {
    id: 'fc-48-iris',
    category: 'main_chute',
    manufacturer: 'Fruity Chutes',
    name: '48" Iris Ultra',
    specs: { diameter_in: 48, cd: 2.2, weight_g: 280, packed_diam_in: 4.5 },
  },
  {
    id: 'fc-60-iris',
    category: 'main_chute',
    manufacturer: 'Fruity Chutes',
    name: '60" Iris Ultra',
    specs: { diameter_in: 60, cd: 2.2, weight_g: 390, packed_diam_in: 5.5 },
  },
  {
    id: 'rm-36',
    category: 'main_chute',
    manufacturer: 'Rocketman',
    name: '36" Classic',
    specs: { diameter_in: 36, cd: 1.8, weight_g: 150, packed_diam_in: 3.0 },
  },
  {
    id: 'rm-48',
    category: 'main_chute',
    manufacturer: 'Rocketman',
    name: '48" Classic',
    specs: { diameter_in: 48, cd: 1.8, weight_g: 220, packed_diam_in: 4.0 },
  },
  {
    id: 'rm-72',
    category: 'main_chute',
    manufacturer: 'Rocketman',
    name: '72" Classic',
    specs: { diameter_in: 72, cd: 1.8, weight_g: 480, packed_diam_in: 6.5 },
  },

  // ── Drogue Parachutes ────────────────────────────────────────────────────────
  {
    id: 'fc-12-drogue',
    category: 'drogue_chute',
    manufacturer: 'Fruity Chutes',
    name: '12" Drogue',
    specs: { diameter_in: 12, cd: 1.5, weight_g: 45, packed_diam_in: 1.5 },
  },
  {
    id: 'fc-18-drogue',
    category: 'drogue_chute',
    manufacturer: 'Fruity Chutes',
    name: '18" Drogue',
    specs: { diameter_in: 18, cd: 1.5, weight_g: 75, packed_diam_in: 2.0 },
  },
  {
    id: 'rm-18-drogue',
    category: 'drogue_chute',
    manufacturer: 'Rocketman',
    name: '18" Drogue',
    specs: { diameter_in: 18, cd: 1.5, weight_g: 70, packed_diam_in: 2.0 },
  },
  {
    id: 'streamer-2x60',
    category: 'drogue_chute',
    manufacturer: 'Generic',
    name: '2"×60" Streamer',
    specs: { diameter_in: 2, cd: 0.3, weight_g: 25, packed_diam_in: 0.5 },
  },

  // ── Flight Computers ─────────────────────────────────────────────────────────
  {
    id: 'fw-raven4',
    category: 'flight_computer',
    manufacturer: 'Featherweight',
    name: 'Raven 4',
    specs: { min_voltage: 3.7, max_voltage: 4.2, weight_g: 28, accel_limit_g: 300, dual_deploy: true },
  },
  {
    id: 'pf-stratologger',
    category: 'flight_computer',
    manufacturer: 'Perfectflite',
    name: 'StratoLogger CF',
    specs: { min_voltage: 3.6, max_voltage: 5.5, weight_g: 21, accel_limit_g: 100, dual_deploy: true },
  },
  {
    id: 'et-quantum',
    category: 'flight_computer',
    manufacturer: 'Eggtimer',
    name: 'Quantum',
    specs: { min_voltage: 3.6, max_voltage: 5.5, weight_g: 22, accel_limit_g: 100, dual_deploy: true },
  },
  {
    id: 'mw-rrc3',
    category: 'flight_computer',
    manufacturer: 'MissileWorks',
    name: 'RRC3',
    specs: { min_voltage: 5.5, max_voltage: 12.0, weight_g: 18, accel_limit_g: 100, dual_deploy: true },
  },

  // ── Batteries ────────────────────────────────────────────────────────────────
  {
    id: 'batt-9v-alk',
    category: 'battery',
    manufacturer: 'Generic',
    name: '9V Alkaline',
    specs: { voltage: 9.0, capacity_mah: 550, weight_g: 45 },
  },
  {
    id: 'batt-7v4-lipo',
    category: 'battery',
    manufacturer: 'Generic',
    name: '7.4V LiPo 150mAh',
    specs: { voltage: 7.4, capacity_mah: 150, weight_g: 25 },
  },
  {
    id: 'batt-3v7-lipo',
    category: 'battery',
    manufacturer: 'Generic',
    name: '3.7V LiPo 300mAh',
    specs: { voltage: 3.7, capacity_mah: 300, weight_g: 15 },
  },
  {
    id: 'batt-6v-lr44',
    category: 'battery',
    manufacturer: 'Generic',
    name: '4× LR44 (6V)',
    specs: { voltage: 6.0, capacity_mah: 150, weight_g: 25 },
  },

  // ── Shock Cord ───────────────────────────────────────────────────────────────
  {
    id: 'sc-tub-half-15',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1/2" Tubular Nylon 15ft',
    specs: { strength_lbs: 1000, length_ft: 15, weight_g: 120 },
  },
  {
    id: 'sc-tub-1-10',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1" Tubular Nylon 10ft',
    specs: { strength_lbs: 2000, length_ft: 10, weight_g: 150 },
  },
  {
    id: 'sc-kev-qtr-15',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1/4" Kevlar 15ft',
    specs: { strength_lbs: 1500, length_ft: 15, weight_g: 85 },
  },
  {
    id: 'sc-kev-qtr-20',
    category: 'shock_cord',
    manufacturer: 'Generic',
    name: '1/4" Kevlar 20ft',
    specs: { strength_lbs: 1500, length_ft: 20, weight_g: 115 },
  },
]
