'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Reminder {
  id: string
  title: string
  time: string
  type: string
  icon: string
  is_done: boolean
  repeat_daily: boolean
  created_at: string
}

const TYPES = [
  { id:'health',    label:'Health',    icon:'❤️', color:'#EF4444' },
  { id:'workout',   label:'Workout',   icon:'💪', color:'#F97316' },
  { id:'meal',      label:'Meal',      icon:'🥗', color:'#22C55E' },
  { id:'water',     label:'Water',     icon:'💧', color:'#3B82F6' },
  { id:'sleep',     label:'Sleep',     icon:'😴', color:'#8B5CF6' },
  { id:'habit',     label:'Habit',     icon:'✅', color:'#EAB308' },
  { id:'medicine',  label:'Medicine',  icon:'💊', color:'#EC4899' },
  { id:'general',   label:'General',   icon:'🔔', color:'#AAFF00' },
]

const PRESETS = [
  { title:'Drink Water',          time:'08:00', type:'water',   icon:'💧', repeat_daily:true  },
  { title:'Morning Workout',      time:'07:00', type:'workout', icon:'💪', repeat_daily:true  },
  { title:'Take Vitamins',        time:'09:00', type:'medicine',icon:'💊', repeat_daily:true  },
  { title:'Lunch Time',           time:'13:00', type:'meal',    icon:'🥗', repeat_daily:true  },
  { title:'Afternoon Water',      time:'15:00', type:'water',   icon:'💧', repeat_daily:true  },
  { title:'Evening Walk',         time:'18:00', type:'workout', icon:'🚶', repeat_daily:true  },
  { title:'Dinner Time',          time:'20:00', type:'meal',    icon:'🌙', repeat_daily:true  },
  { title:'Sleep Time',           time:'22:30', type:'sleep',   icon:'😴', repeat_daily:true  },
  { title:'Log Health Data',      time:'21:00', type:'health',  icon:'📊', repeat_daily:true  },
  { title:'Check Goals',          time:'10:00', type:'habit',   icon:'🎯', repeat_daily:false },
  { title:'Meditation',           time:'06:30', type:'habit',   icon:'🧘', repeat_daily:true  },
  { title:'Protein Shake',        time:'17:00', type:'meal',    icon:'🥤', repeat_daily:true  },
]

