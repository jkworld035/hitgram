'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface HealthLog {
  id?: string
  user_id?: string
  log_date: string
  weight_kg: number | null
  water_ml: number
  sleep_minutes: number
  calories_consumed: number
  steps: number
  mood: number
  heart_rate?: number | null
  systolic_bp?: number | null
  diastolic_bp?: number | null
  spo2?: number | null
  stress_level?: number | null
  active_calories?: number | null
  distance_km?: number | null
}

interface AutoDetectResult {
  steps?: number
  distance_km?: number
  active_calories?: number
  heart_rate?: number
  sleep_minutes?: number
  spo2?: number
}

// ─── Auto Health Detection Hook ───────────────────────────────────────────────
function useAutoDetect(onDetect: (data: AutoDetectResult) => void) {
  const [detecting, setDetecting] = useState(false)
  const [detectedSources, setDetectedSources] = useState<string[]>([])
  const pedometerRef = useRef<any>(null)
  const heartRef = useRef<any>(null)

  const detectDeviceMotion = useCallback(() => {
    if (!('DeviceMotionEvent' in window)) return false
    return true
  }, [])

  // Step counting via accelerometer
  const startPedometer = useCallback(() => {
    if (!detectDeviceMotion()) return
    let stepCount = 0
    let lastMag = 0
    let threshold = 12
    let lastStep = 0

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc) return
      const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2)
      const now = Date.now()
      if (mag > threshold && lastMag <= threshold && now - lastStep > 300) {
        stepCount++
        lastStep = now
        if (stepCount % 10 === 0) {
          onDetect({ steps: stepCount, distance_km: stepCount * 0.000762 })
        }
      }
      lastMag = mag
    }

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      ;(DeviceMotionEvent as any).requestPermission().then((res: string) => {
        if (res === 'granted') {
          window.addEventListener('devicemotion', handleMotion)
          pedometerRef.current = () => window.removeEventListener('devicemotion', handleMotion)
          setDetectedSources(p => [...new Set([...p, 'Motion Sensor'])])
        }
      })
    } else {
      window.addEventListener('devicemotion', handleMotion)
      pedometerRef.current = () => window.removeEventListener('devicemotion', handleMotion)
      setDetectedSources(p => [...new Set([...p, 'Motion Sensor'])])
    }
  }, [detectDeviceMotion, onDetect])

  // Heart rate via camera (if supported)
  const detectHeartRate = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', frameRate: { ideal: 60 } }
      })
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()
      const canvas = document.createElement('canvas')
      canvas.width = 1; canvas.height = 1
      const ctx = canvas.getContext('2d')!
      const samples: number[] = []
      const interval = setInterval(() => {
        ctx.drawImage(video, 0, 0, 1, 1)
        const [r] = ctx.getImageData(0, 0, 1, 1).data
        samples.push(r)
        if (samples.length >= 180) {
          clearInterval(interval)
          stream.getTracks().forEach(t => t.stop())
          // Simple peak detection for BPM
          let peaks = 0
          for (let i = 1; i < samples.length - 1; i++) {
            if (samples[i] > samples[i-1] && samples[i] > samples[i+1] && samples[i] > 100) peaks++
          }
          const bpm = Math.round((peaks / 3) * 60)
          if (bpm > 40 && bpm < 200) {
            onDetect({ heart_rate: bpm })
            setDetectedSources(p => [...new Set([...p, 'Camera (PPG)'])])
          }
        }
      }, 33)
      heartRef.current = () => { clearInterval(interval); stream.getTracks().forEach(t => t.stop()) }
    } catch { /* no camera permission */ }
  }, [onDetect])

  // Ambient light / screen for stress proxy
  const detectFromBattery = useCallback(async () => {
    try {
      const battery = await (navigator as any).getBattery?.()
      if (battery) {
        // Use charging state + level as activity proxy
        const activeCalEstimate = battery.charging ? 0 : Math.round((1 - battery.level) * 200)
        if (activeCalEstimate > 0) onDetect({ active_calories: activeCalEstimate })
        setDetectedSources(p => [...new Set([...p, 'Battery API'])])
      }
    } catch { /* not available */ }
  }, [onDetect])

  // Web Bluetooth for supported devices
  const detectBluetooth = useCallback(async () => {
    if (!('bluetooth' in navigator)) return
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['health_thermometer', 'blood_pressure', 'pulse_oximeter']
      })
      const server = await device.gatt.connect()
      const service = await server.getPrimaryService('heart_rate')
      const char = await service.getCharacteristic('heart_rate_measurement')
      char.startNotifications()
      char.addEventListener('characteristicvaluechanged', (e: any) => {
        const hr = e.target.value.getUint8(1)
        onDetect({ heart_rate: hr })
        setDetectedSources(p => [...new Set([...p, `BLE: ${device.name || 'Device'}`])])
      })
    } catch { /* user cancelled or not available */ }
  }, [onDetect])

  const startDetection = useCallback(async () => {
    setDetecting(true)
    setDetectedSources([])
    startPedometer()
    await detectHeartRate()
    await detectFromBattery()
  }, [startPedometer, detectHeartRate, detectFromBattery])

  const stopDetection = useCallback(() => {
    setDetecting(false)
    pedometerRef.current?.()
    heartRef.current?.()
  }, [])

  const connectBluetooth = useCallback(() => detectBluetooth(), [detectBluetooth])

  useEffect(() => () => stopDetection(), [stopDetection])

  return { detecting, detectedSources, startDetection, stopDetection, connectBluetooth }
}

