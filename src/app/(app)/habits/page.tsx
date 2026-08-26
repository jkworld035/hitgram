'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Habit {
  id: string
  name: string
  icon: string
  description: string | null
  frequency: string
  current_streak: number
  longest_streak: number
  total_completions: number
  is_active: boolean
  created_at: string
}

const ICONS = ['💧','🏃','🧘','📚','💊','🥗','😴','💪','🧠','✍️','🎯','🌅','🚶','🍎','☕','🎵','📱','🚴','🏊','🧹']
const PRESET_HABITS = [
  { name:'Drink 2L Water',       icon:'💧', description:'Stay hydrated throughout the day' },
  { name:'Morning Walk',         icon:'🚶', description:'10 minute walk after waking up' },
  { name:'Meditation',           icon:'🧘', description:'10 minutes of mindfulness' },
  { name:'Read 20 Minutes',      icon:'📚', description:'Read a book or article daily' },
  { name:'Take Supplements',     icon:'💊', description:'Daily vitamins and supplements' },
  { name:'Eat Vegetables',       icon:'🥗', description:'Include vegetables in every meal' },
  { name:'Sleep by 11 PM',       icon:'😴', description:'Consistent bedtime for better sleep' },
  { name:'Strength Training',    icon:'💪', description:'Workout session at least 30 minutes' },
  { name:'Journal',              icon:'✍️', description:'Write thoughts and gratitude daily' },
  { name:'No Social Media AM',   icon:'📱', description:'No phone for first hour after waking' },
]

