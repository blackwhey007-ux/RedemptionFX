/**
 * Pip Calculator Utility
 * Calculates pip values from MT5 position data using current market prices
 * No dependency on currency database - all calculations from API data
 */

interface Position {
  symbol: string
  type: 'BUY' | 'SELL'
  openPrice: number
  currentPrice: number
}

/**
 * Determine pip size based on symbol
 * - JPY pairs: 0.01 (2 decimal places)
 * - Indices: 1.0 (whole numbers)
 * - Gold/Silver: 0.01
 * - Default forex: 0.0001 (4 decimal places)
 */
export function getPipSize(symbol: string): number {
  const upperSymbol = symbol.toUpperCase()
  
  console.log('🔍 Detecting pip size for symbol:', symbol)
  
  // Crypto (BTC, ETH, etc.) - usually 1.0 for pips
  if (
    upperSymbol.startsWith('BTC') ||
    upperSymbol.startsWith('ETH') ||
    upperSymbol.startsWith('XRP') ||
    upperSymbol.includes('CRYPTO') ||
    upperSymbol.includes('CRYPT')
  ) {
    console.log('✅ Crypto detected, pip size: 1.0')
    return 1.0
  }
  
  // JPY pairs
  if (upperSymbol.includes('JPY')) {
    console.log('✅ JPY pair detected, pip size: 0.01')
    return 0.01
  }
  
  // Indices - expanded patterns to catch more variations
  if (
    /^(US|NAS|DOW|SPX|DAX|FTSE|CAC|NK|ASX|AUS|GER|FRA|UK|HK|JP|SG)/i.test(upperSymbol) ||
    upperSymbol.includes('30') ||  // US30, GER30, etc.
    upperSymbol.includes('100') || // NAS100, NIKKEI100
    upperSymbol.includes('500') || // SPX500
    upperSymbol.includes('INDEX') ||
    upperSymbol.includes('IND')
  ) {
    console.log('✅ Index detected, pip size: 1.0')
    return 1.0
  }
  
  // Gold and Silver
  if (upperSymbol.includes('XAU') || upperSymbol.includes('XAG') || upperSymbol.includes('GOLD') || upperSymbol.includes('SILVER')) {
    console.log('✅ Gold/Silver detected, pip size: 0.01')
    return 0.01
  }
  
  // Default forex (4 decimal places)
  console.log('✅ Default forex, pip size: 0.0001')
  return 0.0001
}

/**
 * Calculate pips from position data
 * Formula: ((currentPrice - openPrice) / pipSize) * direction
 * - BUY: positive when currentPrice > openPrice (profit)
 * - SELL: positive when currentPrice < openPrice (profit)
 */
export function calculatePipsFromPosition(position: Position): number {
  const { symbol, type, openPrice, currentPrice } = position
  
  if (!openPrice || !currentPrice || !symbol) {
    console.warn('⚠️ Missing data for pip calculation:', { symbol, type, openPrice, currentPrice })
    return 0
  }
  
  const pipSize = getPipSize(symbol)
  const priceDiff = currentPrice - openPrice
  
  console.log('📊 Pip calculation:', {
    symbol,
    type,
    openPrice,
    currentPrice,
    priceDiff,
    pipSize
  })
  
  // Normalize type to handle both 'BUY' and 'POSITION_TYPE_BUY' formats
  const normalizedType = type.toUpperCase()
  const isBuy = normalizedType.includes('BUY') && !normalizedType.includes('SELL')
  
  // For BUY: profit when current > open (positive diff)
  // For SELL: profit when current < open (negative diff)
  const direction = isBuy ? 1 : -1
  
  const pips = (priceDiff / pipSize) * direction
  
  console.log('✅ Calculated pips:', pips, 'direction:', direction, 'isBuy:', isBuy)
  
  // Round to 1 decimal place
  return Math.round(pips * 10) / 10
}

/**
 * Format pips for display
 */
export function formatPips(pips: number): string {
  if (pips === 0) return '0'
  if (pips > 0) return `+${pips.toFixed(1)}`
  return pips.toFixed(1)
}

