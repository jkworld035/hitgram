'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  StepCounter,
  estimateCalories,
  estimateHR,
  detectActivity,
  getInsights,
  type HealthSensorData,
  type HealthInsight,
} from '@/lib/healthSensors'

export default function HealthLivePage() {
  const [data, setData] = useState<Partial<HealthSensorData>>({
    steps: 0, heartRate: 72, calories: 0, activeMinutes: 0,
    distance: 0, speed: 0, batteryLevel: null, isCharging: null,
    gyroscope: null, accelerometer: null, location: null, altitude: null,
    timestamp: new Date(),
  })
  const [insights, setInsights] = useState<HealthInsight[]>([])
  const [activity, setActivity] = useState('unknown')
  const [active, setActive] = useState(false)
  const [perms, setPerms] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('live')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const stepRef = useRef(new StepCounter())
  const activeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => { fetchHistory() }, [])
  useEffect(() => { setInsights(getInsights(data)) }, [data])

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: d } = await supabase.from('health_logs').select('*')
      .eq('user_id', user.id).order('log_date', { ascending: false }).limit(7)
    if (d) setHistory(d)
  }

  const initBattery = useCallback(async () => {
    try {
      const nav = navigator as any
      if (nav.getBattery) {
        const b = await nav.getBattery()
        setData(prev => ({ ...prev, batteryLevel: Math.round(b.level * 100), isCharging: b.charging }))
        b.addEventListener('levelchange', () =>
          setData(prev => ({ ...prev, batteryLevel: Math.round(b.level * 100) })))
        b.addEventListener('chargingchange', () =>
          setData(prev => ({ ...prev, isCharging: b.charging })))
        setPerms(prev => ({ ...prev, battery: 'granted' }))
      }
    } catch {
      setPerms(prev => ({ ...prev, battery: 'denied' }))
    }
  }, [])

  const initLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPerms(prev => ({ ...prev, location: 'unsupported' }))
      return
    }
    navigator.geolocation.watchPosition(
      pos => {
        setData(prev => ({
          ...prev,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          altitude: pos.coords.altitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
        }))
        setPerms(prev => ({ ...prev, location: 'granted' }))
      },
      () => setPerms(prev => ({ ...prev, location: 'denied' })),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    )
  }, [])

  const initMotion = useCallback(async () => {
    const DE = window.DeviceMotionEvent as any
    if (typeof DE?.requestPermission === 'function') {
      try {
        const perm = await DE.requestPermission()
        if (perm !== 'granted') {
          setPerms(prev => ({ ...prev, motion: 'denied' }))
          return
        }
      } catch {
        setPerms(prev => ({ ...prev, motion: 'denied' }))
        return
      }
    }
    window.addEventListener('devicemotion', (e: DeviceMotionEvent) => {
      const acc = e.acceleration || e.accelerationIncludingGravity
      if (!acc) return
      const x = acc.x || 0
      const y = acc.y || 0
      const z = acc.z || 0
      const mag = Math.sqrt(x * x + y * y + z * z)
      const steps = stepRef.current.process(x, y, z)
      const calories = estimateCalories(steps, activeRef.current)
      const heartRate = estimateHR(mag)
      const distance = parseFloat((steps * 0.000762).toFixed(2))
      setData(prev => ({
        ...prev, steps, calories, heartRate, distance,
        accelerometer: {
          x: parseFloat(x.toFixed(2)),
          y: parseFloat(y.toFixed(2)),
          z: parseFloat(z.toFixed(2)),
        },
        timestamp: new Date(),
      }))
      setActivity(detectActivity({ x, y, z }))
    })
    setPerms(prev => ({ ...prev, motion: 'granted' }))
  }, [])

  const initGyro = useCallback(() => {
    window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
      setData(prev => ({
        ...prev,
        gyroscope: {
          x: parseFloat((e.beta || 0).toFixed(1)),
          y: parseFloat((e.gamma || 0).toFixed(1)),
          z: parseFloat((e.alpha || 0).toFixed(1)),
        },
      }))
      setPerms(prev => ({ ...prev, gyroscope: 'granted' }))
    })
  }, [])

  const startSensors = async () => {
    setActive(true)
    await initBattery()
    initLocation()
    await initMotion()
    initGyro()
    timerRef.current = setInterval(() => {
      activeRef.current += 1
      setData(prev => ({ ...prev, activeMinutes: activeRef.current }))
    }, 60000)
  }

  const stopSensors = () => {
    setActive(false)
    if (timerRef.current !== undefined) clearInterval(timerRef.current)
  }

  const getAI = async () => {
    setAnalyzing(true)
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'jarvis',
        messages: [{
          role: 'user',
          content: `Analyze this health data: Steps: ${data.steps}, Heart Rate: ${data.heartRate} BPM, Calories: ${data.calories}, Activity: ${activity}, Active minutes: ${data.activeMinutes}, Distance: ${data.distance}km. Give a 3-paragraph analysis covering current health status, what to do in the next 2 hours, and one optimization for tonight. Be specific with numbers. No markdown.`
        }]
      })
    })
    const d = await res.json()
    setAiAnalysis(d.message)
    setAnalyzing(false)
  }

  const saveData = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('health_logs').upsert({
      user_id: user.id,
      log_date: new Date().toISOString().split('T')[0],
      steps: data.steps || 0,
      calories_consumed: data.calories || 0,
      mood: 3, water_ml: 0, sleep_minutes: 0,
    }, { onConflict: 'user_id,log_date' })
    setSaving(false)
    setSaved(true)
    fetchHistory()
    setTimeout(() => setSaved(false), 3000)
  }

  const actColors: Record<string, string> = {
    vigorous: '#FF4C4C', moderate: '#AAFF00',
    light: '#3B82F6', sedentary: '#3A3A3A', unknown: '#3A3A3A'
  }
  const actColor = actColors[activity] || '#3A3A3A'
  const hrColor = (data.heartRate || 0) > 100 ? '#FF4C4C' : (data.heartRate || 0) > 85 ? '#F97316' : (data.heartRate || 0) < 60 ? '#3B82F6' : '#AAFF00'
  const stepsColor = (data.steps || 0) >= 10000 ? '#AAFF00' : (data.steps || 0) >= 5000 ? '#F97316' : (data.steps || 0) >= 2000 ? '#3B82F6' : '#3A3A3A'
  const stepsPct = Math.min(((data.steps || 0) / 10000) * 100, 100)
  const insightColors: Record<HealthInsight['type'], string> = {
    success: '#AAFF00', warning: '#F97316', critical: '#EF4444', info: '#3B82F6'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', paddingBottom: '100px', fontFamily: 'Inter,sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(170,255,0,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(170,255,0,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '52px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/dashboard" style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', textDecoration: 'none', fontSize: '16px' }}>←</a>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Live Health</div>
              <div style={{ fontSize: '10px', color: active ? '#AAFF00' : '#3A3A3A', fontWeight: '700', letterSpacing: '0.1em' }}>
                {active ? '● SENSORS ACTIVE' : '○ INACTIVE'}
              </div>
            </div>
          </div>
          <button onClick={active ? stopSensors : startSensors}
            style={{ background: active ? 'rgba(255,76,76,0.1)' : 'rgba(170,255,0,0.1)', border: `1px solid ${active ? 'rgba(255,76,76,0.3)' : 'rgba(170,255,0,0.3)'}`, borderRadius: '20px', padding: '8px 16px', color: active ? '#FF4C4C' : '#AAFF00', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            {active ? 'Stop' : 'Start'}
          </button>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
          {['live', 'insights', 'ai', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', background: tab === t ? '#AAFF00' : 'transparent', color: tab === t ? '#000' : '#3A3A3A', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
              {t === 'ai' ? 'AI' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px', position: 'relative', zIndex: 10 }}>

        {/* LIVE TAB */}
        {tab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInUp 0.4s ease both' }}>

            {!active && (
              <div style={{ background: 'rgba(170,255,0,0.05)', border: '1px solid rgba(170,255,0,0.14)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', animation: 'float 3s ease-in-out infinite' }}>⚡</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Activate Health Sensors</div>
                <div style={{ fontSize: '13px', color: '#3A3A3A', lineHeight: '1.6', marginBottom: '20px' }}>
                  Real-time step counting, GPS tracking, battery monitoring and motion detection
                </div>
                <button onClick={startSensors}
                  style={{ background: '#AAFF00', color: '#000', border: 'none', borderRadius: '14px', padding: '14px 32px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 30px rgba(170,255,0,0.4)' }}>
                  Start Live Tracking
                </button>
              </div>
            )}

            {active && (
              <div style={{ background: `${actColor}10`, border: `1px solid ${actColor}25`, borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Activity Level</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: actColor, textTransform: 'capitalize' }}>{activity}</div>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${actColor}15`, border: `2px solid ${actColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={actColor} strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
              </div>
            )}

            {/* Heart Rate + Steps */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#111', border: `1px solid ${hrColor}20`, borderRadius: '20px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle,${hrColor}15,transparent)` }} />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={hrColor} strokeWidth="2" style={{ marginBottom: '10px' }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <div style={{ fontSize: '32px', fontWeight: '900', color: hrColor, lineHeight: 1, letterSpacing: '-0.03em' }}>{data.heartRate || '--'}</div>
                <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>BPM</div>
                <div style={{ fontSize: '11px', color: hrColor, marginTop: '6px', fontWeight: '600' }}>
                  {(data.heartRate || 0) > 100 ? 'Elevated' : (data.heartRate || 0) < 60 ? 'Athletic' : 'Normal'}
                </div>
              </div>

              <div style={{ background: '#111', border: `1px solid ${stepsColor}20`, borderRadius: '20px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle,${stepsColor}15,transparent)` }} />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stepsColor} strokeWidth="2" style={{ marginBottom: '10px' }}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <div style={{ fontSize: '32px', fontWeight: '900', color: stepsColor, lineHeight: 1, letterSpacing: '-0.03em' }}>{(data.steps || 0).toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>Steps</div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: stepsColor, width: `${stepsPct}%`, borderRadius: '2px', transition: 'width 0.5s ease', boxShadow: `0 0 6px ${stepsColor}` }} />
                </div>
                <div style={{ fontSize: '10px', color: '#3A3A3A', marginTop: '4px' }}>{Math.round(stepsPct)}% of 10,000</div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {[
                { label: 'Calories', value: `${data.calories || 0}`, unit: 'kcal', color: '#F97316' },
                { label: 'Distance', value: `${data.distance || 0}`, unit: 'km', color: '#3B82F6' },
                { label: 'Active Min', value: `${data.activeMinutes || 0}`, unit: 'min', color: '#8B5CF6' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111', border: `1px solid ${s.color}15`, borderRadius: '16px', padding: '14px 12px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.unit}</div>
                  <div style={{ fontSize: '9px', color: '#3A3A3A', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sensor Status */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>Sensor Status</div>
              {[
                { name: 'Accelerometer', key: 'motion', icon: '📱', desc: 'Step counting & activity' },
                { name: 'GPS Location', key: 'location', icon: '📍', desc: `${data.speed || 0} km/h · ${data.distance || 0}km` },
                { name: 'Battery', key: 'battery', icon: '🔋', desc: `${data.batteryLevel ?? '--'}% ${data.isCharging ? '⚡ Charging' : ''}` },
                { name: 'Gyroscope', key: 'gyroscope', icon: '🔄', desc: 'Orientation tracking' },
              ].map(sensor => {
                const status = perms[sensor.key]
                const color = status === 'granted' ? '#AAFF00' : status === 'denied' ? '#EF4444' : '#3A3A3A'
                return (
                  <div key={sensor.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0D0D0D', borderRadius: '12px', marginBottom: '8px', border: `1px solid ${color}12` }}>
                    <div style={{ fontSize: '20px' }}>{sensor.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{sensor.name}</div>
                      <div style={{ fontSize: '11px', color: '#3A3A3A', marginTop: '1px' }}>{sensor.desc}</div>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '700', color, background: `${color}12`, padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                      {status || 'pending'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Raw sensor data */}
            {(data.accelerometer || data.gyroscope) && (
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>Raw Sensor Data</div>
                {data.accelerometer && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#AAFF00', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.06em' }}>ACCELEROMETER (m/s²)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                      {(['x', 'y', 'z'] as const).map(axis => (
                        <div key={axis} style={{ background: '#0D0D0D', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#AAFF00' }}>{data.accelerometer?.[axis]}</div>
                          <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase' }}>{axis}-axis</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.gyroscope && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.06em' }}>GYROSCOPE (degrees)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                      {(['x', 'y', 'z'] as const).map(axis => (
                        <div key={axis} style={{ background: '#0D0D0D', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#3B82F6' }}>{data.gyroscope?.[axis]}°</div>
                          <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase' }}>{axis}-axis</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={saveData} disabled={saving}
              style={{ width: '100%', background: saved ? 'rgba(170,255,0,0.08)' : '#AAFF00', color: saved ? '#AAFF00' : '#000', border: saved ? '1px solid rgba(170,255,0,0.2)' : 'none', borderRadius: '16px', padding: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: saved ? 'none' : '0 0 24px rgba(170,255,0,0.3)', transition: 'all 0.3s' }}>
              {saving ? 'Saving...' : saved ? '✓ Saved to Database' : 'Save Health Data'}
            </button>
          </div>
        )}

        {/* INSIGHTS TAB */}
        {tab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInUp 0.4s ease both' }}>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '600', marginBottom: '4px' }}>{insights.length} personalized insights</div>
            {insights.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#3A3A3A' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>🧠</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>No insights yet</div>
                <div style={{ fontSize: '13px' }}>Start sensors to generate personalized insights</div>
              </div>
            ) : insights.map((ins, i) => {
              const c = insightColors[ins.type]
              return (
                <div key={i} style={{ background: '#111', border: `1px solid ${c}18`, borderRadius: '20px', padding: '18px', animation: `fadeInUp 0.5s ease ${i * 0.1}s both` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${c}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
                        {ins.type === 'success'
                          ? <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                          : <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>}
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{ins.title}</div>
                      <div style={{ fontSize: '10px', color: c, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ins.type}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: '1.6', marginBottom: '10px' }}>{ins.message}</div>
                  <div style={{ background: `${c}08`, border: `1px solid ${c}15`, borderRadius: '12px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: c, fontWeight: '700', marginBottom: '4px', letterSpacing: '0.06em' }}>RECOMMENDATION</div>
                    <div style={{ fontSize: '13px', color: '#fff', lineHeight: '1.6' }}>{ins.recommendation}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* AI TAB */}
        {tab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeInUp 0.4s ease both' }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(170,255,0,0.07),rgba(34,197,94,0.03))', border: '1px solid rgba(170,255,0,0.14)', borderRadius: '20px', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: '#AAFF00', fontWeight: '700', marginBottom: '12px', letterSpacing: '0.06em' }}>CURRENT SNAPSHOT</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
                {[
                  { label: 'Steps', value: (data.steps || 0).toLocaleString() },
                  { label: 'Heart Rate', value: `${data.heartRate || '--'} BPM` },
                  { label: 'Calories', value: `${data.calories || 0} kcal` },
                  { label: 'Activity', value: activity },
                  { label: 'Distance', value: `${data.distance || 0} km` },
                  { label: 'Active Min', value: `${data.activeMinutes || 0} min` },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '500' }}>{s.label}</span>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: '700' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={getAI} disabled={analyzing}
              style={{ width: '100%', background: analyzing ? 'rgba(170,255,0,0.08)' : '#AAFF00', color: analyzing ? '#AAFF00' : '#000', border: analyzing ? '1px solid rgba(170,255,0,0.2)' : 'none', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: '800', cursor: analyzing ? 'not-allowed' : 'pointer', boxShadow: analyzing ? 'none' : '0 0 24px rgba(170,255,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {analyzing ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(170,255,0,0.3)', borderTop: '2px solid #AAFF00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>Analyzing...</>
              ) : '🧠 Get Deep AI Analysis'}
            </button>

            {aiAnalysis && (
              <div style={{ background: '#111', border: '1px solid rgba(170,255,0,0.14)', borderRadius: '20px', padding: '20px', animation: 'fadeInUp 0.5s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#000' }}>J</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>J.A.R.V.I.S Health Analysis</div>
                    <div style={{ fontSize: '10px', color: '#AAFF00', fontWeight: '600' }}>Based on real-time sensor data</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#C0C0C0', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{aiAnalysis}</div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeInUp 0.4s ease both' }}>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '600', marginBottom: '4px' }}>Last 7 days</div>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#3A3A3A' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>No history yet</div>
                <div style={{ fontSize: '13px' }}>Track and save data to see your history</div>
              </div>
            ) : history.map((h, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '16px', animation: `fadeInUp 0.5s ease ${i * 0.08}s both` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                    {new Date(h.log_date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#AAFF00', fontWeight: '700', background: 'rgba(170,255,0,0.08)', padding: '3px 8px', borderRadius: '20px' }}>
                    {(h.steps || 0) >= 10000 ? 'Goal Hit!' : `${Math.round(((h.steps || 0) / 10000) * 100)}%`}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {[
                    { label: 'Steps', value: (h.steps || 0).toLocaleString(), color: '#AAFF00' },
                    { label: 'Water', value: `${h.water_ml || 0}ml`, color: '#3B82F6' },
                    { label: 'Sleep', value: `${Math.round((h.sleep_minutes || 0) / 60)}h`, color: '#8B5CF6' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#0D0D0D', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', zIndex: 100, background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Home</div>
          </a>
          <a href="/health" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Health</div>
          </a>
          <a href="/create-post" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-18px', flexShrink: 0, textDecoration: 'none', boxShadow: '0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          <a href="/goals" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Goals</div>
          </a>
          <a href="/health-live" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <div style={{ fontSize: '10px', color: '#AAFF00', fontWeight: '700' }}>Live</div>
          </a>
        </div>
      </div>
    </div>
  )
}