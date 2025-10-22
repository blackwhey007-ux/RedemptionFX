import { db } from './firestore'
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, limit, Timestamp, getDoc, setDoc } from 'firebase/firestore'
import { Trade } from '@/types/trade'
import { VipImportLog, VipStats } from '@/types/vip'

// Default values - will be overridden by dynamic configuration
const DEFAULT_VIP_PROFILE_ID = 'vip-showcase'
const DEFAULT_VIP_USER_ID = 'vip-trader'

// Configuration collection
const CONFIG_COLLECTION = 'config'
const VIP_CONFIG_DOC = 'vip-showcase'

// Dynamic VIP profile configuration
let cachedVipProfileId: string | null = null
let cachedVipUserId: string | null = null

/**
 * Get the current VIP profile ID from configuration
 */
export const getVipProfileId = async (): Promise<string> => {
  if (cachedVipProfileId) {
    return cachedVipProfileId
  }

  try {
    // First try localStorage (for immediate updates)
    if (typeof window !== 'undefined') {
      const localProfileId = localStorage.getItem('vip-showcase-profile')
      if (localProfileId) {
        cachedVipProfileId = localProfileId
        return localProfileId
      }
    }

    // Then try Firestore config
    const configDoc = await getDoc(doc(db, CONFIG_COLLECTION, VIP_CONFIG_DOC))
    if (configDoc.exists()) {
      const config = configDoc.data()
      cachedVipProfileId = config.profileId || DEFAULT_VIP_PROFILE_ID
      cachedVipUserId = config.userId || DEFAULT_VIP_USER_ID
    } else {
      // Use defaults if no config exists
      cachedVipProfileId = DEFAULT_VIP_PROFILE_ID
      cachedVipUserId = DEFAULT_VIP_USER_ID
    }

    return cachedVipProfileId
  } catch (error) {
    console.error('Error getting VIP profile ID:', error)
    return DEFAULT_VIP_PROFILE_ID
  }
}

/**
 * Get the current VIP user ID from configuration
 */
export const getVipUserId = async (): Promise<string> => {
  if (cachedVipUserId) {
    return cachedVipUserId
  }

  try {
    // First try localStorage (for immediate updates)
    if (typeof window !== 'undefined') {
      const localUserId = localStorage.getItem('vip-showcase-user')
      if (localUserId) {
        cachedVipUserId = localUserId
        return localUserId
      }
    }

    // Then try Firestore config
    const configDoc = await getDoc(doc(db, CONFIG_COLLECTION, VIP_CONFIG_DOC))
    if (configDoc.exists()) {
      const config = configDoc.data()
      cachedVipProfileId = config.profileId || DEFAULT_VIP_PROFILE_ID
      cachedVipUserId = config.userId || DEFAULT_VIP_USER_ID
    } else {
      // Use defaults if no config exists
      cachedVipProfileId = DEFAULT_VIP_PROFILE_ID
      cachedVipUserId = DEFAULT_VIP_USER_ID
    }

    return cachedVipUserId
  } catch (error) {
    console.error('Error getting VIP user ID:', error)
    return DEFAULT_VIP_USER_ID
  }
}

/**
 * Set the VIP profile configuration
 */
export const setVipProfileConfig = async (profileId: string, userId?: string): Promise<void> => {
  try {
    // Update cache
    cachedVipProfileId = profileId
    if (userId) {
      cachedVipUserId = userId
    }

    // Save to localStorage for immediate effect
    if (typeof window !== 'undefined') {
      localStorage.setItem('vip-showcase-profile', profileId)
      if (userId) {
        localStorage.setItem('vip-showcase-user', userId)
      }
    }

    // Save to Firestore for persistence
    await setDoc(doc(db, CONFIG_COLLECTION, VIP_CONFIG_DOC), {
      profileId,
      userId: userId || DEFAULT_VIP_USER_ID,
      updatedAt: Timestamp.now()
    }, { merge: true })

    console.log(`VIP profile configuration updated: profileId=${profileId}, userId=${userId || DEFAULT_VIP_USER_ID}`)
  } catch (error) {
    console.error('Error setting VIP profile configuration:', error)
    throw error
  }
}

/**
 * Clear the VIP profile configuration cache
 */
