// Real step counting using device accelerometer
export interface HealthSensorData {
  steps: number
  heartRate: number | null
  calories: number
  activeMinutes: number
  distance: number
  speed: number
  batteryLevel: number | null
  isCharging: boolean | null
  gyroscope: { x: number; y: number; z: number } | null
  accelerometer: { x: number; y: number; z: number } | null
  location: { lat: number; lng: number } | null
  altitude: number | null
  timestamp: Date
}

export interface HealthInsight {
  type: 'warning' | 'success' | 'info' | 'critical'
  title: string
  message: string
  recommendation: string
}

// ── REAL STEP COUNTER using accelerometer peak detection ──────
export class StepCounter {
  private steps = 0
  private lastMag = 0
  private threshold = 11
  private minStepInterval = 250 // ms between steps
  private lastStepTime = 0
  private initialized = false
  private buffer: number[] = []
  private bufferSize = 5
  private lastPeak = false

  process(x: number, y: number, z: number): number {
    const raw = Math.sqrt(x * x + y * y + z * z)

    // Running average to smooth noise
    this.buffer.push(raw)
    if (this.buffer.length > this.bufferSize) this.buffer.shift()
    const mag = this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length

    const now = Date.now()

    if (!this.initialized) {
      this.lastMag = mag
      this.initialized = true
      return this.steps
    }

    const delta = mag - this.lastMag
    const timeSinceLastStep = now - this.lastStepTime
    const isPeak = delta > this.threshold && !this.lastPeak
    const isValidTiming = timeSinceLastStep > this.minStepInterval

    if (isPeak && isValidTiming) {
      this.steps++
      this.lastStepTime = now
      this.lastPeak = true
    } else if (delta < -this.threshold) {
      this.lastPeak = false
    }

    this.lastMag = mag
    return this.steps
  }

  get(): number { return this.steps }
  set(n: number): void { this.steps = n }
  reset(): void {
    this.steps = 0
    this.lastMag = 0
    this.lastPeak = false
    this.buffer = []
    this.initialized = false
  }
}

// ── CALORIE ESTIMATION (MET based) ───────────────────────────
export function estimateCalories(
  steps: number,
  activeMinutes: number,
  weightKg = 70
): number {
  // Walking MET ~3.5, running MET ~7.0
  const walkingCals = steps * 0.04 * (weightKg / 70)
  const activeCals = activeMinutes * 5 * (weightKg / 70)
  return Math.round(walkingCals + activeCals)
}

// ── HEART RATE ESTIMATE from motion ──────────────────────────
export function estimateHR(mag: number, baseHR = 72): number {
  const intensity = Math.min(Math.max(mag - 9.8, 0), 15)
  return Math.round(baseHR + intensity * 8)
}

// ── DISTANCE ESTIMATION ───────────────────────────────────────
export function estimateDistance(steps: number, heightCm = 170): number {
  // Stride length ≈ 0.415 × height
  const strideLength = 0.415 * (heightCm / 100)
  return parseFloat((steps * strideLength / 1000).toFixed(2)) // km
}

// ── ACTIVITY DETECTION ────────────────────────────────────────
export function detectActivity(
  acc: { x: number; y: number; z: number } | null
): string {
  if (!acc) return 'unknown'
  const mag = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2)
  if (mag < 10.5) return 'sedentary'
  if (mag < 12)   return 'light'
  if (mag < 16)   return 'moderate'
  return 'vigorous'
}

// ── STEP GOAL PROGRESS ────────────────────────────────────────
export function getStepGoalProgress(steps: number, goal = 10000): {
  percentage: number
  remaining: number
  achieved: boolean
  message: string
} {
  const percentage = Math.min(Math.round((steps / goal) * 100), 100)
  const remaining = Math.max(goal - steps, 0)
  const achieved = steps >= goal

  let message = ''
  if (steps === 0) message = 'Start walking to count your steps!'
  else if (percentage < 25) message = `${remaining.toLocaleString()} steps to go. Keep moving!`
  else if (percentage < 50) message = `Great start! ${remaining.toLocaleString()} steps remaining.`
  else if (percentage < 75) message = `Over halfway there! ${remaining.toLocaleString()} more steps.`
  else if (percentage < 100) message = `Almost there! Just ${remaining.toLocaleString()} steps left!`
  else message = `Goal achieved! You walked ${steps.toLocaleString()} steps today! 🎉`

  return { percentage, remaining, achieved, message }
}

