export interface CurrencyPair {
  symbol: string
  name: string
  category: 'forex' | 'indices' | 'commodities' | 'crypto'
  pipValue: number
  pipPosition: number // Position of pip (4 for most forex, 2 for JPY pairs, 1 for indices)
  pipDisplayMultiplier: number // Multiplier for display pips (default: 1)
  baseCurrency: string
  quoteCurrency: string
  description: string
  tradingHours: string
  realPrice: number // Real market price (will be updated via API in future)
  spread: string
}

export const CURRENCY_PAIRS: CurrencyPair[] = [
  // Major Forex Pairs
  {
    symbol: 'EUR/USD',
    name: 'Euro vs US Dollar',
    category: 'forex',
    pipValue: 10,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    description: 'Most traded currency pair globally',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '0.5-1.5 pips'
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound vs US Dollar',
    category: 'forex',
    pipValue: 10,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    description: 'Cable - High volatility pair',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '1.0-2.0 pips'
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar vs Japanese Yen',
    category: 'forex',
    pipValue: 10,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    description: 'Safe haven currency pair',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '0.5-1.5 pips'
  },
  {
    symbol: 'AUD/USD',
    name: 'Australian Dollar vs US Dollar',
    category: 'forex',
    pipValue: 10,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    description: 'Commodity currency pair',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '0.8-1.8 pips'
  },
  {
    symbol: 'USD/CAD',
    name: 'US Dollar vs Canadian Dollar',
    category: 'forex',
    pipValue: 10,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    description: 'Oil-related currency pair',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '0.8-1.8 pips'
  },
  {
    symbol: 'NZD/USD',
    name: 'New Zealand Dollar vs US Dollar',
    category: 'forex',
    pipValue: 10,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'NZD',
    quoteCurrency: 'USD',
    description: 'Kiwi - Dairy commodity currency',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '1.0-2.5 pips'
  },
  {
    symbol: 'EUR/GBP',
    name: 'Euro vs British Pound',
    category: 'forex',
    pipValue: 10,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'EUR',
    quoteCurrency: 'GBP',
    description: 'Cross currency pair',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '1.0-2.0 pips'
  },
  {
    symbol: 'EUR/JPY',
    name: 'Euro vs Japanese Yen',
    category: 'forex',
    pipValue: 10,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'EUR',
    quoteCurrency: 'JPY',
    description: 'Cross currency pair',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '1.0-2.5 pips'
  },
  {
    symbol: 'GBP/JPY',
    name: 'British Pound vs Japanese Yen',
    category: 'forex',
    pipValue: 10,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'GBP',
    quoteCurrency: 'JPY',
    description: 'Dragon - High volatility cross',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '1.5-3.0 pips'
  },
  {
    symbol: 'AUD/JPY',
    name: 'Australian Dollar vs Japanese Yen',
    category: 'forex',
    pipValue: 10,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'AUD',
    quoteCurrency: 'JPY',
    description: 'Commodity vs safe haven',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '1.0-2.5 pips'
  },

  // Indices
  {
    symbol: 'US30',
    name: 'Dow Jones Industrial Average',
    category: 'indices',
    pipValue: 2,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    description: '30 largest US companies',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '2-5 points'
  },
  {
    symbol: 'SPX500',
    name: 'S&P 500',
    category: 'indices',
    pipValue: 2,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    description: '500 largest US companies',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '0.5-2 points'
  },
  {
    symbol: 'NAS100',
    name: 'NASDAQ 100',
    category: 'indices',
    pipValue: 2,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    description: '100 largest NASDAQ companies',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '1-3 points'
  },
  {
    symbol: 'UK100',
    name: 'FTSE 100',
    category: 'indices',
    pipValue: 1,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'GBP',
    quoteCurrency: 'GBP',
    description: '100 largest UK companies',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '1-3 points'
  },
  {
    symbol: 'GER30',
    name: 'DAX 30',
    category: 'indices',
    pipValue: 1,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'EUR',
    quoteCurrency: 'EUR',
    description: '30 largest German companies',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '1-3 points'
  },
  {
    symbol: 'FRA40',
    name: 'CAC 40',
    category: 'indices',
    pipValue: 1,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'EUR',
    quoteCurrency: 'EUR',
    description: '40 largest French companies',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '1-3 points'
  },
  {
    symbol: 'JPN225',
    name: 'Nikkei 225',
    category: 'indices',
    pipValue: 1,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'JPY',
    quoteCurrency: 'JPY',
    description: '225 largest Japanese companies',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '5-15 points'
  },
  {
    symbol: 'AUS200',
    name: 'ASX 200',
    category: 'indices',
    pipValue: 1,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'AUD',
    quoteCurrency: 'AUD',
    description: '200 largest Australian companies',
    tradingHours: '24/5',
    realPrice: 1.0850,
    spread: '1-3 points'
  },

  // Commodities
  {
    symbol: 'XAU/USD',
    name: 'Gold vs US Dollar',
    category: 'commodities',
    pipValue: 0.1,
    pipPosition: 1,
    pipDisplayMultiplier: 1,
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
    description: 'Gold spot price per ounce',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '0.3-0.8 USD'
  },
  {
    symbol: 'XAG/USD',
    name: 'Silver vs US Dollar',
    category: 'commodities',
    pipValue: 0.01,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'XAG',
    quoteCurrency: 'USD',
    description: 'Silver spot price per ounce',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '0.02-0.05 USD'
  },
  {
    symbol: 'XPT/USD',
    name: 'Platinum vs US Dollar',
    category: 'commodities',
    pipValue: 0.1,
    pipPosition: 1,
    pipDisplayMultiplier: 1,
    baseCurrency: 'XPT',
    quoteCurrency: 'USD',
    description: 'Platinum spot price per ounce',
    tradingHours: '24/5',
    realPrice: 1.2650,
    spread: '0.5-1.5 USD'
  },
  {
    symbol: 'XPD/USD',
    name: 'Palladium vs US Dollar',
    category: 'commodities',
    pipValue: 0.1,
    pipPosition: 1,
    pipDisplayMultiplier: 1,
    baseCurrency: 'XPD',
    quoteCurrency: 'USD',
    description: 'Palladium spot price per ounce',
    tradingHours: '24/5',
    realPrice: 2.5000,
    spread: '1-5 USD'
  },
  {
    symbol: 'USOIL',
    name: 'Crude Oil WTI',
    category: 'commodities',
    pipValue: 0.01,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    description: 'West Texas Intermediate crude oil',
    tradingHours: '24/5',
    realPrice: 2.5000,
    spread: '0.03-0.08 USD'
  },
  {
    symbol: 'UKOIL',
    name: 'Crude Oil Brent',
    category: 'commodities',
    pipValue: 0.01,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    description: 'Brent crude oil',
    tradingHours: '24/5',
    realPrice: 2.5000,
    spread: '0.03-0.08 USD'
  },
  {
    symbol: 'NATGAS',
    name: 'Natural Gas',
    category: 'commodities',
    pipValue: 0.001,
    pipPosition: 3,
    pipDisplayMultiplier: 1,
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    description: 'Natural gas futures',
    tradingHours: '24/5',
    realPrice: 2.5000,
    spread: '0.005-0.02 USD'
  },

  // Cryptocurrencies
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin vs US Dollar',
    category: 'crypto',
    pipValue: 1,
    pipPosition: 0,
    pipDisplayMultiplier: 1,
    baseCurrency: 'BTC',
    quoteCurrency: 'USD',
    description: 'Bitcoin spot price',
    tradingHours: '24/7',
    realPrice: 2.5000,
    spread: '5-50 USD'
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum vs US Dollar',
    category: 'crypto',
    pipValue: 0.01,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'ETH',
    quoteCurrency: 'USD',
    description: 'Ethereum spot price',
    tradingHours: '24/7',
    realPrice: 2.5000,
    spread: '0.5-5 USD'
  },
  {
    symbol: 'LTC/USD',
    name: 'Litecoin vs US Dollar',
    category: 'crypto',
    pipValue: 0.01,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'LTC',
    quoteCurrency: 'USD',
    description: 'Litecoin spot price',
    tradingHours: '24/7',
    realPrice: 2.5000,
    spread: '0.1-1 USD'
  },
  {
    symbol: 'XRP/USD',
    name: 'Ripple vs US Dollar',
    category: 'crypto',
    pipValue: 0.0001,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'XRP',
    quoteCurrency: 'USD',
    description: 'Ripple spot price',
    tradingHours: '24/7',
    realPrice: 2.5000,
    spread: '0.0001-0.001 USD'
  },
  {
    symbol: 'ADA/USD',
    name: 'Cardano vs US Dollar',
    category: 'crypto',
    pipValue: 0.0001,
    pipPosition: 4,
    pipDisplayMultiplier: 1,
    baseCurrency: 'ADA',
    quoteCurrency: 'USD',
    description: 'Cardano spot price',
    tradingHours: '24/7',
    realPrice: 2.5000,
    spread: '0.0001-0.001 USD'
  },
  {
    symbol: 'DOT/USD',
    name: 'Polkadot vs US Dollar',
    category: 'crypto',
    pipValue: 0.01,
    pipPosition: 2,
    pipDisplayMultiplier: 1,
    baseCurrency: 'DOT',
    quoteCurrency: 'USD',
    description: 'Polkadot spot price',
    tradingHours: '24/7',
    realPrice: 2.5000,
    spread: '0.1-1 USD'
  }
]

