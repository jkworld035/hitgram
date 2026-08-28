'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Msg  = { role: 'user' | 'aria'; text: string; time: string; type?: string }
type Hist = { role: 'user' | 'assistant'; content: string }
type Mode = 'chat' | 'workout' | 'meal' | 'habit'

const MODES: { id: Mode; label: string; icon: string; color: string; desc: string; placeholder: string }[] = [
  { id:'chat',    label:'Wellness',  icon:'💚', color:'#22C55E', desc:'General health & wellness coach',     placeholder:'Ask Aria anything about health...'           },
  { id:'workout', label:'Trainer',   icon:'💪', color:'#F97316', desc:'Personal trainer & exercise coach',  placeholder:'Ask for a workout plan or exercise tips...'  },
  { id:'meal',    label:'Nutrition', icon:'🥗', color:'#3B82F6', desc:'Expert nutritionist & dietitian',    placeholder:'Ask for meal plans or nutrition advice...'   },
  { id:'habit',   label:'Habits',    icon:'✅', color:'#8B5CF6', desc:'Behavioral psychology & habits',     placeholder:'Ask about building better habits...'         },
]

const QUICK: Record<Mode, { label: string; text: string }[]> = {
  chat: [
    { label:'💧 Hydration',     text:'How much water should I drink daily based on my activity level?' },
    { label:'😴 Better Sleep',  text:'Give me a science-backed sleep optimization routine' },
    { label:'🧠 Reduce Stress', text:'What are the most effective stress management techniques?' },
    { label:'⚡ More Energy',   text:'How can I naturally increase my energy levels throughout the day?' },
    { label:'🏃 Start Fitness', text:'I am a complete beginner. How do I start my fitness journey?' },
    { label:'❤️ Heart Health',  text:'What are the best habits for cardiovascular health?' },
  ],
  workout: [
    { label:'🏠 Home Workout',  text:'Create a complete 30 minute home workout with no equipment' },
    { label:'💪 Build Muscle',  text:'Give me a 4-day muscle building program for intermediate level' },
    { label:'🔥 Fat Burn',      text:'Design a HIIT workout to maximize fat burning in 20 minutes' },
    { label:'🧘 Flexibility',   text:'Create a daily stretching routine to improve flexibility' },
    { label:'🏋️ Gym Plan',      text:'Create a beginner gym workout plan for the first month' },
    { label:'🦵 Leg Day',       text:'Give me the best leg day workout for strength and size' },
  ],
  meal: [
    { label:'🌅 Breakfast',     text:'What are the best high-protein breakfasts for muscle building?' },
    { label:'🥩 High Protein',  text:'Create a high-protein meal plan for muscle gain' },
    { label:'🥗 Weight Loss',   text:'Design a 1500 calorie meal plan for sustainable weight loss' },
    { label:'🌱 Vegan Gains',   text:'How do I build muscle on a vegan diet? Give me a meal plan' },
    { label:'⏰ Meal Timing',   text:'What is the best time to eat before and after workouts?' },
    { label:'💊 Supplements',   text:'What supplements are actually worth taking for fitness?' },
  ],
  habit: [
    { label:'🌅 Morning',       text:'Design the perfect morning routine for peak performance' },
    { label:'🌙 Evening',       text:'What evening habits help with recovery and better sleep?' },
    { label:'📱 Screen Time',   text:'How do I reduce screen time and phone addiction?' },
    { label:'🎯 Consistency',   text:'How do I stay consistent with my fitness goals long term?' },
    { label:'🧠 Mindset',       text:'How do I build a growth mindset for fitness success?' },
    { label:'⚡ Productivity',  text:'Give me a daily routine that maximizes health and productivity' },
  ],
}

const SUGGESTIONS = [
  "What should I eat before a morning workout?",
  "How do I fix my sleep schedule?",
  "Best exercises for back pain relief?",
  "How many calories do I need daily?",
  "How do I stay motivated to exercise?",
  "What is the best diet for weight loss?",
]

