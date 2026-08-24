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

export class StepCounter {
  private steps: number = 0
  private lastMag: number = 0
  private threshold: number = 12
  private minTime: number = 250
  private lastStep: number = 0
  private initialized: boolean = false

  process(x: number, y: number, z: number): number {
    const mag = Math.sqrt(x * x + y * y + z * z)
    const now = Date.now()
    if (Math.abs(mag - this.lastMag) > this.threshold && now - this.lastStep > this.minTime && this.initialized) {
      this.steps++
      this.lastStep = now
    }
    this.lastMag = mag
    this.initialized = true
    return this.steps
  }

  get(): number { return this.steps }
  reset(): void { this.steps = 0 }
}

export function estimateCalories(steps: number, activeMinutes: number): number {
  return Math.round(steps * 0.04 + activeMinutes * 5)
}

export function estimateHR(mag: number): number {
  return Math.round(72 + Math.min(mag * 2, 80))
}

export function detectActivity(acc: { x: number; y: number; z: number } | null): string {
  if (!acc) return 'unknown'
  const mag = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2)
  if (mag < 2) return 'sedentary'
  if (mag < 6) return 'light'
  if (mag < 12) return 'moderate'
  return 'vigorous'
}

export function getInsights(data: Partial<HealthSensorData>): HealthInsight[] {
  const insights: HealthInsight[] = []
  const hour = new Date().getHours()
  const steps = data.steps || 0
  if (steps < 2000 && hour > 12) {
    insights.push({ type: 'warning', title: 'Low Step Count', message: steps.toLocaleString() + ' steps today.', recommendation: 'Take a 10 minute walk to boost your daily activity.' })
  } else if (steps >= 10000) {
    insights.push({ type: 'success', title: 'Step Goal Achieved', message: steps.toLocaleString() + ' steps completed!', recommendation: 'Outstanding! Consider adding strength training for complete fitness.' })
  } else if (steps >= 5000) {
    insights.push({ type: 'info', title: 'Good Progress', message: steps.toLocaleString() + ' steps done.', recommendation: (10000 - steps).toLocaleString() + ' more steps needed. A 20 minute walk will get you there.' })
  }
  if (data.heartRate) {
    if (data.heartRate > 100) {
      insights.push({ type: 'warning', title: 'High Heart Rate', message: data.heartRate + ' BPM detected.', recommendation: 'Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 times.' })
    } else if (data.heartRate < 60) {
      insights.push({ type: 'info', title: 'Athletic Heart Rate', message: data.heartRate + ' BPM shows great cardiovascular fitness.', recommendation: 'A resting heart rate below 60 indicates excellent cardiac efficiency. Keep training.' })
    }
  }
  if (data.batteryLevel !== null && data.batteryLevel !== undefined && data.batteryLevel < 20 && !data.isCharging) {
    insights.push({ type: 'info', title: 'Low Battery', message: 'Battery is running low.', recommendation: 'Charge your device to maintain continuous health monitoring.' })
  }
  if (hour >= 22) {
    insights.push({ type: 'info', title: 'Sleep Time', message: 'Past 10 PM. Time to wind down.', recommendation: 'Reduce screen brightness and aim for sleep by 11 PM for optimal recovery.' })
  }
  if (hour >= 7 && hour <= 9 && steps < 100) {
    insights.push({ type: 'info', title: 'Morning Movement', message: 'Start your day with movement.', recommendation: 'A 5 minute morning walk raises cortisol naturally and improves alertness by 30 percent.' })
  }
  return insights
}