export const clearVipProfileCache = (): void => {
  cachedVipProfileId = null
  cachedVipUserId = null
}

export interface ParsedTrade {
  ticket: string
  openTime: Date
  closeTime: Date
  type: 'BUY' | 'SELL'
  symbol: string
  volume: number
  openPrice: number
  closePrice: number
  profit: number
  commission: number
  swap: number
  comment?: string
}

export interface ImportResult {
  success: boolean
  newTrades: number
  updatedTrades: number
  skippedTrades: number
  errors: string[]
  trades: ParsedTrade[]
}

/**
 * Parse MT5 CSV content and extract trades
 */
export function parseMT5CSV(csvContent: string): ParsedTrade[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  console.log('Total lines in CSV:', lines.length)
  
  if (lines.length < 2) {
    throw new Error('CSV file appears to be empty or invalid')
  }

  // Find the actual data header row (skip report headers)
  let headerLineIndex = 0
  let header = ''
  
  // Look for a line that contains trade-related columns
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase()
    if (line.includes('ticket') || line.includes('deal') || line.includes('time') || 
        line.includes('type') || line.includes('symbol') || line.includes('price')) {
      headerLineIndex = i
      header = line
      break
    }
  }
  
  console.log('Found header at line:', headerLineIndex + 1)
  console.log('CSV header:', header)
  const trades: ParsedTrade[] = []

  // Auto-detect CSV format based on headers
  const isDetailedStatement = header.includes('ticket') && header.includes('open time')
  const isAccountHistory = header.includes('deal') && header.includes('time')
  const isReportHistory = header.includes('ticket') || header.includes('time') || header.includes('type')
  
  console.log('Format detection:', {
    isDetailedStatement,
    isAccountHistory,
    isReportHistory,
    header
  })

  // Start processing from the line after the header
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      let trade: ParsedTrade | null = null
      
      if (isDetailedStatement) {
        trade = parseDetailedStatementLine(line)
      } else if (isAccountHistory) {
        trade = parseAccountHistoryLine(line)
      } else if (isReportHistory) {
        trade = parseReportHistoryLine(line, header)
      } else {
        trade = parseGenericLine(line, header)
      }

      if (trade) {
        trades.push(trade)
        console.log(`Parsed trade ${trades.length}:`, trade.ticket, trade.symbol, trade.profit)
      }
    } catch (error) {
      console.warn(`Error parsing line ${i + 1}: ${error}`)
      console.warn(`Line content: ${line.substring(0, 100)}...`)
      // Continue with other lines
    }
  }

  console.log('Total parsed trades:', trades.length)
  return trades
}

/**
 * Parse Detailed Statement format
 * Format: Ticket,Open Time,Type,Size,Item,Price,S/L,T/P,Close Time,Price,Commission,Swap,Profit
 */
function parseDetailedStatementLine(line: string): ParsedTrade | null {
  const fields = parseCSVLine(line)
  if (fields.length < 13) return null

  const [ticket, openTimeStr, type, size, symbol, price, sl, tp, closeTimeStr, closePrice, commission, swap, profit] = fields

  if (!ticket || !openTimeStr || !type || !symbol) return null

  return {
    ticket: ticket.trim(),
    openTime: parseMT5Date(openTimeStr.trim()),
    closeTime: closeTimeStr ? parseMT5Date(closeTimeStr.trim()) : new Date(),
    type: type.toLowerCase().includes('buy') ? 'BUY' : 'SELL',
    symbol: symbol.trim(),
    volume: parseFloat(size) || 0,
    openPrice: parseFloat(price) || 0,
    closePrice: parseFloat(closePrice) || 0,
    profit: parseFloat(profit) || 0,
    commission: parseFloat(commission) || 0,
    swap: parseFloat(swap) || 0,
    comment: ''
  }
}

/**
 * Parse Account History format
 * Format: Deal,Time,Type,Symbol,Volume,Price,Order,Commission,Swap,Profit
 */
