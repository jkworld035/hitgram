'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Msg  = { role: 'user' | 'ira'; text: string; time: string }
type Hist = { role: 'user' | 'assistant'; content: string }
type State = 'idle' | 'listening' | 'thinking' | 'speaking'

const QUICK_CMDS = [
  { label: '💪 Workout Plan',   text: 'Create a personalized workout plan for me today' },
  { label: '🥗 Meal Plan',      text: 'What should I eat today for optimal energy and health?' },
  { label: '😴 Sleep Tips',     text: 'How can I improve my sleep quality tonight?' },
  { label: '⚡ Motivate Me',    text: 'Give me a powerful motivational message right now' },
  { label: '🧠 Focus Mode',     text: 'Help me get into deep focus mode for the next 2 hours' },
  { label: '🔥 Habit Stack',    text: 'Build me a morning habit stack for peak performance' },
  { label: '🏃 HIIT Workout',   text: 'Give me a 20 minute HIIT workout I can do at home' },
  { label: '🧘 Calm Down',      text: 'I am stressed, help me calm down right now' },
]

const STATES: Record<State, { color: string; glow: string; label: string; sub: string }> = {
  idle:      { color: '#AAFF00', glow: 'rgba(170,255,0,0.3)',  label: '◎  ONLINE',     sub: 'Tap orb to speak'          },
  listening: { color: '#FF4C4C', glow: 'rgba(255,76,76,0.4)',  label: '●  LISTENING',  sub: 'Speak now...'              },
  thinking:  { color: '#FF9500', glow: 'rgba(255,149,0,0.4)',  label: '◈  THINKING',   sub: 'IRA is processing...'      },
  speaking:  { color: '#00CFFF', glow: 'rgba(0,207,255,0.4)',  label: '◉  SPEAKING',   sub: 'Tap orb to stop'           },
}