// ── WEEKLY STATS ─────────────────────────────────────────────
export function getWeeklyStats(dailySteps: number[]): {
  total: number
  average: number
  best: number
  goalsHit: number
} {
  const total = dailySteps.reduce((a, b) => a + b, 0)
  const average = Math.round(total / (dailySteps.length || 1))
  const best = Math.max(...dailySteps, 0)
  const goalsHit = dailySteps.filter(s => s >= 10000).length
  return { total, average, best, goalsHit }
}

// ── HEALTH INSIGHTS ───────────────────────────────────────────
export function getInsights(data: Partial<HealthSensorData>): HealthInsight[] {
  const insights: HealthInsight[] = []
  const hour = new Date().getHours()
  const steps = data.steps || 0

  // Steps insights
  if (steps === 0 && hour > 9) {
    insights.push({
      type: 'warning',
      title: 'No Steps Yet',
      message: 'You have not started moving today.',
      recommendation: 'Even a 5-minute walk counts. Stand up and take a short break from sitting.',
    })
  } else if (steps < 2000 && hour > 12) {
    insights.push({
      type: 'warning',
      title: 'Low Step Count',
      message: `Only ${steps.toLocaleString()} steps so far today.`,
      recommendation: 'Take a 10-minute walk. Even 1,000 extra steps reduces cardiovascular risk by 15%.',
    })
  } else if (steps >= 10000) {
    insights.push({
      type: 'success',
      title: '🎉 Daily Goal Achieved!',
      message: `${steps.toLocaleString()} steps completed today!`,
      recommendation: 'Outstanding! Consider adding strength training to complement your cardio.',
    })
  } else if (steps >= 7500) {
    insights.push({
      type: 'info',
      title: 'Almost There!',
      message: `${steps.toLocaleString()} steps done.`,
      recommendation: `Only ${(10000 - steps).toLocaleString()} more steps needed. A 15-minute walk will get you there.`,
    })
  } else if (steps >= 5000) {
    insights.push({
      type: 'info',
      title: 'Good Progress',
      message: `${steps.toLocaleString()} steps done.`,
      recommendation: `${(10000 - steps).toLocaleString()} more steps needed. A 20-minute walk will finish the job.`,
    })
  }

  // Heart rate insights
  if (data.heartRate) {
    if (data.heartRate > 100) {
      insights.push({
        type: 'warning',
        title: 'Elevated Heart Rate',
        message: `${data.heartRate} BPM detected.`,
        recommendation: 'Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 times.',
      })
    } else if (data.heartRate < 55) {
      insights.push({
        type: 'info',
        title: 'Athletic Heart Rate',
        message: `${data.heartRate} BPM — excellent cardiovascular fitness.`,
        recommendation: 'A resting heart rate below 60 BPM indicates great cardiac efficiency.',
      })
    }
  }

  // Battery
  if (data.batteryLevel !== null && data.batteryLevel !== undefined && data.batteryLevel < 20 && !data.isCharging) {
    insights.push({
      type: 'info',
      title: 'Low Battery',
      message: 'Battery below 20%. Sensor tracking may stop.',
      recommendation: 'Charge your device to maintain continuous health monitoring.',
    })
  }

  // Time-based insights
  if (hour >= 22) {
    insights.push({
      type: 'info',
      title: 'Wind Down Time',
      message: 'Past 10 PM — time to prepare for sleep.',
      recommendation: 'Dim your screen, avoid blue light, and aim for bed by 11 PM for optimal recovery.',
    })
  }

  if (hour >= 7 && hour <= 9 && steps < 100) {
    insights.push({
      type: 'info',
      title: 'Morning Movement',
      message: 'Start your day with movement.',
      recommendation: 'A 5-minute morning walk raises cortisol naturally, improving alertness by 30%.',
    })
  }

  // Calories
  const calories = data.calories || 0
  if (calories < 150 && hour > 15) {
    insights.push({
      type: 'warning',
      title: 'Low Active Calories',
      message: `Only ${calories} active calories burned today.`,
      recommendation: 'Take the stairs, park further away, or do a quick 10-minute walk to boost metabolism.',
    })
  }

  return insights
}