// Helper functions
export const getCurrencyPair = (symbol: string): CurrencyPair | undefined => {
  // First try to get from localStorage (for backward compatibility)
  const savedPairs = localStorage.getItem('customCurrencyPairs')
  if (savedPairs) {
    try {
      const customPairs = JSON.parse(savedPairs)
      const customPair = customPairs.find((pair: CurrencyPair) => pair.symbol === symbol)
      if (customPair) return customPair
    } catch (error) {
      console.error('Error parsing saved currency pairs:', error)
    }
  }
  
  // Fallback to static data
  return CURRENCY_PAIRS.find(pair => pair.symbol === symbol)
}

export const getCurrencyPairsByCategory = (category: 'forex' | 'indices' | 'commodities' | 'crypto'): CurrencyPair[] => {
  return CURRENCY_PAIRS.filter(pair => pair.category === category)
}

export const calculatePips = (entryPrice: number, exitPrice: number, symbol: string, useDisplayMultiplier: boolean = false): number => {
  console.log('Currency Database: calculatePips called with:', { entryPrice, exitPrice, symbol, useDisplayMultiplier })
  const pair = getCurrencyPair(symbol)
  console.log('Currency Database: Found pair:', pair)
  if (!pair) {
    console.log('Currency Database: No pair found for symbol:', symbol)
    return 0
  }

  const priceDifference = exitPrice - entryPrice
  
  // For indices, use pipValue as divisor (e.g., pipValue: 2 means 2 points = 1 pip)
  // For forex/commodities, use pipPosition to calculate pip size (e.g., pipPosition: 1 means 0.1 = 1 pip)
  let pipValue: number
  if (pair.category === 'indices') {
    pipValue = pair.pipValue || Math.pow(10, -pair.pipPosition)
  } else {
    pipValue = Math.pow(10, -pair.pipPosition)
  }
  
  let pips = Math.round(priceDifference / pipValue)
  
  // Apply display multiplier if requested
  if (useDisplayMultiplier && pair.pipDisplayMultiplier !== 1) {
    pips = Math.round(pips * pair.pipDisplayMultiplier)
  }
  
  console.log('Currency Database: Calculation:', {
    priceDifference,
    pipValue,
    pipPosition: pair.pipPosition,
    category: pair.category,
    pipDisplayMultiplier: pair.pipDisplayMultiplier,
    useDispalyMultiplier: useDisplayMultiplier,
    calculatedPips: pips
  })
  
  return pips
}