function parseAccountHistoryLine(line: string): ParsedTrade | null {
  const fields = parseCSVLine(line)
  if (fields.length < 10) return null

  const [deal, timeStr, type, symbol, volume, price, order, commission, swap, profit] = fields

  if (!deal || !timeStr || !type || !symbol) return null

  return {
    ticket: deal.trim(),
    openTime: parseMT5Date(timeStr.trim()),
    closeTime: new Date(), // Account history doesn't have separate close time
    type: type.toLowerCase().includes('buy') ? 'BUY' : 'SELL',
    symbol: symbol.trim(),
    volume: parseFloat(volume) || 0,
    openPrice: parseFloat(price) || 0,
    closePrice: parseFloat(price) || 0, // Same as open for account history
    profit: parseFloat(profit) || 0,
    commission: parseFloat(commission) || 0,
    swap: parseFloat(swap) || 0,
    comment: ''
  }
}

/**
 * Parse Report History format (MT5 Report History export)
 * This is a more flexible parser that tries to map common field names
 */
function parseReportHistoryLine(line: string, header: string): ParsedTrade | null {
  const fields = parseCSVLine(line)
  const headerFields = header.split(',').map(h => h.trim().toLowerCase())
  
  console.log('Parsing report history line:', {
    fields: fields.length,
    headerFields,
    line: line.substring(0, 100)
  })

  // Try to map fields by common names
  const ticketIndex = headerFields.findIndex(h => 
    h.includes('ticket') || h.includes('deal') || h.includes('order') || h.includes('position')
  )
  // Find the first time column (there might be multiple)
  const timeIndex = headerFields.findIndex(h => 
    h.includes('time') || h.includes('date') || h.includes('open time')
  )
  
  // Find close time column (second time column)
  const closeTimeIndex = headerFields.findIndex((h, index) => 
    index > timeIndex && (h.includes('time') || h.includes('close time'))
  )
  const typeIndex = headerFields.findIndex(h => 
    h.includes('type') || h.includes('side')
  )
  const symbolIndex = headerFields.findIndex(h => 
    h.includes('symbol') || h.includes('item') || h.includes('instrument')
  )
  const volumeIndex = headerFields.findIndex(h => 
    h.includes('volume') || h.includes('size') || h.includes('lots')
  )
  const priceIndex = headerFields.findIndex(h => 
    h.includes('price') || h.includes('open price')
  )
  // Find close price column (second price column)
  const closePriceIndex = headerFields.findIndex((h, index) => 
    index > priceIndex && (h.includes('price') || h.includes('close price') || h.includes('exit price'))
  )
  const profitIndex = headerFields.findIndex(h => 
    h.includes('profit') || h.includes('pnl') || h.includes('result')
  )
  const commissionIndex = headerFields.findIndex(h => 
    h.includes('commission') || h.includes('comm')
  )
  const swapIndex = headerFields.findIndex(h => 
    h.includes('swap') || h.includes('rollover')
  )

  console.log('Field mapping:', {
    ticketIndex,
    timeIndex,
    closeTimeIndex,
    typeIndex,
    symbolIndex,
    volumeIndex,
    priceIndex,
    closePriceIndex,
    profitIndex,
    commissionIndex,
    swapIndex
  })

  // Check required fields
  if (ticketIndex === -1 || timeIndex === -1 || typeIndex === -1 || symbolIndex === -1) {
    console.log('Missing required fields for trade parsing')
    return null
  }

  const ticket = fields[ticketIndex]?.trim()
  const timeStr = fields[timeIndex]?.trim()
  const type = fields[typeIndex]?.trim()
  const symbol = fields[symbolIndex]?.trim()

  console.log('Extracted fields:', {
    ticket,
    timeStr,
    type,
    symbol,
    allFields: fields
  })

  if (!ticket || !timeStr || !type || !symbol) {
    console.log('Empty required fields:', { ticket, timeStr, type, symbol })
    return null
  }

  // Skip header-like rows or invalid data
  if (ticket.toLowerCase() === 'ticket' || 
      timeStr.toLowerCase() === 'time' || 
      type.toLowerCase() === 'type' ||
      ticket === '' || timeStr === '' || type === '' || symbol === '') {
    return null
  }

  // Skip summary rows that contain text instead of trade data
  if (ticket.includes('Total') || ticket.includes('Profit') || ticket.includes('Loss') ||
      ticket.includes('Average') || ticket.includes('Maximum') || ticket.includes('Largest') ||
      ticket.includes('Balance') || ticket.includes('Drawdown') || ticket.includes('Factor') ||
      ticket.includes('Recovery') || ticket.includes('Sharpe') || ticket.includes('Results') ||
      ticket.includes('Trades') || ticket.includes('consecutive') || ticket.includes('count')) {
    return null
  }

       const volume = parseFloat(fields[volumeIndex] || '0') || 0
       const openPrice = parseFloat(fields[priceIndex] || '0') || 0
       const closePrice = parseFloat(fields[closePriceIndex] || fields[priceIndex] || '0') || openPrice
       const profit = parseFloat(fields[profitIndex] || '0') || 0
       const commission = parseFloat(fields[commissionIndex] || '0') || 0
       const swap = parseFloat(fields[swapIndex] || '0') || 0

       console.log('Price extraction:', {
         volumeIndex,
         priceIndex,
         closePriceIndex,
         volume,
         openPrice,
         closePrice,
         profit,
         fields: fields.slice(0, 10) // First 10 fields for debugging
       })

  // Get close time if available
  const closeTimeStr = fields[closeTimeIndex]?.trim()
  const closeTime = closeTimeStr ? parseMT5Date(closeTimeStr) : new Date()

  return {
    ticket,
    openTime: parseMT5Date(timeStr),
    closeTime,
    type: type.toLowerCase().includes('buy') ? 'BUY' : 'SELL',
    symbol,
    volume,
    openPrice,
    closePrice,
    profit,
    commission,
    swap,
    comment: ''
  }
}

