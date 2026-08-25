'use client'

import { estimateCalories, estimateDistance, StepCounter } from './healthSensors'
import { createClient } from './supabase/client'

const TODAY_KEY  = 'hitgram_auto_steps'
const DATE_KEY   = 'hitgram_auto_date'
const PERM_KEY   = 'hitgram_motion_perm'

export type PermState = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'requesting'

export interface StepData {
  steps:           number
  calories:        number
  distance:        number
  active:          boolean
  permissionState: PermState
}

type StepListener = (data: StepData) => void

class AutoStepTracker {
  private counter    = new StepCounter()
  private listeners  = new Set<StepListener>()
  private handler:   ((e: DeviceMotionEvent) => void) | null = null
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private _steps     = 0
  private _perm:     PermState = 'unknown'
  private _started   = false
  private supabase   = createClient()

  constructor() {
    if (typeof window === 'undefined') return
    this.loadToday()
    // Auto-restore if previously granted
    const saved = localStorage.getItem(PERM_KEY)
    if (saved === 'granted') {
      this.startTracking()
    } else if (saved === 'denied' || saved === 'unavailable') {
      this._perm = saved as PermState
    }
  }

  // ── Load today's persisted steps ─────────────────────────
  private loadToday() {
    const today   = new Date().toISOString().split('T')[0]
    const saved   = localStorage.getItem(DATE_KEY)
    if (saved === today) {
      this._steps = parseInt(localStorage.getItem(TODAY_KEY) || '0')
      this.counter.set(this._steps)
    } else {
      localStorage.setItem(DATE_KEY, today)
      localStorage.setItem(TODAY_KEY, '0')
      this._steps = 0
      this.counter.reset()
    }
  }

  // ── Save steps ────────────────────────────────────────────
  private saveSteps() {
    localStorage.setItem(TODAY_KEY, String(this._steps))
    sessionStorage.setItem('hitgram_live_steps', String(this._steps))
  }

  // ── Request permission then start ─────────────────────────
  async requestAndStart(): Promise<PermState> {
    if (typeof window === 'undefined') return 'unavailable'

    // No accelerometer at all
    if (!window.DeviceMotionEvent) {
      this._perm = 'unavailable'
      localStorage.setItem(PERM_KEY, 'unavailable')
      this.emit()
      return 'unavailable'
    }

    // iOS 13+ explicit permission
    const DE = window.DeviceMotionEvent as any
    if (typeof DE.requestPermission === 'function') {
      this._perm = 'requesting'
      this.emit()
      try {
        const res = await DE.requestPermission()
        if (res !== 'granted') {
          this._perm = 'denied'
          localStorage.setItem(PERM_KEY, 'denied')
          this.emit()
          return 'denied'
        }
      } catch {
        this._perm = 'denied'
        localStorage.setItem(PERM_KEY, 'denied')
        this.emit()
        return 'denied'
      }
    }

    // Start tracking
    localStorage.setItem(PERM_KEY, 'granted')
    await this.startTracking()
    return 'granted'
  }

  // ── Start motion listener ─────────────────────────────────
  async startTracking() {
    if (this._started || typeof window === 'undefined') return

    this._perm    = 'granted'
    this._started = true

    this.handler = (e: DeviceMotionEvent) => {
      // Use acceleration without gravity for better accuracy
      const a = e.acceleration?.x !== null && e.acceleration?.x !== undefined
        ? e.acceleration
        : e.accelerationIncludingGravity

      if (!a) return

      const x = a.x || 0
      const y = a.y || 0
      const z = a.z || 0

      const newSteps = this.counter.process(x, y, z)
      if (newSteps !== this._steps) {
        this._steps = newSteps
        this.saveSteps()
        this.emit()
      }
    }

    window.addEventListener('devicemotion', this.handler, { passive: true })

    // Sync to DB every 2 minutes
    this.syncTimer = setInterval(() => this.syncDB(), 120_000)

    // Midnight reset
    this.scheduleMidnightReset()

    this.emit()
    console.log('[Hitgram] Auto step tracking started ✅')
  }

  // ── Sync to Supabase ──────────────────────────────────────
  async syncDB() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user || this._steps === 0) return

      const today = new Date().toISOString().split('T')[0]
      await this.supabase.from('health_logs').upsert({
        user_id:          user.id,
        log_date:         today,
        steps:            this._steps,
        calories_consumed: estimateCalories(this._steps, 0),
        distance_km:      estimateDistance(this._steps),
      }, { onConflict: 'user_id,log_date' })

      console.log(`[Hitgram] Synced ${this._steps} steps ✅`)
    } catch (err) {
      console.error('[Hitgram] Step sync error:', err)
    }
  }

  // ── Midnight reset ────────────────────────────────────────
  private scheduleMidnightReset() {
    const now      = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 5, 0)
    const ms = midnight.getTime() - now.getTime()

    setTimeout(() => {
      this._steps = 0
      this.counter.reset()
      this.saveSteps()
      this.emit()
      console.log('[Hitgram] Daily step reset ✅')
      this.scheduleMidnightReset()
    }, ms)
  }

  // ── Request notification permission ──────────────────────
  async requestNotificationPermission() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  // ── Subscribe ─────────────────────────────────────────────
  subscribe(cb: StepListener): () => void {
    this.listeners.add(cb)
    cb(this.currentData())
    return () => this.listeners.delete(cb)
  }

  private emit() {
    const d = this.currentData()
    this.listeners.forEach(cb => cb(d))
  }

  private currentData(): StepData {
    return {
      steps:           this._steps,
      calories:        estimateCalories(this._steps, 0),
      distance:        estimateDistance(this._steps),
      active:          this._started,
      permissionState: this._perm,
    }
  }

  // ── Manual add ────────────────────────────────────────────
  addSteps(n: number) {
    this._steps = Math.max(0, this._steps + n)
    this.counter.set(this._steps)
    this.saveSteps()
    this.emit()
    this.syncDB()
  }

  // ── Getters ───────────────────────────────────────────────
  getSteps():      number    { return this._steps }
  getPermission(): PermState { return this._perm }
  isActive():      boolean   { return this._started }
}

// ── Safe singleton ────────────────────────────────────────────
let _tracker: AutoStepTracker | null = null

export function getAutoTracker(): AutoStepTracker {
  if (typeof window === 'undefined') {
    return {
      requestAndStart:              async () => 'unavailable' as PermState,
      subscribe:                    (cb: StepListener) => { cb({ steps:0, calories:0, distance:0, active:false, permissionState:'unknown' }); return () => {} },
      addSteps:                     () => {},
      getSteps:                     () => 0,
      getPermission:                () => 'unknown' as PermState,
      isActive:                     () => false,
      syncDB:                       async () => {},
      requestNotificationPermission: async () => {},
      startTracking:                async () => {},
    } as any
  }
  if (!_tracker) _tracker = new AutoStepTracker()
  return _tracker
}