'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = () => (
  <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',zIndex:100,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 24px 28px' }}>
    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
      <a href="/dashboard" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Home</div>
      </a>
      <a href="/social" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Social</div>
      </a>
      <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
      </a>
      <a href="/goals" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Goals</div>
      </a>
      <a href="/profile" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Profile</div>
      </a>
    </div>
  </div>
)

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [tab, setTab] = useState('Tasks')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newR, setNewR] = useState({ title:'', time:'', type:'general', icon:'🔔' })
  const supabase = createClient()
  const icons = ['🔔','🏋️','💧','🥗','😴','📚','💊','🧘','🏃','⏰']

  const defaults = [
    { id:'d1', title:'Morning Workout', time:'7:00 AM', icon:'🏋️', type:'workout', is_done:false },
    { id:'d2', title:'Drink Water', time:'Every 2 hours', icon:'💧', type:'water', is_done:false },
    { id:'d3', title:'Take Supplements', time:'After Workout', icon:'💊', type:'meal', is_done:false },
    { id:'d4', title:'Healthy Lunch', time:'12:30 PM', icon:'🥗', type:'meal', is_done:false },
    { id:'d5', title:'Evening Walk', time:'6:00 PM', icon:'🏃', type:'workout', is_done:false },
  ]

  const alerts = [
    { icon:'🤖', title:'AI Coach Tip', desc:"You're 200 calories under your goal. Consider a protein snack!", time:'Just now', color:'#AAFF00' },
    { icon:'💧', title:'Water Reminder', desc:"You haven't logged water in 2 hours. Stay hydrated!", time:'1h ago', color:'#3B82F6' },
    { icon:'🏋️', title:'Workout Time!', desc:"Your scheduled workout starts in 30 minutes. Get ready!", time:'2h ago', color:'#F97316' },
    { icon:'🌙', title:'Sleep Reminder', desc:'Time to wind down. Put your phone away for better sleep.', time:'8h ago', color:'#8B5CF6' },
    { icon:'🎯', title:'Goal Update', desc:"You're 65% towards your goal. Keep going!", time:'1d ago', color:'#22C55E' },
  ]

  useEffect(() => { fetchReminders() }, [])

  const fetchReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('reminders').select('*').eq('user_id', user.id).order('created_at',{ ascending:false })
    if (data) setReminders(data)
  }

  const addReminder = async () => {
    if (!newR.title.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('reminders').insert({ user_id:user.id, title:newR.title, time:newR.time, type:newR.type, icon:newR.icon })
    setNewR({ title:'', time:'', type:'general', icon:'🔔' })
    setShowAdd(false); setLoading(false); fetchReminders()
  }

  const toggleDone = async (id: string, isDone: boolean) => {
    if (id.startsWith('d')) return
    await supabase.from('reminders').update({ is_done:!isDone }).eq('id', id)
    fetchReminders()
  }

  const deleteReminder = async (id: string) => {
    if (id.startsWith('d')) return
    await supabase.from('reminders').delete().eq('id', id)
    fetchReminders()
  }

  const allTasks = [...defaults, ...reminders]
  const inp = { background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'11px 14px', color:'#fff', fontSize:'13px', outline:'none' } as React.CSSProperties

  return (
    <div style={{ minHeight:'100vh',background:'#0A0A0A',paddingBottom:'100px',animation:'fadeInUp 0.4s ease both' }}>
      <div style={{ position:'sticky',top:0,zIndex:50,background:'rgba(10,10,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.04)',padding:'52px 20px 16px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px',height:'36px',borderRadius:'10px',background:'#111',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',textDecoration:'none',fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px',fontWeight:'800',color:'#fff' }}>Reminders</div>
              <div style={{ fontSize:'11px',color:'#3A3A3A' }}>Stay on track</div>
            </div>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ background:'#FB923C',color:'#fff',border:'none',borderRadius:'20px',padding:'9px 18px',fontSize:'13px',fontWeight:'800',boxShadow:'0 0 16px rgba(251,146,60,0.3)' }}>
            + Add
          </button>
        </div>
        <div style={{ display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'4px',gap:'4px' }}>
          {['Tasks','Habits','Alerts'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1,padding:'9px',borderRadius:'8px',border:'none',background:tab===t?'#AAFF00':'transparent',color:tab===t?'#000':'#3A3A3A',fontSize:'13px',fontWeight:'700',cursor:'pointer',transition:'all 0.2s' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {showAdd && (
          <div style={{ background:'#111',border:'1px solid rgba(251,146,60,0.2)',borderRadius:'20px',padding:'18px',marginBottom:'14px',animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px',fontWeight:'700',color:'#fff',marginBottom:'14px' }}>New Reminder</div>
            <div style={{ display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px' }}>
              {icons.map(icon => (
                <button key={icon} onClick={() => setNewR(p => ({ ...p,icon }))}
                  style={{ width:'38px',height:'38px',borderRadius:'10px',border:'1.5px solid',borderColor:newR.icon===icon?'#FB923C':'rgba(255,255,255,0.07)',background:newR.icon===icon?'rgba(251,146,60,0.1)':'#0D0D0D',fontSize:'18px',cursor:'pointer' }}>
                  {icon}
                </button>
              ))}
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'10px',marginBottom:'12px' }}>
              <input placeholder="Reminder title" value={newR.title} onChange={e => setNewR(p => ({ ...p,title:e.target.value }))}
                style={{ ...inp,width:'100%' }}
                onFocus={e => e.target.style.borderColor='rgba(251,146,60,0.4)'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px' }}>
                <input placeholder="Time e.g. 7:00 AM" value={newR.time} onChange={e => setNewR(p => ({ ...p,time:e.target.value }))} style={inp}/>
                <select value={newR.type} onChange={e => setNewR(p => ({ ...p,type:e.target.value }))} style={inp}>
                  {['general','workout','water','meal','sleep','habit'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <button onClick={addReminder} disabled={loading}
              style={{ width:'100%',background:'#FB923C',color:'#fff',border:'none',borderRadius:'12px',padding:'12px',fontSize:'14px',fontWeight:'800',opacity:loading?0.7:1 }}>
              {loading?'Adding...':'Add Reminder'}
            </button>
          </div>
        )}

        {tab==='Tasks' && (
          <div>
            <div style={{ fontSize:'11px',color:'#3A3A3A',fontWeight:'700',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px' }}>
              Pending · {allTasks.filter(r=>!r.is_done).length}
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px' }}>
              {allTasks.filter(r=>!r.is_done).map((r,i) => (
                <div key={r.id} style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'16px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px',animation:`fadeInUp 0.5s ease ${i*0.05}s both` }}>
                  <button onClick={() => toggleDone(r.id, r.is_done)}
                    style={{ width:'24px',height:'24px',borderRadius:'50%',border:'1.5px solid rgba(255,255,255,0.15)',background:'transparent',cursor:'pointer',flexShrink:0,transition:'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#AAFF00' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.15)' }}/>
                  <div style={{ width:'40px',height:'40px',borderRadius:'12px',background:'#0D0D0D',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0 }}>{r.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px',fontWeight:'600',color:'#fff' }}>{r.title}</div>
                    {r.time && <div style={{ fontSize:'11px',color:'#3A3A3A',marginTop:'2px' }}>⏰ {r.time}</div>}
                  </div>
                  {!r.id.startsWith('d') && (
                    <button onClick={() => deleteReminder(r.id)}
                      style={{ background:'transparent',border:'none',color:'#3A3A3A',cursor:'pointer',fontSize:'16px',transition:'color 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.color='#EF4444' }}
                      onMouseLeave={e => { e.currentTarget.style.color='#3A3A3A' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setShowAdd(true)}
              style={{ width:'100%',background:'rgba(251,146,60,0.06)',border:'1px dashed rgba(251,146,60,0.2)',borderRadius:'16px',padding:'14px',color:'#FB923C',fontSize:'14px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px' }}>
              + Add New Task
            </button>
          </div>
        )}

        {tab==='Habits' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
            {[
              { icon:'💧', title:'Drink 2.5L Water', desc:'Every day', progress:72, color:'#3B82F6' },
              { icon:'🏃', title:'10,000 Steps', desc:'Every day', progress:45, color:'#AAFF00' },
              { icon:'😴', title:'Sleep 8 Hours', desc:'Every night', progress:90, color:'#8B5CF6' },
              { icon:'🧘', title:'Morning Meditation', desc:'Every morning', progress:60, color:'#22C55E' },
              { icon:'📚', title:'Read 30 Minutes', desc:'Every day', progress:30, color:'#F97316' },
            ].map((h,i) => (
              <div key={i} style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'16px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px',animation:`fadeInUp 0.5s ease ${i*0.06}s both` }}>
                <div style={{ width:'44px',height:'44px',borderRadius:'14px',background:`${h.color}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0 }}>{h.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'6px' }}>
                    <div style={{ fontSize:'14px',fontWeight:'600',color:'#fff' }}>{h.title}</div>
                    <div style={{ fontSize:'12px',color:h.color,fontWeight:'700' }}>{h.progress}%</div>
                  </div>
                  <div style={{ height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden' }}>
                    <div style={{ height:'100%',background:h.color,width:`${h.progress}%`,borderRadius:'2px',boxShadow:`0 0 4px ${h.color}80` }}/>
                  </div>
                  <div style={{ fontSize:'11px',color:'#3A3A3A',marginTop:'4px' }}>{h.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='Alerts' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
            {alerts.map((a,i) => (
              <div key={i} style={{ background:'#111',border:`1px solid ${a.color}18`,borderRadius:'16px',padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:'12px',animation:`fadeInUp 0.5s ease ${i*0.06}s both` }}>
                <div style={{ width:'40px',height:'40px',borderRadius:'12px',background:`${a.color}12`,border:`1px solid ${a.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0 }}>{a.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'4px' }}>
                    <div style={{ fontSize:'13px',fontWeight:'700',color:a.color }}>{a.title}</div>
                    <div style={{ fontSize:'11px',color:'#3A3A3A' }}>{a.time}</div>
                  </div>
                  <div style={{ fontSize:'13px',color:'#A1A1AA',lineHeight:'1.5' }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <NAV />
    </div>
  )
}