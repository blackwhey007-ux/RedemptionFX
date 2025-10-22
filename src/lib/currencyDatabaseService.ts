import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firestore'
import { CURRENCY_PAIRS, CurrencyPair } from './currencyDatabase'

export class CurrencyDatabaseService {
  private static cache: Map<string, CurrencyPair[]> = new Map()

  // Get currency pairs for user (with caching)
  static async getCurrencyPairs(userId: string): Promise<CurrencyPair[]> {
    // Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId)!
    }

    try {
      const docRef = doc(db, 'currencyPairs', userId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        const pairs = data.pairs as CurrencyPair[]
        this.cache.set(userId, pairs)
        return pairs
      } else {
        // First time user - create with default pairs
        await this.initializeUserPairs(userId)
        this.cache.set(userId, CURRENCY_PAIRS)
        return CURRENCY_PAIRS
      }
    } catch (error) {
      console.error('Error loading currency pairs:', error)
      // Fallback to static data
      return CURRENCY_PAIRS
    }
  }

  // Save currency pairs to database
  static async saveCurrencyPairs(userId: string, pairs: CurrencyPair[]): Promise<void> {
    try {
      const docRef = doc(db, 'currencyPairs', userId)
      await setDoc(docRef, {
        pairs: pairs,
        updatedAt: new Date(),
        version: 1
      }, { merge: true })
      
      // Update cache
      this.cache.set(userId, pairs)
      
      // Also save to localStorage as backup for immediate use
      localStorage.setItem('customCurrencyPairs', JSON.stringify(pairs))
      
      console.log('Currency pairs saved successfully for user:', userId)
    } catch (error) {
      console.error('Error saving currency pairs:', error)
      // Still save to localStorage even if database fails
      localStorage.setItem('customCurrencyPairs', JSON.stringify(pairs))
      throw error
    }
  }

  // Update specific currency pair
  static async updateCurrencyPair(
    userId: string, 
    symbol: string, 
    updates: Partial<CurrencyPair>
  ): Promise<void> {
    const pairs = await this.getCurrencyPairs(userId)
    const updatedPairs = pairs.map(pair => 
      pair.symbol === symbol ? { ...pair, ...updates } : pair
    )
    
    await this.saveCurrencyPairs(userId, updatedPairs)
  }

  // Initialize user with default pairs
  private static async initializeUserPairs(userId: string): Promise<void> {
    await this.saveCurrencyPairs(userId, CURRENCY_PAIRS)
  }

  // Clear cache (for testing)
  static clearCache(): void {
    this.cache.clear()
  }

  // Get single currency pair from user's database
  static async getCurrencyPair(userId: string, symbol: string): Promise<CurrencyPair | undefined> {
    const pairs = await this.getCurrencyPairs(userId)
    return pairs.find(pair => pair.symbol === symbol)
  }
}
