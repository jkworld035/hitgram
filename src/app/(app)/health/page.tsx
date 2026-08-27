'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HealthLog {
  id: string
  log_date: string
  weight_kg: number | null
  water_ml: number
  sleep_minutes: number
  sleep_quality: number
  calories_consumed: number
  steps: number
  mood: number
  heart_rate: number | null
  notes: string | null
}

const MOOD_EMOJIS = ['', '😫', '😔', '😐', '🙂', '😄']
const MOOD_LABELS = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Great']
const MOOD_COLORS = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#AAFF00']

export default function HealthPage() {
  const [logs,    setLogs]    = useState<HealthLog[]>([])
  const [today,   setToday]   = useState<HealthLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [tab,     setTab]     = useState<'log'|'history'|'trends'>('log')
  const [form,    setForm]    = useState({
    weight_kg: '', water_ml: '0', sleep_minutes: '0',
    sleep_quality: '3', calories_consumed: '0',
    steps: '0', mood: '3', heart_rate: '', notes: '',
  })
  const supabase  = createClient()
  const router    = useRouter()
  const todayDate = new Date().toISOString().split('T')[0]

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    await fetchLogs(user.id)
    setLoading(false)
  }

  const fetchLogs = async (uid: string) => {
    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', uid)
      .order('log_date', { ascending: false })
      .limit(30)
    if (data) {
      setLogs(data)
      const todayLog = data.find(l => l.log_date === todayDate)
      if (todayLog) {
        setToday(todayLog)
        setForm({
          weight_kg:         String(todayLog.weight_kg || ''),
          water_ml:          String(todayLog.water_ml || 0),
          sleep_minutes:     String(todayLog.sleep_minutes || 0),
          sleep_quality:     String(todayLog.sleep_quality || 3),
          calories_consumed: String(todayLog.calories_consumed || 0),
          steps:             String(todayLog.steps || 0),
          mood:              String(todayLog.mood || 3),
          heart_rate:        String(todayLog.heart_rate || ''),
          notes:             todayLog.notes || '',
        })
      }
    }
  }

  const saveLog = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Ensure profile exists
    await supabase.from('profiles').upsert({
      id: user.id,
      username: user.email?.split('@')[0],
      full_name: user.email?.split('@')[0],
    }, { onConflict: 'id' })

    const payload = {
      user_id:           user.id,
      log_date:          todayDate,
      weight_kg:         form.weight_kg ? parseFloat(form.weight_kg) : null,
      water_ml:          parseInt(form.water_ml) || 0,
      sleep_minutes:     parseInt(form.sleep_minutes) || 0,
      sleep_quality:     parseInt(form.sleep_quality) || 3,
      calories_consumed: parseInt(form.calories_consumed) || 0,
      steps:             parseInt(form.steps) || 0,
      mood:              parseInt(form.mood) || 3,
      heart_rate:        form.heart_rate ? parseInt(form.heart_rate) : null,
      notes:             form.notes || null,
    }

    const { error } = await supabase
      .from('health_logs')
      .upsert(payload, { onConflict: 'user_id,log_date' })

    if (error) {
      console.error('Health log error:', error)
      alert('Error saving: ' + error.message)
    } else {
      await fetchLogs(user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const deleteLog = async (id: string) => {
    if (!confirm('Delete this log entry?')) return
    await supabase.from('health_logs').delete().eq('id', id)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await fetchLogs(user.id)
  }

  // Slider component
  const Slider = ({ label, value, min, max, step=1, unit, color, onChange, icon }: any) => (
    <div style={{ marginBottom:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
        <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff', display:'flex', alignItems:'center', gap:'6px' }}>
          <span>{icon}</span>{label}
        </div>
        <div style={{ fontSize:'14px', fontWeight:'800', color }}>
          {value}{unit}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width:'100%', accentColor: color, height:'4px', cursor:'pointer' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
        <span style={{ fontSize:'10px', color:'#3A3A3A' }}>{min}{unit}</span>
        <span style={{ fontSize:'10px', color:'#3A3A3A' }}>{max}{unit}</span>
      </div>
    </div>
  )

  const moodColor = MOOD_COLORS[parseInt(form.mood)] || '#EAB308'
  const waterPct  = Math.min((parseInt(form.water_ml) / 2500) * 100, 100)
  const sleepH    = Math.round(parseInt(form.sleep_minutes) / 60 * 10) / 10
  const stepsPct  = Math.min((parseInt(form.steps) / 10000) * 100, 100)

  const inp: React.CSSProperties = {
    background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'12px', padding:'12px 14px', color:'#fff',
    fontSize:'14px', outline:'none', width:'100%',
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(170,255,0,0.2)', borderTop:'3px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input[type=range]{-webkit-appearance:none;background:rgba(255,255,255,0.06);border-radius:4px;height:4px}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--thumb-color,#AAFF00);cursor:pointer;border:3px solid #0A0A0A;box-shadow:0 0 8px rgba(170,255,0,0.4)}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(10,10,10,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>Health Log</div>
              <div style={{ fontSize:'11px', color:'#EF4444', fontWeight:'600' }}>
                {new Date().toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}
              </div>
            </div>
          </div>
          {today && (
            <div style={{ fontSize:'11px', color:'#22C55E', fontWeight:'700', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:'20px', padding:'5px 12px' }}>
              ✓ Logged today
            </div>
          )}
        </div>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px' }}>
          {(['log','history','trends'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:'8px', borderRadius:'8px', border:'none', background:tab===t?'#EF4444':'transparent', color:tab===t?'#fff':'#3A3A3A', fontSize:'12px', fontWeight:'700', cursor:'pointer', textTransform:'capitalize', transition:'all 0.2s' }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* LOG TAB */}
        {tab === 'log' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>

            {/* Quick stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'16px' }}>
              {[
                { icon:'😊', label:'Mood',  value:MOOD_EMOJIS[parseInt(form.mood)], color:moodColor },
                { icon:'💧', label:'Water', value:`${((parseInt(form.water_ml))/1000).toFixed(1)}L`, color:'#3B82F6' },
                { icon:'😴', label:'Sleep', value:`${sleepH}h`, color:'#8B5CF6' },
                { icon:'👟', label:'Steps', value:`${Math.round(parseInt(form.steps)/1000*10)/10}k`, color:'#AAFF00' },
              ].map(s => (
                <div key={s.label} style={{ background:'#111', border:`1px solid ${s.color}15`, borderRadius:'14px', padding:'12px 8px', textAlign:'center' }}>
                  <div style={{ fontSize:'18px', marginBottom:'4px' }}>{s.icon}</div>
                  <div style={{ fontSize:'14px', fontWeight:'800', color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'1px', textTransform:'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mood selector */}
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>😊 How are you feeling today?</div>
              <div style={{ display:'flex', gap:'8px' }}>
                {[1,2,3,4,5].map(m => (
                  <button key={m} onClick={() => setForm(p=>({...p,mood:String(m)}))}
                    style={{ flex:1, padding:'12px 4px', borderRadius:'14px', border:`2px solid ${form.mood===String(m)?MOOD_COLORS[m]:'rgba(255,255,255,0.07)'}`, background:form.mood===String(m)?`${MOOD_COLORS[m]}12`:'#0D0D0D', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
                    <div style={{ fontSize:'24px', marginBottom:'4px' }}>{MOOD_EMOJIS[m]}</div>
                    <div style={{ fontSize:'10px', color:form.mood===String(m)?MOOD_COLORS[m]:'#3A3A3A', fontWeight:'600' }}>{MOOD_LABELS[m]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Water intake */}
            <div style={{ background:'#111', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>💧 Water Intake</div>
                <div style={{ fontSize:'16px', fontWeight:'900', color:'#3B82F6' }}>{(parseInt(form.water_ml)/1000).toFixed(1)}L</div>
              </div>
              <div style={{ height:'8px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden', marginBottom:'12px' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#3B82F6,#60A5FA)', width:`${waterPct}%`, borderRadius:'4px', transition:'width 0.4s ease', boxShadow:'0 0 8px rgba(59,130,246,0.5)' }}/>
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {[250, 500, 750, 1000, 1500, 2000, 2500, 3000].map(ml => (
                  <button key={ml} onClick={() => setForm(p=>({...p,water_ml:String(Math.min(parseInt(p.water_ml)+ml, 5000))}))}
                    style={{ background:'rgba(59,130,246,0.08)', border:`1px solid ${form.water_ml===String(ml)?'rgba(59,130,246,0.4)':'rgba(59,130,246,0.15)'}`, borderRadius:'20px', padding:'6px 12px', color:'#3B82F6', fontSize:'12px', fontWeight:'600', cursor:'pointer', transition:'all 0.2s' }}>
                    +{ml}ml
                  </button>
                ))}
              </div>
              <button onClick={() => setForm(p=>({...p,water_ml:'0'}))}
                style={{ marginTop:'8px', background:'transparent', border:'none', color:'#3A3A3A', fontSize:'12px', cursor:'pointer' }}>
                Reset to 0
              </button>
            </div>

            {/* Steps */}
            <div style={{ background:'#111', border:'1px solid rgba(170,255,0,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>👟 Steps Today</div>
                <div style={{ fontSize:'16px', fontWeight:'900', color:'#AAFF00' }}>{parseInt(form.steps).toLocaleString()}</div>
              </div>
              <div style={{ height:'8px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden', marginBottom:'12px' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#AAFF00,#22C55E)', width:`${stepsPct}%`, borderRadius:'4px', transition:'width 0.4s ease', boxShadow:'0 0 8px rgba(170,255,0,0.5)' }}/>
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
                {[1000, 2000, 3000, 5000, 7500, 10000, 12000, 15000].map(s => (
                  <button key={s} onClick={() => setForm(p=>({...p,steps:String(s)}))}
                    style={{ background:form.steps===String(s)?'rgba(170,255,0,0.12)':'rgba(170,255,0,0.04)', border:`1px solid ${form.steps===String(s)?'rgba(170,255,0,0.4)':'rgba(170,255,0,0.12)'}`, borderRadius:'20px', padding:'6px 12px', color:'#AAFF00', fontSize:'12px', fontWeight:'600', cursor:'pointer', transition:'all 0.2s' }}>
                    {s >= 1000 ? `${s/1000}k` : s}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Or enter exact steps" value={form.steps} onChange={e=>setForm(p=>({...p,steps:e.target.value}))} style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'6px' }}>💡 Check Google Fit or Samsung Health for your real step count</div>
            </div>

            {/* Sleep */}
            <div style={{ background:'#111', border:'1px solid rgba(139,92,246,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>😴 Sleep</div>
                <div style={{ fontSize:'16px', fontWeight:'900', color:'#8B5CF6' }}>{sleepH}h</div>
              </div>
              <Slider label="Hours slept" value={form.sleep_minutes} min={0} max={600} step={30} unit="min"
                color="#8B5CF6" onChange={(v:string)=>setForm(p=>({...p,sleep_minutes:v}))} icon="⏰"/>
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff', marginBottom:'8px' }}>Sleep Quality</div>
              <div style={{ display:'flex', gap:'8px' }}>
                {[{v:'1',l:'Poor',i:'😫'},{v:'2',l:'Fair',i:'😐'},{v:'3',l:'Good',i:'🙂'},{v:'4',l:'Great',i:'😊'},{v:'5',l:'Perfect',i:'⭐'}].map(q => (
                  <button key={q.v} onClick={()=>setForm(p=>({...p,sleep_quality:q.v}))}
                    style={{ flex:1, padding:'10px 4px', borderRadius:'12px', border:`2px solid ${form.sleep_quality===q.v?'#8B5CF6':'rgba(255,255,255,0.07)'}`, background:form.sleep_quality===q.v?'rgba(139,92,246,0.1)':'#0D0D0D', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:'18px' }}>{q.i}</div>
                    <div style={{ fontSize:'9px', color:form.sleep_quality===q.v?'#8B5CF6':'#3A3A3A', marginTop:'2px', fontWeight:'600' }}>{q.l}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Nutrition */}
            <div style={{ background:'#111', border:'1px solid rgba(34,197,94,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>🥗 Nutrition</div>
              <Slider label="Calories consumed" value={form.calories_consumed} min={0} max={5000} step={50} unit=" kcal"
                color="#22C55E" onChange={(v:string)=>setForm(p=>({...p,calories_consumed:v}))} icon="🔥"/>
            </div>

            {/* Body stats */}
            <div style={{ background:'#111', border:'1px solid rgba(249,115,22,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>⚖️ Body Stats</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Weight (kg)</div>
                  <input type="number" step="0.1" placeholder="70.5" value={form.weight_kg} onChange={e=>setForm(p=>({...p,weight_kg:e.target.value}))} style={inp}
                    onFocus={e=>e.target.style.borderColor='rgba(249,115,22,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
                <div>
                  <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Heart Rate (BPM)</div>
                  <input type="number" placeholder="72" value={form.heart_rate} onChange={e=>setForm(p=>({...p,heart_rate:e.target.value}))} style={inp}
                    onFocus={e=>e.target.style.borderColor='rgba(249,115,22,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'16px' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'10px' }}>📝 Notes</div>
              <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                placeholder="How do you feel? Any observations about your health today?"
                rows={3} style={{ ...inp, resize:'none' }}
                onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
            </div>

            {/* Save button */}
            <button onClick={saveLog} disabled={saving}
              style={{ width:'100%', background:saved?'rgba(170,255,0,0.08)':'#AAFF00', color:saved?'#AAFF00':'#000', border:saved?'1px solid rgba(170,255,0,0.2)':'none', borderRadius:'16px', padding:'16px', fontSize:'16px', fontWeight:'900', cursor:'pointer', boxShadow:saved?'none':'0 0 24px rgba(170,255,0,0.35)', transition:'all 0.3s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              {saving ? (
                <><div style={{ width:'16px', height:'16px', border:'2px solid rgba(0,0,0,0.3)', borderTop:'2px solid #000', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>Saving...</>
              ) : saved ? '✓ Health Data Saved!' : '💾 Save Health Log'}
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>📊</div>
                <div style={{ fontSize:'16px', fontWeight:'600', color:'#fff', marginBottom:'8px' }}>No health data yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A' }}>Start logging your daily health to see history</div>
              </div>
            ) : logs.map((log, i) => (
              <div key={log.id} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'18px', padding:'16px', marginBottom:'10px', animation:`fadeInUp 0.5s ease ${i*0.05}s both` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>
                    {new Date(log.log_date).toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' })}
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ fontSize:'20px' }}>{MOOD_EMOJIS[log.mood]}</span>
                    <button onClick={() => deleteLog(log.id)}
                      style={{ background:'rgba(239,68,68,0.06)', border:'none', color:'#EF4444', cursor:'pointer', width:'28px', height:'28px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                  {[
                    { l:'Steps',    v:(log.steps||0).toLocaleString(), c:'#AAFF00' },
                    { l:'Water',    v:`${((log.water_ml||0)/1000).toFixed(1)}L`, c:'#3B82F6' },
                    { l:'Sleep',    v:`${Math.round((log.sleep_minutes||0)/60*10)/10}h`, c:'#8B5CF6' },
                    { l:'Calories', v:String(log.calories_consumed||0), c:'#22C55E' },
                  ].map(s => (
                    <div key={s.l} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'8px', textAlign:'center' }}>
                      <div style={{ fontSize:'13px', fontWeight:'800', color:s.c }}>{s.v}</div>
                      <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'1px' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {log.notes && (
                  <div style={{ marginTop:'10px', fontSize:'12px', color:'#52525B', background:'rgba(255,255,255,0.03)', padding:'8px 12px', borderRadius:'10px' }}>
                    📝 {log.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TRENDS TAB */}
        {tab === 'trends' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {logs.length < 2 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>📈</div>
                <div style={{ fontSize:'16px', fontWeight:'600', color:'#fff', marginBottom:'8px' }}>Not enough data yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A' }}>Log health data for at least 2 days to see trends</div>
              </div>
            ) : (
              <>
                {/* Steps trend */}
                {[
                  { label:'Daily Steps', key:'steps', color:'#AAFF00', unit:'steps', goal:10000 },
                  { label:'Water Intake', key:'water_ml', color:'#3B82F6', unit:'ml', goal:2500 },
                  { label:'Sleep', key:'sleep_minutes', color:'#8B5CF6', unit:'min', goal:480 },
                  { label:'Calories', key:'calories_consumed', color:'#22C55E', unit:'kcal', goal:2000 },
                ].map(metric => {
                  const values  = logs.slice(0,7).reverse().map(l => (l as any)[metric.key] || 0)
                  const maxVal  = Math.max(...values, metric.goal)
                  const avgVal  = Math.round(values.reduce((s,v)=>s+v,0)/values.length)
                  const trend   = values.length > 1 ? values[values.length-1] - values[values.length-2] : 0
                  return (
                    <div key={metric.key} style={{ background:'#111', border:`1px solid ${metric.color}15`, borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                        <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>{metric.label}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ fontSize:'12px', color:trend>=0?'#22C55E':'#EF4444', fontWeight:'700' }}>
                            {trend>=0?'↑':'↓'} {Math.abs(trend).toLocaleString()}{metric.unit==='steps'?'':metric.unit}
                          </div>
                          <div style={{ fontSize:'12px', color:'#3A3A3A' }}>avg: {avgVal.toLocaleString()}</div>
                        </div>
                      </div>
                      {/* Mini bar chart */}
                      <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'80px' }}>
                        {values.map((v, i) => {
                          const pct   = Math.max((v/maxVal)*100, 2)
                          const isGoal = v >= metric.goal
                          const day   = logs[logs.length - 1 - i]?.log_date
                          return (
                            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}>
                              <div style={{ fontSize:'8px', color:'#3A3A3A', fontWeight:'600' }}>
                                {metric.key==='steps'?`${Math.round(v/1000*10)/10}k`:metric.key==='water_ml'?`${Math.round(v/100)/10}L`:metric.key==='sleep_minutes'?`${Math.round(v/60*10)/10}h`:v}
                              </div>
                              <div style={{ width:'100%', background:isGoal?metric.color:`${metric.color}40`, borderRadius:'4px 4px 0 0', height:`${pct}%`, transition:'height 0.8s ease', boxShadow:isGoal?`0 0 8px ${metric.color}60`:'' }}/>
                              <div style={{ fontSize:'8px', color:'#3A3A3A' }}>
                                {day ? new Date(day).toLocaleDateString('en',{weekday:'narrow'}) : ''}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Goal line indicator */}
                      <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ width:'12px', height:'3px', background:metric.color, borderRadius:'2px' }}/>
                        <div style={{ fontSize:'11px', color:'#3A3A3A' }}>
                          Goal: {metric.goal.toLocaleString()} {metric.unit} · {values.filter(v=>v>=metric.goal).length}/{values.length} days hit
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(10,10,10,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/health',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,label:'Health',active:true},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?'#EF4444':'#3A3A3A',fontWeight:(n as any).active?'700':'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
            {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}