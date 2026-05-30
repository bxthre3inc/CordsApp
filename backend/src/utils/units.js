// Unit definitions and cord-equivalent conversion factors.
// All conversions are approximate — actual yield depends on species and moisture content.

const UNIT_LABELS = {
  cord:        'Cord (128 ft³)',
  half_cord:   'Half Cord (64 ft³)',
  face_cord:   'Face Cord (~42 ft³)',
  board_foot:  'Board Foot',
  ton:         'Ton (US)',
  metric_ton:  'Metric Ton',
  cubic_meter: 'Cubic Meter (m³)',
  stere:       'Stère (1 m³ stacked)',
  kg:          'Kilogram (kg)',
  lb:          'Pound (lb)',
};

// Approximate solid-wood cord-equivalents (1 full cord = 1.0).
const TO_CORD = {
  cord:        1.0,
  half_cord:   0.5,
  face_cord:   0.33,
  board_foot:  1 / 500,  // ~500 board-feet per cord (varies)
  ton:         0.45,     // ~1 US ton ≈ 0.45 cord (mixed hardwood, seasoned)
  metric_ton:  0.50,     // ~1 metric ton ≈ 0.50 cord
  cubic_meter: 0.276,    // 1 m³ solid ≈ 0.276 cord (128 ft³ = 3.624 m³)
  stere:       0.193,    // 1 stère = 1 m³ stacked ≈ 0.7 m³ solid ≈ 0.193 cord
  kg:          0.00045,  // ~1 kg ≈ 0.45 ton ≈ 0.00045 cord
  lb:          0.000204, // 1 lb ≈ 0.000204 cord
};

function toCordEquivalent(quantity, unit) {
  return quantity * (TO_CORD[unit] ?? 1);
}

module.exports = { UNIT_LABELS, TO_CORD, toCordEquivalent };