export const calculateProfit = (entryPrice: number, exitPrice: number, lotSize: number, symbol: string): number => {
  console.log('Currency Database: calculateProfit called with:', { entryPrice, exitPrice, lotSize, symbol })
  const pair = getCurrencyPair(symbol)
  console.log('Currency Database: Found pair for profit calculation:', pair)
  if (!pair) {
    console.log('Currency Database: No pair found for profit calculation:', symbol)
    return 0
  }

  const pips = calculatePips(entryPrice, exitPrice, symbol)
  
  // For forex/commodities: pipValue is the dollar value per pip
  // For indices: pipValue is a divisor, so we need to calculate the actual dollar value per pip
  let profitPerPip: number
  if (pair.category === 'indices') {
    // For indices, the pipValue field is used as a divisor in pip calculation
    // The actual profit per pip is typically $1 per point for most indices
    profitPerPip = 1.0 // $1 per point for indices
  } else {
    // For forex/commodities, pipValue is already the dollar value per pip
    profitPerPip = pair.pipValue
  }
  
  const profit = pips * profitPerPip * lotSize
  
  console.log('Currency Database: Profit calculation:', {
    pips,
    profitPerPip,
    lotSize,
    calculatedProfit: profit
  })
  
  return profit
}

export const formatPrice = (price: number, symbol: string): string => {
  const pair = getCurrencyPair(symbol)
  if (!pair) return price.toFixed(2)

  return price.toFixed(pair.pipPosition)
}

export const getPriceColor = (price: number): string => {
  if (price < 1) return 'text-green-600 dark:text-green-400'
  if (price < 10) return 'text-yellow-600 dark:text-yellow-400'
  if (price < 100) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

export const formatRealPrice = (price: number): string => {
  if (price < 1) return price.toFixed(4)
  if (price < 10) return price.toFixed(3)
  if (price < 100) return price.toFixed(2)
  return price.toFixed(1)
}

export const getCategoryIcon = (category: string): string => {
  switch (category) {
    case 'forex': return '💱'
    case 'indices': return '📈'
    case 'commodities': return '🥇'
    case 'crypto': return '₿'
    default: return '💰'
  }
}

