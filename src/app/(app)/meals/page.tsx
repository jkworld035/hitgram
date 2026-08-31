'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Meal {
  id: string
  meal_date: string
  meal_type: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  notes: string | null
  created_at: string
}

const MEAL_TYPES = [
  { id:'breakfast', label:'Breakfast', icon:'🌅', color:'#FBBF24', time:'7:00 AM' },
  { id:'lunch',     label:'Lunch',     icon:'☀️', color:'#22C55E', time:'12:30 PM' },
  { id:'dinner',    label:'Dinner',    icon:'🌙', color:'#6366F1', time:'7:00 PM' },
  { id:'snack',     label:'Snack',     icon:'🍎', color:'#F97316', time:'3:00 PM' },
  { id:'pre_workout',  label:'Pre-Workout',  icon:'⚡', color:'#AAFF00', time:'5:00 PM' },
  { id:'post_workout', label:'Post-Workout', icon:'💪', color:'#3B82F6', time:'8:00 PM' },
]

const PRESET_FOODS = [
  { name:'Boiled Eggs (2)',         meal_type:'breakfast', calories:155, protein_g:13, carbs_g:1,  fat_g:11, fiber_g:0 },
  { name:'Oats with Milk',          meal_type:'breakfast', calories:300, protein_g:10, carbs_g:54, fat_g:6,  fiber_g:4 },
  { name:'Banana',                  meal_type:'snack',     calories:89,  protein_g:1,  carbs_g:23, fat_g:0,  fiber_g:3 },
  { name:'Grilled Chicken 150g',    meal_type:'lunch',     calories:248, protein_g:46, carbs_g:0,  fat_g:5,  fiber_g:0 },
  { name:'Brown Rice 150g',         meal_type:'lunch',     calories:165, protein_g:4,  carbs_g:34, fat_g:1,  fiber_g:2 },
  { name:'Salad with Olive Oil',    meal_type:'lunch',     calories:150, protein_g:3,  carbs_g:10, fat_g:11, fiber_g:4 },
  { name:'Protein Shake',           meal_type:'post_workout', calories:160, protein_g:30, carbs_g:8, fat_g:2, fiber_g:1 },
  { name:'Greek Yogurt 200g',       meal_type:'snack',     calories:130, protein_g:17, carbs_g:9,  fat_g:3,  fiber_g:0 },
  { name:'Salmon 180g',             meal_type:'dinner',    calories:350, protein_g:40, carbs_g:0,  fat_g:20, fiber_g:0 },
  { name:'Sweet Potato 200g',       meal_type:'dinner',    calories:172, protein_g:4,  carbs_g:40, fat_g:0,  fiber_g:6 },
  { name:'Almonds 30g',             meal_type:'snack',     calories:173, protein_g:6,  carbs_g:6,  fat_g:15, fiber_g:3 },
  { name:'Whole Wheat Bread 2sl',   meal_type:'breakfast', calories:180, protein_g:8,  carbs_g:34, fat_g:2,  fiber_g:4 },
  { name:'Peanut Butter 2tbsp',     meal_type:'snack',     calories:190, protein_g:8,  carbs_g:7,  fat_g:16, fiber_g:2 },
  { name:'Dal Rice',                meal_type:'lunch',     calories:400, protein_g:18, carbs_g:72, fat_g:5,  fiber_g:8 },
  { name:'Paneer 100g',             meal_type:'lunch',     calories:265, protein_g:18, carbs_g:3,  fat_g:20, fiber_g:0 },
]

const DAILY_TARGETS = { calories:2000, protein_g:150, carbs_g:200, fat_g:65, fiber_g:30 }

