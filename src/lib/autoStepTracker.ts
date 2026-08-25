// Auto Step Tracker — runs automatically, no button needed
// Uses device accelerometer + persists across sessions

import { StepCounter, estimateCalories, estimateDistance } from './healthSensors'
import { createClient } from './supabase/client'

const TODAY_KEY   = 'hitgram_auto_steps'
const DATE_KEY    = 'hitgram_auto_date'
const ACTIVE_KEY  = 'hitgram_auto_active'
const PERM_KEY    = 'hitgram_motion_perm'

type StepListener = (data: {
  steps: number
  calories: number
  distance: number
  active: boolean
  permissionState: PermState
}) => void

type PermState = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'requesting'

class AutoStepTracker {
  private counter    = new StepCounter()
  private listeners  = new Set<StepListener>()
  private handler: ((e: DeviceMotionEvent) => void) | null = null
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private notifTimer: ReturnType<typeof setInterval> | null = null
  private supabase   = createClient()
  private _steps     = 0
  private _perm: PermState = 'unknown'
  private _started   = false

  constructor() {
    if (typeof window === 'undefined') return
    this.loadToday()
    this.checkSavedPerm()
  }

  // ── Load today's steps from storage ──────────────────────
  private loadToday() {
    const today = new Date().toISOString().split('T')[0]
    const savedDate = localStorage.getItem(DATE_KEY)
    if (savedDate === today) {
      this._steps = parseInt(localStorage.getItem(TODAY_KEY) || '0')
      this.counter.set(this._steps)
    } else {
      localStorage.setItem(DATE_KEY, today)
      localStorage.setItem(TODAY_KEY, '0')
      this._steps = 0
      this.counter.reset()
    }
  }

  // ── Check if we already have permission ──────────────────
  private async checkSavedPerm() {
    const saved = localStorage.getItem(PERM_KEY)
    if (saved === 'granted') {
      // Auto-start if previously granted
      await this.startTracking()
    } else if (saved === 'denied') {
      this._perm = 'denied'
      this.emit()
    } else {
      this._perm = 'unknown'
      this.emit()
    }
  }

  // ── Request permission and auto-start ─────────────────────
  async requestAndStart(): Promise<PermState> {
    if (typeof window === 'undefined') return 'unavailable'

    // Check if motion is available
    if (!window.DeviceMotionEvent) {
      this._perm = 'unavailable'
      localStorage.setItem(PERM_KEY, 'unavailable')
      this.emit()
      return 'unavailable'
    }

    // iOS 13+ requires explicit permission
    const DE = window.DeviceMotionEvent as any
    if (typeof DE.requestPermission === 'function') {
      this._perm = 'requesting'
      this.emit()
      try {
        const result = await DE.requestPermission()
        if (result === 'granted') {
          localStorage.setItem(PERM_KEY, 'granted')
          await this.startTracking()
          return 'granted'
        } else {
          this._perm = 'denied'
          localStorage.setItem(PERM_KEY, 'denied')
          this.emit()
          return 'denied'
        }
      } catch {
        this._perm = 'denied'
        this.emit()
        return 'denied'
      }
    }

    // Android / desktop — no explicit permission needed
    localStorage.setItem(PERM_KEY, 'granted')
    await this.startTracking()
    return 'granted'
  }

  // ── Start accelerometer listener ──────────────────────────
  async startTracking() {
    if (this._started) return
    if (typeof window === 'undefined') return

    this._perm = 'granted'
    this._started = true
    localStorage.setItem(ACTIVE_KEY, 'true')

    // Motion handler — step detection
    this.handler = (e: DeviceMotionEvent) => {
      const a = e.acceleration || e.accelerationIncludingGravity
      if (!a) return
      const x = a.x || 0, y = a.y || 0, z = a.z || 0
      const newSteps = this.counter.process(x, y, z)
      if (newSteps !== this._steps) {
        this._steps = newSteps
        this.saveSteps()
        this.emit()
        // Notify SW with latest steps
        this.notifyServiceWorker()
      }
    }

    window.addEventListener('devicemotion', this.handler, { passive: true })

    // Sync to Supabase every 2 minutes
    this.syncTimer = setInterval(() => this.syncDB(), 120000)

    // Daily step reminder notification every 2 hours
    this.notifTimer = setInterval(() => this.checkStepReminder(), 7200000)

    // Midnight reset check
    this.scheduleMidnightReset()

    this.emit()
    console.log('Hitgram: Auto step tracking started ✅')
  }