/**
 * Parse generic CSV line (fallback)
 */
function parseGenericLine(line: string, header: string): ParsedTrade | null {
  const fields = parseCSVLine(line)
  const headerFields = header.split(',').map(h => h.trim().toLowerCase())

  // Try to map common field names
  const ticketIndex = headerFields.findIndex(h => h.includes('ticket') || h.includes('deal'))
  const timeIndex = headerFields.findIndex(h => h.includes('time') || h.includes('date'))
  const typeIndex = headerFields.findIndex(h => h.includes('type'))
  const symbolIndex = headerFields.findIndex(h => h.includes('symbol') || h.includes('item'))
  const volumeIndex = headerFields.findIndex(h => h.includes('volume') || h.includes('size'))
  const priceIndex = headerFields.findIndex(h => h.includes('price'))
  const profitIndex = headerFields.findIndex(h => h.includes('profit'))

  if (ticketIndex === -1 || timeIndex === -1 || typeIndex === -1 || symbolIndex === -1) {
    return null
  }

  return {
    ticket: fields[ticketIndex]?.trim() || '',
    openTime: parseMT5Date(fields[timeIndex]?.trim() || ''),
    closeTime: new Date(),
    type: fields[typeIndex]?.toLowerCase().includes('buy') ? 'BUY' : 'SELL',
    symbol: fields[symbolIndex]?.trim() || '',
    volume: parseFloat(fields[volumeIndex] || '0') || 0,
    openPrice: parseFloat(fields[priceIndex] || '0') || 0,
    closePrice: parseFloat(fields[priceIndex] || '0') || 0,
    profit: parseFloat(fields[profitIndex] || '0') || 0,
    commission: 0,
    swap: 0,
    comment: ''
  }
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

/**
 * Parse MT5 date format
 */
function parseMT5Date(dateStr: string): Date {
  console.log('Parsing date:', dateStr)
  
  // Try different MT5 date formats
  const formats = [
    /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/, // 2024.01.01 10:30
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/, // 2024-01-01 10:30:00
    /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/, // 01.01.2024 10:30
    /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/, // 2024.01.01 10:30:00
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/, // 01/01/2024 10:30
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/, // 2024-01-01 10:30
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const [, year, month, day, hour, minute, second] = match
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        second ? parseInt(second) : 0
      )
      console.log('Parsed date:', date)
      return date
    }
  }

  // Fallback to Date constructor
  const fallbackDate = new Date(dateStr)
  console.log('Fallback date:', fallbackDate)
  return fallbackDate
}

/**
 * Validate parsed trades
 */