export default function RemindersPage() {
  const [reminders,       setReminders]       = useState<Reminder[]>([])
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [showAdd,         setShowAdd]         = useState(false)
  const [showPresets,     setShowPresets]      = useState(false)
  const [editReminder,    setEditReminder]    = useState<Reminder | null>(null)
  const [notifPerm,       setNotifPerm]       = useState<string>('default')
  const [tab,             setTab]             = useState<'today'|'all'>('today')
  const [userId,          setUserId]          = useState('')
  const [error,           setError]           = useState('')
  const [nextFiring,      setNextFiring]      = useState<string>('')
  const [form, setForm] = useState({
    title:'', time:'08:00', type:'general', icon:'🔔', repeat_daily:true
  })
  const supabase  = createClient()
  const router    = useRouter()
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifRef  = useRef<Set<string>>(new Set())

  useEffect(() => {
    init()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    await supabase.from('profiles').upsert({
      id: user.id,
      username: user.email?.split('@')[0],
      full_name: user.email?.split('@')[0],
    }, { onConflict: 'id' })

    await fetchReminders(user.id)
    checkNotifPermission()
    setLoading(false)
  }

  const fetchReminders = async (uid: string) => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', uid)
      .order('time', { ascending: true })
    if (error) { setError(error.message); return }
    setReminders(data || [])
    startReminderTimer(data || [])
  }

  // ── Notification permission ───────────────────────────────
  const checkNotifPermission = () => {
    if (!('Notification' in window)) { setNotifPerm('unavailable'); return }
    setNotifPerm(Notification.permission)
  }

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) { setNotifPerm('unavailable'); return }
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm === 'granted') {
      new Notification('Hitgram Reminders Active! 🎉', {
        body: 'You will now receive health reminders from IRA.',
        icon: '/icons/icon-192.png',
        tag:  'hitgram-test',
      })
    }
  }

  // ── Timer to check reminders every minute ─────────────────
  const startReminderTimer = (rems: Reminder[]) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      checkAndFireReminders(rems)
      updateNextFiring(rems)
    }, 30000) // check every 30 seconds
    checkAndFireReminders(rems)
    updateNextFiring(rems)
  }

  const checkAndFireReminders = (rems: Reminder[]) => {
    if (Notification.permission !== 'granted') return
    const now     = new Date()
    const hhmm    = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    const today   = now.toISOString().split('T')[0]

    rems.forEach(r => {
      if (r.is_done && !r.repeat_daily) return
      if (!r.time) return
      const key = `${r.id}-${today}-${r.time}`
      if (notifRef.current.has(key)) return
      if (r.time === hhmm) {
        notifRef.current.add(key)
        fireNotification(r)
      }
    })
  }

  const fireNotification = (r: Reminder) => {
    if (Notification.permission !== 'granted') return
    const notif = new Notification(`${r.icon} ${r.title}`, {
      body:    `Time for your ${r.type} reminder!`,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-96.png',
      tag:     r.id,
      vibrate: [200, 100, 200],
    } as any)
    notif.onclick = () => { window.focus(); notif.close() }
  }

  const updateNextFiring = (rems: Reminder[]) => {
    const now     = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const active  = rems.filter(r => !r.is_done || r.repeat_daily)

    let nearest: { mins: number; title: string; time: string } | null = null
    active.forEach(r => {
      if (!r.time) return
      const [h, m] = r.time.split(':').map(Number)
      const rMins  = h * 60 + m
      const diff   = rMins > nowMins ? rMins - nowMins : 1440 - nowMins + rMins
      if (!nearest || diff < nearest.mins) nearest = { mins: diff, title: r.title, time: r.time }
    })

    if (nearest) {
      const h = Math.floor((nearest as any).mins / 60)
      const m = (nearest as any).mins % 60
      setNextFiring(h > 0 ? `${(nearest as any).title} in ${h}h ${m}m` : `${(nearest as any).title} in ${m}m`)
    } else {
      setNextFiring('')
    }
  }

  // ── CRUD ──────────────────────────────────────────────────
  const addReminder = async () => {
    if (!form.title.trim()) { setError('Please enter a reminder title'); return }
    setSaving(true)
    setError('')
    const { data, error } = await supabase.from('reminders').insert({
      user_id:      userId,
      title:        form.title.trim(),
      time:         form.time,
      type:         form.type,
      icon:         form.icon,
      is_done:      false,
      repeat_daily: form.repeat_daily,
    }).select().single()
    if (error) { setError(error.message); setSaving(false); return }
    if (data) {
      const updated = [...reminders, data as Reminder].sort((a,b) => a.time.localeCompare(b.time))
      setReminders(updated)
      startReminderTimer(updated)
    }
    resetForm()
    setSaving(false)
  }

  const addPreset = async (p: typeof PRESETS[0]) => {
    if (!userId) return
    setSaving(true)
    const { data, error } = await supabase.from('reminders').insert({
      user_id: userId, title: p.title, time: p.time,
      type: p.type, icon: p.icon, is_done: false, repeat_daily: p.repeat_daily,
    }).select().single()
    if (!error && data) {
      const updated = [...reminders, data as Reminder].sort((a,b) => a.time.localeCompare(b.time))
      setReminders(updated)
      startReminderTimer(updated)
    }
    setSaving(false)
  }

  const updateReminder = async () => {
    if (!editReminder) return
    setSaving(true)
    const { error } = await supabase.from('reminders').update({
      title: form.title.trim(), time: form.time,
      type: form.type, icon: form.icon, repeat_daily: form.repeat_daily,
    }).eq('id', editReminder.id)
    if (!error) {
      const updated = reminders.map(r => r.id === editReminder.id
        ? { ...r, title:form.title, time:form.time, type:form.type, icon:form.icon, repeat_daily:form.repeat_daily }
        : r).sort((a,b) => a.time.localeCompare(b.time))
      setReminders(updated)
      startReminderTimer(updated)
      setEditReminder(null)
      resetForm()
    } else { setError(error.message) }
    setSaving(false)
  }

  const toggleDone = async (r: Reminder) => {
    const { error } = await supabase.from('reminders').update({ is_done: !r.is_done }).eq('id', r.id)
    if (!error) setReminders(p => p.map(rem => rem.id === r.id ? { ...rem, is_done: !rem.is_done } : rem))
  }

  const deleteReminder = async (id: string) => {
    if (!confirm('Delete this reminder?')) return
    await supabase.from('reminders').delete().eq('id', id)
    const updated = reminders.filter(r => r.id !== id)
    setReminders(updated)
    startReminderTimer(updated)
  }

  const openEdit = (r: Reminder) => {
    setForm({ title:r.title, time:r.time, type:r.type, icon:r.icon, repeat_daily:r.repeat_daily })
    setEditReminder(r)
    setShowAdd(false)
  }

  const resetForm = () => {
    setForm({ title:'', time:'08:00', type:'general', icon:'🔔', repeat_daily:true })
    setShowAdd(false)
    setShowPresets(false)
    setEditReminder(null)
  }

  const testNotification = () => {
    if (Notification.permission !== 'granted') { requestNotifPermission(); return }
    new Notification('🔔 Test Reminder', {
      body: 'IRA reminders are working correctly!',
      icon: '/icons/icon-192.png',
    })
  }

  const getType  = (id: string) => TYPES.find(t => t.id === id) || TYPES[7]
  const todayStr = new Date().toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })

  // Group today's reminders by status
  const now        = new Date()
  const nowMins    = now.getHours() * 60 + now.getMinutes()
  const todayRems  = reminders.filter(r => r.repeat_daily || !r.is_done)
  const upcoming   = todayRems.filter(r => {
    if (!r.time) return false
    const [h,m] = r.time.split(':').map(Number)
    return h*60+m > nowMins
  })
  const past = todayRems.filter(r => {
    if (!r.time) return false
    const [h,m] = r.time.split(':').map(Number)
    return h*60+m <= nowMins
  })

  const doneCount = reminders.filter(r => r.is_done).length
  const inp: React.CSSProperties = {
    width:'100%', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'14px', outline:'none',
  }

  const ReminderCard = ({ r }: { r: Reminder }) => {
    const type    = getType(r.type)
    const isPast  = (() => { if (!r.time) return false; const [h,m]=r.time.split(':').map(Number); return h*60+m <= nowMins })()
    const isNow   = (() => { if (!r.time) return false; const [h,m]=r.time.split(':').map(Number); const diff=Math.abs(h*60+m-nowMins); return diff <= 5 })()

    return (
      <div style={{ background: r.is_done ? 'rgba(255,255,255,0.02)' : isNow ? `${type.color}08` : '#111', border:`1px solid ${r.is_done ? 'rgba(255,255,255,0.04)' : isNow ? type.color+'30' : `${type.color}15`}`, borderRadius:'18px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', transition:'all 0.2s', position:'relative', overflow:'hidden' }}>
        {isNow && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:`linear-gradient(90deg,${type.color},transparent)`, animation:'shimmer 1.5s ease-in-out infinite' }}/>}

        {/* Time */}
        <div style={{ textAlign:'center', flexShrink:0, minWidth:'48px' }}>
          <div style={{ fontSize:'14px', fontWeight:'800', color: r.is_done ? '#3A3A3A' : isNow ? type.color : '#fff' }}>{r.time}</div>
          {isNow && <div style={{ fontSize:'9px', color:type.color, fontWeight:'700', animation:'glowPulse 1s infinite' }}>NOW</div>}
          {isPast && !isNow && <div style={{ fontSize:'9px', color:'#3A3A3A' }}>past</div>}
        </div>

        {/* Icon */}
        <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:`${type.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0, border:`1px solid ${type.color}20` }}>
          {r.icon}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'14px', fontWeight:'600', color: r.is_done ? '#3A3A3A' : '#fff', textDecoration: r.is_done ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {r.title}
          </div>
          <div style={{ display:'flex', gap:'6px', marginTop:'3px', flexWrap:'wrap' }}>
            <div style={{ fontSize:'10px', color:type.color, fontWeight:'600', background:`${type.color}10`, padding:'1px 7px', borderRadius:'20px' }}>{type.label}</div>
            {r.repeat_daily && <div style={{ fontSize:'10px', color:'#3A3A3A', background:'rgba(255,255,255,0.04)', padding:'1px 7px', borderRadius:'20px' }}>Daily</div>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
          <button onClick={() => toggleDone(r)}
            style={{ width:'28px', height:'28px', borderRadius:'8px', background: r.is_done ? `${type.color}15` : 'rgba(255,255,255,0.05)', border:`1px solid ${r.is_done ? type.color+'30' : 'rgba(255,255,255,0.08)'}`, color: r.is_done ? type.color : '#3A3A3A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', transition:'all 0.2s' }}>
            {r.is_done ? '✓' : '○'}
          </button>
          <button onClick={() => openEdit(r)}
            style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#3A3A3A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}
            onMouseEnter={e=>{e.currentTarget.style.color='#EAB308'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#3A3A3A'}}>
            ✏️
          </button>
          <button onClick={() => deleteReminder(r.id)}
            style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.1)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
            🗑️
          </button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(170,255,0,0.2)', borderTop:'3px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes glowPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes shimmer   { 0%{opacity:0.4} 50%{opacity:1} 100%{opacity:0.4} }
        *::-webkit-scrollbar { display:none }
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>Reminders</div>
              <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'600' }}>
                {nextFiring ? `⏰ ${nextFiring}` : todayStr}
              </div>
            </div>
          </div>
          <button onClick={() => { setShowAdd(!showAdd); setEditReminder(null) }}
            style={{ background:'linear-gradient(135deg,#AAFF00,#22C55E)', color:'#000', border:'none', borderRadius:'20px', padding:'9px 18px', fontSize:'13px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 16px rgba(170,255,0,0.3)' }}>
            + Add
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px' }}>
          {[{id:'today',label:'Today'},{id:'all',label:`All (${reminders.length})`}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex:1, padding:'8px', borderRadius:'8px', border:'none', background:tab===t.id?'#AAFF00':'transparent', color:tab===t.id?'#000':'#3A3A3A', fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* Notification permission banner */}
        {notifPerm !== 'granted' && (
          <div style={{ background: notifPerm==='denied' ? 'rgba(239,68,68,0.08)' : 'rgba(170,255,0,0.06)', border:`1px solid ${notifPerm==='denied'?'rgba(239,68,68,0.2)':'rgba(170,255,0,0.2)'}`, borderRadius:'18px', padding:'16px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ fontSize:'28px' }}>{notifPerm==='denied'?'🚫':'🔔'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'3px' }}>
                  {notifPerm==='denied' ? 'Notifications Blocked' : notifPerm==='unavailable' ? 'Notifications Not Available' : 'Enable Push Notifications'}
                </div>
                <div style={{ fontSize:'12px', color:'#52525B', lineHeight:'1.5' }}>
                  {notifPerm==='denied'
                    ? 'Go to browser settings → allow notifications for this site'
                    : notifPerm==='unavailable'
                    ? 'Your browser does not support push notifications'
                    : 'Get notified when it is time for your health reminders'}
                </div>
              </div>
              {notifPerm !== 'denied' && notifPerm !== 'unavailable' && (
                <button onClick={requestNotifPermission}
                  style={{ background:'#AAFF00', color:'#000', border:'none', borderRadius:'12px', padding:'10px 16px', fontSize:'12px', fontWeight:'800', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
                  Enable
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notification active + test */}
        {notifPerm === 'granted' && (
          <div style={{ background:'rgba(170,255,0,0.04)', border:'1px solid rgba(170,255,0,0.12)', borderRadius:'14px', padding:'12px 16px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#AAFF00', animation:'glowPulse 1.5s infinite', flexShrink:0 }}/>
            <div style={{ fontSize:'12px', color:'#AAFF00', fontWeight:'600', flex:1 }}>Push notifications active</div>
            <button onClick={testNotification}
              style={{ background:'rgba(170,255,0,0.1)', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'8px', padding:'5px 12px', color:'#AAFF00', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
              Test
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'14px', padding:'12px 16px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
            <span>⚠️</span><span style={{ fontSize:'13px', color:'#EF4444', flex:1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background:'transparent', border:'none', color:'#EF4444', cursor:'pointer', fontSize:'16px' }}>✕</button>
          </div>
        )}

        {/* Add Form */}
        {showAdd && !editReminder && (
          <div style={{ background:'#111', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>🔔 New Reminder</div>

            {/* Presets */}
            <button onClick={() => setShowPresets(!showPresets)}
              style={{ width:'100%', background:'rgba(170,255,0,0.06)', border:'1px solid rgba(170,255,0,0.15)', borderRadius:'12px', padding:'10px', color:'#AAFF00', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'12px' }}>
              ⚡ {showPresets ? 'Hide Presets' : 'Quick Add Preset'}
            </button>

            {showPresets && (
              <div style={{ maxHeight:'220px', overflowY:'auto', marginBottom:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => addPreset(p)} disabled={saving}
                    style={{ display:'flex', alignItems:'center', gap:'12px', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'10px 14px', cursor:'pointer', textAlign:'left', transition:'all 0.2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(170,255,0,0.3)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}>
                    <span style={{ fontSize:'20px' }}>{p.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff' }}>{p.title}</div>
                      <div style={{ fontSize:'10px', color:'#3A3A3A' }}>{p.time} · {p.repeat_daily?'Daily':'Once'}</div>
                    </div>
                    <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'700' }}>Add →</div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* Title */}
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Reminder Title *</div>
                <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Take Vitamins, Drink Water..." style={inp} autoFocus
                  onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>

              {/* Time */}
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Time *</div>
                <input type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>

              {/* Type */}
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Category</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
                  {TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm(p=>({...p,type:t.id,icon:t.icon}))}
                      style={{ padding:'8px 4px', borderRadius:'10px', border:`1.5px solid ${form.type===t.id?t.color:'rgba(255,255,255,0.06)'}`, background:form.type===t.id?`${t.color}10`:'#0D0D0D', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
                      <div style={{ fontSize:'18px', marginBottom:'2px' }}>{t.icon}</div>
                      <div style={{ fontSize:'9px', color:form.type===t.id?t.color:'#3A3A3A', fontWeight:'600' }}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0D0D0D', borderRadius:'12px', padding:'13px 14px' }}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'600', color:'#fff' }}>Repeat Daily</div>
                  <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'2px' }}>Fire this reminder every day</div>
                </div>
                <button onClick={() => setForm(p=>({...p,repeat_daily:!p.repeat_daily}))}
                  style={{ width:'48px', height:'26px', borderRadius:'13px', background:form.repeat_daily?'#AAFF00':'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', position:'relative', transition:'all 0.3s' }}>
                  <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'#000', position:'absolute', top:'3px', transition:'left 0.3s', left:form.repeat_daily?'25px':'3px' }}/>
                </button>
              </div>

              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={addReminder} disabled={!form.title.trim()||saving}
                  style={{ flex:1, background:!form.title.trim()||saving?'#1A1A1A':'#AAFF00', color:!form.title.trim()||saving?'#3A3A3A':'#000', border:'none', borderRadius:'12px', padding:'13px', fontSize:'14px', fontWeight:'800', cursor:'pointer', transition:'all 0.2s' }}>
                  {saving?'Saving...':'+ Add Reminder'}
                </button>
                <button onClick={resetForm}
                  style={{ background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'13px 18px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        {editReminder && (
          <div style={{ background:'#111', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>✏️ Edit Reminder</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Title" style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <input type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} style={inp}/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => setForm(p=>({...p,type:t.id,icon:t.icon}))}
                    style={{ padding:'7px 4px', borderRadius:'10px', border:`1.5px solid ${form.type===t.id?t.color:'rgba(255,255,255,0.06)'}`, background:form.type===t.id?`${t.color}10`:'#0D0D0D', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:'16px' }}>{t.icon}</div>
                    <div style={{ fontSize:'9px', color:form.type===t.id?t.color:'#3A3A3A', fontWeight:'600' }}>{t.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0D0D0D', borderRadius:'12px', padding:'12px 14px' }}>
                <span style={{ fontSize:'13px', color:'#fff', fontWeight:'600' }}>Repeat Daily</span>
                <button onClick={() => setForm(p=>({...p,repeat_daily:!p.repeat_daily}))}
                  style={{ width:'48px', height:'26px', borderRadius:'13px', background:form.repeat_daily?'#AAFF00':'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', position:'relative', transition:'all 0.3s' }}>
                  <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'#000', position:'absolute', top:'3px', left:form.repeat_daily?'25px':'3px', transition:'left 0.3s' }}/>
                </button>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={updateReminder} disabled={saving}
                  style={{ flex:1, background:'#AAFF00', color:'#000', border:'none', borderRadius:'12px', padding:'12px', fontSize:'14px', fontWeight:'800', cursor:'pointer', opacity:saving?0.7:1 }}>
                  {saving?'Saving...':'Save Changes'}
                </button>
                <button onClick={resetForm}
                  style={{ background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'12px 16px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TODAY TAB */}
        {tab === 'today' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>

            {/* Progress */}
            {todayRems.length > 0 && (
              <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'18px', padding:'16px', marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>Today's Progress</div>
                  <div style={{ fontSize:'13px', color:'#AAFF00', fontWeight:'800' }}>{doneCount}/{reminders.length}</div>
                </div>
                <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'linear-gradient(90deg,#AAFF00,#22C55E)', width:`${reminders.length > 0 ? (doneCount/reminders.length)*100 : 0}%`, borderRadius:'3px', transition:'width 0.8s ease', boxShadow:'0 0 8px rgba(170,255,0,0.4)' }}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginTop:'12px' }}>
                  {[
                    { label:'Upcoming', value:upcoming.length, color:'#AAFF00' },
                    { label:'Done',     value:doneCount,       color:'#22C55E' },
                    { label:'Total',    value:reminders.length,color:'#3B82F6' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:'18px', fontWeight:'800', color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase', marginTop:'2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px' }}>⏰ Upcoming</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {upcoming.map((r, i) => <ReminderCard key={r.id} r={r}/>)}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px' }}>Past</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', opacity:0.7 }}>
                  {past.map((r, i) => <ReminderCard key={r.id} r={r}/>)}
                </div>
              </div>
            )}

            {/* Empty */}
            {todayRems.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px' }}>🔔</div>
                <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>No reminders yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'24px' }}>Add health reminders to stay on track with your goals</div>
                <button onClick={() => setShowAdd(true)}
                  style={{ background:'#AAFF00', color:'#000', border:'none', borderRadius:'14px', padding:'13px 28px', fontSize:'15px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 20px rgba(170,255,0,0.3)' }}>
                  Add First Reminder
                </button>
              </div>
            )}
          </div>
        )}

        {/* ALL TAB */}
        {tab === 'all' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {reminders.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px' }}>🔔</div>
                <div style={{ fontSize:'16px', fontWeight:'600', color:'#fff', marginBottom:'20px' }}>No reminders yet</div>
                <button onClick={() => setShowAdd(true)}
                  style={{ background:'#AAFF00', color:'#000', border:'none', borderRadius:'14px', padding:'12px 24px', fontSize:'14px', fontWeight:'800', cursor:'pointer' }}>
                  Add Reminder
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {reminders.map(r => <ReminderCard key={r.id} r={r}/>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/habits',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,label:'Habits'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/reminders',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>,label:'Reminders',active:true},
            {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?'#AAFF00':'#3A3A3A',fontWeight:(n as any).active?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}