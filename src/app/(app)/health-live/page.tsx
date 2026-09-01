'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAutoTracker } from '@/lib/autoStepTracker'
import { estimateCalories, estimateDistance, estimateHR, detectActivity, getInsights, getStepGoalProgress, type HealthInsight } from '@/lib/healthSensors'

const STEP_GOAL = 10000

type CheckupStatus = 'idle' | 'checking' | 'done'
type MetricStatus  = 'normal' | 'attention' | 'unavailable' | 'loading'

interface Metric {
  id:      string
  label:   string
  value:   string
  unit:    string
  icon:    string
  status:  MetricStatus
  source:  string
  normal:  string
  trend?:  string
  note?:   string
}

export default function HealthLivePage() {
  // ── Steps (from auto tracker) ─────────────────────────────
  const [steps,         setSteps]         = useState(0)
  const [calories,      setCalories]      = useState(0)
  const [distance,      setDistance]      = useState(0)

  // ── Sensors ───────────────────────────────────────────────
  const [heartRate,     setHeartRate]     = useState<number|null>(null)
  const [activity,      setActivity]      = useState('unknown')
  const [battery,       setBattery]       = useState<number|null>(null)
  const [charging,      setCharging]      = useState<boolean|null>(null)
  const [location,      setLocation]      = useState<{lat:number,lng:number,accuracy:number}|null>(null)
  const [altitude,      setAltitude]      = useState<number|null>(null)
  const [speed,         setSpeed]         = useState<number>(0)
  const [gyro,          setGyro]          = useState<{x:number,y:number,z:number}|null>(null)
  const [acc,           setAcc]           = useState<{x:number,y:number,z:number}|null>(null)
  const [activeMinutes, setActiveMinutes] = useState(0)

  // ── Checkup ───────────────────────────────────────────────
  const [checkupStatus, setCheckupStatus] = useState<CheckupStatus>('idle')
  const [checkupStep,   setCheckupStep]   = useState(0)
  const [checkupResult, setCheckupResult] = useState<string>('')
  const [metrics,       setMetrics]       = useState<Metric[]>([])

  // ── Permissions ───────────────────────────────────────────
  const [perms,         setPerms]         = useState<Record<string,string>>({})

  // ── UI ────────────────────────────────────────────────────
  const [tab,           setTab]           = useState('checkup')
  const [insights,      setInsights]      = useState<HealthInsight[]>([])
  const [weeklyHistory, setWeeklyHistory] = useState<{date:string,steps:number}[]>([])
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [sensorOn,      setSensorOn]      = useState(false)

  const supabase       = createClient()
  const activeRef      = useRef(0)
  const activeTimer    = useRef<ReturnType<typeof setInterval>|undefined>(undefined)
  const motionHandler  = useRef<((e:DeviceMotionEvent)=>void)|null>(null)
  const gyroHandler    = useRef<((e:DeviceOrientationEvent)=>void)|null>(null)

  // ── Auto tracker subscription ─────────────────────────────
  useEffect(() => {
    const tracker = getAutoTracker()
    const unsub = tracker.subscribe(data => {
      setSteps(data.steps)
      setCalories(data.calories)
      setDistance(data.distance)
    })
    loadBattery()
    loadWeeklyHistory()
    return unsub
  }, [])

  // ── Insights update ───────────────────────────────────────
  useEffect(() => {
    setInsights(getInsights({
      steps, heartRate, calories, activeMinutes,
      distance, batteryLevel: battery, isCharging: charging,
      accelerometer: acc, gyroscope: gyro, timestamp: new Date(),
    }))
  }, [steps, heartRate, calories, activeMinutes, battery])

  // ── Battery API ───────────────────────────────────────────
  const loadBattery = async () => {
    try {
      const nav = navigator as any
      if (!nav.getBattery) return
      const b = await nav.getBattery()
      setBattery(Math.round(b.level * 100))
      setCharging(b.charging)
      b.addEventListener('levelchange',   () => setBattery(Math.round(b.level * 100)))
      b.addEventListener('chargingchange',() => setCharging(b.charging))
      setPerms(p => ({ ...p, battery: 'granted' }))
    } catch { setPerms(p => ({ ...p, battery: 'unavailable' })) }
  }

  // ── GPS ───────────────────────────────────────────────────
  const startLocation = useCallback(() => {
    if (!navigator.geolocation) { setPerms(p => ({ ...p, location: 'unavailable' })); return }
    navigator.geolocation.watchPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setAltitude(pos.coords.altitude)
        setSpeed(pos.coords.speed ? parseFloat((pos.coords.speed * 3.6).toFixed(1)) : 0)
        setPerms(p => ({ ...p, location: 'granted' }))
      },
      () => setPerms(p => ({ ...p, location: 'denied' })),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
  }, [])

  // ── Motion sensors ────────────────────────────────────────
  const startMotion = useCallback(async () => {
    if (!window.DeviceMotionEvent) { setPerms(p => ({ ...p, motion: 'unavailable' })); return }
    const DE = window.DeviceMotionEvent as any
    if (typeof DE.requestPermission === 'function') {
      const r = await DE.requestPermission().catch(() => 'denied')
      if (r !== 'granted') { setPerms(p => ({ ...p, motion: 'denied' })); return }
    }

    motionHandler.current = (e: DeviceMotionEvent) => {
      const a = e.acceleration || e.accelerationIncludingGravity
      if (!a) return
      const x = a.x||0, y = a.y||0, z = a.z||0
      setAcc({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)), z: parseFloat(z.toFixed(2)) })
      setHeartRate(estimateHR(Math.sqrt(x*x+y*y+z*z)))
      setActivity(detectActivity({ x, y, z }))
    }
    window.addEventListener('devicemotion', motionHandler.current, { passive: true })
    setPerms(p => ({ ...p, motion: 'granted' }))

    gyroHandler.current = (e: DeviceOrientationEvent) => {
      setGyro({ x: parseFloat((e.beta||0).toFixed(1)), y: parseFloat((e.gamma||0).toFixed(1)), z: parseFloat((e.alpha||0).toFixed(1)) })
    }
    window.addEventListener('deviceorientation', gyroHandler.current, { passive: true })
  }, [])

  const startSensors = async () => {
    setSensorOn(true)
    startLocation()
    await startMotion()
    activeTimer.current = setInterval(() => {
      activeRef.current += 1
      setActiveMinutes(activeRef.current)
    }, 60000)
  }

  const stopSensors = () => {
    setSensorOn(false)
    if (motionHandler.current) window.removeEventListener('devicemotion', motionHandler.current)
    if (gyroHandler.current)   window.removeEventListener('deviceorientation', gyroHandler.current)
    if (activeTimer.current)   clearInterval(activeTimer.current)
  }

  // ── Live Health Checkup ───────────────────────────────────
  const runCheckup = async () => {
    setCheckupStatus('checking')
    setCheckupStep(0)
    setMetrics([])
    setCheckupResult('')

    const steps_check: [string, number][] = [
      ['Collecting step data...',      800],
      ['Checking battery status...',   600],
      ['Reading motion sensors...',    700],
      ['Fetching location data...',    600],
      ['Analyzing activity level...',  700],
      ['Loading health history...',    800],
      ['Running IRA analysis...',     1200],
      ['Generating recommendations...', 600],
    ]

    for (let i = 0; i < steps_check.length; i++) {
      setCheckupStep(i)
      await new Promise(r => setTimeout(r, steps_check[i][1]))
    }

    // Build real metrics from available sensors
    const builtMetrics: Metric[] = [
      {
        id:     'steps',
        label:  'Steps Today',
        value:  steps.toLocaleString(),
        unit:   'steps',
        icon:   '👟',
        status: steps >= 10000 ? 'normal' : steps >= 5000 ? 'normal' : 'attention',
        source: 'Accelerometer (Auto)',
        normal: '8,000 – 12,000 steps/day',
        trend:  steps >= 10000 ? '✅ Goal achieved' : `${(10000-steps).toLocaleString()} to goal`,
      },
      {
        id:     'calories',
        label:  'Active Calories',
        value:  String(calories),
        unit:   'kcal',
        icon:   '🔥',
        status: calories > 200 ? 'normal' : 'attention',
        source: 'Calculated from steps',
        normal: '200 – 600 kcal active burn',
        trend:  `${distance} km walked`,
      },
      {
        id:     'heart_rate',
        label:  'Heart Rate',
        value:  heartRate ? String(heartRate) : 'N/A',
        unit:   'BPM',
        icon:   '❤️',
        status: heartRate ? (heartRate < 100 ? 'normal' : 'attention') : 'unavailable',
        source: 'Estimated from motion',
        normal: '60 – 100 BPM resting',
        note:   '⚠️ Motion-estimated only. Use a heart rate monitor for accuracy.',
        trend:  heartRate ? (heartRate < 60 ? 'Athletic range' : heartRate < 85 ? 'Normal range' : 'Elevated') : undefined,
      },
      {
        id:     'activity',
        label:  'Activity Level',
        value:  activity.charAt(0).toUpperCase() + activity.slice(1),
        unit:   '',
        icon:   activity==='vigorous'?'🏃':activity==='moderate'?'🚶':activity==='light'?'🦶':'🪑',
        status: activity==='vigorous'||activity==='moderate' ? 'normal' : 'attention',
        source: 'Accelerometer',
        normal: 'Moderate to vigorous',
        trend:  `${activeMinutes} active minutes`,
      },
      {
        id:     'battery',
        label:  'Battery',
        value:  battery !== null ? String(battery) : 'N/A',
        unit:   '%',
        icon:   '🔋',
        status: battery === null ? 'unavailable' : battery > 20 ? 'normal' : 'attention',
        source: 'Battery API',
        normal: 'Above 20%',
        trend:  charging ? '⚡ Charging' : battery !== null ? (battery > 50 ? 'Good level' : 'Consider charging') : undefined,
      },
      {
        id:     'location',
        label:  'GPS',
        value:  location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : 'N/A',
        unit:   '',
        icon:   '📍',
        status: location ? 'normal' : 'unavailable',
        source: 'Device GPS',
        normal: 'Location available',
        trend:  location ? `±${Math.round(location.accuracy)}m accuracy` : undefined,
        note:   !location ? 'Enable location for distance tracking' : undefined,
      },
      // Metrics that need a wearable
      {
        id:     'spo2',
        label:  'Blood Oxygen (SpO2)',
        value:  'N/A',
        unit:   '%',
        icon:   '🩸',
        status: 'unavailable',
        source: 'Requires wearable device',
        normal: '95 – 100%',
        note:   'Connect a supported wearable (Apple Watch, Fitbit, Garmin) to access this metric.',
      },
      {
        id:     'blood_pressure',
        label:  'Blood Pressure',
        value:  'N/A',
        unit:   'mmHg',
        icon:   '💉',
        status: 'unavailable',
        source: 'Requires BP monitor',
        normal: '120/80 mmHg',
        note:   'Connect a Bluetooth blood pressure monitor to track this metric.',
      },
      {
        id:     'temperature',
        label:  'Body Temperature',
        value:  'N/A',
        unit:   '°C',
        icon:   '🌡️',
        status: 'unavailable',
        source: 'Requires thermometer',
        normal: '36.1 – 37.2 °C',
        note:   'Body temperature cannot be measured by your phone. Use a thermometer.',
      },
    ]

    setMetrics(builtMetrics)

    // Generate IRA analysis
    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type: 'jarvis',
          messages: [{
            role:    'user',
            content: `Analyze this real health checkup data and give a 3-paragraph health summary. Be specific with the numbers. No markdown.

Steps today: ${steps}
Calories burned: ${calories} kcal  
Distance: ${distance} km
Heart rate estimate: ${heartRate || 'unavailable'} BPM
Activity level: ${activity}
Active minutes: ${activeMinutes}
Battery: ${battery !== null ? battery+'%' : 'unknown'}
GPS available: ${location ? 'yes' : 'no'}

Note: Heart rate is estimated from phone motion sensors — not a medical reading.
SpO2, blood pressure and body temperature are not available without a wearable device.

Give: 1) Current health status 2) What to focus on next 2 hours 3) Tonight's recovery tip.`,
          }],
        }),
      })
      const d = await res.json()
      setCheckupResult(d.message || '')
    } catch {
      setCheckupResult(`Your health checkup is complete. You have taken ${steps.toLocaleString()} steps today, burning approximately ${calories} calories and covering ${distance} km. Your activity level is currently ${activity}. Keep moving to reach your daily step goal of 10,000 steps. For a complete health picture including heart rate, SpO2 and blood pressure, connect a compatible wearable device.`)
    }

    // Save to DB
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('health_logs').upsert({
          user_id:   user.id,
          log_date:  new Date().toISOString().split('T')[0],
          steps,
          calories_consumed: calories,
          distance_km:       distance,
        }, { onConflict: 'user_id,log_date' })
      }
    } catch {}

    setCheckupStatus('done')
  }

  const loadWeeklyHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('health_logs').select('log_date,steps').eq('user_id', user.id).order('log_date', { ascending: false }).limit(7)
      if (data) setWeeklyHistory(data.map(d => ({ date: d.log_date, steps: d.steps || 0 })))
    } catch {}
  }

  const saveAll = async () => {
    setSaving(true)
    const tracker = getAutoTracker()
    await tracker.syncDB()
    await loadWeeklyHistory()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const progress   = getStepGoalProgress(steps)
  const scoreColor = steps >= 10000 ? '#AAFF00' : steps >= 5000 ? '#F97316' : steps >= 2000 ? '#3B82F6' : '#EF4444'
  const weekMax    = Math.max(...weeklyHistory.map(h => h.steps), 1)

  const statusColor = (s: MetricStatus) =>
    s === 'normal' ? '#22C55E' : s === 'attention' ? '#F97316' : s === 'unavailable' ? '#3A3A3A' : '#3B82F6'
  const statusLabel = (s: MetricStatus) =>
    s === 'normal' ? 'Normal' : s === 'attention' ? 'Needs Attention' : s === 'unavailable' ? 'Not Available' : 'Loading'

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes scanLine{0%{transform:translateY(0)}100%{transform:translateY(300px)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky',top:0,zIndex:50,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'52px 20px 16px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px',height:'36px',borderRadius:'10px',background:'#111',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',textDecoration:'none',fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px',fontWeight:'800',color:'#fff' }}>Live Health</div>
              <div style={{ fontSize:'10px',color:sensorOn?'#AAFF00':'#3A3A3A',fontWeight:'700',letterSpacing:'0.1em' }}>
                {sensorOn ? '● SENSORS ACTIVE' : '○ READY'}
              </div>
            </div>
          </div>
          <button onClick={sensorOn ? stopSensors : startSensors}
            style={{ background:sensorOn?'rgba(239,68,68,0.1)':'rgba(170,255,0,0.1)',border:`1px solid ${sensorOn?'rgba(239,68,68,0.3)':'rgba(170,255,0,0.3)'}`,borderRadius:'20px',padding:'8px 16px',color:sensorOn?'#EF4444':'#AAFF00',fontSize:'12px',fontWeight:'700',cursor:'pointer' }}>
            {sensorOn ? '⏹ Stop' : '▶ Sensors'}
          </button>
        </div>
        <div style={{ display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'4px',gap:'4px' }}>
          {['checkup','steps','sensors','history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1,padding:'8px 4px',borderRadius:'8px',border:'none',background:tab===t?'#AAFF00':'transparent',color:tab===t?'#000':'#3A3A3A',fontSize:'11px',fontWeight:'700',cursor:'pointer',textTransform:'capitalize',transition:'all 0.2s' }}>
              {t === 'checkup' ? 'Checkup' : t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* ── CHECKUP TAB ── */}
        {tab === 'checkup' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>

            {checkupStatus === 'idle' && (
              <div style={{ textAlign:'center',padding:'40px 20px' }}>
                <div style={{ width:'100px',height:'100px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',boxShadow:'0 0 60px rgba(170,255,0,0.4)',fontSize:'44px' }}>
                  🩺
                </div>
                <div style={{ fontSize:'22px',fontWeight:'900',color:'#fff',marginBottom:'10px' }}>Live Health Checkup</div>
                <div style={{ fontSize:'14px',color:'#52525B',lineHeight:'1.7',marginBottom:'28px',maxWidth:'300px',margin:'0 auto 28px' }}>
                  IRA analyzes your real health data from device sensors and gives you a personalized health summary.
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:'8px',marginBottom:'24px',textAlign:'left' }}>
                  {[
                    { icon:'✅', text:'Real step count from accelerometer' },
                    { icon:'✅', text:'Activity level and active minutes' },
                    { icon:'✅', text:'Calorie burn and distance' },
                    { icon:'✅', text:'Battery and GPS status' },
                    { icon:'⚠️', text:'Heart rate — motion estimate only' },
                    { icon:'📱', text:'SpO2, BP, Temperature — wearable needed' },
                  ].map(f => (
                    <div key={f.text} style={{ display:'flex',gap:'10px',alignItems:'center',background:'#111',borderRadius:'12px',padding:'10px 14px',border:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize:'16px',flexShrink:0 }}>{f.icon}</span>
                      <span style={{ fontSize:'13px',color:'#A1A1AA' }}>{f.text}</span>
                    </div>
                  ))}
                </div>
                <button onClick={runCheckup}
                  style={{ width:'100%',background:'#AAFF00',color:'#000',border:'none',borderRadius:'16px',padding:'16px',fontSize:'16px',fontWeight:'900',cursor:'pointer',boxShadow:'0 0 30px rgba(170,255,0,0.4)' }}>
                  🩺 Start Health Checkup
                </button>
              </div>
            )}

            {checkupStatus === 'checking' && (
              <div style={{ textAlign:'center',padding:'40px 20px' }}>
                <div style={{ width:'80px',height:'80px',borderRadius:'50%',background:'rgba(170,255,0,0.08)',border:'2px solid rgba(170,255,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:'36px',animation:'pulse 1.5s ease-in-out infinite' }}>
                  🩺
                </div>
                <div style={{ fontSize:'18px',fontWeight:'800',color:'#fff',marginBottom:'8px' }}>Running Health Checkup</div>
                <div style={{ fontSize:'13px',color:'#3A3A3A',marginBottom:'28px' }}>IRA is analyzing your health data...</div>
                <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                  {['Collecting step data','Checking battery status','Reading motion sensors','Fetching location data','Analyzing activity level','Loading health history','Running IRA analysis','Generating recommendations'].map((s,i) => (
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:'12px',background:'#111',borderRadius:'12px',padding:'12px 16px',border:`1px solid ${checkupStep>=i?'rgba(170,255,0,0.15)':'rgba(255,255,255,0.04)'}`,transition:'all 0.3s' }}>
                      {checkupStep > i ? (
                        <div style={{ width:'20px',height:'20px',borderRadius:'50%',background:'#AAFF00',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                      ) : checkupStep === i ? (
                        <div style={{ width:'20px',height:'20px',border:'2px solid rgba(170,255,0,0.3)',borderTop:'2px solid #AAFF00',borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0 }}/>
                      ) : (
                        <div style={{ width:'20px',height:'20px',borderRadius:'50%',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0 }}/>
                      )}
                      <span style={{ fontSize:'13px',color:checkupStep>=i?'#fff':'#3A3A3A',fontWeight:checkupStep===i?'700':'400' }}>{s}</span>
                      {checkupStep===i && <div style={{ marginLeft:'auto',fontSize:'11px',color:'#AAFF00',animation:'pulse 1s infinite' }}>...</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {checkupStatus === 'done' && (
              <div style={{ animation:'fadeInUp 0.4s ease both' }}>
                {/* IRA Summary */}
                {checkupResult && (
                  <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.07),rgba(34,197,94,0.03))',border:'1px solid rgba(170,255,0,0.15)',borderRadius:'20px',padding:'20px',marginBottom:'14px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px' }}>
                      <div style={{ width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'900',color:'#000',flexShrink:0 }}>I</div>
                      <div>
                        <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff' }}>IRA Health Analysis</div>
                        <div style={{ fontSize:'10px',color:'#AAFF00',fontWeight:'600' }}>Based on real sensor data • {new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:'14px',color:'#C0C0C0',lineHeight:'1.8' }}>{checkupResult}</div>
                  </div>
                )}

                {/* Metrics grid */}
                <div style={{ fontSize:'12px',color:'#3A3A3A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'12px' }}>
                  Health Metrics ({metrics.filter(m=>m.status!=='unavailable').length} available • {metrics.filter(m=>m.status==='unavailable').length} need device)
                </div>

                <div style={{ display:'flex',flexDirection:'column',gap:'10px',marginBottom:'14px' }}>
                  {metrics.map((m,i) => (
                    <div key={m.id} style={{ background:'#111',border:`1px solid ${statusColor(m.status)}15`,borderRadius:'18px',padding:'16px',animation:`fadeInUp 0.5s ease ${i*0.05}s both`,opacity:m.status==='unavailable'?0.7:1 }}>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                          <span style={{ fontSize:'24px' }}>{m.icon}</span>
                          <div>
                            <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff' }}>{m.label}</div>
                            <div style={{ fontSize:'10px',color:'#3A3A3A',marginTop:'1px' }}>Source: {m.source}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'22px',fontWeight:'900',color:statusColor(m.status) }}>
                            {m.value}{m.unit && <span style={{ fontSize:'12px',fontWeight:'600',marginLeft:'2px' }}>{m.unit}</span>}
                          </div>
                          <div style={{ fontSize:'9px',color:statusColor(m.status),fontWeight:'700',background:`${statusColor(m.status)}15`,padding:'2px 8px',borderRadius:'20px',display:'inline-block',marginTop:'2px' }}>
                            {statusLabel(m.status)}
                          </div>
                        </div>
                      </div>
                      {m.trend && <div style={{ fontSize:'11px',color:'#52525B',marginTop:'4px' }}>📈 {m.trend}</div>}
                      {m.note && (
                        <div style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'10px',padding:'8px 12px',marginTop:'8px',fontSize:'11px',color:'#52525B',lineHeight:'1.5' }}>
                          {m.note}
                        </div>
                      )}
                      {m.normal && (
                        <div style={{ fontSize:'10px',color:'#3A3A3A',marginTop:'4px' }}>Normal range: {m.normal}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Wearable CTA */}
                <div style={{ background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'18px',padding:'16px',marginBottom:'14px' }}>
                  <div style={{ fontSize:'14px',fontWeight:'700',color:'#3B82F6',marginBottom:'8px' }}>📡 Get More Health Data</div>
                  <div style={{ fontSize:'13px',color:'#52525B',lineHeight:'1.6',marginBottom:'12px' }}>
                    Connect a wearable device to unlock SpO2, blood pressure, precise heart rate, sleep tracking and body temperature.
                  </div>
                  <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
                    {['Apple Watch','Fitbit','Garmin','Samsung Galaxy Watch','Xiaomi Band'].map(w => (
                      <div key={w} style={{ fontSize:'11px',color:'#3B82F6',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'20px',padding:'4px 12px' }}>{w}</div>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex',gap:'10px' }}>
                  <button onClick={runCheckup}
                    style={{ flex:1,background:'#111',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'13px',color:'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer' }}>
                    ↺ Run Again
                  </button>
                  <button onClick={saveAll} disabled={saving}
                    style={{ flex:1,background:saved?'rgba(170,255,0,0.08)':'#AAFF00',color:saved?'#AAFF00':'#000',border:saved?'1px solid rgba(170,255,0,0.2)':'none',borderRadius:'14px',padding:'13px',fontSize:'13px',fontWeight:'800',cursor:'pointer',transition:'all 0.3s' }}>
                    {saving?'Saving...' : saved?'✓ Saved' : '💾 Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEPS TAB ── */}
        {tab === 'steps' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ background:'#111',border:`1px solid ${scoreColor}20`,borderRadius:'24px',padding:'28px 20px',marginBottom:'14px',textAlign:'center',position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:'-60px',right:'-60px',width:'200px',height:'200px',borderRadius:'50%',background:`radial-gradient(circle,${scoreColor}08,transparent)` }}/>
              <div style={{ fontSize:'11px',color:'#3A3A3A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'12px' }}>AUTO-COUNTED TODAY</div>
              <div style={{ fontSize:'72px',fontWeight:'900',color:scoreColor,letterSpacing:'-0.04em',lineHeight:1,marginBottom:'8px',textShadow:`0 0 40px ${scoreColor}40` }}>
                {steps.toLocaleString()}
              </div>
              <div style={{ fontSize:'13px',color:'#3A3A3A',marginBottom:'20px' }}>of {STEP_GOAL.toLocaleString()} step goal</div>
              <div style={{ position:'relative',width:'120px',height:'120px',margin:'0 auto 16px' }}>
                <svg width="120" height="120" style={{ transform:'rotate(-90deg)' }}>
                  <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={scoreColor}/><stop offset="100%" stopColor="#22C55E"/></linearGradient></defs>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="url(#sg)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*52}`}
                    strokeDashoffset={`${2*Math.PI*52*(1-progress.percentage/100)}`}
                    style={{ transition:'stroke-dashoffset 0.8s ease',filter:`drop-shadow(0 0 6px ${scoreColor}80)` }}/>
                </svg>
                <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
                  <div style={{ fontSize:'22px',fontWeight:'900',color:scoreColor }}>{progress.percentage}%</div>
                  <div style={{ fontSize:'9px',color:'#3A3A3A',fontWeight:'600' }}>GOAL</div>
                </div>
              </div>
              <div style={{ fontSize:'13px',color:'#A1A1AA',marginBottom:'16px' }}>{progress.message}</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px' }}>
                {[
                  { label:'Calories',value:`${calories}`,unit:'kcal',color:'#F97316',icon:'🔥' },
                  { label:'Distance',value:`${distance}`,unit:'km',color:'#3B82F6',icon:'📍' },
                  { label:'Active',value:`${activeMinutes}`,unit:'min',color:'#8B5CF6',icon:'⏱️' },
                ].map(s => (
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.03)',borderRadius:'14px',padding:'12px 8px',border:`1px solid ${s.color}15` }}>
                    <div style={{ fontSize:'18px',marginBottom:'4px' }}>{s.icon}</div>
                    <div style={{ fontSize:'16px',fontWeight:'800',color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:'9px',color:'#3A3A3A',fontWeight:'600',textTransform:'uppercase' }}>{s.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual add */}
            <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'18px',padding:'16px',marginBottom:'14px' }}>
              <div style={{ fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'12px' }}>📝 Add Steps Manually</div>
              <div style={{ display:'flex',gap:'8px' }}>
                {[500,1000,2500,5000,10000].map(n => (
                  <button key={n} onClick={() => {
                    const t = getAutoTracker()
                    t.addSteps(n)
                  }}
                    style={{ flex:1,background:'rgba(170,255,0,0.08)',border:'1px solid rgba(170,255,0,0.15)',borderRadius:'10px',padding:'10px 4px',color:'#AAFF00',fontSize:'11px',fontWeight:'700',cursor:'pointer' }}>
                    +{n>=1000?`${n/1000}k`:n}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={saveAll} disabled={saving}
              style={{ width:'100%',background:saved?'rgba(170,255,0,0.08)':'#AAFF00',color:saved?'#AAFF00':'#000',border:saved?'1px solid rgba(170,255,0,0.2)':'none',borderRadius:'16px',padding:'15px',fontSize:'15px',fontWeight:'800',cursor:'pointer',boxShadow:saved?'none':'0 0 24px rgba(170,255,0,0.3)',transition:'all 0.3s' }}>
              {saving?'Saving...' : saved?'✓ Saved to Health Records' : '💾 Save to Health Records'}
            </button>
          </div>
        )}

        {/* ── SENSORS TAB ── */}
        {tab === 'sensors' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'12px',animation:'fadeInUp 0.4s ease both' }}>
            {[
              { name:'Auto Step Counter',  icon:'👟', value:`${steps.toLocaleString()} steps`, status:'granted',        note:'Accelerometer pedometer — always running' },
              { name:'Heart Rate',         icon:'❤️', value:heartRate?`${heartRate} BPM`:'Not tracking',  status:sensorOn?'granted':'idle',   note:'Motion estimate — not medical grade' },
              { name:'GPS Location',       icon:'📍', value:location?`±${Math.round(location.accuracy)}m`:'Not available',  status:perms.location||'idle',  note:'Used for distance and route tracking' },
              { name:'Battery Status',     icon:'🔋', value:battery!==null?`${battery}% ${charging?'⚡':''}`:'Unknown',  status:perms.battery||'idle',   note:'Battery API' },
              { name:'Accelerometer',      icon:'📱', value:acc?`${acc.x},${acc.y},${acc.z}m/s²`:'Not tracking',  status:sensorOn?'granted':'idle',   note:'Used for step counting and activity detection' },
              { name:'Gyroscope',          icon:'🔄', value:gyro?`β${gyro.x}° γ${gyro.y}°`:'Not tracking',  status:sensorOn?'granted':'idle',   note:'Device orientation' },
              { name:'SpO2',               icon:'🩸', value:'Wearable needed',  status:'unavailable',  note:'Requires Apple Watch, Fitbit or similar' },
              { name:'Blood Pressure',     icon:'💉', value:'BP monitor needed', status:'unavailable',  note:'Requires Bluetooth BP cuff' },
              { name:'Body Temperature',   icon:'🌡️', value:'Thermometer needed',status:'unavailable',  note:'Cannot be measured by smartphone' },
            ].map(s => {
              const c = s.status==='granted'?'#22C55E':s.status==='denied'||s.status==='unavailable'?'#3A3A3A':s.status==='idle'?'#F97316':'#3B82F6'
              return (
                <div key={s.name} style={{ background:'#111',border:`1px solid ${c}15`,borderRadius:'16px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px' }}>
                  <span style={{ fontSize:'22px',flexShrink:0 }}>{s.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px',fontWeight:'600',color:'#fff' }}>{s.name}</div>
                    <div style={{ fontSize:'12px',color:'#3A3A3A',marginTop:'2px' }}>{s.note}</div>
                  </div>
                  <div style={{ textAlign:'right',flexShrink:0 }}>
                    <div style={{ fontSize:'12px',color:c,fontWeight:'700' }}>{s.value}</div>
                    <div style={{ fontSize:'9px',color:c,background:`${c}12`,padding:'2px 8px',borderRadius:'20px',marginTop:'3px',textTransform:'uppercase',fontWeight:'700' }}>
                      {s.status}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'18px',marginBottom:'14px' }}>
              <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'16px' }}>📊 Last 7 Days</div>
              {weeklyHistory.length === 0 ? (
                <div style={{ textAlign:'center',padding:'30px',color:'#3A3A3A' }}>
                  <div style={{ fontSize:'32px',marginBottom:'10px' }}>📈</div>
                  <div style={{ fontSize:'14px' }}>No history yet</div>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex',alignItems:'flex-end',gap:'8px',height:'120px',marginBottom:'16px' }}>
                    {weeklyHistory.slice().reverse().map((h,i) => {
                      const pct = Math.max((h.steps/weekMax)*100,2)
                      const isGoal = h.steps >= 10000
                      const day = new Date(h.date).toLocaleDateString('en',{weekday:'short'})
                      return (
                        <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end' }}>
                          <div style={{ fontSize:'9px',color:'#3A3A3A',fontWeight:'600' }}>{h.steps>=1000?`${(h.steps/1000).toFixed(1)}k`:h.steps}</div>
                          <div style={{ width:'100%',borderRadius:'6px 6px 0 0',background:isGoal?'#AAFF00':'rgba(170,255,0,0.3)',height:`${pct}%`,transition:'height 0.8s ease',boxShadow:isGoal?'0 0 8px rgba(170,255,0,0.4)':'none' }}/>
                          <div style={{ fontSize:'9px',color:'#3A3A3A',fontWeight:'600' }}>{day}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px' }}>
                    {[
                      { label:'Total Steps',  value:weeklyHistory.reduce((s,h)=>s+h.steps,0).toLocaleString(), color:'#AAFF00' },
                      { label:'Daily Average',value:Math.round(weeklyHistory.reduce((s,h)=>s+h.steps,0)/Math.max(weeklyHistory.length,1)).toLocaleString(), color:'#3B82F6' },
                      { label:'Best Day',     value:Math.max(...weeklyHistory.map(h=>h.steps),0).toLocaleString(), color:'#F97316' },
                      { label:'Goals Hit',    value:`${weeklyHistory.filter(h=>h.steps>=10000).length}/${weeklyHistory.length}`, color:'#22C55E' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#0D0D0D',borderRadius:'12px',padding:'12px',textAlign:'center' }}>
                        <div style={{ fontSize:'18px',fontWeight:'800',color:s.color }}>{s.value}</div>
                        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600',marginTop:'2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={loadWeeklyHistory}
              style={{ width:'100%',background:'#111',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'13px',color:'#fff',fontSize:'14px',fontWeight:'600',cursor:'pointer' }}>
              ↺ Refresh
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',zIndex:100,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 24px 28px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/health',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,label:'Health'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
            {href:'/health-live',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,label:'Live'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:n.href==='/health-live'?'#AAFF00':'#3A3A3A',fontWeight:n.href==='/health-live'?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