export function validateMT5Trades(trades: ParsedTrade[]): { valid: ParsedTrade[], errors: string[] } {
  const valid: ParsedTrade[] = []
  const errors: string[] = []

  trades.forEach((trade, index) => {
    const tradeErrors: string[] = []

        if (!trade.ticket) tradeErrors.push('Missing ticket ID')
        if (!trade.symbol) tradeErrors.push('Missing symbol')
        if (!trade.openTime || isNaN(trade.openTime.getTime())) tradeErrors.push('Invalid open time')
        if (trade.volume <= 0) tradeErrors.push('Invalid volume')
        // Be more lenient with price validation - some trades might have 0 prices
        if (trade.openPrice < 0) tradeErrors.push('Invalid open price (negative)')

    if (tradeErrors.length === 0) {
      valid.push(trade)
    } else {
      errors.push(`Trade ${index + 1} (${trade.ticket}): ${tradeErrors.join(', ')}`)
    }
  })

  return { valid, errors }
}

/**
 * Convert parsed trade to app Trade format
 */
async function convertToAppTrade(trade: ParsedTrade): Promise<Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>> {
  const isBuy = trade.type === 'BUY'
  const pips = Math.abs(trade.profit) * 10000 // Rough conversion

  let status: 'OPEN' | 'CLOSED' | 'LOSS' | 'BREAKEVEN' = 'CLOSED'
  if (trade.profit > 0) status = 'CLOSED'
  else if (trade.profit < 0) status = 'LOSS'
  else status = 'BREAKEVEN'

  const profileId = await getVipProfileId()
  const userId = await getVipUserId()

  return {
    pair: trade.symbol,
    type: trade.type,
    status,
    entryPrice: trade.openPrice,
    exitPrice: trade.closePrice,
    pips: Math.round(pips),
    profit: trade.profit,
    rr: 0, // Will be calculated
    risk: 0, // Will be calculated
    lotSize: trade.volume,
    result: trade.profit,
    date: trade.openTime.toISOString().split('T')[0],
    time: trade.openTime.toISOString().split('T')[1].split('.')[0],
    notes: trade.comment || '',
    source: 'MT5_VIP',
    mt5TicketId: trade.ticket,
    mt5Commission: trade.commission,
    mt5Swap: trade.swap,
    openTime: trade.openTime,
    closeTime: trade.closeTime,
    syncMethod: 'manual',
    importedAt: new Date(),
    profileId,
    userId
  }
}

/**
 * Check for duplicate trades (batched to handle Firebase IN limit of 30)
 */
async function checkDuplicates(trades: ParsedTrade[]): Promise<{ existing: string[], new: ParsedTrade[] }> {
  const existingTickets = new Set<string>()
  const newTrades: ParsedTrade[] = []

  console.log('Checking for duplicates in', trades.length, 'trades')
  
  // Process in batches of 30 (Firebase IN limit)
  const batchSize = 30
  const ticketIds = trades.map(t => t.ticket)
  
  for (let i = 0; i < ticketIds.length; i += batchSize) {
    const batch = ticketIds.slice(i, i + batchSize)
    console.log(`Checking batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ticketIds.length/batchSize)} (${batch.length} tickets)`)
    
    try {
      const q = query(
        collection(db, 'trades'),
        where('profileId', '==', VIP_PROFILE_ID),
        where('mt5TicketId', 'in', batch)
      )

      const querySnapshot = await getDocs(q)
      querySnapshot.forEach(doc => {
        const data = doc.data()
        if (data.mt5TicketId) {
          existingTickets.add(data.mt5TicketId)
        }
      })
    } catch (error) {
      console.error('Error checking batch for duplicates:', error)
      // Continue with other batches
    }
  }

  console.log('Found', existingTickets.size, 'existing tickets')

  // Separate new and existing trades
  trades.forEach(trade => {
    if (existingTickets.has(trade.ticket)) {
      // This is a duplicate, don't add to newTrades
    } else {
      newTrades.push(trade)
    }
  })

  console.log('New trades to import:', newTrades.length)
  console.log('Existing trades (duplicates):', existingTickets.size)

  return {
    existing: Array.from(existingTickets),
    new: newTrades
  }
}

/**
 * Import VIP trades from CSV
 */