export default function HabitsPage() {
  const [habits,      setHabits]      = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [editHabit,   setEditHabit]   = useState<Habit | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [tab,         setTab]         = useState<'today'|'all'|'stats'>('today')
  const [form,        setForm]        = useState({ name:'', icon:'💧', description:'', frequency:'daily' })
  const supabase = createClient()
  const today    = new Date().toISOString().split('T')[0]

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await Promise.all([ fetchHabits(user.id), fetchCompletions(user.id) ])
    setLoading(false)
  }

  const fetchHabits = async (uid: string) => {
    const { data } = await supabase.from('habits').select('*').eq('user_id', uid).order('created_at', { ascending: true })
    if (data) setHabits(data)
  }

  const fetchCompletions = async (uid: string) => {
    const { data } = await supabase.from('habit_completions').select('habit_id').eq('user_id', uid).eq('completed_date', today)
    if (data) setCompletions(new Set(data.map(c => c.habit_id)))
  }

  const toggleHabit = async (habit: Habit) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const done = completions.has(habit.id)
    const newC  = new Set(completions)

    if (done) {
      newC.delete(habit.id)
      setCompletions(newC)
      await supabase.from('habit_completions').delete().eq('habit_id', habit.id).eq('completed_date', today).eq('user_id', user.id)
      await supabase.from('habits').update({ current_streak: Math.max(0, habit.current_streak - 1) }).eq('id', habit.id)
    } else {
      newC.add(habit.id)
      setCompletions(newC)
      await supabase.from('habit_completions').insert({ habit_id: habit.id, user_id: user.id, completed_date: today })
      const newStreak  = habit.current_streak + 1
      const newLongest = Math.max(habit.longest_streak, newStreak)
      await supabase.from('habits').update({
        current_streak: newStreak, longest_streak: newLongest,
        total_completions: habit.total_completions + 1,
      }).eq('id', habit.id)
      setHabits(p => p.map(h => h.id === habit.id ? { ...h, current_streak: newStreak, longest_streak: newLongest, total_completions: h.total_completions + 1 } : h))
    }
  }

  const addHabit = async (name: string, icon: string, description: string) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('habits').insert({
      user_id: user.id, name, icon, description,
      frequency: form.frequency, is_active: true,
    })
    await fetchHabits(user.id)
    setShowAdd(false)
    setShowPresets(false)
    setForm({ name:'', icon:'💧', description:'', frequency:'daily' })
    setSaving(false)
  }

  const updateHabit = async () => {
    if (!editHabit) return
    setSaving(true)
    await supabase.from('habits').update({
      name: form.name, icon: form.icon, description: form.description,
    }).eq('id', editHabit.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await fetchHabits(user.id)
    setEditHabit(null)
    setSaving(false)
  }

  const toggleActive = async (habit: Habit) => {
    await supabase.from('habits').update({ is_active: !habit.is_active }).eq('id', habit.id)
    setHabits(p => p.map(h => h.id === habit.id ? { ...h, is_active: !h.is_active } : h))
  }

  const deleteHabit = async (id: string) => {
    if (!confirm('Delete this habit? This will remove all completion history.')) return
    await supabase.from('habit_completions').delete().eq('habit_id', id)
    await supabase.from('habits').delete().eq('id', id)
    setHabits(p => p.filter(h => h.id !== id))
  }

  const openEdit = (h: Habit) => {
    setForm({ name: h.name, icon: h.icon, description: h.description || '', frequency: h.frequency })
    setEditHabit(h)
  }

  const activeHabits  = habits.filter(h => h.is_active)
  const doneToday     = activeHabits.filter(h => completions.has(h.id)).length
  const pct           = activeHabits.length > 0 ? Math.round(doneToday / activeHabits.length * 100) : 0
  const bestStreak    = habits.reduce((m, h) => Math.max(m, h.longest_streak), 0)
  const totalDone     = habits.reduce((s, h) => s + h.total_completions, 0)

  const inp: React.CSSProperties = {
    width:'100%', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'14px', outline:'none',
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(170,255,0,0.2)', borderTop:'3px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} *::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ position:'sticky',top:0,zIndex:50,background:'rgba(10,10,10,0.97)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'52px 20px 16px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px',height:'36px',borderRadius:'10px',background:'#111',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',textDecoration:'none',fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px',fontWeight:'800',color:'#fff' }}>Habits</div>
              <div style={{ fontSize:'11px',color:'#EAB308',fontWeight:'600' }}>{doneToday}/{activeHabits.length} done today</div>
            </div>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ background:'linear-gradient(135deg,#EAB308,#F97316)',color:'#000',border:'none',borderRadius:'20px',padding:'9px 18px',fontSize:'13px',fontWeight:'800',cursor:'pointer',boxShadow:'0 0 16px rgba(234,179,8,0.3)' }}>
            + Add Habit
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:'12px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'6px' }}>
            <span style={{ fontSize:'12px',color:'#3A3A3A',fontWeight:'600' }}>Today's Progress</span>
            <span style={{ fontSize:'12px',color:pct===100?'#AAFF00':'#EAB308',fontWeight:'700' }}>{pct}%</span>
          </div>
          <div style={{ height:'6px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden' }}>
            <div style={{ height:'100%',background:pct===100?'linear-gradient(90deg,#AAFF00,#22C55E)':'linear-gradient(90deg,#EAB308,#F97316)',width:`${pct}%`,borderRadius:'3px',transition:'width 0.8s ease',boxShadow:`0 0 8px ${pct===100?'rgba(170,255,0,0.5)':'rgba(234,179,8,0.5)'}` }}/>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'4px',gap:'4px' }}>
          {(['today','all','stats'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1,padding:'8px',borderRadius:'8px',border:'none',background:tab===t?'#EAB308':'transparent',color:tab===t?'#000':'#3A3A3A',fontSize:'12px',fontWeight:'700',cursor:'pointer',textTransform:'capitalize',transition:'all 0.2s' }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* Add Habit Form */}
        {showAdd && !editHabit && (
          <div style={{ background:'#111',border:'1px solid rgba(234,179,8,0.2)',borderRadius:'20px',padding:'18px',marginBottom:'14px',animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'14px' }}>New Habit</div>

            {/* Presets */}
            <button onClick={() => setShowPresets(!showPresets)}
              style={{ width:'100%',background:'rgba(234,179,8,0.06)',border:'1px solid rgba(234,179,8,0.15)',borderRadius:'12px',padding:'11px',color:'#EAB308',fontSize:'13px',fontWeight:'700',cursor:'pointer',marginBottom:'12px' }}>
              ⚡ Quick Add from Presets
            </button>

            {showPresets && (
              <div style={{ display:'flex',flexDirection:'column',gap:'8px',marginBottom:'14px',maxHeight:'240px',overflowY:'auto' }}>
                {PRESET_HABITS.map(p => (
                  <button key={p.name} onClick={() => addHabit(p.name, p.icon, p.description)}
                    style={{ display:'flex',alignItems:'center',gap:'12px',background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'12px',cursor:'pointer',textAlign:'left',transition:'all 0.2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(234,179,8,0.3)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}>
                    <span style={{ fontSize:'20px' }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize:'13px',fontWeight:'600',color:'#fff' }}>{p.name}</div>
                      <div style={{ fontSize:'11px',color:'#3A3A3A',marginTop:'1px' }}>{p.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
              {/* Icon picker */}
              <div>
                <div style={{ fontSize:'11px',color:'#3A3A3A',fontWeight:'600',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.06em' }}>Icon</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:'8px' }}>
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setForm(p=>({...p,icon}))}
                      style={{ width:'40px',height:'40px',borderRadius:'10px',background:form.icon===icon?'rgba(234,179,8,0.15)':'#0D0D0D',border:`1.5px solid ${form.icon===icon?'#EAB308':'rgba(255,255,255,0.06)'}`,fontSize:'20px',cursor:'pointer',transition:'all 0.2s' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'11px',color:'#3A3A3A',fontWeight:'600',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.06em' }}>Habit Name</div>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Morning Walk" style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'11px',color:'#3A3A3A',fontWeight:'600',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.06em' }}>Description</div>
                <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Why is this habit important?" style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div style={{ display:'flex',gap:'10px' }}>
                <button onClick={() => addHabit(form.name, form.icon, form.description)} disabled={!form.name.trim() || saving}
                  style={{ flex:1,background:'#EAB308',color:'#000',border:'none',borderRadius:'12px',padding:'12px',fontSize:'14px',fontWeight:'800',cursor:'pointer',opacity:!form.name.trim()||saving?0.5:1 }}>
                  {saving?'Adding...':'Add Habit'}
                </button>
                <button onClick={() => { setShowAdd(false); setShowPresets(false) }}
                  style={{ flex:1,background:'transparent',color:'#3A3A3A',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Habit Modal */}
        {editHabit && (
          <div style={{ background:'#111',border:'1px solid rgba(234,179,8,0.2)',borderRadius:'20px',padding:'18px',marginBottom:'14px',animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'14px' }}>Edit Habit</div>
            <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
              <div style={{ display:'flex',flexWrap:'wrap',gap:'8px' }}>
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(p=>({...p,icon}))}
                    style={{ width:'40px',height:'40px',borderRadius:'10px',background:form.icon===icon?'rgba(234,179,8,0.15)':'#0D0D0D',border:`1.5px solid ${form.icon===icon?'#EAB308':'rgba(255,255,255,0.06)'}`,fontSize:'20px',cursor:'pointer',transition:'all 0.2s' }}>
                    {icon}
                  </button>
                ))}
              </div>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Description" style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <div style={{ display:'flex',gap:'8px' }}>
                <button onClick={updateHabit} disabled={saving}
                  style={{ flex:1,background:'#EAB308',color:'#000',border:'none',borderRadius:'12px',padding:'12px',fontSize:'14px',fontWeight:'800',cursor:'pointer' }}>
                  {saving?'Saving...':'Save Changes'}
                </button>
                <button onClick={() => setEditHabit(null)}
                  style={{ flex:1,background:'transparent',color:'#3A3A3A',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TODAY TAB */}
        {tab === 'today' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {pct === 100 && activeHabits.length > 0 && (
              <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.08),rgba(34,197,94,0.04))',border:'1px solid rgba(170,255,0,0.2)',borderRadius:'18px',padding:'16px',marginBottom:'14px',textAlign:'center' }}>
                <div style={{ fontSize:'32px',marginBottom:'8px' }}>🎉</div>
                <div style={{ fontSize:'16px',fontWeight:'800',color:'#AAFF00',marginBottom:'4px' }}>All habits complete!</div>
                <div style={{ fontSize:'13px',color:'#52525B' }}>Outstanding discipline today. Keep this streak going!</div>
              </div>
            )}
            {activeHabits.length === 0 ? (
              <div style={{ textAlign:'center',padding:'60px 20px' }}>
                <div style={{ fontSize:'48px',marginBottom:'16px' }}>✅</div>
                <div style={{ fontSize:'16px',fontWeight:'600',color:'#fff',marginBottom:'8px' }}>No active habits yet</div>
                <div style={{ fontSize:'13px',color:'#3A3A3A',marginBottom:'20px' }}>Add your first habit to start building consistency</div>
                <button onClick={() => setShowAdd(true)}
                  style={{ background:'#EAB308',color:'#000',border:'none',borderRadius:'14px',padding:'12px 24px',fontSize:'14px',fontWeight:'800',cursor:'pointer' }}>
                  Add First Habit
                </button>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
                {activeHabits.map((h, i) => {
                  const done = completions.has(h.id)
                  return (
                    <div key={h.id} style={{ background:done?'rgba(170,255,0,0.04)':'#111',border:`1px solid ${done?'rgba(170,255,0,0.15)':'rgba(255,255,255,0.06)'}`,borderRadius:'18px',padding:'16px',display:'flex',alignItems:'center',gap:'14px',animation:`fadeInUp 0.5s ease ${i*0.06}s both`,transition:'all 0.2s' }}>
                      <button onClick={() => toggleHabit(h)}
                        style={{ width:'28px',height:'28px',borderRadius:'8px',border:`2px solid ${done?'#AAFF00':'rgba(255,255,255,0.15)'}`,background:done?'#AAFF00':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s' }}>
                        {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                      </button>
                      <span style={{ fontSize:'24px',flexShrink:0 }}>{h.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'15px',fontWeight:'600',color:done?'#AAFF00':'#fff' }}>{h.name}</div>
                        {h.description && <div style={{ fontSize:'11px',color:'#3A3A3A',marginTop:'2px' }}>{h.description}</div>}
                        <div style={{ display:'flex',gap:'10px',marginTop:'6px' }}>
                          {h.current_streak > 0 && (
                            <div style={{ fontSize:'11px',color:'#F97316',fontWeight:'700',background:'rgba(249,115,22,0.1)',padding:'2px 8px',borderRadius:'20px' }}>🔥 {h.current_streak} day streak</div>
                          )}
                          {h.total_completions > 0 && (
                            <div style={{ fontSize:'11px',color:'#3A3A3A',background:'rgba(255,255,255,0.04)',padding:'2px 8px',borderRadius:'20px' }}>✓ {h.total_completions} total</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display:'flex',gap:'8px' }}>
                        <button onClick={() => openEdit(h)}
                          style={{ width:'32px',height:'32px',borderRadius:'8px',background:'rgba(255,255,255,0.04)',border:'none',color:'#3A3A3A',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center' }}>
                          ✏️
                        </button>
                        <button onClick={() => deleteHabit(h.id)}
                          style={{ width:'32px',height:'32px',borderRadius:'8px',background:'rgba(239,68,68,0.06)',border:'none',color:'#EF4444',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ALL TAB */}
        {tab === 'all' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ fontSize:'12px',color:'#3A3A3A',fontWeight:'600',marginBottom:'12px' }}>{habits.length} total habits</div>
            {habits.map((h, i) => (
              <div key={h.id} style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'18px',padding:'14px 16px',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px',opacity:h.is_active?1:0.5,animation:`fadeInUp 0.5s ease ${i*0.05}s both` }}>
                <span style={{ fontSize:'22px' }}>{h.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px',fontWeight:'600',color:'#fff' }}>{h.name}</div>
                  <div style={{ display:'flex',gap:'8px',marginTop:'4px' }}>
                    <span style={{ fontSize:'10px',color:'#F97316' }}>🔥 {h.current_streak}d streak</span>
                    <span style={{ fontSize:'10px',color:'#3A3A3A' }}>Best: {h.longest_streak}d</span>
                    <span style={{ fontSize:'10px',color:'#3A3A3A' }}>Total: {h.total_completions}</span>
                  </div>
                </div>
                <div style={{ display:'flex',gap:'8px',alignItems:'center' }}>
                  <button onClick={() => toggleActive(h)}
                    style={{ fontSize:'11px',color:h.is_active?'#22C55E':'#3A3A3A',fontWeight:'700',background:h.is_active?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.04)',border:'none',borderRadius:'20px',padding:'4px 10px',cursor:'pointer' }}>
                    {h.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button onClick={() => openEdit(h)} style={{ background:'rgba(255,255,255,0.04)',border:'none',color:'#3A3A3A',cursor:'pointer',width:'32px',height:'32px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center' }}>✏️</button>
                  <button onClick={() => deleteHabit(h.id)} style={{ background:'rgba(239,68,68,0.06)',border:'none',color:'#EF4444',cursor:'pointer',width:'32px',height:'32px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px',marginBottom:'14px' }}>
              {[
                { label:'Total Habits',      value:habits.length,    color:'#EAB308',icon:'📋' },
                { label:'Active Habits',     value:activeHabits.length,color:'#22C55E',icon:'✅' },
                { label:'Total Completions', value:totalDone,        color:'#AAFF00',icon:'🏆' },
                { label:'Best Streak',       value:`${bestStreak}d`, color:'#F97316',icon:'🔥' },
              ].map(s => (
                <div key={s.label} style={{ background:'#111',border:`1px solid ${s.color}15`,borderRadius:'18px',padding:'16px',textAlign:'center' }}>
                  <div style={{ fontSize:'24px',marginBottom:'6px' }}>{s.icon}</div>
                  <div style={{ fontSize:'24px',fontWeight:'900',color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600',marginTop:'2px',textTransform:'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Per-habit stats */}
            {habits.map((h, i) => (
              <div key={h.id} style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'16px',padding:'14px 16px',marginBottom:'8px',animation:`fadeInUp 0.5s ease ${i*0.05}s both` }}>
                <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px' }}>
                  <span style={{ fontSize:'20px' }}>{h.icon}</span>
                  <div style={{ fontSize:'14px',fontWeight:'600',color:'#fff' }}>{h.name}</div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px' }}>
                  {[
                    { label:'Streak',   value:`${h.current_streak}d`, color:'#F97316' },
                    { label:'Best',     value:`${h.longest_streak}d`, color:'#EAB308' },
                    { label:'Total',    value:String(h.total_completions), color:'#AAFF00' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#0D0D0D',borderRadius:'10px',padding:'8px',textAlign:'center' }}>
                      <div style={{ fontSize:'14px',fontWeight:'800',color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:'9px',color:'#3A3A3A',fontWeight:'600',marginTop:'1px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Streak bar */}
                <div style={{ marginTop:'8px' }}>
                  <div style={{ height:'3px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden' }}>
                    <div style={{ height:'100%',background:'#F97316',width:`${Math.min((h.current_streak/Math.max(h.longest_streak,1))*100,100)}%`,borderRadius:'2px',transition:'width 0.8s ease' }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',zIndex:100,background:'rgba(10,10,10,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 24px 28px' }}>
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