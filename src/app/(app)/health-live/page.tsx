'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStepService } from '@/lib/stepService'
import { estimateCalories, estimateDistance, estimateHR, detectActivity, getInsights, getStepGoalProgress, type HealthSensorData, type HealthInsight } from '@/lib/healthSensors'

const STEP_GOAL = 10000

export default function HealthLivePage() {
  const [steps, setSteps] = useState(0)
  const [calories, setCalories] = useState(0)
  const [distance, setDistance] = useState(0)
  const [heartRate, setHeartRate] = useState(72)
  const [activeMinutes, setActiveMinutes] = useState(0)
  const [activity, setActivity] = useState('unknown')
  const [battery, setBattery] = useState<number|null>(null)
  const [charging, setCharging] = useState<boolean|null>(null)
  const [gyro, setGyro] = useState<{x:number,y:number,z:number}|null>(null)
  const [acc, setAcc] = useState<{x:number,y:number,z:number}|null>(null)
  const [location, setLocation] = useState<{lat:number,lng:number}|null>(null)
  const [perms, setPerms] = useState<Record<string,string>>({})
  const [tracking, setTracking] = useState(false)
  const [tab, setTab] = useState('steps')
  const [insights, setInsights] = useState<HealthInsight[]>([])
  const [weeklyHistory, setWeeklyHistory] = useState<{date:string,steps:number}[]>([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sensorStatus, setSensorStatus] = useState<'idle'|'starting'|'active'|'denied'|'unavailable'>('idle')
  const activeRef = useRef(0)
  const activeTimer = useRef<ReturnType<typeof setInterval>|undefined>(undefined)
  const stepService = getStepService()
  const supabase = createClient()

  // Load today's steps from service on mount
  useEffect(() => {
    const unsub = stepService.subscribe(s => {
      setSteps(s)
      setCalories(estimateCalories(s, activeRef.current))
      setDistance(estimateDistance(s))
    })
    loadWeeklyHistory()
    initBattery()
    return () => unsub()
  }, [])

  // Update insights when data changes
  useEffect(() => {
    const data: Partial<HealthSensorData> = {
      steps, heartRate, calories, activeMinutes, distance,
      batteryLevel: battery, isCharging: charging,
      accelerometer: acc, gyroscope: gyro, location,
      timestamp: new Date(),
    }
    setInsights(getInsights(data))
  }, [steps, heartRate, calories, activeMinutes, battery, charging])

  const loadWeeklyHistory = async () => {
    const history = await stepService.getWeeklyHistory()
    setWeeklyHistory(history)
  }

  const initBattery = async () => {
    try {
      const nav = navigator as any
      if (nav.getBattery) {
        const b = await nav.getBattery()
        setBattery(Math.round(b.level * 100))
        setCharging(b.charging)
        b.addEventListener('levelchange', () => setBattery(Math.round(b.level * 100)))
        b.addEventListener('chargingchange', () => setCharging(b.charging))
        setPerms(p => ({ ...p, battery: 'granted' }))
      }
    } catch { setPerms(p => ({ ...p, battery: 'denied' })) }
  }

  const initLocation = useCallback(() => {
    if (!navigator.geolocation) { setPerms(p => ({ ...p, location: 'unavailable' })); return }
    navigator.geolocation.watchPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPerms(p => ({ ...p, location: 'granted' }))
      },
      () => setPerms(p => ({ ...p, location: 'denied' })),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }, [])

  const initGyro = useCallback(() => {
    window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
      setGyro({
        x: parseFloat((e.beta || 0).toFixed(1)),
        y: parseFloat((e.gamma || 0).toFixed(1)),
        z: parseFloat((e.alpha || 0).toFixed(1)),
      })
      setPerms(p => ({ ...p, gyro: 'granted' }))
    })
  }, [])

  const initMotion = useCallback(() => {
    window.addEventListener('devicemotion', (e: DeviceMotionEvent) => {
      const a = e.acceleration || e.accelerationIncludingGravity
      if (!a) return
      const ax = a.x || 0, ay = a.y || 0, az = a.z || 0
      setAcc({ x: parseFloat(ax.toFixed(2)), y: parseFloat(ay.toFixed(2)), z: parseFloat(az.toFixed(2)) })
      setHeartRate(estimateHR(Math.sqrt(ax*ax+ay*ay+az*az)))
      setActivity(detectActivity({ x: ax, y: ay, z: az }))
      setPerms(p => ({ ...p, motion: 'granted' }))
    })
  }, [])

  const startTracking = async () => {
    setSensorStatus('starting')
    const result = await stepService.start()

    if (result === 'denied') {
      setSensorStatus('denied')
      setPerms(p => ({ ...p, motion: 'denied' }))
      return
    }
    if (result === 'unavailable') {
      setSensorStatus('unavailable')
      setPerms(p => ({ ...p, motion: 'unavailable' }))
      return
    }

    setSensorStatus('active')
    setTracking(true)
    setPerms(p => ({ ...p, motion: 'granted' }))

    initLocation()
    initGyro()
    initMotion()

    // Active minutes counter
    activeTimer.current = setInterval(() => {
      activeRef.current += 1
      setActiveMinutes(activeRef.current)
    }, 60000)
  }

  const stopTracking = () => {
    stepService.stop()
    setTracking(false)
    setSensorStatus('idle')
    if (activeTimer.current) clearInterval(activeTimer.current)
  }

  const saveData = async () => {
    setSaving(true)
    await stepService.syncToDatabase()
    await loadWeeklyHistory()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const progress = getStepGoalProgress(steps)
  const scoreColor = steps >= 10000 ? '#AAFF00' : steps >= 5000 ? '#F97316' : steps >= 2000 ? '#3B82F6' : '#3A3A3A'

  const insightColors = { success:'#AAFF00', warning:'#F97316', critical:'#EF4444', info:'#3B82F6' }

  const weekMax = Math.max(...weeklyHistory.map(h => h.steps), 1)

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>Live Health</div>
              <div style={{ fontSize:'10px', color:tracking?'#AAFF00':'#3A3A3A', fontWeight:'700', letterSpacing:'0.1em' }}>
                {tracking ? '● TRACKING ACTIVE' : '○ SENSORS READY'}
              </div>
            </div>
          </div>
          <button onClick={tracking ? stopTracking : startTracking}
            style={{ background:tracking?'rgba(239,68,68,0.1)':'rgba(170,255,0,0.1)', border:`1px solid ${tracking?'rgba(239,68,68,0.3)':'rgba(170,255,0,0.3)'}`, borderRadius:'20px', padding:'8px 18px', color:tracking?'#EF4444':'#AAFF00', fontSize:'13px', fontWeight:'800', cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'6px' }}>
            {sensorStatus === 'starting' ? (
              <><div style={{ width:'12px', height:'12px', border:'2px solid rgba(170,255,0,0.3)', borderTop:'2px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Starting</>
            ) : tracking ? '⏹ Stop' : '▶ Start'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px' }}>
          {['steps','sensors','insights','history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:'8px 4px', borderRadius:'8px', border:'none', background:tab===t?'#AAFF00':'transparent', color:tab===t?'#000':'#3A3A3A', fontSize:'11px', fontWeight:'700', cursor:'pointer', textTransform:'capitalize', transition:'all 0.2s' }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor denied / unavailable banners */}
      {sensorStatus === 'denied' && (
        <div style={{ margin:'16px 20px 0', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'14px', padding:'14px 16px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
          <span style={{ fontSize:'20px' }}>🚫</span>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#EF4444', marginBottom:'4px' }}>Motion Permission Denied</div>
            <div style={{ fontSize:'12px', color:'#A1A1AA', lineHeight:'1.5' }}>On iPhone: go to Settings → Safari → Motion & Orientation Access → Allow. On Android: use Chrome and allow when prompted.</div>
          </div>
        </div>
      )}
      {sensorStatus === 'unavailable' && (
        <div style={{ margin:'16px 20px 0', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:'14px', padding:'14px 16px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
          <span style={{ fontSize:'20px' }}>⚠️</span>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#EAB308', marginBottom:'4px' }}>Accelerometer Not Available</div>
            <div style={{ fontSize:'12px', color:'#A1A1AA', lineHeight:'1.5' }}>Step counting requires a device with motion sensors. Open this app on your phone for automatic step detection. You can manually log steps below.</div>
          </div>
        </div>
      )}

      <div style={{ padding:'16px 20px' }}>

        {/* ── STEPS TAB ── */}
        {tab === 'steps' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>

            {/* Big step counter */}
            <div style={{ background:'#111', border:`1px solid ${scoreColor}20`, borderRadius:'24px', padding:'28px 20px', marginBottom:'14px', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'200px', height:'200px', borderRadius:'50%', background:`radial-gradient(circle,${scoreColor}08,transparent)` }}/>

              <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'12px' }}>TODAY'S STEPS</div>

              <div style={{ fontSize:'72px', fontWeight:'900', color:scoreColor, letterSpacing:'-0.04em', lineHeight:1, marginBottom:'8px', textShadow:`0 0 40px ${scoreColor}40` }}>
                {steps.toLocaleString()}
              </div>

              <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'20px' }}>of {STEP_GOAL.toLocaleString()} step goal</div>

              {/* Progress ring */}
              <div style={{ position:'relative', width:'120px', height:'120px', margin:'0 auto 16px' }}>
                <svg width="120" height="120" style={{ transform:'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="stepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={scoreColor}/>
                      <stop offset="100%" stopColor="#22C55E"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke={`url(#stepGrad)`} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*52}`}
                    strokeDashoffset={`${2*Math.PI*52*(1-progress.percentage/100)}`}
                    style={{ transition:'stroke-dashoffset 0.8s ease', filter:`drop-shadow(0 0 6px ${scoreColor}80)` }}/>
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:'22px', fontWeight:'900', color:scoreColor }}>{progress.percentage}%</div>
                  <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600' }}>COMPLETE</div>
                </div>
              </div>

              <div style={{ fontSize:'13px', color:'#A1A1AA', lineHeight:'1.5', marginBottom:'16px' }}>{progress.message}</div>

              {/* Quick stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
                {[
                  { label:'Calories', value:`${calories}`, unit:'kcal', color:'#F97316', icon:'🔥' },
                  { label:'Distance', value:`${distance}`, unit:'km', color:'#3B82F6', icon:'📍' },
                  { label:'Active', value:`${activeMinutes}`, unit:'min', color:'#8B5CF6', icon:'⏱️' },
                ].map(s => (
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'14px', padding:'12px 8px', border:`1px solid ${s.color}15` }}>
                    <div style={{ fontSize:'18px', marginBottom:'4px' }}>{s.icon}</div>
                    <div style={{ fontSize:'16px', fontWeight:'800', color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase' }}>{s.unit}</div>
                    <div style={{ fontSize:'9px', color:'#3A3A3A', marginTop:'1px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status card */}
            {!tracking && sensorStatus === 'idle' && (
              <div style={{ background:'rgba(170,255,0,0.04)', border:'1px solid rgba(170,255,0,0.12)', borderRadius:'20px', padding:'20px', marginBottom:'14px', textAlign:'center' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>📱</div>
                <div style={{ fontSize:'16px', fontWeight:'700', color:'#fff', marginBottom:'6px' }}>Start Auto Step Counting</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A', lineHeight:'1.6', marginBottom:'16px' }}>
                  Uses your phone's accelerometer to automatically detect steps as you walk. Works best on mobile devices.
                </div>
                <button onClick={startTracking}
                  style={{ background:'#AAFF00', color:'#000', border:'none', borderRadius:'14px', padding:'13px 28px', fontSize:'15px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 24px rgba(170,255,0,0.4)' }}>
                  Start Tracking Steps
                </button>
              </div>
            )}

            {/* Manual step input when no sensor */}
            {sensorStatus === 'unavailable' && (
              <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'14px' }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>📝 Log Steps Manually</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[1000, 2500, 5000, 7500, 10000].map(n => (
                    <button key={n} onClick={async () => {
                      stepService.addSteps(n)
                      await stepService.syncToDatabase()
                    }}
                      style={{ flex:1, background:'rgba(170,255,0,0.08)', border:'1px solid rgba(170,255,0,0.15)', borderRadius:'10px', padding:'10px 4px', color:'#AAFF00', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
                      +{n >= 1000 ? `${n/1000}k` : n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            <button onClick={saveData} disabled={saving}
              style={{ width:'100%', background:saved?'rgba(170,255,0,0.08)':'#AAFF00', color:saved?'#AAFF00':'#000', border:saved?'1px solid rgba(170,255,0,0.2)':'none', borderRadius:'16px', padding:'15px', fontSize:'15px', fontWeight:'800', cursor:'pointer', boxShadow:saved?'none':'0 0 24px rgba(170,255,0,0.3)', transition:'all 0.3s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              {saving ? (<><div style={{ width:'14px', height:'14px', border:'2px solid rgba(0,0,0,0.3)', borderTop:'2px solid #000', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>Saving...</>) : saved ? '✓ Saved to Health Records' : '💾 Save to Health Records'}
            </button>
          </div>
        )}

        {/* ── SENSORS TAB ── */}
        {tab === 'sensors' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', animation:'fadeInUp 0.4s ease both' }}>

            {/* Activity */}
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>Current Activity</div>
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ fontSize:'48px' }}>
                  {activity==='vigorous'?'🏃':activity==='moderate'?'🚶':activity==='light'?'🦶':'🪑'}
                </div>
                <div>
                  <div style={{ fontSize:'22px', fontWeight:'800', color:'#AAFF00', textTransform:'capitalize' }}>{activity}</div>
                  <div style={{ fontSize:'13px', color:'#3A3A3A', marginTop:'2px' }}>
                    {activity==='vigorous'?'High intensity movement detected':activity==='moderate'?'Active movement detected':activity==='light'?'Light movement detected':'No significant movement'}
                  </div>
                </div>
              </div>
            </div>

            {/* Heart rate */}
            <div style={{ background:'#111', border:'1px solid rgba(239,68,68,0.15)', borderRadius:'20px', padding:'18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff' }}>❤️ Heart Rate</div>
                <div style={{ fontSize:'10px', color:'#3A3A3A', background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:'20px' }}>Estimated from motion</div>
              </div>
              <div style={{ fontSize:'48px', fontWeight:'900', color:'#EF4444', lineHeight:1 }}>{heartRate}</div>
              <div style={{ fontSize:'12px', color:'#3A3A3A', marginTop:'4px' }}>BPM • {heartRate < 60 ? 'Resting' : heartRate < 85 ? 'Normal' : heartRate < 100 ? 'Elevated' : 'High'}</div>
              <div style={{ fontSize:'11px', color:'#52525B', marginTop:'8px', background:'rgba(255,255,255,0.03)', padding:'8px 12px', borderRadius:'10px' }}>
                ⚠️ Estimated value based on movement intensity. For accurate heart rate, use a heart rate monitor or wearable device.
              </div>
            </div>

            {/* Sensor status grid */}
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>Sensor Status</div>
              {[
                { name:'Step Counter', key:'motion', icon:'👟', desc:tracking?`${steps.toLocaleString()} steps counted`:'Tap Start to begin', real:'Accelerometer-based pedometer' },
                { name:'GPS Location', key:'location', icon:'📍', desc:location?`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`:'Not tracking', real:'Device GPS' },
                { name:'Battery', key:'battery', icon:'🔋', desc:battery!==null?`${battery}% ${charging?'⚡ Charging':''}`:'Unknown', real:'Battery API' },
                { name:'Gyroscope', key:'gyro', icon:'🔄', desc:gyro?`β${gyro.x}° γ${gyro.y}°`:'Not available', real:'Device orientation' },
              ].map(s => {
                const st = perms[s.key]
                const c = st==='granted'?'#AAFF00':st==='denied'||st==='unavailable'?'#EF4444':'#3A3A3A'
                return (
                  <div key={s.key} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'#0D0D0D', borderRadius:'12px', marginBottom:'8px', border:`1px solid ${c}12` }}>
                    <div style={{ fontSize:'22px' }}>{s.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff' }}>{s.name}</div>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'1px' }}>{s.desc}</div>
                      <div style={{ fontSize:'10px', color:'#2A2A2A', marginTop:'1px' }}>Source: {s.real}</div>
                    </div>
                    <div style={{ fontSize:'10px', fontWeight:'700', color:c, background:`${c}12`, padding:'3px 8px', borderRadius:'20px', textTransform:'uppercase', flexShrink:0 }}>
                      {st || 'pending'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Raw sensor data */}
            {(acc || gyro) && (
              <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px' }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>Raw Sensor Data</div>
                {acc && (
                  <div style={{ marginBottom:'12px' }}>
                    <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'700', marginBottom:'8px', letterSpacing:'0.06em' }}>ACCELEROMETER m/s²</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                      {(['x','y','z'] as const).map(a => (
                        <div key={a} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                          <div style={{ fontSize:'16px', fontWeight:'800', color:'#AAFF00' }}>{acc[a]}</div>
                          <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase' }}>{a}-axis</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {gyro && (
                  <div>
                    <div style={{ fontSize:'11px', color:'#3B82F6', fontWeight:'700', marginBottom:'8px', letterSpacing:'0.06em' }}>GYROSCOPE degrees</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                      {(['x','y','z'] as const).map(a => (
                        <div key={a} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                          <div style={{ fontSize:'16px', fontWeight:'800', color:'#3B82F6' }}>{gyro[a]}°</div>
                          <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase' }}>{a}-axis</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {tab === 'insights' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'600', marginBottom:'4px' }}>{insights.length} personalized insights</div>
            {insights.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>🧠</div>
                <div style={{ fontSize:'16px', fontWeight:'600', color:'#fff', marginBottom:'8px' }}>No insights yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A' }}>Start tracking to generate personalized health insights</div>
              </div>
            ) : insights.map((ins, i) => {
              const c = insightColors[ins.type]
              return (
                <div key={i} style={{ background:'#111', border:`1px solid ${c}18`, borderRadius:'20px', padding:'18px', animation:`fadeInUp 0.5s ease ${i*0.1}s both` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${c}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
                        {ins.type==='success' ? <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/> : <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>}
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>{ins.title}</div>
                      <div style={{ fontSize:'10px', color:c, fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>{ins.type}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:'13px', color:'#A1A1AA', lineHeight:'1.6', marginBottom:'10px' }}>{ins.message}</div>
                  <div style={{ background:`${c}08`, border:`1px solid ${c}15`, borderRadius:'12px', padding:'10px 14px' }}>
                    <div style={{ fontSize:'11px', color:c, fontWeight:'700', marginBottom:'4px', letterSpacing:'0.06em' }}>RECOMMENDATION</div>
                    <div style={{ fontSize:'13px', color:'#fff', lineHeight:'1.6' }}>{ins.recommendation}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'14px' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'16px' }}>📊 Last 7 Days</div>

              {weeklyHistory.length === 0 ? (
                <div style={{ textAlign:'center', padding:'30px', color:'#3A3A3A' }}>
                  <div style={{ fontSize:'32px', marginBottom:'10px' }}>📈</div>
                  <div style={{ fontSize:'14px' }}>No history yet. Start tracking to see your progress!</div>
                </div>
              ) : (
                <>
                  {/* Bar chart */}
                  <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'120px', marginBottom:'16px' }}>
                    {weeklyHistory.slice().reverse().map((h, i) => {
                      const pct = Math.max((h.steps / weekMax) * 100, 2)
                      const isGoal = h.steps >= 10000
                      const day = new Date(h.date).toLocaleDateString('en', { weekday: 'short' })
                      return (
                        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}>
                          <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600' }}>{h.steps >= 1000 ? `${(h.steps/1000).toFixed(1)}k` : h.steps}</div>
                          <div style={{ width:'100%', borderRadius:'6px 6px 0 0', background:isGoal?'#AAFF00':'rgba(170,255,0,0.3)', height:`${pct}%`, transition:'height 0.8s ease', boxShadow:isGoal?'0 0 8px rgba(170,255,0,0.4)':'none' }}/>
                          <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600' }}>{day}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Weekly stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px' }}>
                    {[
                      { label:'Total Steps', value:weeklyHistory.reduce((s,h)=>s+h.steps,0).toLocaleString(), color:'#AAFF00' },
                      { label:'Daily Average', value:Math.round(weeklyHistory.reduce((s,h)=>s+h.steps,0)/Math.max(weeklyHistory.length,1)).toLocaleString(), color:'#3B82F6' },
                      { label:'Best Day', value:Math.max(...weeklyHistory.map(h=>h.steps),0).toLocaleString(), color:'#F97316' },
                      { label:'Goals Hit', value:`${weeklyHistory.filter(h=>h.steps>=10000).length}/${weeklyHistory.length}`, color:'#22C55E' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                        <div style={{ fontSize:'18px', fontWeight:'800', color:s.color }}>{s.value}</div>
                        <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={loadWeeklyHistory}
              style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'13px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>
              ↺ Refresh History
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/health',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,label:'Health'},
          ].map(n => (
            <a key={n.href} href={n.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'-18px', flexShrink:0, textDecoration:'none', boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
            {href:'/health-live',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,label:'Live'},
          ].map(n => (
            <a key={n.href} href={n.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px', color:n.href==='/health-live'?'#AAFF00':'#3A3A3A', fontWeight:n.href==='/health-live'?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}