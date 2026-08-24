'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Goal {
  id: string
  title: string
  icon: string
  target_value: number
  current_value: number
  unit: string
  due_date?: string
  category?: string
  status: string
}

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const particles: Particle[] = []
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.4 + 0.1,
      })
    }
    let raf: number
    const animate = () => {
      ctx.fillStyle = 'rgba(10,10,10,0.03)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.speedX
        p.y += p.speedY
        if (p.x > canvas.width) p.x = 0
        if (p.x < 0) p.x = canvas.width
        if (p.y > canvas.height) p.y = 0
        if (p.y < 0) p.y = canvas.height
        ctx.fillStyle = `rgba(170,255,0,${p.opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
      raf = requestAnimationFrame(animate)
    }
    animate()
    const onResize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return (
    <canvas ref={canvasRef} style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1 }}/>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [activeTab, setActiveTab] = useState('Goals')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [newGoal, setNewGoal] = useState({ title:'', icon:'🎯', target_value:'', current_value:'', unit:'kg', due_date:'', category:'health' })
  const supabase = createClient()

  const icons = ['🎯','💪','🏃','📚','💧','🥗','😴','🧘','💰','❤️','🧠','⚡','🏆','📊','🎨','🚀','🌟','🔥']
  const categories = ['health','fitness','learning','finance','lifestyle']

  const achievements = [
    { icon:'🎯', name:'Goal Setter', desc:'Create your first goal', earned:goals.length>0 },
    { icon:'🔥', name:'On Fire', desc:'3 day habit streak', earned:false },
    { icon:'💪', name:'Athlete', desc:'Log 5 workouts', earned:false },
    { icon:'🥗', name:'Clean Eater', desc:'Log meals 7 days', earned:false },
    { icon:'💧', name:'Hydrated', desc:'Drink 2L for 5 days', earned:false },
    { icon:'🌙', name:'Sleep King', desc:'8h sleep 7 days', earned:false },
    { icon:'🏆', name:'Champion', desc:'Complete 10 goals', earned:false },
    { icon:'⭐', name:'Elite', desc:'Reach Level 10', earned:false },
  ]

  useEffect(() => { fetchGoals() }, [])

  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('status','active').order('created_at',{ ascending:false })
    if (data) setGoals(data)
  }

  const addGoal = async () => {
    if (!newGoal.title.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('goals').insert({
      user_id:user.id, title:newGoal.title, icon:newGoal.icon,
      target_value:parseFloat(newGoal.target_value)||100,
      current_value:parseFloat(newGoal.current_value)||0,
      unit:newGoal.unit, category:newGoal.category, due_date:newGoal.due_date||null,
    })
    setNewGoal({ title:'', icon:'🎯', target_value:'', current_value:'', unit:'kg', due_date:'', category:'health' })
    setShowAdd(false); setLoading(false); fetchGoals()
  }

  const updateProgress = async (id: string, current: number, target: number, inc: number) => {
    await supabase.from('goals').update({ current_value: Math.min(current+inc, target) }).eq('id', id)
    fetchGoals()
  }

  const completeGoal = async (id: string) => {
    await supabase.from('goals').update({ status:'completed' }).eq('id', id)
    fetchGoals()
  }

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  const filtered = filter==='all' ? goals : goals.filter(g => g.category===filter)

  const inp = { width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'#fff', fontSize:'13px', outline:'none', transition:'all 0.2s' } as React.CSSProperties

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', color:'#fff', paddingBottom:'140px', position:'relative', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer { 0%{background-position:-1000px 0} 100%{background-position:1000px 0} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(170,255,0,0.3)} 50%{box-shadow:0 0 50px rgba(170,255,0,0.7)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .goal-card::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(170,255,0,0.06),transparent); animation:shimmer 4s infinite; }
        *::-webkit-scrollbar { display:none }
      `}</style>

      <ParticleBackground />

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(10,10,10,0.96)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(170,255,0,0.08)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'20px', fontWeight:'800', letterSpacing:'-0.03em' }}>My Goals</div>
              <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'1px' }}>Track progress · Reach excellence</div>
            </div>
          </div>
          {activeTab==='Goals' && (
            <button onClick={() => setShowAdd(!showAdd)}
              style={{ background:'linear-gradient(135deg,#AAFF00,#22C55E)', color:'#000', border:'none', borderRadius:'20px', padding:'9px 18px', fontSize:'13px', fontWeight:'800', cursor:'pointer', boxShadow:'0 0 24px rgba(170,255,0,0.4)', transition:'all 0.2s', animation:'glow 2s ease-in-out infinite' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 40px rgba(170,255,0,0.7)' }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 0 24px rgba(170,255,0,0.4)' }}>
              {showAdd ? '✕ Close' : '+ New Goal'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px', marginBottom:'12px' }}>
          {['Goals','Achievements'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex:1, padding:'9px', borderRadius:'8px', border:'none', background:activeTab===tab?'#AAFF00':'transparent', color:activeTab===tab?'#000':'#3A3A3A', fontSize:'13px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {activeTab==='Goals' && (
          <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'4px' }}>
            {['all',...categories].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                style={{ flexShrink:0, padding:'6px 12px', borderRadius:'20px', border:`1px solid ${filter===cat?'#AAFF00':'rgba(255,255,255,0.07)'}`, background:filter===cat?'rgba(170,255,0,0.1)':'transparent', color:filter===cat?'#AAFF00':'#3A3A3A', fontSize:'11px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s' }}>
                {cat.charAt(0).toUpperCase()+cat.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:'16px 20px', position:'relative', zIndex:10 }}>

        {activeTab==='Goals' && (
          <>
            {/* Summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
              {[
                { label:'Active', value:goals.length, color:'#AAFF00', icon:'🎯' },
                { label:'In Progress', value:goals.filter(g=>g.current_value>0&&g.current_value<g.target_value).length, color:'#F97316', icon:'⚡' },
                { label:'Completed', value:goals.filter(g=>g.current_value>=g.target_value).length, color:'#22C55E', icon:'✅' },
              ].map(s => (
                <div key={s.label} style={{ background:'#111', border:`1px solid ${s.color}15`, borderRadius:'16px', padding:'14px', textAlign:'center', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:'-12px', right:'-12px', fontSize:'32px', opacity:0.1 }}>{s.icon}</div>
                  <div style={{ fontSize:'22px', fontWeight:'900', color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Add form */}
            {showAdd && (
              <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.06),rgba(34,197,94,0.03))', border:'1px solid rgba(170,255,0,0.18)', borderRadius:'24px', padding:'22px', marginBottom:'16px', animation:'fadeInUp 0.4s ease both', backdropFilter:'blur(10px)', position:'relative', overflow:'hidden' }}>
                <div style={{ fontSize:'16px', fontWeight:'800', marginBottom:'16px', color:'#fff' }}>Create New Goal</div>

                {/* Icon grid */}
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px' }}>Choose Icon</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'8px', marginBottom:'16px' }}>
                  {icons.map(icon => (
                    <button key={icon} onClick={() => setNewGoal(p => ({ ...p, icon }))}
                      style={{ aspectRatio:'1', borderRadius:'12px', border:`1.5px solid ${newGoal.icon===icon?'#AAFF00':'rgba(255,255,255,0.07)'}`, background:newGoal.icon===icon?'rgba(170,255,0,0.14)':'rgba(255,255,255,0.02)', fontSize:'20px', cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1) rotate(5deg)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform='scale(1) rotate(0deg)' }}>
                      {icon}
                    </button>
                  ))}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'14px' }}>
                  <div>
                    <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Goal Title</div>
                    <input placeholder="e.g. Lose 10kg, Read 12 books..." value={newGoal.title}
                      onChange={e => setNewGoal(p => ({ ...p, title:e.target.value }))} style={inp}
                      onFocus={e => { e.target.style.borderColor='rgba(170,255,0,0.4)'; e.target.style.background='rgba(170,255,0,0.04)' }}
                      onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.08)'; e.target.style.background='rgba(255,255,255,0.03)' }}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
                    <div>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px' }}>Target</div>
                      <input type="number" placeholder="100" value={newGoal.target_value}
                        onChange={e => setNewGoal(p => ({ ...p, target_value:e.target.value }))} style={inp}/>
                    </div>
                    <div>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px' }}>Current</div>
                      <input type="number" placeholder="0" value={newGoal.current_value}
                        onChange={e => setNewGoal(p => ({ ...p, current_value:e.target.value }))} style={inp}/>
                    </div>
                    <div>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px' }}>Unit</div>
                      <input placeholder="kg" value={newGoal.unit}
                        onChange={e => setNewGoal(p => ({ ...p, unit:e.target.value }))} style={inp}/>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                    <div>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px' }}>Category</div>
                      <select value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category:e.target.value }))} style={{ ...inp, width:'100%' }}>
                        {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px' }}>Due Date</div>
                      <input type="date" value={newGoal.due_date}
                        onChange={e => setNewGoal(p => ({ ...p, due_date:e.target.value }))} style={inp}/>
                    </div>
                  </div>
                </div>

                <button onClick={addGoal} disabled={loading}
                  style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#AAFF00,#22C55E)', color:'#000', fontSize:'14px', fontWeight:'800', cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, boxShadow:'0 0 24px rgba(170,255,0,0.3)', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  {loading ? (<><div style={{ width:'14px', height:'14px', border:'2px solid rgba(0,0,0,0.3)', borderTop:'2px solid #000', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>Creating...</>) : '✨ Create Goal'}
                </button>
              </div>
            )}

            {/* Goals list */}
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', animation:'fadeInUp 0.6s ease both' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px', animation:'float 3s ease-in-out infinite' }}>🎯</div>
                <div style={{ fontSize:'18px', fontWeight:'700', marginBottom:'8px' }}>No goals yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A' }}>
                  {filter==='all' ? 'Tap + New Goal to get started!' : `No ${filter} goals. Try another category!`}
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {filtered.map((goal, i) => {
                  const pct = Math.min(Math.round((goal.current_value/goal.target_value)*100), 100)
                  const daysLeft = goal.due_date ? Math.ceil((new Date(goal.due_date).getTime()-Date.now())/(1000*60*60*24)) : null
                  const isComplete = pct >= 100
                  const catColors: Record<string,string> = { health:'#AAFF00', fitness:'#F97316', learning:'#3B82F6', finance:'#EAB308', lifestyle:'#8B5CF6' }
                  const catColor = catColors[goal.category||'health'] || '#AAFF00'

                  return (
                    <div key={goal.id} className="goal-card"
                      style={{ background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(170,255,0,0.02))', border:`1px solid ${isComplete?'rgba(170,255,0,0.25)':'rgba(170,255,0,0.08)'}`, borderRadius:'22px', padding:'20px', animation:`fadeInUp 0.5s ease ${i*0.08}s both`, position:'relative', overflow:'hidden', transition:'all 0.3s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(170,255,0,0.3)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.4)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=isComplete?'rgba(170,255,0,0.25)':'rgba(170,255,0,0.08)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}>

                      {/* Top row */}
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', flex:1 }}>
                          <div style={{ width:'52px', height:'52px', borderRadius:'16px', background:`linear-gradient(135deg,${catColor}20,${catColor}08)`, border:`1px solid ${catColor}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', flexShrink:0 }}>
                            {goal.icon}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{goal.title}</div>
                            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                              {goal.category && (
                                <span style={{ fontSize:'10px', color:catColor, fontWeight:'700', background:`${catColor}12`, padding:'2px 8px', borderRadius:'20px', border:`1px solid ${catColor}20` }}>
                                  {goal.category}
                                </span>
                              )}
                              {daysLeft !== null && (
                                <span style={{ fontSize:'10px', color:daysLeft<0?'#EF4444':daysLeft<7?'#F97316':'#3A3A3A', fontWeight:'600' }}>
                                  {daysLeft<0?`⚠️ ${Math.abs(daysLeft)}d overdue`:daysLeft===0?'⏰ Due today':`📅 ${daysLeft}d left`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Circular progress */}
                        <div style={{ position:'relative', width:'58px', height:'58px', flexShrink:0 }}>
                          <svg width="58" height="58" style={{ transform:'rotate(-90deg)' }}>
                            <defs>
                              <linearGradient id={`g-${goal.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={catColor}/>
                                <stop offset="100%" stopColor="#22C55E"/>
                              </linearGradient>
                            </defs>
                            <circle cx="29" cy="29" r="25" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
                            <circle cx="29" cy="29" r="25" fill="none"
                              stroke={`url(#g-${goal.id})`} strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${2*Math.PI*25}`}
                              strokeDashoffset={`${2*Math.PI*25*(1-pct/100)}`}
                              style={{ transition:'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)', filter:`drop-shadow(0 0 6px ${catColor}80)` }}/>
                          </svg>
                          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'900', color:catColor }}>
                            {pct}%
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom:'14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'7px' }}>
                          <span style={{ fontSize:'11px', color:'#3A3A3A' }}>Progress</span>
                          <span style={{ fontSize:'12px', color:catColor, fontWeight:'800' }}>
                            {goal.current_value} / {goal.target_value} {goal.unit}
                          </span>
                        </div>
                        <div style={{ height:'7px', background:'rgba(255,255,255,0.05)', borderRadius:'4px', overflow:'hidden', border:`1px solid ${catColor}10` }}>
                          <div style={{ height:'100%', background:`linear-gradient(90deg,${catColor},#22C55E)`, borderRadius:'4px', width:`${pct}%`, transition:'width 1s cubic-bezier(0.4,0,0.2,1)', boxShadow:`0 0 12px ${catColor}60` }}/>
                        </div>
                      </div>

                      {/* Milestone indicators */}
                      <div style={{ display:'flex', gap:'4px', marginBottom:'14px' }}>
                        {[25,50,75,100].map(milestone => (
                          <div key={milestone} style={{ flex:1, textAlign:'center' }}>
                            <div style={{ height:'3px', background:pct>=milestone?catColor:'rgba(255,255,255,0.06)', borderRadius:'2px', marginBottom:'3px', transition:'background 0.5s', boxShadow:pct>=milestone?`0 0 4px ${catColor}`:'none' }}/>
                            <div style={{ fontSize:'8px', color:pct>=milestone?catColor:'#2A2A2A', fontWeight:'700' }}>{milestone}%</div>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      {isComplete ? (
                        <div style={{ textAlign:'center', padding:'10px', background:'rgba(170,255,0,0.06)', borderRadius:'12px', border:'1px solid rgba(170,255,0,0.15)' }}>
                          <div style={{ fontSize:'14px', color:'#AAFF00', fontWeight:'700' }}>🎉 Goal Achieved! Amazing work!</div>
                        </div>
                      ) : (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:'8px' }}>
                          <button onClick={() => updateProgress(goal.id, goal.current_value, goal.target_value, 1)}
                            style={{ background:`${catColor}12`, border:`1px solid ${catColor}20`, borderRadius:'12px', padding:'10px', color:catColor, fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background=`${catColor}22`; e.currentTarget.style.transform='translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background=`${catColor}12`; e.currentTarget.style.transform='translateY(0)' }}>
                            ➕ +1 Progress
                          </button>
                          <button onClick={() => completeGoal(goal.id)}
                            style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:'12px', padding:'10px', color:'#22C55E', fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(34,197,94,0.18)'; e.currentTarget.style.transform='translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='rgba(34,197,94,0.08)'; e.currentTarget.style.transform='translateY(0)' }}>
                            ✓ Complete
                          </button>
                          <button onClick={() => deleteGoal(goal.id)}
                            style={{ width:'42px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.12)', borderRadius:'12px', color:'#EF4444', fontSize:'16px', cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.16)'; e.currentTarget.style.transform='translateY(-1px)' }}
                            onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.06)'; e.currentTarget.style.transform='translateY(0)' }}>
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Achievements tab */}
        {activeTab === 'Achievements' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px' }}>
            {achievements.map((a, i) => (
              <div key={i}
                style={{ background:a.earned?'linear-gradient(135deg,rgba(170,255,0,0.08),rgba(34,197,94,0.04))':'rgba(255,255,255,0.02)', border:`1px solid ${a.earned?'rgba(170,255,0,0.2)':'rgba(255,255,255,0.05)'}`, borderRadius:'18px', padding:'18px', textAlign:'center', opacity:a.earned?1:0.45, animation:`fadeInUp 0.5s ease ${i*0.06}s both`, transition:'all 0.3s', cursor:'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor=a.earned?'rgba(170,255,0,0.35)':'rgba(255,255,255,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=a.earned?'rgba(170,255,0,0.2)':'rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:'36px', marginBottom:'10px', filter:a.earned?'none':'grayscale(1) brightness(0.7)' }}>{a.icon}</div>
                <div style={{ fontSize:'13px', fontWeight:'700', color:a.earned?'#AAFF00':'#fff', marginBottom:'4px' }}>{a.name}</div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', lineHeight:'1.4' }}>{a.desc}</div>
                {a.earned && (
                  <div style={{ marginTop:'10px', fontSize:'10px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.12)', padding:'4px 10px', borderRadius:'20px', display:'inline-block', border:'1px solid rgba(170,255,0,0.2)' }}>
                    🏆 EARNED
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'linear-gradient(180deg,rgba(10,10,10,0) 0%,rgba(10,10,10,0.98) 40%)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(170,255,0,0.08)', padding:'12px 24px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <a href="/dashboard" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600' }}>Home</div>
          </a>
          <a href="/social" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600' }}>Social</div>
          </a>
          <a href="/create-post" style={{ width:'58px', height:'58px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'-20px', flexShrink:0, textDecoration:'none', boxShadow:'0 0 40px rgba(170,255,0,0.6)', animation:'glow 2s ease-in-out infinite' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          <a href="/goals" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <div style={{ fontSize:'10px', color:'#AAFF00', fontWeight:'700' }}>Goals</div>
          </a>
          <a href="/profile" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600' }}>Profile</div>
          </a>
        </div>
      </div>
    </div>
  )
}