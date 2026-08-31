'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Goal {
  id: string
  title: string
  description: string | null
  category: string
  icon: string
  target_value: number
  current_value: number
  unit: string
  due_date: string | null
  status: string
  created_at: string
}

const CATEGORIES = [
  { id:'fitness',   label:'Fitness',   icon:'💪', color:'#F97316' },
  { id:'nutrition', label:'Nutrition', icon:'🥗', color:'#22C55E' },
  { id:'health',    label:'Health',    icon:'❤️', color:'#EF4444' },
  { id:'sleep',     label:'Sleep',     icon:'😴', color:'#8B5CF6' },
  { id:'mental',    label:'Mental',    icon:'🧠', color:'#3B82F6' },
  { id:'habit',     label:'Habit',     icon:'✅', color:'#EAB308' },
  { id:'weight',    label:'Weight',    icon:'⚖️', color:'#AAFF00' },
  { id:'other',     label:'Other',     icon:'🎯', color:'#52525B' },
]

const PRESET_GOALS = [
  { title:'Walk 10,000 steps daily',    category:'fitness',   icon:'👟', target:10000, unit:'steps',   desc:'Hit daily step goal every day' },
  { title:'Lose 5kg',                   category:'weight',    icon:'⚖️', target:5,     unit:'kg',      desc:'Reach target weight' },
  { title:'Drink 2L water daily',       category:'health',    icon:'💧', target:2,     unit:'liters',  desc:'Stay hydrated every day' },
  { title:'Sleep 8 hours nightly',      category:'sleep',     icon:'😴', target:8,     unit:'hours',   desc:'Get quality sleep every night' },
  { title:'Run 5km without stopping',   category:'fitness',   icon:'🏃', target:5,     unit:'km',      desc:'Build endurance to run 5km' },
  { title:'Do 50 pushups in a row',     category:'fitness',   icon:'💪', target:50,    unit:'pushups', desc:'Build upper body strength' },
  { title:'Meditate 30 days straight',  category:'mental',    icon:'🧘', target:30,    unit:'days',    desc:'Build a meditation habit' },
  { title:'Eat vegetables every day',   category:'nutrition', icon:'🥗', target:30,    unit:'days',    desc:'Improve diet quality' },
]

