// Static FX rates relative to USD. Rates are approximate and for display only.
// All prices are stored in USD; conversion is client-side for presentation.

export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$',    name: 'US Dollar',         rate: 1 },
  EUR: { code: 'EUR', symbol: '€',    name: 'Euro',              rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£',    name: 'British Pound',     rate: 0.79 },
  CAD: { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar',   rate: 1.37 },
  AUD: { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar', rate: 1.54 },
  NZD: { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar',rate: 1.63 },
  MXN: { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso',      rate: 17.1 },
  BRL: { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',    rate: 5.0 },
  ZAR: { code: 'ZAR', symbol: 'R',    name: 'South African Rand',rate: 18.5 },
  JPY: { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',      rate: 148 },
  INR: { code: 'INR', symbol: '₹',    name: 'Indian Rupee',      rate: 83.5 },
  CNY: { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',      rate: 7.24 },
  CHF: { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc',       rate: 0.90 },
  SEK: { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona',     rate: 10.5 },
  NOK: { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone',   rate: 10.7 },
};

export function formatPrice(usdAmount, currencyCode = 'USD') {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const converted = parseFloat(usdAmount) * currency.rate;
  const decimals = ['JPY'].includes(currencyCode) ? 0 : 2;
  return `${currency.symbol}${converted.toFixed(decimals)}`;
}

export function formatRange(usdMin, usdMax, currencyCode = 'USD') {
  return `${formatPrice(usdMin, currencyCode)} – ${formatPrice(usdMax, currencyCode)}`;
}
