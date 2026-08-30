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

const ICONS = ['💧','🏃','🧘','📚','💊','🥗','😴','💪','🧠','✍️','🎯','🌅','🚶','🍎','☕','🎵','📱','🚴','🏊','🧹','⚡','🌿','🦷','🧘','🏋️']

const PRESETS = [
  { name:'Drink 2L Water',      icon:'💧', description:'Stay hydrated throughout the day' },
  { name:'Morning Walk',        icon:'🚶', description:'10 minute walk after waking up' },
  { name:'Meditation',          icon:'🧘', description:'10 minutes of mindfulness practice' },
  { name:'Read 20 Minutes',     icon:'📚', description:'Read a book or article daily' },
  { name:'Take Supplements',    icon:'💊', description:'Daily vitamins and supplements' },
  { name:'Eat Vegetables',      icon:'🥗', description:'Include vegetables in every meal' },
  { name:'Sleep by 11 PM',      icon:'😴', description:'Consistent bedtime for better sleep' },
  { name:'Strength Training',   icon:'💪', description:'Workout session at least 30 minutes' },
  { name:'Journal',             icon:'✍️', description:'Write thoughts and gratitude daily' },
  { name:'No Phone 1st Hour',   icon:'📱', description:'No phone for first hour after waking' },
  { name:'Cold Shower',         icon:'🚿', description:'End shower with 30 seconds cold water' },
  { name:'Gratitude Practice',  icon:'🙏', description:'Write 3 things you are grateful for' },
]