export default function GoalsPage() {
  const [goals,    setGoals]    = useState<Goal[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [showAdd,  setShowAdd]  = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [tab,      setTab]      = useState<'active'|'done'|'all'>('active')
  const [error,    setError]    = useState('')
  const [userId,   setUserId]   = useState('')
  const [form,     setForm]     = useState({
    title:'', description:'', category:'fitness',
    icon:'🎯', target_value:'100', current_value:'0',
    unit:'', due_date:'',
  })
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    // Ensure profile exists
    await supabase.from('profiles').upsert({
      id: user.id,
      username: user.email?.split('@')[0],
      full_name: user.email?.split('@')[0],
    }, { onConflict: 'id' })

    await fetchGoals(user.id)
    setLoading(false)
  }

  const fetchGoals = async (uid: string) => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (error) { setError(error.message); return }
    setGoals(data || [])
  }

  const addGoal = async () => {
    if (!form.title.trim()) { setError('Please enter a goal title'); return }
    if (!userId) { setError('Not logged in'); return }
    setSaving(true)
    setError('')

    const { data, error } = await supabase.from('goals').insert({
      user_id:       userId,
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      category:      form.category,
      icon:          form.icon,
      target_value:  parseFloat(form.target_value) || 100,
      current_value: parseFloat(form.current_value) || 0,
      unit:          form.unit.trim(),
      due_date:      form.due_date || null,
      status:        'active',
    }).select().single()

    if (error) { setError(error.message); setSaving(false); return }
    if (data) setGoals(p => [data as Goal, ...p])
    resetForm()
    setSaving(false)
  }

  const updateGoal = async () => {
    if (!editGoal || !form.title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('goals').update({
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      category:      form.category,
      icon:          form.icon,
      target_value:  parseFloat(form.target_value) || 100,
      current_value: parseFloat(form.current_value) || 0,
      unit:          form.unit.trim(),
      due_date:      form.due_date || null,
    }).eq('id', editGoal.id)

    if (error) { setError(error.message) }
    else {
      await fetchGoals(userId)
      setEditGoal(null)
      resetForm()
    }
    setSaving(false)
  }

  const updateProgress = async (goal: Goal, newValue: number) => {
    setUpdating(goal.id)
    const clamped = Math.min(Math.max(newValue, 0), goal.target_value)
    const status  = clamped >= goal.target_value ? 'completed' : 'active'
    const { error } = await supabase.from('goals').update({
      current_value: clamped, status
    }).eq('id', goal.id)
    if (!error) {
      setGoals(p => p.map(g => g.id === goal.id ? { ...g, current_value: clamped, status } : g))
    }
    setUpdating(null)
  }

  const completeGoal = async (goal: Goal) => {
    const status = goal.status === 'completed' ? 'active' : 'completed'
    await supabase.from('goals').update({ status, current_value: status==='completed'?goal.target_value:goal.current_value }).eq('id', goal.id)
    setGoals(p => p.map(g => g.id === goal.id ? { ...g, status, current_value: status==='completed'?g.target_value:g.current_value } : g))
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    setGoals(p => p.filter(g => g.id !== id))
  }

  const openEdit = (g: Goal) => {
    setForm({
      title:         g.title,
      description:   g.description || '',
      category:      g.category,
      icon:          g.icon,
      target_value:  String(g.target_value),
      current_value: String(g.current_value),
      unit:          g.unit,
      due_date:      g.due_date || '',
    })
    setEditGoal(g)
    setShowAdd(false)
  }

  const addPreset = async (p: typeof PRESET_GOALS[0]) => {
    if (!userId) return
    setSaving(true)
    const { data, error } = await supabase.from('goals').insert({
      user_id: userId, title: p.title, description: p.desc,
      category: p.category, icon: p.icon,
      target_value: p.target, current_value: 0,
      unit: p.unit, status: 'active',
    }).select().single()
    if (!error && data) setGoals(prev => [data as Goal, ...prev])
    setSaving(false)
  }

  const resetForm = () => {
    setForm({ title:'', description:'', category:'fitness', icon:'🎯', target_value:'100', current_value:'0', unit:'', due_date:'' })
    setShowAdd(false)
    setEditGoal(null)
  }

  const getCatInfo = (cat: string) => CATEGORIES.find(c => c.id === cat) || CATEGORIES[7]
  const getPct     = (g: Goal)    => Math.min(Math.round((g.current_value / Math.max(g.target_value, 1)) * 100), 100)
  const getDaysLeft = (due: string | null) => {
    if (!due) return null
    const diff = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
    return diff
  }

  const filtered = goals.filter(g =>
    tab === 'active' ? g.status === 'active' :
    tab === 'done'   ? g.status === 'completed' : true
  )

  const activeCount    = goals.filter(g => g.status === 'active').length
  const completedCount = goals.filter(g => g.status === 'completed').length
  const avgPct         = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + getPct(g), 0) / goals.length) : 0

  const inp: React.CSSProperties = {
    width:'100%', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'14px', outline:'none',
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(170,255,0,0.2)', borderTop:'3px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>My Goals</div>
              <div style={{ fontSize:'11px', color:'#3B82F6', fontWeight:'600' }}>{activeCount} active · {completedCount} completed</div>
            </div>
          </div>
          <button onClick={() => { setShowAdd(!showAdd); setEditGoal(null) }}
            style={{ background:'linear-gradient(135deg,#3B82F6,#8B5CF6)', color:'#fff', border:'none', borderRadius:'20px', padding:'9px 18px', fontSize:'13px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 16px rgba(59,130,246,0.3)' }}>
            + New Goal
          </button>
        </div>

        {/* Overall progress */}
        <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'14px', padding:'12px 16px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ position:'relative', width:'44px', height:'44px', flexShrink:0 }}>
            <svg width="44" height="44" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
              <circle cx="22" cy="22" r="18" fill="none" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*18}`} strokeDashoffset={`${2*Math.PI*18*(1-avgPct/100)}`}
                style={{ filter:'drop-shadow(0 0 4px rgba(59,130,246,0.6))', transition:'stroke-dashoffset 1s ease' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'900', color:'#3B82F6' }}>{avgPct}%</div>
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>Overall Progress</div>
            <div style={{ fontSize:'11px', color:'#3A3A3A' }}>{goals.length} goals · avg {avgPct}% complete</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px' }}>
          {[
            { id:'active', label:`Active (${activeCount})` },
            { id:'done',   label:`Done (${completedCount})` },
            { id:'all',    label:`All (${goals.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex:1, padding:'8px 4px', borderRadius:'8px', border:'none', background:tab===t.id?'#3B82F6':'transparent', color:tab===t.id?'#fff':'#3A3A3A', fontSize:'11px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* Error */}
        {error && (
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'14px', padding:'12px 16px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
            <span>⚠️</span><span style={{ fontSize:'13px', color:'#EF4444', flex:1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background:'transparent', border:'none', color:'#EF4444', cursor:'pointer', fontSize:'16px' }}>✕</button>
          </div>
        )}

        {/* Add Goal Form */}
        {showAdd && !editGoal && (
          <div style={{ background:'#111', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>🎯 New Goal</div>

            {/* Presets */}
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Quick Add Preset</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'200px', overflowY:'auto' }}>
                {PRESET_GOALS.map((p, i) => (
                  <button key={i} onClick={() => addPreset(p)} disabled={saving}
                    style={{ display:'flex', alignItems:'center', gap:'12px', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'10px 14px', cursor:'pointer', textAlign:'left', transition:'all 0.2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(59,130,246,0.3)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}>
                    <span style={{ fontSize:'20px' }}>{p.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff' }}>{p.title}</div>
                      <div style={{ fontSize:'10px', color:'#3A3A3A' }}>Target: {p.target} {p.unit}</div>
                    </div>
                    <div style={{ fontSize:'11px', color:'#3B82F6', fontWeight:'700' }}>Add →</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height:'1px', background:'rgba(255,255,255,0.05)', marginBottom:'14px' }}/>
            <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Custom Goal</div>

            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Goal Title *</div>
                <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Run 5km without stopping" style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>

              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Category</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setForm(p=>({...p,category:c.id,icon:c.icon}))}
                      style={{ padding:'8px 4px', borderRadius:'10px', border:`1.5px solid ${form.category===c.id?c.color:'rgba(255,255,255,0.06)'}`, background:form.category===c.id?`${c.color}10`:'#0D0D0D', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
                      <div style={{ fontSize:'18px', marginBottom:'2px' }}>{c.icon}</div>
                      <div style={{ fontSize:'9px', color:form.category===c.id?c.color:'#3A3A3A', fontWeight:'600' }}>{c.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Target</div>
                  <input type="number" value={form.target_value} onChange={e=>setForm(p=>({...p,target_value:e.target.value}))} placeholder="100" style={inp}
                    onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
                <div>
                  <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Current</div>
                  <input type="number" value={form.current_value} onChange={e=>setForm(p=>({...p,current_value:e.target.value}))} placeholder="0" style={inp}
                    onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
                <div>
                  <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Unit</div>
                  <input value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} placeholder="kg, km, days" style={inp}
                    onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
              </div>

              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Due Date (optional)</div>
                <input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>

              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Description (optional)</div>
                <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Why is this goal important to you?" style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>

              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={addGoal} disabled={!form.title.trim() || saving}
                  style={{ flex:1, background:!form.title.trim()||saving?'#1A1A1A':'linear-gradient(135deg,#3B82F6,#8B5CF6)', color:!form.title.trim()||saving?'#3A3A3A':'#fff', border:'none', borderRadius:'12px', padding:'13px', fontSize:'14px', fontWeight:'800', cursor:'pointer', transition:'all 0.2s' }}>
                  {saving ? 'Saving...' : '+ Create Goal'}
                </button>
                <button onClick={resetForm}
                  style={{ background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'13px 18px', fontSize:'14px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Goal Form */}
        {editGoal && (
          <div style={{ background:'#111', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>✏️ Edit Goal</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Goal title" style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(59,130,246,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setForm(p=>({...p,category:c.id,icon:c.icon}))}
                    style={{ padding:'8px 4px', borderRadius:'10px', border:`1.5px solid ${form.category===c.id?c.color:'rgba(255,255,255,0.06)'}`, background:form.category===c.id?`${c.color}10`:'#0D0D0D', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', marginBottom:'2px' }}>{c.icon}</div>
                    <div style={{ fontSize:'9px', color:form.category===c.id?c.color:'#3A3A3A', fontWeight:'600' }}>{c.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'10px', color:'#3A3A3A', marginBottom:'4px' }}>Target</div>
                  <input type="number" value={form.target_value} onChange={e=>setForm(p=>({...p,target_value:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'#3A3A3A', marginBottom:'4px' }}>Current</div>
                  <input type="number" value={form.current_value} onChange={e=>setForm(p=>({...p,current_value:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'#3A3A3A', marginBottom:'4px' }}>Unit</div>
                  <input value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} style={inp}/>
                </div>
              </div>
              <input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} style={inp}/>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Description" style={inp}/>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={updateGoal} disabled={saving}
                  style={{ flex:1, background:'linear-gradient(135deg,#3B82F6,#8B5CF6)', color:'#fff', border:'none', borderRadius:'12px', padding:'12px', fontSize:'14px', fontWeight:'800', cursor:'pointer', opacity:saving?0.7:1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={resetForm}
                  style={{ background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'12px 16px', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goals list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'56px', marginBottom:'16px' }}>🎯</div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>
              {tab === 'done' ? 'No completed goals yet' : tab === 'active' ? 'No active goals' : 'No goals yet'}
            </div>
            <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'24px' }}>
              {tab === 'done' ? 'Complete your active goals to see them here' : 'Set your first goal and start tracking progress'}
            </div>
            {tab !== 'done' && (
              <button onClick={() => setShowAdd(true)}
                style={{ background:'linear-gradient(135deg,#3B82F6,#8B5CF6)', color:'#fff', border:'none', borderRadius:'14px', padding:'13px 28px', fontSize:'15px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 20px rgba(59,130,246,0.3)' }}>
                Create First Goal
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {filtered.map((goal, i) => {
              const cat      = getCatInfo(goal.category)
              const pct      = getPct(goal)
              const daysLeft = getDaysLeft(goal.due_date)
              const done     = goal.status === 'completed'
              const isUpdating = updating === goal.id

              return (
                <div key={goal.id}
                  style={{ background: done ? 'rgba(170,255,0,0.03)' : '#111', border:`1px solid ${done ? 'rgba(170,255,0,0.15)' : `${cat.color}15`}`, borderRadius:'20px', padding:'18px', animation:`fadeInUp 0.5s ease ${i*0.06}s both`, transition:'all 0.3s', opacity:done?0.85:1 }}>

                  {/* Goal header */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', marginBottom:'14px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:`${cat.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0, border:`1px solid ${cat.color}20` }}>
                      {goal.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px', flexWrap:'wrap' }}>
                        <div style={{ fontSize:'15px', fontWeight:'700', color: done ? '#AAFF00' : '#fff' }}>{goal.title}</div>
                        {done && (
                          <div style={{ fontSize:'10px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.1)', padding:'2px 8px', borderRadius:'20px' }}>✓ Complete</div>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                        <div style={{ fontSize:'11px', color:cat.color, fontWeight:'600', background:`${cat.color}10`, padding:'2px 8px', borderRadius:'20px' }}>{cat.icon} {cat.label}</div>
                        {daysLeft !== null && (
                          <div style={{ fontSize:'11px', color: daysLeft < 0 ? '#EF4444' : daysLeft < 7 ? '#F97316' : '#3A3A3A', fontWeight:'600' }}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today!' : `${daysLeft}d left`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                      <button onClick={() => openEdit(goal)}
                        style={{ width:'30px', height:'30px', borderRadius:'8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', color:'#3A3A3A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}
                        onMouseEnter={e=>{e.currentTarget.style.color='#3B82F6';e.currentTarget.style.borderColor='rgba(59,130,246,0.3)'}}
                        onMouseLeave={e=>{e.currentTarget.style.color='#3A3A3A';e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}>
                        ✏️
                      </button>
                      <button onClick={() => deleteGoal(goal.id)}
                        style={{ width:'30px', height:'30px', borderRadius:'8px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.1)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                      <div style={{ fontSize:'13px', color:'#A1A1AA' }}>
                        <span style={{ fontWeight:'800', color:cat.color, fontSize:'16px' }}>{goal.current_value}</span>
                        <span style={{ color:'#3A3A3A' }}> / {goal.target_value} {goal.unit}</span>
                      </div>
                      <div style={{ fontSize:'14px', fontWeight:'900', color: pct >= 100 ? '#AAFF00' : cat.color }}>{pct}%</div>
                    </div>
                    <div style={{ height:'8px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden', position:'relative' }}>
                      <div style={{ height:'100%', background: pct >= 100 ? 'linear-gradient(90deg,#AAFF00,#22C55E)' : `linear-gradient(90deg,${cat.color},${cat.color}80)`, width:`${pct}%`, borderRadius:'4px', transition:'width 0.8s ease', boxShadow:`0 0 8px ${pct>=100?'rgba(170,255,0,0.5)':cat.color+'60'}` }}/>
                    </div>
                  </div>

                  {/* Quick update progress */}
                  {!done && (
                    <div style={{ marginBottom:'12px' }}>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Update Progress</div>
                      <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                        <button onClick={() => updateProgress(goal, goal.current_value - 1)} disabled={isUpdating || goal.current_value <= 0}
                          style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#fff', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', opacity:goal.current_value<=0?0.3:1 }}>
                          −
                        </button>
                        <input
                          type="number"
                          value={goal.current_value}
                          onChange={e => updateProgress(goal, parseFloat(e.target.value) || 0)}
                          style={{ ...inp, textAlign:'center', width:'80px', padding:'8px', fontSize:'15px', fontWeight:'800', color:cat.color }}
                        />
                        <button onClick={() => updateProgress(goal, goal.current_value + 1)} disabled={isUpdating || goal.current_value >= goal.target_value}
                          style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${cat.color}12`, border:`1px solid ${cat.color}20`, color:cat.color, cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', opacity:goal.current_value>=goal.target_value?0.3:1 }}>
                          +
                        </button>

                        {/* Quick add buttons */}
                        {[10, 25, 50].map(n => (
                          <button key={n} onClick={() => updateProgress(goal, goal.current_value + n)}
                            style={{ background:`${cat.color}08`, border:`1px solid ${cat.color}15`, borderRadius:'8px', padding:'6px 10px', color:cat.color, fontSize:'11px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background=`${cat.color}18`}}
                            onMouseLeave={e=>{e.currentTarget.style.background=`${cat.color}08`}}>
                            +{n}
                          </button>
                        ))}

                        {isUpdating && <div style={{ width:'14px', height:'14px', border:`2px solid ${cat.color}30`, borderTop:`2px solid ${cat.color}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {goal.description && (
                    <div style={{ fontSize:'12px', color:'#52525B', marginBottom:'10px', lineHeight:'1.5' }}>
                      {goal.description}
                    </div>
                  )}

                  {/* Mark complete button */}
                  <button onClick={() => completeGoal(goal)}
                    style={{ width:'100%', background: done ? 'rgba(255,255,255,0.04)' : `${cat.color}10`, border:`1px solid ${done ? 'rgba(255,255,255,0.06)' : `${cat.color}20`}`, borderRadius:'12px', padding:'10px', color: done ? '#3A3A3A' : cat.color, fontSize:'13px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}>
                    {done ? '↺ Mark as Active' : '✓ Mark as Complete'}
                  </button>
                </div>
              )
            })}
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
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals',active:true},
            {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?'#3B82F6':'#3A3A3A',fontWeight:(n as any).active?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}