export default function IRAPage() {
  const [state,     setState]     = useState<State>('idle')
  const [messages,  setMessages]  = useState<Msg[]>([{
    role: 'ira',
    text: 'Hi! I am IRA — your Intelligent Response Assistant. I have deep knowledge across health, fitness, nutrition, science, philosophy, history and much more. How can I help you today?',
    time: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
  }])
  const [input,     setInput]     = useState('')
  const [voiceOn,   setVoiceOn]   = useState(true)
  const [bars,      setBars]      = useState<number[]>(Array(28).fill(3))
  const [transcript,setTranscript]= useState('')
  const [loading,   setLoading]   = useState(false)
  const histRef    = useRef<Hist[]>([])
  const recogRef   = useRef<any>(null)
  const animRef    = useRef<number>(0)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const cfg = STATES[state]

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Bar animation
  useEffect(() => {
    const animate = () => {
      setBars(prev => prev.map((_, i) => {
        if (state === 'listening') return Math.random() * 44 + 4
        if (state === 'speaking')  return Math.abs(Math.sin(Date.now()/150 + i*0.4)) * 36 + 6
        if (state === 'thinking')  return Math.abs(Math.sin(Date.now()/600 + i*0.8)) * 12 + 3
        return 3 + Math.abs(Math.sin(Date.now()/1800 + i*0.6)) * 2
      }))
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [state])

  // ── Speak ─────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!voiceOn || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const clean = text.replace(/[*#`>_]/g, '').replace(/\n+/g, '. ').slice(0, 500)
    const u     = new SpeechSynthesisUtterance(clean)
    u.rate  = 0.92
    u.pitch = 1.3
    u.volume = 1

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const best   =
        voices.find(v => v.name === 'Google UK English Female')   ||
        voices.find(v => v.name.includes('Zira'))                  ||
        voices.find(v => v.name.includes('Aria'))                  ||
        voices.find(v => v.name === 'Samantha')                    ||
        voices.find(v => v.name === 'Karen')                       ||
        voices.find(v => v.name === 'Moira')                       ||
        voices.find(v => v.lang === 'en-GB')                       ||
        voices.find(v => v.lang.startsWith('en'))
      if (best) {
        u.voice = best
        if (best.name.includes('Zira'))   { u.pitch = 1.4; u.rate = 0.88 }
        if (best.name.includes('Aria'))   { u.pitch = 1.2; u.rate = 0.94 }
        if (best.name.includes('Google')) { u.pitch = 1.3; u.rate = 0.90 }
      }
    }

    if (window.speechSynthesis.getVoices().length > 0) setVoice()
    else window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true })

    u.onstart = () => setState('speaking')
    u.onend   = () => setState('idle')
    u.onerror = () => setState('idle')
    window.speechSynthesis.speak(u)
  }, [voiceOn])

  const stopSpeak = () => {
    window.speechSynthesis?.cancel()
    setState('idle')
  }

  // ── Voice input ───────────────────────────────────────────
  const startListen = () => {
    if (state === 'speaking') stopSpeak()
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome browser'); return }
    const r = new SR()
    r.lang = 'en-US'; r.interimResults = true; r.continuous = false
    recogRef.current = r
    r.onstart  = () => setState('listening')
    // Use the functional form of setState here — this callback fires asynchronously,
    // long after this closure was created, so comparing against the plain `state`
    // variable would always check its stale value from click-time (always 'idle'),
    // never the live value. setState(prev => ...) always reads the current state.
    r.onend    = () => { setState(prev => prev === 'listening' ? 'idle' : prev); setTranscript('') }
    r.onerror  = () => { setState('idle'); setTranscript('') }
    r.onresult = (e: any) => {
      const res = e.results[e.results.length - 1]
      const txt = res[0].transcript
      setTranscript(txt)
      if (res.isFinal) {
        setTranscript('')
        recogRef.current?.stop()
        sendMessage(txt)
      }
    }
    r.start()
  }

  const stopListen = () => {
    recogRef.current?.stop()
    setState('idle')
  }

  // ── Send message ──────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const now = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
    const userMsg: Msg = { role:'user', text:text.trim(), time:now }
    setMessages(p => [...p, userMsg])
    histRef.current.push({ role:'user', content:text.trim() })
    setLoading(true)
    setState('thinking')

    try {
      const controller = new AbortController()
      const timeout    = setTimeout(() => controller.abort(), 30000)

      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body:    JSON.stringify({
          type:     'Ira',
          messages: histRef.current.slice(-12),
        }),
      })

      clearTimeout(timeout)

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const data  = await res.json()
      const reply = data.message || data.reply || data.text || data.content

      if (!reply) throw new Error('No response from IRA')

      histRef.current.push({ role:'assistant', content:reply })
      const replyTime = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
      setMessages(p => [...p, { role:'ira', text:reply, time:replyTime }])

      if (voiceOn) speak(reply)
      else setState('idle')

    } catch (err: any) {
      console.error('IRA error:', err)
      const errorMsg = err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'I encountered an issue connecting. Please check your internet and try again.'
      setMessages(p => [...p, { role:'ira', text:errorMsg, time:new Date().toLocaleTimeString() }])
      setState('idle')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  const handleOrb = () => {
    if (state === 'speaking') { stopSpeak(); return }
    if (state === 'listening') { stopListen(); return }
    if (state === 'idle') startListen()
  }

  const clearChat = () => {
    histRef.current = []
    setMessages([{
      role: 'ira',
      text: 'Memory cleared! Fresh start. What would you like to explore today?',
      time: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
    }])
  }

  return (
    <div style={{ minHeight:'100vh', background:'#060608', display:'flex', flexDirection:'column', fontFamily:'"SF Pro Display",-apple-system,Inter,sans-serif', paddingBottom:'90px', maxWidth:'480px', margin:'0 auto', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes orbFloat  { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.02)} }
        @keyframes spinRing  { to{transform:rotate(360deg)} }
        @keyframes spinRingR { to{transform:rotate(-360deg)} }
        @keyframes bounce    { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-8px);opacity:1} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        *::-webkit-scrollbar { display:none }
      `}</style>

      {/* Animated background */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.05 }}>
          <defs>
            <pattern id="hexbg" x="0" y="0" width="52" height="44" patternUnits="userSpaceOnUse">
              <polygon points="26,2 48,13 48,31 26,42 4,31 4,13" fill="none" stroke={cfg.color} strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexbg)" style={{ transition:'stroke 0.6s' }}/>
        </svg>
        <div style={{ position:'absolute', top:'-100px', left:'50%', transform:'translateX(-50%)', width:'400px', height:'300px', borderRadius:'50%', background:`radial-gradient(ellipse, ${cfg.glow} 0%, transparent 70%)`, transition:'background 0.6s', animation:'glowPulse 3s ease-in-out infinite' }}/>
      </div>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:30, background:'rgba(6,6,8,0.92)', backdropFilter:'blur(24px)', borderBottom:`1px solid ${cfg.color}18`, padding:'52px 20px 16px', transition:'border-color 0.6s' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'38px', height:'38px', borderRadius:'12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'30px', height:'30px', borderRadius:'10px', background:`linear-gradient(135deg,${cfg.color},#22C55E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'900', color:'#000', boxShadow:`0 0 14px ${cfg.glow}`, transition:'all 0.6s' }}>I</div>
                <div>
                  <div style={{ fontSize:'17px', fontWeight:'800', color:'#fff', letterSpacing:'0.1em' }}>I.R.A</div>
                  <div style={{ fontSize:'8px', color:'#3A3A3A', letterSpacing:'0.15em' }}>INTELLIGENT RESPONSE ASSISTANT</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {/* Status */}
            <div style={{ display:'flex', alignItems:'center', gap:'5px', background:`${cfg.color}10`, border:`1px solid ${cfg.color}25`, borderRadius:'20px', padding:'5px 10px', transition:'all 0.4s' }}>
              <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:cfg.color, animation:'glowPulse 1.5s infinite' }}/>
              <div style={{ fontSize:'9px', color:cfg.color, fontWeight:'700', letterSpacing:'0.1em' }}>{cfg.label}</div>
            </div>
            <button onClick={() => { setVoiceOn(v => !v); if (state==='speaking') stopSpeak() }}
              style={{ width:'36px', height:'36px', borderRadius:'10px', background:voiceOn?`${cfg.color}12`:'rgba(255,255,255,0.04)', border:`1px solid ${voiceOn?cfg.color+'30':'rgba(255,255,255,0.07)'}`, cursor:'pointer', fontSize:'15px', transition:'all 0.3s' }}>
              {voiceOn ? '🔊' : '🔇'}
            </button>
            <button onClick={clearChat}
              style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#555', cursor:'pointer', fontSize:'15px' }}>
              ↺
            </button>
          </div>
        </div>
      </div>

      {/* Orb section */}
      <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 20px 16px' }}>

        {/* Visualizer */}
        <div style={{ display:'flex', alignItems:'center', gap:'2px', marginBottom:'20px', height:'52px' }}>
          {bars.map((h, i) => {
            const dist = Math.abs(i - bars.length/2) / (bars.length/2)
            return (
              <div key={i} style={{ width:'2.5px', height:`${Math.max(3,h)}px`, borderRadius:'2px', background:`linear-gradient(180deg,${cfg.color},${cfg.color}30)`, opacity:(0.2 + (h/44)*0.8)*(1-dist*0.3), transition:'height 0.05s ease, background 0.6s' }}/>
            )
          })}
        </div>

        {/* Main Orb */}
        <div onClick={handleOrb}
          style={{ width:'160px', height:'160px', borderRadius:'50%', cursor:'pointer', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', animation:state==='idle'?'orbFloat 4s ease-in-out infinite':'none', transition:'transform 0.3s' }}>

          {/* Rings */}
          <div style={{ position:'absolute', inset:'-18px', borderRadius:'50%', border:`1px solid ${cfg.color}10`, animation:state!=='idle'?'spinRing 8s linear infinite':'none', transition:'border-color 0.6s' }}/>
          <div style={{ position:'absolute', inset:'-8px',  borderRadius:'50%', border:`1px solid ${cfg.color}16`, animation:state!=='idle'?'spinRingR 5s linear infinite':'none', transition:'border-color 0.6s' }}/>
          <div style={{ position:'absolute', inset:'14px',  borderRadius:'50%', border:`1px dashed ${cfg.color}18`, animation:state!=='idle'?'spinRing 3s linear infinite':'none', transition:'border-color 0.6s' }}/>

          {/* Orb body */}
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:`radial-gradient(circle at 35% 30%, ${cfg.color}18 0%, #080810 55%, #060608 100%)`, border:`1.5px solid ${cfg.color}30`, boxShadow:`0 0 0 10px ${cfg.color}08, 0 0 0 24px ${cfg.color}03, 0 0 60px ${cfg.glow}, inset 0 0 30px ${cfg.color}05`, transition:'all 0.6s' }}/>

          {/* Center content */}
          <div style={{ position:'relative', zIndex:2, textAlign:'center' }}>
            {state === 'idle' && (
              <>
                <div style={{ fontSize:'26px', fontWeight:'900', color:cfg.color, letterSpacing:'0.06em', textShadow:`0 0 20px ${cfg.color}`, lineHeight:1 }}>IRA</div>
                <div style={{ fontSize:'8px', color:`${cfg.color}60`, letterSpacing:'0.2em', marginTop:'2px' }}>AI</div>
              </>
            )}
            {state === 'listening' && <div style={{ fontSize:'44px', filter:`drop-shadow(0 0 12px ${cfg.color})` }}>🎙</div>}
            {state === 'thinking'  && <div style={{ fontSize:'44px', animation:'spin 2s linear infinite' }}>⚙️</div>}
            {state === 'speaking'  && <div style={{ fontSize:'44px', filter:`drop-shadow(0 0 12px ${cfg.color})` }}>📡</div>}
          </div>
        </div>

        {/* Status text */}
        <div style={{ marginTop:'16px', textAlign:'center' }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:cfg.color, transition:'color 0.4s' }}>{cfg.sub}</div>
          {transcript && <div style={{ fontSize:'12px', color:'#444', fontStyle:'italic', marginTop:'6px', maxWidth:'260px' }}>"{transcript}"</div>}
        </div>

        {/* Data strip */}
        <div style={{ display:'flex', gap:'20px', marginTop:'16px', padding:'10px 20px', background:'rgba(255,255,255,0.02)', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label:'MODE',  value:state.toUpperCase() },
            { label:'VOICE', value:voiceOn?'ON':'OFF' },
            { label:'MSGS',  value:String(messages.length) },
          ].map(d => (
            <div key={d.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'8px', color:'#3A3A3A', fontWeight:'700', letterSpacing:'0.12em', marginBottom:'2px' }}>{d.label}</div>
              <div style={{ fontSize:'11px', color:cfg.color, fontWeight:'800', letterSpacing:'0.06em', transition:'color 0.4s' }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px', display:'flex', flexDirection:'column', gap:'10px', maxHeight:'280px', zIndex:10, position:'relative' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', gap:'8px', alignItems:'flex-end', animation:'fadeSlide 0.35s ease both' }}>
            {msg.role === 'ira' && (
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`linear-gradient(135deg,${cfg.color},#22C55E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'900', color:'#000', flexShrink:0, transition:'background 0.6s' }}>I</div>
            )}
            <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', alignItems:msg.role==='user'?'flex-end':'flex-start', gap:'3px' }}>
              <div style={{ padding:'11px 15px', borderRadius:msg.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px', background:msg.role==='user'?`linear-gradient(135deg,${cfg.color}14,rgba(34,197,94,0.08))`:'rgba(255,255,255,0.04)', border:`1px solid ${msg.role==='user'?cfg.color+'20':'rgba(255,255,255,0.06)'}`, color:msg.role==='user'?'#DDFFA0':'#E0E0E0', fontSize:'13.5px', lineHeight:'1.7', backdropFilter:'blur(8px)', transition:'border-color 0.6s' }}>
                {msg.text}
              </div>
              <div style={{ fontSize:'10px', color:'#2A2A2A', paddingInline:'4px' }}>{msg.time}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', animation:'fadeSlide 0.3s ease both' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`linear-gradient(135deg,${cfg.color},#22C55E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'900', color:'#000', flexShrink:0 }}>I</div>
            <div style={{ padding:'12px 16px', borderRadius:'18px 18px 18px 4px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:'5px', alignItems:'center' }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width:'5px', height:'5px', borderRadius:'50%', background:cfg.color, animation:'bounce 1.2s ease infinite', animationDelay:`${j*0.2}s`, transition:'background 0.4s' }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick commands */}
      <div style={{ padding:'10px 16px 8px', overflowX:'auto', position:'relative', zIndex:10 }}>
        <div style={{ display:'flex', gap:'7px', width:'max-content' }}>
          {QUICK_CMDS.map((c, i) => (
            <button key={i} onClick={() => sendMessage(c.text)} disabled={loading}
              style={{ flexShrink:0, background:`${cfg.color}06`, border:`1px solid ${cfg.color}18`, borderRadius:'20px', padding:'7px 14px', color:`${cfg.color}AA`, fontSize:'11px', fontWeight:'600', cursor:loading?'not-allowed':'pointer', whiteSpace:'nowrap', opacity:loading?0.5:1, transition:'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background=`${cfg.color}14`; e.currentTarget.style.color=cfg.color }}
              onMouseLeave={e => { e.currentTarget.style.background=`${cfg.color}06`; e.currentTarget.style.color=`${cfg.color}AA` }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'0 16px 12px', display:'flex', gap:'10px', position:'relative', zIndex:10 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask IRA anything..."
          disabled={loading}
          style={{ flex:1, background:'rgba(255,255,255,0.04)', border:`1px solid ${cfg.color}20`, borderRadius:'16px', padding:'14px 18px', color:'#fff', fontSize:'14px', outline:'none', fontFamily:'inherit', transition:'border-color 0.3s', opacity:loading?0.7:1 }}
          onFocus={e => e.target.style.borderColor=`${cfg.color}50`}
          onBlur={e  => e.target.style.borderColor=`${cfg.color}20`}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          style={{ width:'50px', height:'50px', borderRadius:'16px', background:input.trim()&&!loading?`linear-gradient(135deg,${cfg.color},#22C55E)`:'rgba(255,255,255,0.05)', border:'none', cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:input.trim()&&!loading?`0 0 20px ${cfg.glow}`:'none', transition:'all 0.3s' }}>
          {loading
            ? <div style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim()?'#000':'#333'} strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
        </button>
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(6,6,8,0.97)', backdropFilter:'blur(28px)', borderTop:`1px solid ${cfg.color}10`, padding:'10px 24px 28px', transition:'border-color 0.6s' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label:'Home'},
            {href:'/ai',        icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label:'Ira'},
          ].map(n => (
            <a key={n.href} href={n.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'54px', height:'54px', borderRadius:'50%', background:`linear-gradient(135deg,${cfg.color},#22C55E)`, display:'flex', alignItems:'center', justifyContent:'center', marginTop:'-14px', flexShrink:0, textDecoration:'none', boxShadow:`0 0 24px ${cfg.glow}`, transition:'all 0.6s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',  icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, label:'Goals'},
            {href:'/ira', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, label:'IRA'},
          ].map(n => (
            <a key={n.href} href={n.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', textDecoration:'none', flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px', color:n.href==='/ira'?cfg.color:'#3A3A3A', fontWeight:n.href==='/ira'?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}