  // ── Save steps to localStorage ────────────────────────────
  private saveSteps() {
    localStorage.setItem(TODAY_KEY, String(this._steps))
    // Also save to sessionStorage for quick access
    sessionStorage.setItem('hitgram_live_steps', String(this._steps))
  }

  // ── Notify Service Worker ─────────────────────────────────
  private notifyServiceWorker() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STEPS_UPDATE',
        payload: {
          steps: this._steps,
          date: new Date().toISOString().split('T')[0],
          calories: estimateCalories(this._steps, 0),
        }
      })
    }
  }

  // ── Sync to Supabase ──────────────────────────────────────
  async syncDB() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user || this._steps === 0) return

      const today = new Date().toISOString().split('T')[0]
      await this.supabase.from('health_logs').upsert({
        user_id: user.id,
        log_date: today,
        steps: this._steps,
        calories_consumed: estimateCalories(this._steps, 0),
        distance_km: estimateDistance(this._steps),
      }, { onConflict: 'user_id,log_date' })

      console.log(`Hitgram: Synced ${this._steps} steps to DB ✅`)
    } catch (err) {
      console.error('Step DB sync error:', err)
    }
  }

  // ── Step reminder notification ────────────────────────────
  private async checkStepReminder() {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (this._steps >= 10000) return

    const remaining = 10000 - this._steps
    const hour = new Date().getHours()
    if (hour < 8 || hour > 21) return

    new Notification('Hitgram Step Reminder 👟', {
      body: `You have ${this._steps.toLocaleString()} steps today. ${remaining.toLocaleString()} more to hit your goal!`,
      icon: '/icons/icon-192.png',
      tag: 'step-reminder',
    })
  }

  // ── Midnight reset ────────────────────────────────────────
  private scheduleMidnightReset() {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = midnight.getTime() - now.getTime()

    setTimeout(() => {
      this._steps = 0
      this.counter.reset()
      this.saveSteps()
      this.emit()
      console.log('Hitgram: Daily step count reset at midnight ✅')
      // Schedule next reset
      this.scheduleMidnightReset()
    }, msUntilMidnight)
  }

  // ── Request notification permission ──────────────────────
  async requestNotificationPermission() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  // ── Subscribe to updates ──────────────────────────────────
  subscribe(cb: StepListener): () => void {
    this.listeners.add(cb)
    // Emit current state immediately
    cb({
      steps: this._steps,
      calories: estimateCalories(this._steps, 0),
      distance: estimateDistance(this._steps),
      active: this._started,
      permissionState: this._perm,
    })
    return () => this.listeners.delete(cb)
  }

  private emit() {
    const data = {
      steps: this._steps,
      calories: estimateCalories(this._steps, 0),
      distance: estimateDistance(this._steps),
      active: this._started,
      permissionState: this._perm,
    }
    this.listeners.forEach(cb => cb(data))
  }

  // ── Manual step add ───────────────────────────────────────
  addSteps(n: number) {
    this._steps = Math.max(0, this._steps + n)
    this.counter.set(this._steps)
    this.saveSteps()
    this.emit()
    this.syncDB()
  }

  // ── Getters ───────────────────────────────────────────────
  getSteps() { return this._steps }
  getPermission() { return this._perm }
  isActive() { return this._started }
}

// ── Singleton ─────────────────────────────────────────────────
let tracker: AutoStepTracker | null = null

export function getAutoTracker(): AutoStepTracker {
  if (typeof window === 'undefined') {
    // SSR safe stub
    return {
      requestAndStart: async () => 'unavailable' as const,
      subscribe: (cb: StepListener) => { cb({ steps: 0, calories: 0, distance: 0, active: false, permissionState: 'unknown' as const }); return () => {} },
      addSteps: () => {},
      getSteps: () => 0,
      getPermission: () => 'unknown' as const,
      isActive: () => false,
      syncDB: async () => {},
      requestNotificationPermission: async () => {},
    } as any
  }
  if (!tracker) tracker = new AutoStepTracker()
  return tracker
}