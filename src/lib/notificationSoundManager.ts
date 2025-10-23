import { SoundConfig, NotificationPreferences } from '@/types/notification'

class NotificationSoundManager {
  private audioContext: AudioContext | null = null
  private lastPlayTime = 0
  private debounceDelay = 3000 // 3 seconds
  private lastNotificationTime = 0

  constructor() {
    this.initializeAudioContext()
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
    } catch (error) {
      console.warn('Failed to initialize audio context:', error)
    }
  }

  private getLastNotificationTime(): number {
    if (typeof window === 'undefined') return 0
    
    try {
      const stored = localStorage.getItem('lastNotificationTime')
      return stored ? parseInt(stored, 10) : 0
    } catch {
      return 0
    }
  }

  private setLastNotificationTime(timestamp: number) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('lastNotificationTime', timestamp.toString())
      this.lastNotificationTime = timestamp
    } catch (error) {
      console.warn('Failed to store last notification time:', error)
    }
  }

  private isNewNotification(notificationTime: number): boolean {
    const lastSeen = this.getLastNotificationTime()
    return notificationTime > lastSeen
  }

  private shouldPlaySound(preferences: NotificationPreferences): boolean {
    if (!preferences.soundEnabled) return false
    if (preferences.doNotDisturb) return false
    
    // Check Do Not Disturb schedule
    if (preferences.dndSchedule) {
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()
      const [startHour, startMin] = preferences.dndSchedule.start.split(':').map(Number)
      const [endHour, endMin] = preferences.dndSchedule.end.split(':').map(Number)
      const startTime = startHour * 60 + startMin
      const endTime = endHour * 60 + endMin
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return false
      }
    }
    
    return true
  }

  private getSoundConfig(preferences: NotificationPreferences, notificationType?: string): SoundConfig {
    const baseConfig: SoundConfig = {
      type: preferences.soundType,
      volume: preferences.volume
    }

    switch (preferences.soundType) {
      case 'minimal':
        return {
          ...baseConfig,
          frequency: 800,
          duration: 0.2,
          pattern: [800]
        }
      
      case 'custom':
        // Allow for future custom sound uploads
        return {
          ...baseConfig,
          frequency: 1000,
          duration: 0.3,
          pattern: [1000, 1200]
        }
      
      default: // 'default'
        const typePatterns = {
          welcome: [523, 659, 784], // C5, E5, G5
          vip_approved: [523, 659, 784, 1047], // C5, E5, G5, C6
          promotion: [659, 784, 1047], // E5, G5, C6
          signal: [800, 1000], // G5, C6
          system: [440, 330], // A4, E4
          warning: [330, 220], // E4, A3
          info: [440, 554, 659], // A4, C#5, E5
          default: [440, 330] // A4, E4
        }
        
        const pattern = typePatterns[notificationType as keyof typeof typePatterns] || typePatterns.default
        
        return {
          ...baseConfig,
          pattern,
          duration: 0.3
        }
    }
  }

  private async playWebAudioSound(config: SoundConfig): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext()
      if (!this.audioContext) return
    }

    try {
      if (config.pattern && config.pattern.length > 0) {
        // Play pattern of frequencies
        for (let i = 0; i < config.pattern.length; i++) {
          setTimeout(() => {
            this.playTone(config.pattern![i], config.duration || 0.3, config.volume)
          }, i * 200)
        }
      } else if (config.frequency) {
        // Play single frequency
        this.playTone(config.frequency, config.duration || 0.3, config.volume)
      }
    } catch (error) {
      console.warn('Failed to play Web Audio sound:', error)
      this.fallbackToSystemSound()
    }
  }

  private playTone(frequency: number, duration: number, volume: number) {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  private fallbackToSystemSound() {
    try {
      // Try to use the system beep (works in some browsers)
      console.log('\u0007') // ASCII bell character
    } catch (error) {
      console.warn('All sound methods failed:', error)
    }
  }

  private async playDataURISound(config: SoundConfig): Promise<void> {
    try {
      const audio = new Audio()
      
      // Create a simple beep sound using data URI
      const sampleRate = 44100
      const duration = config.duration || 0.3
      const frequency = config.frequency || 800
      const samples = Math.floor(sampleRate * duration)
      const buffer = new ArrayBuffer(44 + samples * 2)
      const view = new DataView(buffer)
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i))
        }
      }
      
      writeString(0, 'RIFF')
      view.setUint32(4, 36 + samples * 2, true)
      writeString(8, 'WAVE')
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      writeString(36, 'data')
      view.setUint32(40, samples * 2, true)
      
      // Generate sine wave
      for (let i = 0; i < samples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * (config.volume * 0.3)
        view.setInt16(44 + i * 2, sample * 32767, true)
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      audio.src = url
      audio.volume = config.volume
      
      await audio.play()
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
      
    } catch (error) {
      console.warn('Failed to play data URI sound:', error)
      this.fallbackToSystemSound()
    }
  }

  async playNotificationSound(
    preferences: NotificationPreferences, 
    notificationType?: string,
    notificationTime?: number
  ): Promise<boolean> {
    // Check if sound should play
    if (!this.shouldPlaySound(preferences)) {
      return false
    }

    // Check if this is a new notification
    if (notificationTime && !this.isNewNotification(notificationTime)) {
      return false
    }

    // Debounce sound playback
    const now = Date.now()
    if (now - this.lastPlayTime < this.debounceDelay) {
      return false
    }

    this.lastPlayTime = now

    // Update last notification time
    if (notificationTime) {
      this.setLastNotificationTime(notificationTime)
    }

    try {
      const config = this.getSoundConfig(preferences, notificationType)
      
      // Try Web Audio API first
      if (this.audioContext && this.audioContext.state === 'running') {
        await this.playWebAudioSound(config)
      } else {
        // Fallback to data URI
        await this.playDataURISound(config)
      }
      
      return true
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
      this.fallbackToSystemSound()
      return false
    }
  }

  // Vibration support
  async vibrate(preferences: NotificationPreferences, pattern?: number[]): Promise<void> {
    if (!preferences.vibrationEnabled || !navigator.vibrate) return
    
    try {
      const vibrationPattern = pattern || [200, 100, 200]
      navigator.vibrate(vibrationPattern)
    } catch (error) {
      console.warn('Failed to vibrate:', error)
    }
  }

  // Reset last notification time (useful for testing or manual reset)
  resetLastNotificationTime() {
    this.setLastNotificationTime(0)
  }

  // Get audio context state
  getAudioContextState(): string | null {
    return this.audioContext?.state || null
  }

  // Resume audio context if suspended
  async resumeAudioContext(): Promise<boolean> {
    if (!this.audioContext) {
      await this.initializeAudioContext()
      return !!this.audioContext
    }
    
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        return true
      } catch (error) {
        console.warn('Failed to resume audio context:', error)
        return false
      }
    }
    
    return true
  }
}

// Export singleton instance
export const notificationSoundManager = new NotificationSoundManager()