export async function importVipTrades(csvContent: string, importedBy: string): Promise<ImportResult> {
  try {
    console.log('Starting CSV import process...')
    console.log('CSV content length:', csvContent.length)
    
    // Show first few lines for debugging
    const lines = csvContent.split('\n')
    console.log('First 10 lines of CSV:')
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`Line ${i + 1}:`, line.substring(0, 200))
    })
    
    // Parse CSV
    const parsedTrades = parseMT5CSV(csvContent)
    console.log('Parsed trades count:', parsedTrades.length)
    
    // Validate trades
    const { valid: validTrades, errors: validationErrors } = validateMT5Trades(parsedTrades)
    console.log('Valid trades count:', validTrades.length)
    console.log('Validation errors:', validationErrors)
    
    if (validTrades.length === 0) {
      return {
        success: false,
        newTrades: 0,
        updatedTrades: 0,
        skippedTrades: 0,
        errors: ['No valid trades found in CSV file', ...validationErrors],
        trades: []
      }
    }

    // If we have valid trades, proceed even if some had errors
    console.log(`Proceeding with ${validTrades.length} valid trades (${validationErrors.length} validation errors ignored)`)

    // Check for duplicates
    const { existing, new: newTrades } = await checkDuplicates(validTrades)
    console.log('Existing trades:', existing.length)
    console.log('New trades to import:', newTrades.length)
    
    // Convert to app format
    const appTrades = await Promise.all(newTrades.map(convertToAppTrade))
    console.log('Converted to app format:', appTrades.length)
    
    // Save to Firebase
    let newCount = 0
    let errorCount = 0
    const saveErrors: string[] = []

    console.log('Starting to save trades to Firebase...')
    console.log('App trades to save:', appTrades.length)
    
    // Test Firebase connection first
    try {
      console.log('Testing Firebase connection...')
      const testCollection = collection(db, 'trades')
      console.log('Firebase collection reference created successfully')
    } catch (error) {
      console.error('Firebase connection test failed:', error)
      return {
        success: false,
        newTrades: 0,
        updatedTrades: 0,
        skippedTrades: 0,
        errors: [`Firebase connection failed: ${error}`],
        trades: []
      }
    }
    
    for (const trade of appTrades) {
      try {
        const tradeData = {
          ...trade,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
        
        console.log('Saving trade:', trade.mt5TicketId, 'Symbol:', trade.pair, 'Profit:', trade.profit)
        await addDoc(collection(db, 'trades'), tradeData)
        newCount++
        console.log('Successfully saved trade:', trade.mt5TicketId)
        
        // Log progress every 50 trades
        if (newCount % 50 === 0) {
          console.log(`Progress: ${newCount}/${appTrades.length} trades saved`)
        }
      } catch (error) {
        errorCount++
        console.error('Failed to save trade:', trade.mt5TicketId, error)
        console.error('Trade data that failed:', JSON.stringify(trade, null, 2))
        saveErrors.push(`Failed to save trade ${trade.mt5TicketId}: ${error}`)
        
        // Stop after 10 errors to avoid spam
        if (errorCount >= 10) {
          console.error('Too many save errors, stopping...')
          break
        }
      }
    }
    
    console.log('Firebase save completed. New:', newCount, 'Errors:', errorCount)

    // Log import
    const importLog: Omit<VipImportLog, 'id'> = {
      method: 'manual',
      importedAt: new Date(),
      tradesCount: validTrades.length,
      newTrades: newCount,
      updatedTrades: 0,
      skippedTrades: existing.length,
      importedBy,
      status: errorCount === 0 ? 'success' : errorCount < validTrades.length ? 'partial' : 'failed',
      errors: [...validationErrors, ...saveErrors]
    }

    await addDoc(collection(db, 'vip_imports'), importLog)

    return {
      success: errorCount === 0,
      newTrades: newCount,
      updatedTrades: 0,
      skippedTrades: existing.length,
      errors: [...validationErrors, ...saveErrors],
      trades: validTrades
    }
  } catch (error) {
    return {
      success: false,
      newTrades: 0,
      updatedTrades: 0,
      skippedTrades: 0,
      errors: [`Import failed: ${error}`],
      trades: []
    }
  }
}

/**
 * Get VIP import history
 */