export default function AriaPage() {
  const [mode,     setMode]     = useState<Mode>('chat')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [profile,  setProfile]  = useState<any>(null)
  const [showSugg, setShowSugg] = useState(true)
  const histRef   = useRef<Hist[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const supabase  = createClient()

  const currentMode = MODES.find(m => m.id === mode)!

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name, fitness_goal, diet_type').eq('id', user.id).single()
        if (data) setProfile(data)
      }
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Reset chat when mode changes
  const switchMode = (m: Mode) => {
    setMode(m)
    setMessages([])
    histRef.current = []
    setShowSugg(true)
    setInput('')
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const now  = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
    const uMsg: Msg = { role:'user', text:text.trim(), time:now, type:mode }
    setMessages(p => [...p, uMsg])
    histRef.current.push({ role:'user', content:text.trim() })
    setInput('')
    setLoading(true)
    setShowSugg(false)

    try {
      // Add user context to first message
      const contextualMessages = histRef.current.length === 1 ? [
        {
          role: 'user' as const,
          content: profile
            ? `[User context: Name=${profile.full_name || 'User'}, Goal=${profile.fitness_goal || 'general health'}, Diet=${profile.diet_type || 'flexible'}]\n\n${text.trim()}`
            : text.trim()
        }
      ] : histRef.current.slice(-14)

      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:     mode,
          messages: contextualMessages,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data  = await res.json()
      const reply = data.message || data.reply || data.text || 'I could not generate a response. Please try again.'

      histRef.current.push({ role:'assistant', content:reply })
      const replyTime = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
      setMessages(p => [...p, { role:'aria', text:reply, time:replyTime, type:mode }])

    } catch (err) {
      console.error('Aria error:', err)
      setMessages(p => [...p, {
        role: 'aria', type: mode,
        text: 'I am having trouble connecting right now. Please check your internet connection and try again.',
        time: new Date().toLocaleTimeString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    histRef.current = []
    setShowSugg(true)
  }

  const modeColor = currentMode.color

  return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', flexDirection:'column', fontFamily:'Inter,sans-serif', maxWidth:'480px', margin:'0 auto', position:'relative' }}>
      <style>{`
        @keyframes fadeInUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn   { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes bounce    { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-8px);opacity:1} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes gradMove  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        *::-webkit-scrollbar { display:none }
        textarea:focus       { outline:none }
      `}</style>

      {/* ── HEADER ───────────────────────────────────────── */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 0' }}>

        {/* Title row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {/* Animated Aria logo */}
                <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:`linear-gradient(135deg,${modeColor},${modeColor}80)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', boxShadow:`0 0 16px ${modeColor}40`, transition:'all 0.4s' }}>
                  {currentMode.icon}
                </div>
                <div>
                  <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>Aria <span style={{ color:modeColor, transition:'color 0.4s' }}>AI</span></div>
                  <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600' }}>{currentMode.desc}</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {messages.length > 0 && (
              <button onClick={clearChat}
                style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', color:'#3A3A3A', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.color='#EF4444';e.currentTarget.style.borderColor='rgba(239,68,68,0.3)'}}
                onMouseLeave={e=>{e.currentTarget.style.color='#3A3A3A';e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}}>
                ↺
              </button>
            )}
            <a href="/jarvis"
              style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(170,255,0,0.08)', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'20px', padding:'8px 14px', textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(170,255,0,0.14)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(170,255,0,0.08)'}}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#AAFF00', animation:'pulse 1.5s infinite' }}/>
              <span style={{ fontSize:'12px', color:'#AAFF00', fontWeight:'700' }}>IRA Voice</span>
            </a>
          </div>
        </div>

        {/* Mode selector — large cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', paddingBottom:'14px' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => switchMode(m.id)}
              style={{ padding:'10px 4px', borderRadius:'14px', border:`1.5px solid ${mode===m.id?m.color:'rgba(255,255,255,0.06)'}`, background:mode===m.id?`${m.color}10`:'#111', cursor:'pointer', textAlign:'center', transition:'all 0.25s', position:'relative', overflow:'hidden' }}>
              {mode === m.id && (
                <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg,${m.color}08,transparent)` }}/>
              )}
              <div style={{ fontSize:'20px', marginBottom:'4px' }}>{m.icon}</div>
              <div style={{ fontSize:'10px', fontWeight:'700', color:mode===m.id?m.color:'#3A3A3A', letterSpacing:'0.04em' }}>{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── MESSAGES AREA ─────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 0', minHeight:'0', display:'flex', flexDirection:'column', gap:'14px' }}>

        {/* Welcome screen */}
        {messages.length === 0 && (
          <div style={{ animation:'fadeInUp 0.5s ease both' }}>

            {/* Hero card */}
            <div style={{ background:`linear-gradient(135deg,${modeColor}10,${modeColor}05)`, border:`1px solid ${modeColor}20`, borderRadius:'24px', padding:'28px 20px', marginBottom:'20px', textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'150px', height:'150px', borderRadius:'50%', background:`radial-gradient(circle,${modeColor}12,transparent)` }}/>
              <div style={{ position:'absolute', bottom:'-30px', left:'-30px', width:'100px', height:'100px', borderRadius:'50%', background:`radial-gradient(circle,${modeColor}08,transparent)` }}/>

              {/* Big animated icon */}
              <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:`linear-gradient(135deg,${modeColor},${modeColor}60)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', margin:'0 auto 16px', boxShadow:`0 0 32px ${modeColor}40`, animation:'pulse 3s ease-in-out infinite' }}>
                {currentMode.icon}
              </div>

              <div style={{ fontSize:'22px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>
                Aria <span style={{ color:modeColor }}>{currentMode.label}</span> Coach
              </div>
              <div style={{ fontSize:'13px', color:'#52525B', lineHeight:'1.6', marginBottom:'16px' }}>
                {mode === 'chat'    && `Hi ${profile?.full_name || 'there'}! I'm your personal wellness coach. Ask me anything about health, nutrition, fitness or lifestyle.`}
                {mode === 'workout' && `Ready to train! I'll create personalized workout plans based on your fitness level, goals and available equipment.`}
                {mode === 'meal'    && `Fueling your body right is 70% of your results. Tell me your goals and I'll design your perfect nutrition plan.`}
                {mode === 'habit'   && `Building consistent habits is the foundation of lasting health. Let's design your personal habit system together.`}
              </div>

              {/* Profile context badge */}
              {profile && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'6px 14px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:modeColor }}/>
                  <span style={{ fontSize:'11px', color:'#A1A1AA', fontWeight:'500' }}>
                    {profile.fitness_goal?.replace(/_/g,' ') || 'General wellness'} · {profile.diet_type?.replace(/_/g,' ') || 'Flexible diet'}
                  </span>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {showSugg && (
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>
                  Suggested questions
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {QUICK[mode].map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q.text)}
                      style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', background:'#111', border:`1px solid ${modeColor}12`, borderRadius:'16px', cursor:'pointer', textAlign:'left', transition:'all 0.2s', animation:`fadeInUp 0.5s ease ${i*0.07}s both` }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${modeColor}30`;e.currentTarget.style.background=`${modeColor}06`;e.currentTarget.style.transform='translateX(4px)'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=`${modeColor}12`;e.currentTarget.style.background='#111';e.currentTarget.style.transform='translateX(0)'}}>
                      <span style={{ fontSize:'18px', flexShrink:0 }}>{q.label.split(' ')[0]}</span>
                      <span style={{ fontSize:'13px', color:'#A1A1AA', lineHeight:'1.4', flex:1 }}>{q.label.split(' ').slice(1).join(' ')}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={modeColor} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          const modeInfo = MODES.find(m => m.id === (msg.type as Mode)) || currentMode
          const isUser   = msg.role === 'user'

          return (
            <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-end', justifyContent:isUser?'flex-end':'flex-start', animation:'fadeInUp 0.35s ease both' }}>

              {/* Aria avatar */}
              {!isUser && (
                <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:`linear-gradient(135deg,${modeInfo.color},${modeInfo.color}60)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0, boxShadow:`0 0 10px ${modeInfo.color}30` }}>
                  {modeInfo.icon}
                </div>
              )}

              <div style={{ maxWidth:'82%', display:'flex', flexDirection:'column', alignItems:isUser?'flex-end':'flex-start', gap:'4px' }}>
                {/* Bubble */}
                <div style={{
                  padding: '13px 16px',
                  borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: isUser
                    ? `linear-gradient(135deg,${modeColor}20,${modeColor}10)`
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isUser ? modeColor+'25' : 'rgba(255,255,255,0.07)'}`,
                  color: isUser ? '#fff' : '#E0E0E0',
                  fontSize: '14px',
                  lineHeight: '1.75',
                  whiteSpace: 'pre-wrap',
                  backdropFilter: 'blur(8px)',
                  transition: 'background 0.4s',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <div style={{ fontSize:'10px', color:'#2A2A2A', paddingInline:'4px' }}>
                  {isUser ? 'You' : `Aria · ${modeInfo.label}`} · {msg.time}
                </div>
              </div>

              {/* User avatar */}
              {isUser && (
                <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'900', color:'#000', flexShrink:0 }}>
                  {(profile?.full_name || 'U')[0]?.toUpperCase()}
                </div>
              )}
            </div>
          )
        })}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display:'flex', gap:'10px', alignItems:'flex-end', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:`linear-gradient(135deg,${modeColor},${modeColor}60)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0 }}>
              {currentMode.icon}
            </div>
            <div style={{ padding:'14px 18px', borderRadius:'20px 20px 20px 4px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'5px', alignItems:'center' }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width:'6px', height:'6px', borderRadius:'50%', background:modeColor, animation:'bounce 1.2s ease infinite', animationDelay:`${j*0.2}s` }}/>
              ))}
            </div>
            <div style={{ fontSize:'12px', color:'#3A3A3A', alignSelf:'center' }}>Aria is thinking...</div>
          </div>
        )}

        <div ref={bottomRef} style={{ paddingBottom:'16px' }}/>
      </div>

      {/* ── INPUT AREA ────────────────────────────────────── */}
      <div style={{ position:'sticky', bottom:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'12px 16px 100px' }}>

        {/* Quick prompts when chatting */}
        {messages.length > 0 && messages.length < 3 && (
          <div style={{ overflowX:'auto', marginBottom:'10px' }}>
            <div style={{ display:'flex', gap:'6px', width:'max-content' }}>
              {QUICK[mode].slice(0,4).map((q, i) => (
                <button key={i} onClick={() => sendMessage(q.text)} disabled={loading}
                  style={{ flexShrink:0, background:`${modeColor}06`, border:`1px solid ${modeColor}18`, borderRadius:'20px', padding:'6px 12px', color:`${modeColor}AA`, fontSize:'11px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap', opacity:loading?0.5:1, transition:'all 0.2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${modeColor}14`;e.currentTarget.style.color=modeColor}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${modeColor}06`;e.currentTarget.style.color=`${modeColor}AA`}}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text input */}
        <div style={{ display:'flex', gap:'10px', alignItems:'flex-end' }}>
          <div style={{ flex:1, background:'#111', border:`1.5px solid ${loading?modeColor+'30':input?modeColor+'40':'rgba(255,255,255,0.08)'}`, borderRadius:'18px', padding:'12px 16px', transition:'border-color 0.3s', position:'relative' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentMode.placeholder}
              disabled={loading}
              rows={1}
              style={{ width:'100%', background:'transparent', border:'none', color:'#fff', fontSize:'14px', lineHeight:'1.6', resize:'none', fontFamily:'Inter,sans-serif', outline:'none', maxHeight:'120px', overflowY:'auto', opacity:loading?0.6:1 }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            {/* Mode indicator inside input */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'6px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <span style={{ fontSize:'12px' }}>{currentMode.icon}</span>
                <span style={{ fontSize:'10px', color:modeColor, fontWeight:'600' }}>{currentMode.label} Mode</span>
              </div>
              <div style={{ fontSize:'10px', color:'#3A3A3A' }}>↵ to send · shift+↵ newline</div>
            </div>
          </div>

          {/* Send button */}
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            style={{ width:'52px', height:'52px', borderRadius:'16px', background:input.trim()&&!loading?`linear-gradient(135deg,${modeColor},${modeColor}80)`:'rgba(255,255,255,0.06)', border:'none', cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:input.trim()&&!loading?`0 0 20px ${modeColor}40`:'none', transition:'all 0.3s' }}>
            {loading
              ? <div style={{ width:'18px', height:'18px', border:`2px solid ${modeColor}30`, borderTop:`2px solid ${modeColor}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={input.trim()?'#000':'#333'} strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
          </button>
        </div>

        {/* Bottom hint */}
        <div style={{ display:'flex', justifyContent:'center', marginTop:'8px' }}>
          <div style={{ fontSize:'10px', color:'#2A2A2A', display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:modeColor, animation:'pulse 2s infinite' }}/>
            Aria AI · Powered by Claude · Personalized for {profile?.full_name || 'you'}
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV ───────────────────────────────────── */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/ai',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill={modeColor} stroke={modeColor} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,label:'Aria',active:true},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?modeColor:'#3A3A3A',fontWeight:(n as any).active?'700':'600',transition:'color 0.4s' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
            {href:'/jarvis',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,label:'IRA'},
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