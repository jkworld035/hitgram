// Step Service — manages step counting, persistence, and sync
import { StepCounter, estimateCalories, estimateDistance } from './healthSensors'
import { createClient } from './supabase/client'

const STEP_STORAGE_KEY = 'hitgram_steps_today'
const STEP_DATE_KEY    = 'hitgram_steps_date'

export class StepService {
  private counter = new StepCounter()
  private supabase = createClient()
  private listeners: ((steps: number) => void)[] = []
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null
  private saveInterval: ReturnType<typeof setInterval> | null = null
  private todaySteps = 0
  private isTracking = false

  constructor() {
    this.loadFromStorage()
  }

  // ── Load persisted steps ──────────────────────────────────
  private loadFromStorage() {
    if (typeof window === 'undefined') return
    const savedDate = localStorage.getItem(STEP_DATE_KEY)
    const today = new Date().toISOString().split('T')[0]

    if (savedDate === today) {
      const saved = parseInt(localStorage.getItem(STEP_STORAGE_KEY) || '0')
      this.todaySteps = saved
      this.counter.set(saved)
    } else {
      // New day — reset
      localStorage.setItem(STEP_DATE_KEY, today)
      localStorage.setItem(STEP_STORAGE_KEY, '0')
      this.todaySteps = 0
      this.counter.reset()
    }
  }

  // ── Save to localStorage ──────────────────────────────────
  private saveToStorage() {
    if (typeof window === 'undefined') return
    localStorage.setItem(STEP_STORAGE_KEY, String(this.todaySteps))
  }

  // ── Subscribe to step updates ─────────────────────────────
  subscribe(cb: (steps: number) => void) {
    this.listeners.push(cb)
    cb(this.todaySteps) // emit current immediately
    return () => { this.listeners = this.listeners.filter(l => l !== cb) }
  }

  private emit() {
    this.listeners.forEach(cb => cb(this.todaySteps))
  }

  // ── Request motion permission (iOS 13+) ───────────────────
  async requestPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
    if (typeof window === 'undefined') return 'unavailable'
    if (!window.DeviceMotionEvent) return 'unavailable'

    const DE = window.DeviceMotionEvent as any
    if (typeof DE.requestPermission === 'function') {
      try {
        const perm = await DE.requestPermission()
        return perm === 'granted' ? 'granted' : 'denied'
      } catch {
        return 'denied'
      }
    }
    // Android / desktop — no permission needed
    return 'granted'
  }

  // ── Start tracking ────────────────────────────────────────
  async start(): Promise<'started' | 'denied' | 'unavailable'> {
    if (this.isTracking) return 'started'
    if (typeof window === 'undefined') return 'unavailable'
    if (!window.DeviceMotionEvent) return 'unavailable'

    const perm = await this.requestPermission()
    if (perm !== 'granted') return perm

    this.motionHandler = (e: DeviceMotionEvent) => {
      const acc = e.acceleration || e.accelerationIncludingGravity
      if (!acc) return
      const x = acc.x || 0
      const y = acc.y || 0
      const z = acc.z || 0
      const newSteps = this.counter.process(x, y, z)
      if (newSteps !== this.todaySteps) {
        this.todaySteps = newSteps
        this.emit()
        this.saveToStorage()
      }
    }

    window.addEventListener('devicemotion', this.motionHandler)
    this.isTracking = true

    // Auto-sync to Supabase every 60s
    this.saveInterval = setInterval(() => this.syncToDatabase(), 60000)

    return 'started'
  }

  // ── Stop tracking ─────────────────────────────────────────
  stop() {
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler)
      this.motionHandler = null
    }
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
    this.isTracking = false
    this.syncToDatabase()
  }

  // ── Get current steps ─────────────────────────────────────
  getSteps(): number { return this.todaySteps }
  isActive(): boolean { return this.isTracking }

  // ── Manually add steps (for testing) ─────────────────────
  addSteps(n: number) {
    this.todaySteps += n
    this.counter.set(this.todaySteps)
    this.emit()
    this.saveToStorage()
  }

  // ── Sync to Supabase ──────────────────────────────────────
  async syncToDatabase() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const calories = estimateCalories(this.todaySteps, Math.round(this.todaySteps / 100))
      const distance = estimateDistance(this.todaySteps)

      await this.supabase.from('health_logs').upsert({
        user_id: user.id,
        log_date: today,
        steps: this.todaySteps,
        calories_consumed: calories,
        distance_km: distance,
      }, { onConflict: 'user_id,log_date' })
    } catch (err) {
      console.error('Step sync error:', err)
    }
  }

  // ── Get weekly history from DB ────────────────────────────
  async getWeeklyHistory(): Promise<{ date: string; steps: number }[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return []

      const { data } = await this.supabase
        .from('health_logs')
        .select('log_date, steps')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(7)

      return (data || []).map(d => ({ date: d.log_date, steps: d.steps || 0 }))
    } catch {
      return []
    }
  }
}

// Singleton instance
let instance: StepService | null = null
export function getStepService(): StepService {
  if (!instance) instance = new StepService()
  return instance
}