export default function MealsPage() {
  const [meals,      setMeals]      = useState<Meal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)
  const [showPresets,setShowPresets]= useState(false)
  const [editMeal,   setEditMeal]   = useState<Meal | null>(null)
  const [tab,        setTab]        = useState<'today'|'history'>('today')
  const [error,      setError]      = useState('')
  const [userId,     setUserId]     = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState({
    meal_type:'breakfast', name:'', calories:'',
    protein_g:'', carbs_g:'', fat_g:'', fiber_g:'0', notes:'',
  })
  const supabase = createClient()
  const router   = useRouter()
  const today    = new Date().toISOString().split('T')[0]

  useEffect(() => { init() }, [])
  useEffect(() => { if (userId) fetchMeals(userId, selectedDate) }, [selectedDate])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    await supabase.from('profiles').upsert({
      id: user.id,
      username: user.email?.split('@')[0],
      full_name: user.email?.split('@')[0],
    }, { onConflict: 'id' })

    await fetchMeals(user.id, selectedDate)
    setLoading(false)
  }

  const fetchMeals = async (uid: string, date: string) => {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', uid)
      .eq('meal_date', date)
      .order('created_at', { ascending: true })
    if (error) { setError(error.message); return }
    setMeals(data || [])
  }

  const addMeal = async () => {
    if (!form.name.trim()) { setError('Please enter a food name'); return }
    setSaving(true)
    setError('')
    const { data, error } = await supabase.from('meals').insert({
      user_id:   userId,
      meal_date: selectedDate,
      meal_type: form.meal_type,
      name:      form.name.trim(),
      calories:  parseInt(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g:   parseFloat(form.carbs_g) || 0,
      fat_g:     parseFloat(form.fat_g) || 0,
      fiber_g:   parseFloat(form.fiber_g) || 0,
      notes:     form.notes.trim() || null,
    }).select().single()

    if (error) { setError(error.message); setSaving(false); return }
    if (data) setMeals(p => [...p, data as Meal])
    resetForm()
    setSaving(false)
  }

  const addPreset = async (preset: typeof PRESET_FOODS[0]) => {
    if (!userId) return
    setSaving(true)
    const { data, error } = await supabase.from('meals').insert({
      user_id: userId, meal_date: selectedDate,
      meal_type: preset.meal_type, name: preset.name,
      calories: preset.calories, protein_g: preset.protein_g,
      carbs_g: preset.carbs_g, fat_g: preset.fat_g, fiber_g: preset.fiber_g,
    }).select().single()
    if (!error && data) setMeals(p => [...p, data as Meal])
    setSaving(false)
  }

  const updateMeal = async () => {
    if (!editMeal) return
    setSaving(true)
    const { error } = await supabase.from('meals').update({
      meal_type: form.meal_type, name: form.name.trim(),
      calories: parseInt(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      fiber_g: parseFloat(form.fiber_g) || 0,
      notes: form.notes || null,
    }).eq('id', editMeal.id)

    if (error) { setError(error.message) }
    else {
      setMeals(p => p.map(m => m.id === editMeal.id ? {
        ...m, meal_type:form.meal_type, name:form.name,
        calories:parseInt(form.calories)||0, protein_g:parseFloat(form.protein_g)||0,
        carbs_g:parseFloat(form.carbs_g)||0, fat_g:parseFloat(form.fat_g)||0,
      } : m))
      setEditMeal(null)
      resetForm()
    }
    setSaving(false)
  }

  const deleteMeal = async (id: string) => {
    if (!confirm('Delete this meal?')) return
    await supabase.from('meals').delete().eq('id', id)
    setMeals(p => p.filter(m => m.id !== id))
  }

  const openEdit = (m: Meal) => {
    setForm({
      meal_type: m.meal_type, name: m.name,
      calories: String(m.calories), protein_g: String(m.protein_g),
      carbs_g: String(m.carbs_g), fat_g: String(m.fat_g),
      fiber_g: String(m.fiber_g), notes: m.notes || '',
    })
    setEditMeal(m)
    setShowAdd(false)
    setShowPresets(false)
  }

  const resetForm = () => {
    setForm({ meal_type:'breakfast', name:'', calories:'', protein_g:'', carbs_g:'', fat_g:'', fiber_g:'0', notes:'' })
    setShowAdd(false)
    setShowPresets(false)
    setEditMeal(null)
  }

  // Totals
  const totals = meals.reduce((acc, m) => ({
    calories:  acc.calories  + (m.calories  || 0),
    protein_g: acc.protein_g + (m.protein_g || 0),
    carbs_g:   acc.carbs_g   + (m.carbs_g   || 0),
    fat_g:     acc.fat_g     + (m.fat_g     || 0),
    fiber_g:   acc.fiber_g   + (m.fiber_g   || 0),
  }), { calories:0, protein_g:0, carbs_g:0, fat_g:0, fiber_g:0 })

  const getMealType = (id: string) => MEAL_TYPES.find(t => t.id === id) || MEAL_TYPES[0]
  const calPct      = Math.min(Math.round((totals.calories / DAILY_TARGETS.calories) * 100), 100)
  const remaining   = Math.max(DAILY_TARGETS.calories - totals.calories, 0)

  // Group meals by type
  const grouped = MEAL_TYPES.map(type => ({
    type,
    items: meals.filter(m => m.meal_type === type.id),
  })).filter(g => g.items.length > 0)

  const inp: React.CSSProperties = {
    width:'100%', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'14px', outline:'none',
  }

  const MacroBar = ({ label, value, target, color, unit='g' }: any) => {
    const pct = Math.min(Math.round((value/target)*100), 100)
    return (
      <div style={{ marginBottom:'10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
          <span style={{ fontSize:'12px', color:'#A1A1AA', fontWeight:'600' }}>{label}</span>
          <span style={{ fontSize:'12px', color, fontWeight:'700' }}>{Math.round(value)}{unit} <span style={{ color:'#3A3A3A', fontWeight:'400' }}>/ {target}{unit}</span></span>
        </div>
        <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
          <div style={{ height:'100%', background:color, width:`${pct}%`, borderRadius:'3px', transition:'width 0.6s ease', boxShadow:`0 0 6px ${color}60` }}/>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(34,197,94,0.2)', borderTop:'3px solid #22C55E', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>Nutrition</div>
              <div style={{ fontSize:'11px', color:'#22C55E', fontWeight:'600' }}>
                {Math.round(totals.calories)} / {DAILY_TARGETS.calories} kcal today
              </div>
            </div>
          </div>
          <button onClick={() => { setShowAdd(!showAdd); setEditMeal(null) }}
            style={{ background:'linear-gradient(135deg,#22C55E,#AAFF00)', color:'#000', border:'none', borderRadius:'20px', padding:'9px 18px', fontSize:'13px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 16px rgba(34,197,94,0.3)' }}>
            + Add Food
          </button>
        </div>

        {/* Date picker */}
        <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'12px' }}>
          <button onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() - 1)
            setSelectedDate(d.toISOString().split('T')[0])
          }} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', color:'#666', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>‹</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ flex:1, background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'8px 12px', color:'#fff', fontSize:'13px', outline:'none', textAlign:'center' }}/>
          <button onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() + 1)
            const next = d.toISOString().split('T')[0]
            if (next <= today) setSelectedDate(next)
          }} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', color:'#666', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>›</button>
          {selectedDate !== today && (
            <button onClick={() => setSelectedDate(today)}
              style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:'8px', padding:'6px 12px', color:'#22C55E', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
              Today
            </button>
          )}
        </div>

        {/* Calorie ring summary */}
        <div style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.12)', borderRadius:'16px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'16px' }}>
          {/* Ring */}
          <div style={{ position:'relative', width:'60px', height:'60px', flexShrink:0 }}>
            <svg width="60" height="60" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
              <circle cx="30" cy="30" r="24" fill="none" stroke={calPct>=100?'#AAFF00':'#22C55E'} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*24}`}
                strokeDashoffset={`${2*Math.PI*24*(1-calPct/100)}`}
                style={{ transition:'stroke-dashoffset 1s ease', filter:'drop-shadow(0 0 4px rgba(34,197,94,0.6))' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontSize:'13px', fontWeight:'900', color:calPct>=100?'#AAFF00':'#22C55E' }}>{calPct}%</div>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
              {[
                { label:'Calories', value:Math.round(totals.calories),  color:'#22C55E',  suffix:'kcal' },
                { label:'Protein',  value:Math.round(totals.protein_g), color:'#F97316',  suffix:'g' },
                { label:'Carbs',    value:Math.round(totals.carbs_g),   color:'#3B82F6',  suffix:'g' },
                { label:'Fat',      value:Math.round(totals.fat_g),     color:'#EAB308',  suffix:'g' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'15px', fontWeight:'800', color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'6px' }}>
              {remaining > 0 ? `${remaining} kcal remaining` : `${Math.abs(DAILY_TARGETS.calories - Math.round(totals.calories))} kcal over target`}
            </div>
          </div>
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

        {/* Add Meal Form */}
        {showAdd && !editMeal && (
          <div style={{ background:'#111', border:'1px solid rgba(34,197,94,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>🥗 Log Food</div>

            {/* Presets */}
            <button onClick={() => setShowPresets(!showPresets)}
              style={{ width:'100%', background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:'12px', padding:'10px', color:'#22C55E', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'12px' }}>
              ⚡ {showPresets ? 'Hide' : 'Quick Add Common Foods'}
            </button>

            {showPresets && (
              <div style={{ maxHeight:'220px', overflowY:'auto', marginBottom:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
                {PRESET_FOODS.map((p, i) => (
                  <button key={i} onClick={() => addPreset(p)} disabled={saving}
                    style={{ display:'flex', alignItems:'center', gap:'12px', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'10px 14px', cursor:'pointer', textAlign:'left', transition:'all 0.2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(34,197,94,0.3)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}}>
                    <span style={{ fontSize:'18px' }}>{getMealType(p.meal_type).icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff' }}>{p.name}</div>
                      <div style={{ fontSize:'10px', color:'#3A3A3A' }}>{p.calories} kcal · {p.protein_g}g protein · {p.carbs_g}g carbs</div>
                    </div>
                    <div style={{ fontSize:'11px', color:'#22C55E', fontWeight:'700' }}>Add →</div>
                  </button>
                ))}
              </div>
            )}

            {/* Meal type */}
            <div style={{ marginBottom:'10px' }}>
              <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Meal Type</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {MEAL_TYPES.map(t => (
                  <button key={t.id} onClick={() => setForm(p=>({...p,meal_type:t.id}))}
                    style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 12px', borderRadius:'20px', border:`1.5px solid ${form.meal_type===t.id?t.color:'rgba(255,255,255,0.07)'}`, background:form.meal_type===t.id?`${t.color}10`:'#0D0D0D', cursor:'pointer', transition:'all 0.2s' }}>
                    <span style={{ fontSize:'14px' }}>{t.icon}</span>
                    <span style={{ fontSize:'11px', color:form.meal_type===t.id?t.color:'#3A3A3A', fontWeight:'600' }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Food name */}
            <div style={{ marginBottom:'10px' }}>
              <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Food Name *</div>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Grilled Chicken, Rice, Apple..." style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(34,197,94,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} autoFocus/>
            </div>

            {/* Macros */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px', marginBottom:'10px' }}>
              {[
                { key:'calories',  label:'Calories (kcal)', placeholder:'350' },
                { key:'protein_g', label:'Protein (g)',      placeholder:'30' },
                { key:'carbs_g',   label:'Carbs (g)',        placeholder:'45' },
                { key:'fat_g',     label:'Fat (g)',          placeholder:'12' },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', marginBottom:'4px', textTransform:'uppercase' }}>{f.label}</div>
                  <input type="number" value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inp}
                    onFocus={e=>e.target.style.borderColor='rgba(34,197,94,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={addMeal} disabled={!form.name.trim() || saving}
                style={{ flex:1, background:!form.name.trim()||saving?'#1A1A1A':'linear-gradient(135deg,#22C55E,#AAFF00)', color:!form.name.trim()||saving?'#3A3A3A':'#000', border:'none', borderRadius:'12px', padding:'13px', fontSize:'14px', fontWeight:'800', cursor:'pointer', transition:'all 0.2s' }}>
                {saving ? 'Saving...' : '+ Log Food'}
              </button>
              <button onClick={resetForm}
                style={{ background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'13px 18px', cursor:'pointer', fontSize:'14px' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Edit Meal Form */}
        {editMeal && (
          <div style={{ background:'#111', border:'1px solid rgba(34,197,94,0.2)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>✏️ Edit Food</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {MEAL_TYPES.map(t => (
                  <button key={t.id} onClick={() => setForm(p=>({...p,meal_type:t.id}))}
                    style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 10px', borderRadius:'20px', border:`1.5px solid ${form.meal_type===t.id?t.color:'rgba(255,255,255,0.07)'}`, background:form.meal_type===t.id?`${t.color}10`:'#0D0D0D', cursor:'pointer' }}>
                    <span style={{ fontSize:'12px' }}>{t.icon}</span>
                    <span style={{ fontSize:'10px', color:form.meal_type===t.id?t.color:'#3A3A3A', fontWeight:'600' }}>{t.label}</span>
                  </button>
                ))}
              </div>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Food name" style={inp}
                onFocus={e=>e.target.style.borderColor='rgba(34,197,94,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px' }}>
                {[{k:'calories',l:'Calories'},{k:'protein_g',l:'Protein (g)'},{k:'carbs_g',l:'Carbs (g)'},{k:'fat_g',l:'Fat (g)'}].map(f => (
                  <div key={f.k}>
                    <div style={{ fontSize:'10px', color:'#3A3A3A', marginBottom:'4px' }}>{f.l}</div>
                    <input type="number" value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={inp}/>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={updateMeal} disabled={saving}
                  style={{ flex:1, background:'linear-gradient(135deg,#22C55E,#AAFF00)', color:'#000', border:'none', borderRadius:'12px', padding:'12px', fontSize:'14px', fontWeight:'800', cursor:'pointer', opacity:saving?0.7:1 }}>
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

        {/* Daily Macro Summary */}
        {meals.length > 0 && (
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>📊 Daily Macros</div>
            <MacroBar label="Calories" value={totals.calories}  target={DAILY_TARGETS.calories}  color="#22C55E" unit=" kcal"/>
            <MacroBar label="Protein"  value={totals.protein_g} target={DAILY_TARGETS.protein_g} color="#F97316"/>
            <MacroBar label="Carbs"    value={totals.carbs_g}   target={DAILY_TARGETS.carbs_g}   color="#3B82F6"/>
            <MacroBar label="Fat"      value={totals.fat_g}     target={DAILY_TARGETS.fat_g}     color="#EAB308"/>
            <MacroBar label="Fiber"    value={totals.fiber_g}   target={DAILY_TARGETS.fiber_g}   color="#8B5CF6"/>
          </div>
        )}

        {/* Meals grouped by type */}
        {meals.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'56px', marginBottom:'16px' }}>🥗</div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>No meals logged yet</div>
            <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'24px' }}>
              {selectedDate === today ? 'Start logging your meals to track nutrition' : 'No meals logged for this date'}
            </div>
            {selectedDate === today && (
              <button onClick={() => setShowAdd(true)}
                style={{ background:'linear-gradient(135deg,#22C55E,#AAFF00)', color:'#000', border:'none', borderRadius:'14px', padding:'13px 28px', fontSize:'15px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 20px rgba(34,197,94,0.3)' }}>
                Log First Meal
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {grouped.map(({ type, items }) => (
              <div key={type.id} style={{ animation:'fadeInUp 0.4s ease both' }}>
                {/* Meal type header */}
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:`${type.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', border:`1px solid ${type.color}20` }}>
                    {type.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px', fontWeight:'700', color:type.color }}>{type.label}</div>
                    <div style={{ fontSize:'11px', color:'#3A3A3A' }}>
                      {items.reduce((s,m)=>s+m.calories,0)} kcal · {Math.round(items.reduce((s,m)=>s+m.protein_g,0))}g protein
                    </div>
                  </div>
                  <button onClick={() => { setForm(p=>({...p,meal_type:type.id})); setShowAdd(true) }}
                    style={{ width:'28px', height:'28px', borderRadius:'8px', background:`${type.color}10`, border:`1px solid ${type.color}20`, color:type.color, cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900' }}>
                    +
                  </button>
                </div>

                {/* Food items */}
                {items.map((meal, i) => (
                  <div key={meal.id}
                    style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'13px 14px', marginBottom:'6px', display:'flex', alignItems:'center', gap:'12px', animation:`fadeInUp 0.4s ease ${i*0.05}s both` }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:'600', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{meal.name}</div>
                      <div style={{ display:'flex', gap:'10px', marginTop:'4px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'11px', color:'#22C55E', fontWeight:'700' }}>{meal.calories} kcal</span>
                        <span style={{ fontSize:'11px', color:'#F97316' }}>{Math.round(meal.protein_g)}g P</span>
                        <span style={{ fontSize:'11px', color:'#3B82F6' }}>{Math.round(meal.carbs_g)}g C</span>
                        <span style={{ fontSize:'11px', color:'#EAB308' }}>{Math.round(meal.fat_g)}g F</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                      <button onClick={() => openEdit(meal)}
                        style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', color:'#3A3A3A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
                        ✏️
                      </button>
                      <button onClick={() => deleteMeal(meal.id)}
                        style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.1)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Daily total */}
            <div style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:'16px', padding:'14px 16px', marginTop:'4px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#22C55E', marginBottom:'8px' }}>Daily Total · {meals.length} items</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px', textAlign:'center' }}>
                {[
                  { label:'Cal',     value:Math.round(totals.calories),  color:'#22C55E' },
                  { label:'Protein', value:`${Math.round(totals.protein_g)}g`, color:'#F97316' },
                  { label:'Carbs',   value:`${Math.round(totals.carbs_g)}g`,   color:'#3B82F6' },
                  { label:'Fat',     value:`${Math.round(totals.fat_g)}g`,     color:'#EAB308' },
                  { label:'Fiber',   value:`${Math.round(totals.fiber_g)}g`,   color:'#8B5CF6' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize:'14px', fontWeight:'800', color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase', marginTop:'2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
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
            {href:'/meals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>,label:'Meals',active:true},
            {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?'#22C55E':'#3A3A3A',fontWeight:(n as any).active?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}