export default function HabitsPage() {
  const [habits,      setHabits]      = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [editHabit,   setEditHabit]   = useState<Habit | null>(null)
  const [tab,         setTab]         = useState<'today'|'all'|'stats'>('today')
  const [userId,      setUserId]      = useState<string>('')
  const [error,       setError]       = useState('')
  const [form,        setForm]        = useState({ name:'', icon:'💧', description:'' })
  const supabase = createClient()
  const today    = new Date().toISOString().split('T')[0]

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) {
        setError('Not logged in')
        setLoading(false)
        return
      }
      setUserId(user.id)

      // Ensure profile exists — this is critical for habits to save
      await supabase.from('profiles').upsert({
        id:         user.id,
        username:   user.email?.split('@')[0] || 'user',
        full_name:  user.email?.split('@')[0] || 'User',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      await Promise.all([
        fetchHabits(user.id),
        fetchCompletions(user.id),
      ])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchHabits = async (uid: string) => {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Fetch habits error:', error)
      setError(`Failed to load habits: ${error.message}`)
      return
    }
    setHabits(data || [])
  }

  const fetchCompletions = async (uid: string) => {
    const { data, error } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('user_id', uid)
      .eq('completed_date', today)

    if (error) {
      console.error('Fetch completions error:', error)
      return
    }
    setCompletions(new Set((data || []).map(c => c.habit_id)))
  }

  const addHabit = async (name: string, icon: string, description: string) => {
    if (!name.trim()) { setError('Please enter a habit name'); return }
    if (!userId)      { setError('Not logged in'); return }

    setSaving(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id:           userId,
          name:              name.trim(),
          icon:              icon || '✅',
          description:       description?.trim() || '',
          frequency:         'daily',
          current_streak:    0,
          longest_streak:    0,
          total_completions: 0,
          is_active:         true,
        })
        .select()
        .single()

      if (error) {
        console.error('Add habit error:', error)
        setError(`Could not save: ${error.message} (${error.code})`)
        return
      }

      if (data) {
        setHabits(prev => [...prev, data as Habit])
      }

      setShowAdd(false)
      setShowPresets(false)
      setForm({ name:'', icon:'💧', description:'' })

    } catch (err: any) {
      setError('Unexpected error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleHabit = async (habit: Habit) => {
    if (!userId) return
    const done = completions.has(habit.id)
    const newC = new Set(completions)

    if (done) {
      newC.delete(habit.id)
      setCompletions(newC)
      await supabase.from('habit_completions')
        .delete()
        .eq('habit_id', habit.id)
        .eq('completed_date', today)
        .eq('user_id', userId)
      await supabase.from('habits')
        .update({ current_streak: Math.max(0, habit.current_streak - 1) })
        .eq('id', habit.id)
      setHabits(p => p.map(h => h.id === habit.id ? { ...h, current_streak: Math.max(0, h.current_streak - 1) } : h))
    } else {
      newC.add(habit.id)
      setCompletions(newC)
      const { error } = await supabase.from('habit_completions')
        .insert({ habit_id: habit.id, user_id: userId, completed_date: today })
      if (error && error.code !== '23505') {
        console.error('Completion error:', error)
        newC.delete(habit.id)
        setCompletions(new Set(newC))
        return
      }
      const newStreak  = habit.current_streak + 1
      const newLongest = Math.max(habit.longest_streak, newStreak)
      await supabase.from('habits')
        .update({ current_streak: newStreak, longest_streak: newLongest, total_completions: habit.total_completions + 1 })
        .eq('id', habit.id)
      setHabits(p => p.map(h => h.id === habit.id
        ? { ...h, current_streak: newStreak, longest_streak: newLongest, total_completions: h.total_completions + 1 }
        : h))
    }
  }

  const updateHabit = async () => {
    if (!editHabit || !form.name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('habits')
      .update({ name: form.name.trim(), icon: form.icon, description: form.description.trim() })
      .eq('id', editHabit.id)
    if (!error) {
      setHabits(p => p.map(h => h.id === editHabit.id ? { ...h, name: form.name, icon: form.icon, description: form.description } : h))
      setEditHabit(null)
    } else {
      setError(error.message)
    }
    setSaving(false)
  }

  const toggleActive = async (habit: Habit) => {
    await supabase.from('habits').update({ is_active: !habit.is_active }).eq('id', habit.id)
    setHabits(p => p.map(h => h.id === habit.id ? { ...h, is_active: !h.is_active } : h))
  }

  const deleteHabit = async (id: string) => {
    if (!confirm('Delete this habit and all its history?')) return
    await supabase.from('habit_completions').delete().eq('habit_id', id)
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) setHabits(p => p.filter(h => h.id !== id))
    else setError(error.message)
  }

  const openEdit = (h: Habit) => {
    setForm({ name: h.name, icon: h.icon, description: h.description || '' })
    setEditHabit(h)
    setShowAdd(false)
  }

  const activeHabits = habits.filter(h => h.is_active)
  const doneToday    = activeHabits.filter(h => completions.has(h.id)).length
  const pct          = activeHabits.length > 0 ? Math.round(doneToday / activeHabits.length * 100) : 0
  const bestStreak   = habits.reduce((m, h) => Math.max(m, h.longest_streak), 0)
  const totalDone    = habits.reduce((s, h) => s + h.total_completions, 0)

  const inp: React.CSSProperties = {
    width:'100%', background:'#0D0D0D',
    border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'12px', padding:'12px 14px',
    color:'#fff', fontSize:'14px', outline:'none',
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'44px', height:'44px', border:'3px solid rgba(234,179,8,0.2)', borderTop:'3px solid #EAB308', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }}/>
        <div style={{ fontSize:'14px', color:'#3A3A3A' }}>Loading habits...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(10,10,10,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>Habits</div>
              <div style={{ fontSize:'11px', color:'#EAB308', fontWeight:'600' }}>{doneToday}/{activeHabits.length} done today · {pct}%</div>
            </div>
          </div>
          <button onClick={() => { setShowAdd(!showAdd); setEditHabit(null); setShowPresets(false) }}
            style={{ background:'linear-gradient(135deg,#EAB308,#F97316)', color:'#000', border:'none', borderRadius:'20px', padding:'9px 18px', fontSize:'13px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 16px rgba(234,179,8,0.3)' }}>
            + Add Habit
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:'12px' }}>
          <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ height:'100%', background: pct === 100 ? 'linear-gradient(90deg,#AAFF00,#22C55E)' : 'linear-gradient(90deg,#EAB308,#F97316)', width:`${pct}%`, borderRadius:'3px', transition:'width 0.8s ease', boxShadow:`0 0 8px ${pct===100?'rgba(170,255,0,0.5)':'rgba(234,179,8,0.5)'}` }}/>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px' }}>
          {(['today','all','stats'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:'8px', borderRadius:'8px', border:'none', background:tab===t?'#EAB308':'transparent', color:tab===t?'#000':'#3A3A3A', fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize' }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* Error banner */}
        {error && (
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'14px', padding:'12px 16px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px', animation:'slideDown 0.3s ease both' }}>
            <span style={{ fontSize:'18px' }}>⚠️</span>
            <span style={{ fontSize:'13px', color:'#EF4444', flex:1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background:'transparent', border:'none', color:'#EF4444', cursor:'pointer', fontSize:'18px' }}>✕</button>
          </div>
        )}

        {/* Add Habit Form */}
        {showAdd && !editHabit && (
          <div style={{ background:'#111', border:'1px solid rgba(234,179,8,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>✨ New Habit</div>

            {/* Preset toggle */}
            <button onClick={() => setShowPresets(!showPresets)}
              style={{ width:'100%', background:'rgba(234,179,8,0.06)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:'12px', padding:'11px', color:'#EAB308', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              ⚡ {showPresets ? 'Hide Presets' : 'Quick Add from Presets'}
            </button>

            {/* Presets list */}
            {showPresets && (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px', maxHeight:'220px', overflowY:'auto' }}>
                {PRESETS.map(p => (
                  <button key={p.name} onClick={() => addHabit(p.name, p.icon, p.description)} disabled={saving}
                    style={{ display:'flex', alignItems:'center', gap:'12px', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'12px', cursor:'pointer', textAlign:'left', transition:'all 0.2s', opacity:saving?0.6:1 }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(234,179,8,0.3)';e.currentTarget.style.background='rgba(234,179,8,0.04)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.background='#0D0D0D'}}>
                    <span style={{ fontSize:'22px' }}>{p.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff' }}>{p.name}</div>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'2px' }}>{p.description}</div>
                    </div>
                    <div style={{ fontSize:'12px', color:'#EAB308', fontWeight:'700' }}>{saving ? '...' : 'Add →'}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom habit form */}
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* Icon picker */}
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Choose Icon</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setForm(p=>({...p, icon}))}
                      style={{ width:'38px', height:'38px', borderRadius:'10px', background: form.icon===icon ? 'rgba(234,179,8,0.15)' : '#0D0D0D', border:`1.5px solid ${form.icon===icon ? '#EAB308' : 'rgba(255,255,255,0.06)'}`, fontSize:'18px', cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Habit Name *</div>
                <input
                  value={form.name}
                  onChange={e => setForm(p=>({...p, name: e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && addHabit(form.name, form.icon, form.description)}
                  placeholder="e.g. Morning Walk, Drink Water..."
                  style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}
                  autoFocus
                />
              </div>

              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Why this habit? (optional)</div>
                <input
                  value={form.description}
                  onChange={e => setForm(p=>({...p, description: e.target.value}))}
                  placeholder="e.g. To stay hydrated and boost energy"
                  style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}
                />
              </div>

              <div style={{ display:'flex', gap:'10px' }}>
                <button
                  onClick={() => addHabit(form.name, form.icon, form.description)}
                  disabled={!form.name.trim() || saving}
                  style={{ flex:1, background: !form.name.trim() || saving ? '#1A1A1A' : '#EAB308', color: !form.name.trim() || saving ? '#3A3A3A' : '#000', border:'none', borderRadius:'12px', padding:'13px', fontSize:'14px', fontWeight:'800', cursor: !form.name.trim() || saving ? 'not-allowed' : 'pointer', transition:'all 0.2s' }}>
                  {saving ? '⏳ Saving...' : '+ Add Habit'}
                </button>
                <button onClick={() => { setShowAdd(false); setShowPresets(false); setError(''); setForm({ name:'', icon:'💧', description:'' }) }}
                  style={{ background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'13px 18px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Habit Form */}
        {editHabit && (
          <div style={{ background:'#111', border:'1px solid rgba(234,179,8,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>✏️ Edit Habit</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(p=>({...p, icon}))}
                    style={{ width:'36px', height:'36px', borderRadius:'10px', background:form.icon===icon?'rgba(234,179,8,0.15)':'#0D0D0D', border:`1.5px solid ${form.icon===icon?'#EAB308':'rgba(255,255,255,0.06)'}`, fontSize:'17px', cursor:'pointer', transition:'all 0.15s' }}>
                    {icon}
                  </button>
                ))}
              </div>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Habit name" style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Description (optional)" style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(234,179,8,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={updateHabit} disabled={!form.name.trim() || saving}
                  style={{ flex:1, background:'#EAB308', color:'#000', border:'none', borderRadius:'12px', padding:'12px', fontSize:'14px', fontWeight:'800', cursor:'pointer', opacity:saving?0.7:1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditHabit(null)}
                  style={{ background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'12px 16px', fontSize:'13px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TODAY TAB */}
        {tab === 'today' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {/* All done celebration */}
            {pct === 100 && activeHabits.length > 0 && (
              <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.08),rgba(34,197,94,0.04))', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'18px', padding:'20px', marginBottom:'14px', textAlign:'center' }}>
                <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎉</div>
                <div style={{ fontSize:'16px', fontWeight:'800', color:'#AAFF00', marginBottom:'4px' }}>All habits complete!</div>
                <div style={{ fontSize:'13px', color:'#52525B' }}>Perfect day! Keep this streak going tomorrow!</div>
              </div>
            )}

            {/* Empty state */}
            {activeHabits.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px' }}>✅</div>
                <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>No habits yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'24px', lineHeight:'1.6' }}>
                  Add your first habit to start building consistency and improving your health.
                </div>
                <button onClick={() => setShowAdd(true)}
                  style={{ background:'#EAB308', color:'#000', border:'none', borderRadius:'14px', padding:'13px 28px', fontSize:'15px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 20px rgba(234,179,8,0.3)' }}>
                  Add First Habit
                </button>
              </div>
            )}

            {/* Habits list */}
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {activeHabits.map((h, i) => {
                const done = completions.has(h.id)
                return (
                  <div key={h.id}
                    style={{ background: done ? 'rgba(170,255,0,0.04)' : '#111', border:`1px solid ${done ? 'rgba(170,255,0,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius:'18px', padding:'16px', display:'flex', alignItems:'center', gap:'14px', animation:`fadeInUp 0.5s ease ${i*0.05}s both`, transition:'all 0.2s' }}>

                    {/* Checkbox */}
                    <button onClick={() => toggleHabit(h)}
                      style={{ width:'28px', height:'28px', borderRadius:'8px', border:`2px solid ${done ? '#AAFF00' : 'rgba(255,255,255,0.15)'}`, background: done ? '#AAFF00' : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                      {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>

                    {/* Icon */}
                    <span style={{ fontSize:'26px', flexShrink:0 }}>{h.icon}</span>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'15px', fontWeight:'600', color: done ? '#AAFF00' : '#fff', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.8 : 1 }}>
                        {h.name}
                      </div>
                      {h.description && (
                        <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {h.description}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:'8px', marginTop:'6px', flexWrap:'wrap' }}>
                        {h.current_streak > 0 && (
                          <div style={{ fontSize:'11px', color:'#F97316', fontWeight:'700', background:'rgba(249,115,22,0.1)', padding:'2px 8px', borderRadius:'20px' }}>
                            🔥 {h.current_streak} day streak
                          </div>
                        )}
                        {h.longest_streak > 0 && (
                          <div style={{ fontSize:'11px', color:'#3A3A3A', background:'rgba(255,255,255,0.04)', padding:'2px 8px', borderRadius:'20px' }}>
                            Best: {h.longest_streak}d
                          </div>
                        )}
                        {h.total_completions > 0 && (
                          <div style={{ fontSize:'11px', color:'#3A3A3A', background:'rgba(255,255,255,0.04)', padding:'2px 8px', borderRadius:'20px' }}>
                            ✓ {h.total_completions}x
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                      <button onClick={() => openEdit(h)}
                        style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', color:'#3A3A3A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', transition:'all 0.2s' }}
                        onMouseEnter={e=>{e.currentTarget.style.color='#EAB308';e.currentTarget.style.borderColor='rgba(234,179,8,0.3)'}}
                        onMouseLeave={e=>{e.currentTarget.style.color='#3A3A3A';e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}>
                        ✏️
                      </button>
                      <button onClick={() => deleteHabit(h.id)}
                        style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.1)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', transition:'all 0.2s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.15)'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,0.06)'}}>
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ALL TAB */}
        {tab === 'all' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'600', marginBottom:'12px' }}>
              {habits.length} total · {activeHabits.length} active · {habits.filter(h=>!h.is_active).length} paused
            </div>
            {habits.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#3A3A3A' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>📋</div>
                <div style={{ fontSize:'14px' }}>No habits created yet</div>
              </div>
            ) : habits.map((h, i) => (
              <div key={h.id}
                style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'14px 16px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px', opacity: h.is_active ? 1 : 0.5, animation:`fadeInUp 0.5s ease ${i*0.04}s both` }}>
                <span style={{ fontSize:'22px' }}>{h.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:'600', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.name}</div>
                  <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                    <span style={{ fontSize:'10px', color:'#F97316' }}>🔥 {h.current_streak}d</span>
                    <span style={{ fontSize:'10px', color:'#3A3A3A' }}>Best: {h.longest_streak}d</span>
                    <span style={{ fontSize:'10px', color:'#3A3A3A' }}>Total: {h.total_completions}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                  <button onClick={() => toggleActive(h)}
                    style={{ fontSize:'11px', color: h.is_active ? '#22C55E' : '#3A3A3A', fontWeight:'700', background: h.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border:'none', borderRadius:'20px', padding:'4px 10px', cursor:'pointer', transition:'all 0.2s' }}>
                    {h.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button onClick={() => openEdit(h)}
                    style={{ width:'30px', height:'30px', borderRadius:'8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', color:'#3A3A3A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>
                    ✏️
                  </button>
                  <button onClick={() => deleteHabit(h.id)}
                    style={{ width:'30px', height:'30px', borderRadius:'8px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.1)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {/* Summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', marginBottom:'16px' }}>
              {[
                { label:'Total Habits',       value:habits.length,       color:'#EAB308', icon:'📋' },
                { label:'Active',             value:activeHabits.length, color:'#22C55E', icon:'✅' },
                { label:'Total Completions',  value:totalDone,           color:'#AAFF00', icon:'🏆' },
                { label:'Best Ever Streak',   value:`${bestStreak}d`,    color:'#F97316', icon:'🔥' },
              ].map(s => (
                <div key={s.label} style={{ background:'#111', border:`1px solid ${s.color}15`, borderRadius:'18px', padding:'16px', textAlign:'center' }}>
                  <div style={{ fontSize:'24px', marginBottom:'8px' }}>{s.icon}</div>
                  <div style={{ fontSize:'26px', fontWeight:'900', color:s.color, letterSpacing:'-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', marginTop:'3px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Per habit breakdown */}
            {habits.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#3A3A3A' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>📊</div>
                <div style={{ fontSize:'14px' }}>Add habits to see your stats</div>
              </div>
            ) : habits.map((h, i) => (
              <div key={h.id} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'16px', marginBottom:'10px', animation:`fadeInUp 0.5s ease ${i*0.05}s both` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                  <span style={{ fontSize:'20px' }}>{h.icon}</span>
                  <div style={{ fontSize:'14px', fontWeight:'600', color:'#fff', flex:1 }}>{h.name}</div>
                  {!h.is_active && <span style={{ fontSize:'10px', color:'#3A3A3A', background:'rgba(255,255,255,0.04)', padding:'2px 8px', borderRadius:'20px' }}>Paused</span>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'10px' }}>
                  {[
                    { label:'Current',  value:`${h.current_streak}d`,  color:'#F97316' },
                    { label:'Best',     value:`${h.longest_streak}d`,  color:'#EAB308' },
                    { label:'Total',    value:String(h.total_completions), color:'#AAFF00' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:'16px', fontWeight:'800', color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px', textTransform:'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Streak progress bar */}
                <div style={{ height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'#F97316', width:`${Math.min((h.current_streak / Math.max(h.longest_streak, 1)) * 100, 100)}%`, borderRadius:'2px', transition:'width 0.8s ease' }}/>
                </div>
                <div style={{ fontSize:'10px', color:'#3A3A3A', marginTop:'4px' }}>
                  {h.current_streak}/{h.longest_streak} of personal best
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(10,10,10,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
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