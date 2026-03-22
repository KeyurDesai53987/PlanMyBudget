export const exchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.53,
  INR: 83.12,
  CNY: 7.24,
  CHF: 0.88,
  SGD: 1.34,
}

export const currencies = Object.keys(exchangeRates)

export const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  INR: '₹',
  CNY: '¥',
  CHF: 'CHF',
  SGD: 'S$',
}

export const regions = [
  { value: 'US', label: 'United States', currency: 'USD' },
  { value: 'EU', label: 'Europe', currency: 'EUR' },
  { value: 'GB', label: 'United Kingdom', currency: 'GBP' },
  { value: 'JP', label: 'Japan', currency: 'JPY' },
  { value: 'CA', label: 'Canada', currency: 'CAD' },
  { value: 'AU', label: 'Australia', currency: 'AUD' },
  { value: 'IN', label: 'India', currency: 'INR' },
  { value: 'CN', label: 'China', currency: 'CNY' },
  { value: 'CH', label: 'Switzerland', currency: 'CHF' },
  { value: 'SG', label: 'Singapore', currency: 'SGD' },
]

export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (!fromCurrency || !toCurrency) return amount
  if (fromCurrency === toCurrency) return amount
  const rate = exchangeRates[fromCurrency]
  if (!rate) return amount
  const inUSD = amount / rate
  const toRate = exchangeRates[toCurrency]
  if (!toRate) return amount
  return inUSD * toRate
}

export const formatCurrency = (amount, currency = 'USD') => {
  const symbol = currencySymbols[currency] || '$'
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const getCurrencyForRegion = (region) => {
  const r = regions.find(r => r.value === region)
  return r ? r.currency : 'USD'
}