// ─── Health Score Calculator ───────────────────────────────────────────────────
function calcHealthScore(log: Partial<HealthLog>): { score: number; breakdown: Record<string, number>; status: string } {
  const breakdown: Record<string, number> = {}
  breakdown.sleep = Math.min(100, ((log.sleep_minutes || 0) / 480) * 100)
  breakdown.steps = Math.min(100, ((log.steps || 0) / 10000) * 100)
  breakdown.water = Math.min(100, ((log.water_ml || 0) / 2500) * 100)
  breakdown.mood = ((log.mood || 3) / 5) * 100
  const hr = log.heart_rate
  breakdown.heartRate = hr ? (hr >= 60 && hr <= 100 ? 100 : hr < 60 ? Math.max(0, 100 - (60 - hr) * 5) : Math.max(0, 100 - (hr - 100) * 2)) : 50
  const spo2 = log.spo2
  breakdown.spo2 = spo2 ? (spo2 >= 95 ? 100 : Math.max(0, (spo2 - 85) * 10)) : 50
  const weights = { sleep: 0.25, steps: 0.2, water: 0.2, mood: 0.15, heartRate: 0.1, spo2: 0.1 }
  const score = Math.round(Object.entries(breakdown).reduce((a, [k, v]) => a + v * (weights as any)[k], 0))
  const status = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work'
  return { score, breakdown, status }
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
const NAV = () => (
  <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(5,5,8,0.98)', backdropFilter:'blur(28px)', borderTop:'1px solid rgba(255,255,255,0.04)', padding:'10px 24px 28px' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      {[
        { href:'/dashboard', label:'Home', icon:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
        { href:'/social', label:'Social', icon:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></> },
      ].map(n => (
        <a key={n.label} href={n.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#383838" strokeWidth="2">{n.icon}</svg>
          <span style={{ fontSize:'10px', color:'#383838', fontWeight:'700', letterSpacing:'0.04em' }}>{n.label}</span>
        </a>
      ))}
      <a href="/create-post" style={{ width:'54px', height:'54px', borderRadius:'50%', background:'linear-gradient(135deg,#00FFA3,#00C6FF)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'-20px', flexShrink:0, textDecoration:'none', boxShadow:'0 0 32px rgba(0,255,163,0.4)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
      </a>
      {[
        { href:'/goals', label:'Goals', icon:<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> },
        { href:'/profile', label:'Profile', icon:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></> },
      ].map(n => (
        <a key={n.label} href={n.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#383838" strokeWidth="2">{n.icon}</svg>
          <span style={{ fontSize:'10px', color:'#383838', fontWeight:'700', letterSpacing:'0.04em' }}>{n.label}</span>
        </a>
      ))}
    </div>
  </div>
)

const ScoreRing = ({ score, status }: { score: number; status: string }) => {
  const r = 52, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 85 ? '#00FFA3' : score >= 70 ? '#00C6FF' : score >= 50 ? '#FFB800' : '#FF4D4D'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color}/>
            <stop offset="100%" stopColor={color + '88'}/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10"/>
        <circle cx="65" cy="65" r={r} fill="none" stroke="url(#sg)" strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          strokeDashoffset={circ * 0.25} filter="url(#glow)"
          style={{ transition:'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}/>
        <text x="65" y="60" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="900" fontFamily="system-ui">{score}</text>
        <text x="65" y="78" textAnchor="middle" fill={color} fontSize="10" fontWeight="700" fontFamily="system-ui" letterSpacing="1">{status.toUpperCase()}</text>
      </svg>
    </div>
  )
}

const Pulse = ({ active }: { active: boolean }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}>
    <span style={{
      width:8, height:8, borderRadius:'50%', background: active ? '#00FFA3' : '#383838',
      boxShadow: active ? '0 0 12px #00FFA3' : 'none',
      animation: active ? 'pulse-dot 1.2s infinite' : 'none',
      display:'inline-block'
    }}/>
  </span>
)

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HealthPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const moods = ['😞','😕','😐','🙂','😄']
  const moodLabels = ['Bad','Poor','Okay','Good','Great']

  const [log, setLog] = useState<HealthLog>({
    log_date: today,
    weight_kg: null, water_ml: 0, sleep_minutes: 0, calories_consumed: 0,
    steps: 0, mood: 3, heart_rate: null, systolic_bp: null, diastolic_bp: null,
    spo2: null, stress_level: null, active_calories: null, distance_km: null
  })
  const [history, setHistory] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'log'|'insights'|'history'>('log')
  const [detectFlash, setDetectFlash] = useState<string[]>([])
  const [expandedSection, setExpandedSection] = useState<string|null>('vitals')

  const handleAutoDetect = useCallback((data: AutoDetectResult) => {
    setLog(prev => ({
      ...prev,
      steps: data.steps !== undefined ? Math.max(prev.steps || 0, data.steps) : prev.steps,
      distance_km: data.distance_km !== undefined ? data.distance_km : prev.distance_km,
      active_calories: data.active_calories !== undefined ? data.active_calories : prev.active_calories,
      heart_rate: data.heart_rate !== undefined ? data.heart_rate : prev.heart_rate,
      sleep_minutes: data.sleep_minutes !== undefined ? data.sleep_minutes : prev.sleep_minutes,
      spo2: data.spo2 !== undefined ? data.spo2 : prev.spo2,
    }))
    const keys = Object.keys(data).filter(k => data[k as keyof AutoDetectResult] !== undefined)
    setDetectFlash(keys)
    setTimeout(() => setDetectFlash([]), 3000)
  }, [])

  const { detecting, detectedSources, startDetection, stopDetection, connectBluetooth } =
    useAutoDetect(handleAutoDetect)

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('health_logs').select('*')
      .eq('user_id', user.id).order('log_date', { ascending: false }).limit(14)
    if (data) setHistory(data)
  }

  const save = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    await supabase.from('health_logs').upsert({
      user_id: user.id,
      log_date: today,
      weight_kg: log.weight_kg,
      water_ml: log.water_ml || 0,
      sleep_minutes: log.sleep_minutes || 0,
      calories_consumed: log.calories_consumed || 0,
      steps: log.steps || 0,
      mood: log.mood,
      heart_rate: log.heart_rate,
      systolic_bp: log.systolic_bp,
      diastolic_bp: log.diastolic_bp,
      spo2: log.spo2,
      stress_level: log.stress_level,
      active_calories: log.active_calories,
      distance_km: log.distance_km,
    }, { onConflict: 'user_id,log_date' })
    setSaved(true); setLoading(false); fetchHistory()
    setTimeout(() => setSaved(false), 3000)
  }

  const { score, breakdown, status } = calcHealthScore(log)

  // Trend analysis
  const trend = (key: keyof HealthLog) => {
    if (history.length < 2) return null
    const a = Number(history[0][key] || 0)
    const b = Number(history[1][key] || 0)
    if (b === 0) return null
    const pct = ((a - b) / b) * 100
    return pct
  }

  const TrendBadge = ({ pct, invert = false }: { pct: number | null; invert?: boolean }) => {
    if (pct === null) return null
    const good = invert ? pct < 0 : pct > 0
    return (
      <span style={{ fontSize:'10px', fontWeight:'700', color: good ? '#00FFA3' : '#FF4D4D', background: good ? 'rgba(0,255,163,0.1)' : 'rgba(255,77,77,0.1)', borderRadius:'6px', padding:'2px 6px' }}>
        {pct > 0 ? '↑' : '↓'}{Math.abs(pct).toFixed(1)}%
      </span>
    )
  }

  const sections = [
    {
      id: 'vitals',
      label: '⚡ Core Vitals',
      fields: [
        { key:'weight_kg', label:'Weight', unit:'kg', ph:'72.5', icon:'⚖️', color:'#00FFA3', type:'number', step:'0.1' },
        { key:'water_ml', label:'Water', unit:'ml', ph:'2000', icon:'💧', color:'#00C6FF', type:'number' },
        { key:'sleep_minutes', label:'Sleep', unit:'min', ph:'480', icon:'🌙', color:'#A855F7', type:'number' },
        { key:'calories_consumed', label:'Calories', unit:'kcal', ph:'2000', icon:'🔥', color:'#FF6B35', type:'number' },
        { key:'steps', label:'Steps', unit:'', ph:'8000', icon:'👟', color:'#22C55E', type:'number' },
      ]
    },
    {
      id: 'clinical',
      label: '🩺 Clinical Metrics',
      fields: [
        { key:'heart_rate', label:'Heart Rate', unit:'bpm', ph:'72', icon:'❤️', color:'#FF4D4D', type:'number' },
        { key:'spo2', label:'SpO₂', unit:'%', ph:'98', icon:'🫁', color:'#60A5FA', type:'number' },
        { key:'systolic_bp', label:'Systolic BP', unit:'mmHg', ph:'120', icon:'🩸', color:'#F472B6', type:'number' },
        { key:'diastolic_bp', label:'Diastolic BP', unit:'mmHg', ph:'80', icon:'🩸', color:'#FB923C', type:'number' },
        { key:'stress_level', label:'Stress Level', unit:'/10', ph:'3', icon:'🧠', color:'#FBBF24', type:'number', max:10 },
      ]
    },
    {
      id: 'activity',
      label: '🏃 Activity',
      fields: [
        { key:'active_calories', label:'Active Cal.', unit:'kcal', ph:'350', icon:'⚡', color:'#F59E0B', type:'number' },
        { key:'distance_km', label:'Distance', unit:'km', ph:'5.2', icon:'📍', color:'#34D399', type:'number', step:'0.1' },
      ]
    }
  ]

  const inp = (color: string) => ({
    width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
    borderRadius:'10px', padding:'10px 12px', color:'#fff', fontSize:'14px', fontWeight:'500',
    outline:'none', fontFamily:'inherit', transition:'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties)

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
        @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.5} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:none} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(0,255,163,0.2)} 50%{box-shadow:0 0 40px rgba(0,255,163,0.5)} }
        .card { background:#0D0F14; border:1px solid rgba(255,255,255,0.05); border-radius:20px; }
        .field-flash { animation:shimmer 1.5s linear; background:linear-gradient(90deg,transparent,rgba(0,255,163,0.12),transparent); background-size:200% 100%; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; }
        ::-webkit-scrollbar { width:0 }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#07080C', color:'#fff', fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom:110 }}>

        {/* Header */}
        <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(7,8,12,0.96)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.04)', padding:'52px 20px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px', flexShrink:0 }}>←</a>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'20px', fontWeight:'900', color:'#fff', letterSpacing:'-0.5px' }}>Health Intelligence</div>
              <div style={{ fontSize:'11px', color:'#444', fontWeight:'600', marginTop:'1px' }}>
                {new Date().toLocaleDateString('en',{ weekday:'long', month:'long', day:'numeric' })}
                {detectedSources.length > 0 && <span style={{ color:'#00FFA3', marginLeft:6 }}>· {detectedSources.join(', ')}</span>}
              </div>
            </div>
            {/* Auto-detect toggle */}
            <button onClick={detecting ? stopDetection : startDetection}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'20px', border:'1px solid', borderColor: detecting ? '#00FFA3' : 'rgba(255,255,255,0.1)', background: detecting ? 'rgba(0,255,163,0.08)' : 'rgba(255,255,255,0.03)', color: detecting ? '#00FFA3' : '#666', fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', animation: detecting ? 'glow-pulse 2s infinite' : 'none' }}>
              <Pulse active={detecting}/>
              {detecting ? 'Live' : 'Auto-Detect'}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            {(['log','insights','history'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex:1, padding:'10px 0 12px', background:'none', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'700', letterSpacing:'0.05em', textTransform:'uppercase', color: activeTab===tab ? '#00FFA3' : '#383838', borderBottom: activeTab===tab ? '2px solid #00FFA3' : '2px solid transparent', transition:'all 0.2s' }}>
                {tab === 'log' ? '📝 Log' : tab === 'insights' ? '🧠 Insights' : '📊 History'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'16px 16px', animation:'fadeUp 0.4s ease both' }}>

          {/* ── LOG TAB ── */}
          {activeTab === 'log' && (
            <>
              {/* Score + Quick Stats */}
              <div className="card" style={{ padding:'20px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'16px' }}>
                <ScoreRing score={score} status={status}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'12px', color:'#444', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Health Score</div>
                  {Object.entries(breakdown).map(([k, v]) => (
                    <div key={k} style={{ marginBottom:'6px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                        <span style={{ fontSize:'10px', color:'#555', fontWeight:'600', textTransform:'capitalize' }}>{k.replace(/([A-Z])/g,' $1')}</span>
                        <span style={{ fontSize:'10px', color:'#777', fontWeight:'700' }}>{Math.round(v)}%</span>
                      </div>
                      <div style={{ height:'3px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${v}%`, borderRadius:'2px', background: v >= 80 ? '#00FFA3' : v >= 60 ? '#00C6FF' : v >= 40 ? '#FFB800' : '#FF4D4D', transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-detect source badges */}
              {detecting && (
                <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
                  {['Motion', 'Camera', 'Battery', 'Bluetooth'].map(src => (
                    <div key={src} style={{ padding:'5px 12px', borderRadius:'20px', background:'rgba(0,255,163,0.06)', border:'1px solid rgba(0,255,163,0.15)', fontSize:'11px', color:'#00FFA3', fontWeight:'700' }}>
                      <Pulse active/> Scanning {src}...
                    </div>
                  ))}
                </div>
              )}

              {/* BLE Connect */}
              <button onClick={connectBluetooth}
                style={{ width:'100%', padding:'12px', marginBottom:'12px', borderRadius:'14px', background:'rgba(0,198,255,0.05)', border:'1px solid rgba(0,198,255,0.15)', color:'#00C6FF', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C6FF" strokeWidth="2.5"><path d="M6.5 6.5l11 11M6.5 17.5L12 12l5.5-5.5L12 1v22l5.5-5.5"/></svg>
                Connect Bluetooth Device (HR Monitor / Smartwatch)
              </button>

              {saved && (
                <div style={{ background:'rgba(0,255,163,0.07)', border:'1px solid rgba(0,255,163,0.2)', borderRadius:'14px', padding:'12px 16px', color:'#00FFA3', fontSize:'13px', fontWeight:'700', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FFA3" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  Health log saved — great job staying consistent!
                </div>
              )}

              {/* Sections */}
              {sections.map(section => (
                <div key={section.id} className="card" style={{ marginBottom:'12px', overflow:'hidden' }}>
                  <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    style={{ width:'100%', padding:'16px 18px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', color:'#fff' }}>
                    <span style={{ fontSize:'14px', fontWeight:'800', letterSpacing:'-0.3px' }}>{section.label}</span>
                    <span style={{ color:'#444', transition:'transform 0.2s', display:'inline-block', transform: expandedSection===section.id ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>

                  {expandedSection === section.id && (
                    <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:'10px', animation:'slideIn 0.2s ease' }}>
                      {section.fields.map(f => {
                        const isFlashing = detectFlash.includes(f.key)
                        const val = log[f.key as keyof HealthLog]
                        return (
                          <div key={f.key} style={{ display:'flex', alignItems:'center', gap:'10px', borderRadius:'12px', padding:'8px', transition:'background 0.3s', background: isFlashing ? 'rgba(0,255,163,0.05)' : 'transparent' }}>
                            <div style={{ width:'38px', height:'38px', borderRadius:'11px', background:`${f.color}12`, border:`1px solid ${f.color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>{f.icon}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' }}>
                                <span style={{ fontSize:'11px', color:'#444', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.label}</span>
                                {f.unit && <span style={{ fontSize:'10px', color:'#333', fontWeight:'600' }}>{f.unit}</span>}
                                {isFlashing && <span style={{ fontSize:'10px', color:'#00FFA3', fontWeight:'700', animation:'slideIn 0.3s ease' }}>● Auto-detected</span>}
                              </div>
                              <input
                                type={f.type || 'text'}
                                placeholder={f.ph}
                                value={val !== null && val !== undefined && val !== 0 ? String(val) : ''}
                                onChange={e => {
                                  const v = e.target.value
                                  setLog(p => ({ ...p, [f.key]: v === '' ? null : (f.key === 'weight_kg' || f.key === 'distance_km') ? parseFloat(v) : parseInt(v) || 0 }))
                                }}
                                style={inp(f.color)}
                                onFocus={e => { e.target.style.borderColor = `${f.color}40`; e.target.style.boxShadow = `0 0 0 3px ${f.color}10` }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none' }}
                              />
                            </div>
                            {val ? <div style={{ fontSize:'15px', fontWeight:'800', color: f.color, minWidth:'fit-content', animation: isFlashing ? 'slideIn 0.3s ease' : 'none' }}>{val}</div> : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Mood */}
              <div className="card" style={{ padding:'18px', marginBottom:'12px' }}>
                <div style={{ fontSize:'14px', fontWeight:'800', color:'#fff', marginBottom:'14px' }}>Mood Check-in</div>
                <div style={{ display:'flex', gap:'6px' }}>
                  {moods.map((emoji, i) => (
                    <button key={i} onClick={() => setLog(p => ({ ...p, mood: i+1 }))}
                      style={{ flex:1, padding:'10px 2px', borderRadius:'12px', border:'1.5px solid', borderColor: log.mood===i+1 ? '#00FFA3' : 'rgba(255,255,255,0.06)', background: log.mood===i+1 ? 'rgba(0,255,163,0.07)' : 'transparent', cursor:'pointer', transition:'all 0.2s', transform: log.mood===i+1 ? 'scale(1.05)' : 'scale(1)' }}>
                      <div style={{ fontSize:'22px', marginBottom:'3px' }}>{emoji}</div>
                      <div style={{ fontSize:'9px', color: log.mood===i+1 ? '#00FFA3' : '#383838', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.04em' }}>{moodLabels[i]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button onClick={save} disabled={loading}
                style={{ width:'100%', background: loading ? '#1a1a1a' : 'linear-gradient(135deg,#00FFA3,#00C6FF)', color: loading ? '#444' : '#000', border:'none', borderRadius:'16px', padding:'16px', fontSize:'15px', fontWeight:'900', letterSpacing:'-0.3px', cursor: loading ? 'wait' : 'pointer', boxShadow: loading ? 'none' : '0 8px 32px rgba(0,255,163,0.25)', transition:'all 0.3s', transform: loading ? 'scale(0.99)' : 'scale(1)' }}>
                {loading ? '⏳ Saving...' : '💾 Save Today\'s Health Log'}
              </button>
            </>
          )}

          {/* ── INSIGHTS TAB ── */}
          {activeTab === 'insights' && (
            <div style={{ animation:'fadeUp 0.3s ease both' }}>
              {history.length === 0 ? (
                <div className="card" style={{ padding:'40px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>📊</div>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'#fff' }}>No Data Yet</div>
                  <div style={{ fontSize:'13px', color:'#444', marginTop:'6px' }}>Log a few days to see insights</div>
                </div>
              ) : (
                <>
                  {/* 7-day averages */}
                  <div className="card" style={{ padding:'18px', marginBottom:'12px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'800', color:'#fff', marginBottom:'14px' }}>7-Day Averages</div>
                    {[
                      { key:'steps', label:'Daily Steps', icon:'👟', color:'#22C55E', target:10000, unit:'' },
                      { key:'water_ml', label:'Hydration', icon:'💧', color:'#00C6FF', target:2500, unit:'ml' },
                      { key:'sleep_minutes', label:'Sleep', icon:'🌙', color:'#A855F7', target:480, unit:'min' },
                      { key:'heart_rate', label:'Resting HR', icon:'❤️', color:'#FF4D4D', target:72, unit:'bpm' },
                    ].map(m => {
                      const vals = history.slice(0,7).map(h => Number(h[m.key as keyof HealthLog] || 0))
                      const avg = vals.reduce((a,b)=>a+b,0)/Math.max(vals.filter(v=>v>0).length,1)
                      const pct = Math.min(100, (avg/m.target)*100)
                      return (
                        <div key={m.key} style={{ marginBottom:'12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                            <span style={{ fontSize:'13px', color:'#ccc', fontWeight:'600' }}>{m.icon} {m.label}</span>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <TrendBadge pct={trend(m.key as keyof HealthLog)} invert={m.key==='heart_rate'}/>
                              <span style={{ fontSize:'13px', fontWeight:'800', color:m.color }}>{Math.round(avg)}{m.unit}</span>
                            </div>
                          </div>
                          <div style={{ height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:m.color, borderRadius:'3px', transition:'width 1s ease' }}/>
                          </div>
                          <div style={{ fontSize:'10px', color:'#333', marginTop:'3px' }}>Target: {m.target}{m.unit}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Health Alerts */}
                  {history[0] && (() => {
                    const alerts: Array<{ msg: string; color: string; icon: string }> = []
                    if ((history[0].sleep_minutes || 0) < 360) alerts.push({ msg:'Sleep below 6 hours — risk of cognitive decline', color:'#FF4D4D', icon:'⚠️' })
                    if ((history[0].steps || 0) < 5000) alerts.push({ msg:'Low activity today — try a 20-min walk', color:'#FFB800', icon:'🏃' })
                    if ((history[0].water_ml || 0) < 1500) alerts.push({ msg:'Low hydration — drink more water', color:'#00C6FF', icon:'💧' })
                    if (history[0].heart_rate && (history[0].heart_rate > 100 || history[0].heart_rate < 50)) alerts.push({ msg:`Heart rate ${history[0].heart_rate} bpm — outside normal range`, color:'#FF4D4D', icon:'❤️' })
                    if (history[0].spo2 && history[0].spo2 < 95) alerts.push({ msg:`SpO₂ at ${history[0].spo2}% — consider seeking medical advice`, color:'#FF4D4D', icon:'🫁' })
                    if (alerts.length === 0) alerts.push({ msg:'All metrics look healthy — great work!', color:'#00FFA3', icon:'✅' })
                    return (
                      <div className="card" style={{ padding:'18px', marginBottom:'12px' }}>
                        <div style={{ fontSize:'14px', fontWeight:'800', color:'#fff', marginBottom:'12px' }}>🔔 Health Alerts</div>
                        {alerts.map((a,i) => (
                          <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'10px 12px', borderRadius:'12px', background:`${a.color}08`, border:`1px solid ${a.color}20`, marginBottom:'6px' }}>
                            <span style={{ fontSize:'16px' }}>{a.icon}</span>
                            <span style={{ fontSize:'12px', color: a.color, fontWeight:'600', lineHeight:1.4 }}>{a.msg}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Streak */}
                  {(() => {
                    let streak = 0
                    const sorted = [...history].sort((a,b)=>b.log_date.localeCompare(a.log_date))
                    for (let i = 0; i < sorted.length; i++) {
                      const d = new Date(); d.setDate(d.getDate()-i)
                      if (sorted[i]?.log_date === d.toISOString().split('T')[0]) streak++
                      else break
                    }
                    return (
                      <div className="card" style={{ padding:'18px', marginBottom:'12px', textAlign:'center' }}>
                        <div style={{ fontSize:'48px', marginBottom:'6px' }}>🔥</div>
                        <div style={{ fontSize:'36px', fontWeight:'900', color:'#FF6B35', letterSpacing:'-2px' }}>{streak}</div>
                        <div style={{ fontSize:'13px', color:'#555', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em' }}>Day Streak</div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div style={{ animation:'fadeUp 0.3s ease both' }}>
              {history.length === 0 ? (
                <div className="card" style={{ padding:'40px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px' }}>📅</div>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'#fff', marginTop:'12px' }}>No history yet</div>
                </div>
              ) : history.map((h, i) => {
                const { score: hs, status: hst } = calcHealthScore(h)
                const scoreColor = hs >= 85 ? '#00FFA3' : hs >= 70 ? '#00C6FF' : hs >= 50 ? '#FFB800' : '#FF4D4D'
                return (
                  <div key={i} className="card" style={{ padding:'14px 16px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:`${scoreColor}12`, border:`1px solid ${scoreColor}25`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:'16px' }}>{moods[(h.mood||3)-1]}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'13px', fontWeight:'700', color:'#fff' }}>
                          {new Date(h.log_date).toLocaleDateString('en',{ weekday:'short', month:'short', day:'numeric' })}
                        </span>
                        <span style={{ fontSize:'10px', fontWeight:'700', color:scoreColor, background:`${scoreColor}12`, borderRadius:'6px', padding:'2px 6px' }}>{hst}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:'#444', fontWeight:'600' }}>
                        {(h.steps||0).toLocaleString()} steps · {h.water_ml||0}ml · {Math.round((h.sleep_minutes||0)/60)}h sleep
                        {h.heart_rate ? ` · ${h.heart_rate}bpm` : ''}
                        {h.spo2 ? ` · SpO₂ ${h.spo2}%` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'20px', fontWeight:'900', color:scoreColor }}>{hs}</div>
                      {h.weight_kg && <div style={{ fontSize:'11px', color:'#444', fontWeight:'600' }}>{h.weight_kg}kg</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <NAV/>
    </>
  )
}