export async function getVipImportHistory(limitCount: number = 10): Promise<VipImportLog[]> {
  try {
    const q = query(
      collection(db, 'vip_imports'),
      orderBy('importedAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      importedAt: doc.data().importedAt?.toDate()
    })) as VipImportLog[]
  } catch (error) {
    console.error('Error getting VIP import history:', error)
    return []
  }
}

/**
 * Get VIP stats
 */
export async function getVipStats(profileId?: string): Promise<VipStats> {
  try {
    console.log('Getting VIP stats...')
    const targetProfileId = profileId || await getVipProfileId()
    console.log('Looking for trades with profileId:', targetProfileId)
    
    // Simplified query to avoid Firebase index requirement
    const q = query(
      collection(db, 'trades'),
      where('profileId', '==', targetProfileId)
    )
    
    const querySnapshot = await getDocs(q)
    console.log('Found trades count:', querySnapshot.docs.length)
    
    const allTrades = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Trade[]
    
    // Filter for VIP trades (any source) on the client side
    const trades = allTrades.filter(trade => 
      trade.source === 'MT5_VIP' || 
      trade.source === 'MANUAL' || 
      trade.source === 'manual' || 
      trade.source === 'csv' ||
      trade.source === 'CSV'
    )
    console.log('Filtered VIP trades count:', trades.length)
    
    console.log('Processed trades:', trades.length)

    // Filter for closed trades only (exclude OPEN trades)
    const closedTrades = trades.filter(trade => 
      trade.status === 'CLOSED' || trade.status === 'LOSS' || trade.status === 'BREAKEVEN'
    )

    console.log('Trade filtering:', {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      openTrades: trades.filter(t => t.status === 'OPEN').length
    })

    // Calculate starting balance from first trade's cumulative profit
    // We'll estimate starting balance by working backwards from total profit
    const totalProfit = closedTrades.reduce((sum, trade) => sum + (trade.result || 0), 0)
    
    // If no trades, show $0 balance
    const estimatedStartingBalance = closedTrades.length === 0 ? 0 : Math.max(10000, Math.abs(totalProfit) * 2)

    const stats: VipStats = {
      totalTrades: closedTrades.length,
      winningTrades: closedTrades.filter(trade => trade.result && trade.result > 0).length,
      losingTrades: closedTrades.filter(trade => trade.result && trade.result < 0).length,
      totalProfit: totalProfit,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      startingBalance: estimatedStartingBalance,
      currentBalance: estimatedStartingBalance + totalProfit,
      lastUpdated: new Date(),
      syncMethod: 'manual' // Default, will be updated based on actual data
    }

    console.log('Stats calculation:', {
      totalTrades: stats.totalTrades,
      winningTrades: stats.winningTrades,
      losingTrades: stats.losingTrades,
      totalProfit: stats.totalProfit,
      estimatedStartingBalance
    })

    if (stats.totalTrades > 0) {
      stats.winRate = (stats.winningTrades / stats.totalTrades) * 100
      
      const winningTrades = closedTrades.filter(trade => trade.result && trade.result > 0)
      const losingTrades = closedTrades.filter(trade => trade.result && trade.result < 0)
      
      if (winningTrades.length > 0) {
        stats.averageWin = winningTrades.reduce((sum, trade) => sum + (trade.result || 0), 0) / winningTrades.length
      }
      
      if (losingTrades.length > 0) {
        stats.averageLoss = losingTrades.reduce((sum, trade) => sum + (trade.result || 0), 0) / losingTrades.length
      }
      
      const results = closedTrades.map(trade => trade.result || 0)
      stats.bestTrade = Math.max(...results)
      stats.worstTrade = Math.min(...results)
    }

    // Get last import info
    const lastImport = await getVipImportHistory(1)
    if (lastImport.length > 0) {
      stats.lastUpdated = lastImport[0].importedAt
      stats.syncMethod = lastImport[0].method
    }

    return stats
  } catch (error) {
    console.error('Error getting VIP stats:', error)
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      startingBalance: 0, // No trades = $0 balance
      currentBalance: 0, // No trades = $0 balance
      lastUpdated: new Date(),
      syncMethod: 'manual'
    }
  }
}
