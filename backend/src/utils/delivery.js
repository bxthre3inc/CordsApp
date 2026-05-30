// Delivery pricing — shared constants used by backend and referenced by frontend.
// Platform keeps PLATFORM_DELIVERY_RATE of the fee; driver keeps the rest.

const PLATFORM_DELIVERY_RATE = 0.20;   // 20% to platform, 80% to driver
const EXPRESS_MULTIPLIER     = 1.50;   // express = 1.5× the standard per-mile rate
const MIN_DELIVERY_FEE       = 10.00;  // floor — keeps short trips worthwhile

// Per-mile rate the buyer pays, tiered by number of cords being delivered.
// Higher quantity = larger vehicle needed but lower per-cord overhead.
const RATE_TIERS = [
  { maxQuantity: 1,        ratePerMile: 3.50 },
  { maxQuantity: 3,        ratePerMile: 3.00 },
  { maxQuantity: 6,        ratePerMile: 2.50 },
  { maxQuantity: 10,       ratePerMile: 2.00 },
  { maxQuantity: Infinity, ratePerMile: 1.75 },
];

function getRatePerMile(quantity) {
  const tier = RATE_TIERS.find(t => quantity <= t.maxQuantity);
  return tier ? tier.ratePerMile : RATE_TIERS[RATE_TIERS.length - 1].ratePerMile;
}

// Haversine distance in miles between two {latitude, longitude} points.
function haversineMiles(a, b) {
  const R = 3958.8; // earth radius in miles
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude  - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// Returns { miles, ratePerMile, baseFee, deliveryFee } where deliveryFee is what
// the buyer pays (after express multiplier and minimum floor applied).
function calcDeliveryFee(supplierLocation, buyerLocation, quantity, isExpress = false) {
  const miles       = haversineMiles(supplierLocation, buyerLocation);
  const ratePerMile = getRatePerMile(quantity);
  const multiplier  = isExpress ? EXPRESS_MULTIPLIER : 1;
  const raw         = miles * ratePerMile * multiplier;
  const deliveryFee = parseFloat(Math.max(raw, MIN_DELIVERY_FEE).toFixed(2));
  return { miles: parseFloat(miles.toFixed(1)), ratePerMile, deliveryFee };
}

module.exports = { PLATFORM_DELIVERY_RATE, EXPRESS_MULTIPLIER, MIN_DELIVERY_FEE, RATE_TIERS, getRatePerMile, haversineMiles, calcDeliveryFee };
