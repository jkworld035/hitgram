'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Msg   = { role: 'user' | 'ira'; text: string; time: string }
type Hist  = { role: 'user' | 'assistant'; content: string }
type State = 'idle' | 'listening' | 'thinking' | 'speaking'

const QUICK_CMDS = [
  { label: '💪 Workout Plan',  text: 'Create a personalized workout plan for me today' },
  { label: '🥗 Meal Plan',     text: 'What should I eat today for optimal energy?' },
  { label: '😴 Sleep Tips',    text: 'How can I improve my sleep quality tonight?' },
  { label: '⚡ Motivate Me',   text: 'Give me a powerful motivational message right now' },
  { label: '🧠 Focus Mode',    text: 'Help me get into deep focus for the next 2 hours' },
  { label: '🔥 Habit Stack',   text: 'Build me a morning habit stack for peak performance' },
  { label: '🏃 HIIT Workout',  text: 'Give me a 20 minute HIIT workout I can do at home' },
  { label: '🧘 Calm Down',     text: 'I am stressed, help me calm down right now' },
]

const STATE_CONFIG = {
  idle:      { color: '#AAFF00', glow: 'rgba(170,255,0,0.35)',  label: '◎  READY',      sub: 'Tap orb or type to start'   },
  listening: { color: '#FF4C4C', glow: 'rgba(255,76,76,0.45)',  label: '●  LISTENING',  sub: 'Speak now — I am listening' },
  thinking:  { color: '#FF9500', glow: 'rgba(255,149,0,0.45)',  label: '◈  THINKING',   sub: 'Processing your request...' },
  speaking:  { color: '#00CFFF', glow: 'rgba(0,207,255,0.45)',  label: '◉  SPEAKING',   sub: 'Tap orb to stop speaking'   },
}

export default function IRAPage() {
  const [appState,        setAppState]        = useState<State>('idle')
  const [messages,        setMessages]        = useState<Msg[]>([{
    role: 'ira',
    text: 'Hello! I am IRA — your Intelligent Response Assistant. I have deep knowledge across health, fitness, nutrition, science, philosophy and much more. Tap the orb to speak or type below!',
    time: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
  }])
  const [input,           setInput]           = useState('')
  const [voiceOn,         setVoiceOn]         = useState(true)
  const [loading,         setLoading]         = useState(false)
  const [transcript,      setTranscript]      = useState('')
  const [bars,            setBars]            = useState<number[]>(Array(32).fill(3))
  const [voiceSupported,  setVoiceSupported]  = useState(true)
  const [speechSupported, setSpeechSupported] = useState(true)

  const histRef   = useRef<Hist[]>([])
  const recogRef  = useRef<any>(null)
  const animRef   = useRef<number>(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const stateRef  = useRef<State>('idle')

  const cfg = STATE_CONFIG[appState]

  useEffect(() => { stateRef.current = appState }, [appState])

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setVoiceSupported(false)
    if (!window.speechSynthesis) setSpeechSupported(false)
    const load = () => { voicesRef.current = window.speechSynthesis?.getVoices() || [] }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  useEffect(() => {
    const animate = () => {
      setBars(prev => prev.map((_, i) => {
        const s = stateRef.current
        if (s === 'listening') return Math.random() * 48 + 4
        if (s === 'speaking')  return Math.abs(Math.sin(Date.now()/120 + i*0.35)) * 40 + 6
        if (s === 'thinking')  return Math.abs(Math.sin(Date.now()/500 + i*0.7))  * 14 + 3
        return 3 + Math.abs(Math.sin(Date.now()/2000 + i*0.5)) * 2
      }))
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current
    if (!voices.length) return null
    const preferred = ['Samantha','Karen','Moira','Tessa','Google UK English Female','Microsoft Aria Online (Natural)','Microsoft Jenny Online (Natural)','Zira','Aria']
    for (const name of preferred) {
      const v = voices.find(v => v.name.includes(name))
      if (v) return v
    }
    return voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0]
  }, [])

  const splitIntoChunks = (text: string, maxLen: number): string[] => {
    if (text.length <= maxLen) return [text]
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks: string[] = []
    let current = ''
    for (const s of sentences) {
      if ((current + s).length > maxLen && current) { chunks.push(current.trim()); current = s }
      else current += s
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks.length ? chunks : [text]
  }

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setAppState('idle')
  }, [])

  const speak = useCallback((text: string) => {
    if (!voiceOn || !speechSupported) return
    window.speechSynthesis.cancel()
    const clean = text.replace(/[*#`>_~]/g,'').replace(/\n+/g,'. ').replace(/\s+/g,' ').trim()
    if (!clean) return
    const chunks = splitIntoChunks(clean, 200)
    let idx = 0
    const speakChunk = () => {
      if (idx >= chunks.length || stateRef.current !== 'speaking') {
        if (stateRef.current === 'speaking') setAppState('idle')
        return
      }
      const u = new SpeechSynthesisUtterance(chunks[idx])
      const voice = getBestVoice()
      if (voice) u.voice = voice
      u.rate = 0.95; u.pitch = 1.1; u.volume = 1.0
      if (voice?.name.includes('Samantha')) { u.rate = 1.0;  u.pitch = 1.05 }
      if (voice?.name.includes('Google'))   { u.rate = 0.92; u.pitch = 1.15 }
      if (voice?.name.includes('Zira'))     { u.rate = 0.90; u.pitch = 1.2  }
      u.onstart = () => setAppState('speaking')
      u.onend   = () => { idx++; if (idx < chunks.length && stateRef.current === 'speaking') setTimeout(speakChunk, 80); else if (stateRef.current === 'speaking') setAppState('idle') }
      u.onerror = () => { if (stateRef.current === 'speaking') setAppState('idle') }
      const ka = setInterval(() => { if (!window.speechSynthesis.speaking) clearInterval(ka); else { window.speechSynthesis.pause(); window.speechSynthesis.resume() } }, 10000)
      window.speechSynthesis.speak(u)
    }
    setAppState('speaking')
    speakChunk()
  }, [voiceOn, speechSupported, getBestVoice])

  const startListening = useCallback(() => {
    if (!voiceSupported) { alert('Voice input requires Chrome or Edge browser'); return }
    if (appState === 'speaking') stopSpeaking()
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recog = new SR()
    recogRef.current = recog
    recog.lang = 'en-US'; recog.interimResults = true; recog.continuous = false
    recog.onstart  = () => { setAppState('listening'); setTranscript('') }
    recog.onresult = (e: any) => {
      let final = '', interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t; else interim += t
      }
      setTranscript(final || interim)
      if (final) { setTranscript(''); recog.stop(); sendMessage(final.trim()) }
    }
    recog.onerror = (e: any) => {
      setTranscript(''); setAppState('idle')
      if (e.error === 'not-allowed') alert('Microphone permission denied.')
    }
    recog.onend = () => { if (stateRef.current === 'listening') setAppState('idle'); setTranscript('') }
    recog.start()
  }, [voiceSupported, appState, stopSpeaking])

  const stopListening = useCallback(() => {
    recogRef.current?.stop(); setTranscript(''); setAppState('idle')
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const now = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
    setMessages(p => [...p, { role:'user', text:text.trim(), time:now }])
    histRef.current.push({ role:'user', content:text.trim() })
    setInput('')
    setLoading(true)
    setAppState('thinking')
    try {
      const controller = new AbortController()
      const timeout    = setTimeout(() => controller.abort(), 30000)
      const res = await fetch('/api/ai/chat', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ type:'jarvis', messages: histRef.current.slice(-12) }),
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data  = await res.json()
      const reply = data.message || data.reply || data.text || 'Sorry, I could not generate a response.'
      histRef.current.push({ role:'assistant', content:reply })
      const rt = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
      setMessages(p => [...p, { role:'ira', text:reply, time:rt }])
      setLoading(false)
      if (voiceOn && speechSupported) speak(reply); else setAppState('idle')
    } catch (err: any) {
      setLoading(false)
      const msg = err.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Connection issue. Please try again.'
      setMessages(p => [...p, { role:'ira', text:msg, time:new Date().toLocaleTimeString() }])
      setAppState('idle')
    }
  }, [loading, voiceOn, speechSupported, speak])

  const handleOrb = useCallback(() => {
    if (appState === 'speaking')  { stopSpeaking();  return }
    if (appState === 'listening') { stopListening(); return }
    if (appState === 'idle')      { startListening(); return }
  }, [appState, stopSpeaking, stopListening, startListening])

  const handleSend = () => { if (input.trim()) sendMessage(input) }

  const clearChat = () => {
    stopSpeaking()
    histRef.current = []
    setMessages([{ role:'ira', text:'Memory cleared! Fresh start. What would you like to explore?', time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }])
  }

  const replayLast = () => {
    const last = [...messages].reverse().find(m => m.role === 'ira')
    if (last) speak(last.text)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#060608', display:'flex', flexDirection:'column', fontFamily:'"SF Pro Display",-apple-system,Inter,sans-serif', paddingBottom:'90px', maxWidth:'480px', margin:'0 auto', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes orbFloat  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes spinRing  { to{transform:rotate(360deg)} }
        @keyframes spinRingR { to{transform:rotate(-360deg)} }
        @keyframes bounce    { 0%,60%,100%{transform:translateY(0);opacity:.35} 30%{transform:translateY(-9px);opacity:1} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes ripple    { 0%{transform:scale(0.8);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
        *::-webkit-scrollbar { display:none }
      `}</style>

      {/* Background */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-80px', left:'50%', transform:'translateX(-50%)', width:'500px', height:'360px', borderRadius:'50%', background:`radial-gradient(ellipse,${cfg.glow} 0%,transparent 68%)`, transition:'background 0.7s', animation:'glowPulse 3s ease-in-out infinite' }}/>
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }}>
          <defs><pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke={cfg.color} strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" style={{ transition:'stroke 0.7s' }}/>
        </svg>
      </div>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:30, background:'rgba(6,6,8,0.93)', backdropFilter:'blur(28px)', borderBottom:`1px solid ${cfg.color}15`, padding:'52px 20px 16px', transition:'border-color 0.7s' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'38px', height:'38px', borderRadius:'12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:`linear-gradient(135deg,${cfg.color},#22C55E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:'900', color:'#000', boxShadow:`0 0 16px ${cfg.glow}`, transition:'all 0.7s' }}>I</div>
              <div>
                <div style={{ fontSize:'17px', fontWeight:'800', color:'#fff', letterSpacing:'0.08em' }}>I·R·A</div>
                <div style={{ fontSize:'8px', color:'#3A3A3A', letterSpacing:'0.18em', textTransform:'uppercase' }}>Intelligent Response Assistant</div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'5px', background:`${cfg.color}10`, border:`1px solid ${cfg.color}25`, borderRadius:'20px', padding:'5px 11px', transition:'all 0.5s' }}>
              <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:cfg.color, animation:'glowPulse 1.4s infinite' }}/>
              <span style={{ fontSize:'9px', color:cfg.color, fontWeight:'700', letterSpacing:'0.1em' }}>{cfg.label}</span>
            </div>
            <button onClick={() => { if (voiceOn && appState==='speaking') stopSpeaking(); setVoiceOn(v=>!v) }}
              style={{ width:'36px', height:'36px', borderRadius:'10px', background:voiceOn?`${cfg.color}12`:'rgba(255,255,255,0.04)', border:`1px solid ${voiceOn?cfg.color+'30':'rgba(255,255,255,0.07)'}`, cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s' }}>
              {voiceOn?'🔊':'🔇'}
            </button>
            {messages.length > 1 && (
              <button onClick={replayLast} disabled={appState!=='idle'}
                style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', opacity:appState!=='idle'?0.4:1 }}>
                ▶
              </button>
            )}
            <button onClick={clearChat}
              style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#555', cursor:'pointer', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              ↺
            </button>
          </div>
        </div>
      </div>

      {/* Orb + Visualizer */}
      <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 20px 12px' }}>
        {/* Visualizer bars */}
        <div style={{ display:'flex', alignItems:'center', gap:'2px', height:'56px', marginBottom:'18px' }}>
          {bars.map((h, i) => {
            const dist = Math.abs(i - bars.length/2) / (bars.length/2)
            return (
              <div key={i} style={{ width:'2.5px', height:`${Math.max(3,h)}px`, borderRadius:'2px', background:`linear-gradient(180deg,${cfg.color},${cfg.color}20)`, opacity:0.15+(h/48)*0.85*(1-dist*0.4), transition:'height 0.05s ease, background 0.7s' }}/>
            )
          })}
        </div>

        {/* Main Orb */}
        <div onClick={handleOrb} style={{ position:'relative', width:'168px', height:'168px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', animation:appState==='idle'?'orbFloat 4s ease-in-out infinite':'none' }}>
          {(appState==='speaking'||appState==='listening') && (
            <>
              <div style={{ position:'absolute', inset:'-20px', borderRadius:'50%', border:`1.5px solid ${cfg.color}25`, animation:'ripple 2s ease-out infinite' }}/>
              <div style={{ position:'absolute', inset:'-10px', borderRadius:'50%', border:`1.5px solid ${cfg.color}30`, animation:'ripple 2s ease-out infinite 0.5s' }}/>
            </>
          )}
          <div style={{ position:'absolute', inset:'-20px', borderRadius:'50%', border:`1px solid ${cfg.color}08`, animation:appState!=='idle'?'spinRing 10s linear infinite':'none' }}/>
          <div style={{ position:'absolute', inset:'-10px', borderRadius:'50%', border:`1px solid ${cfg.color}12`, animation:appState!=='idle'?'spinRingR 6s linear infinite':'none' }}/>
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:`radial-gradient(circle at 35% 28%,${cfg.color}18 0%,#080812 55%,#060608 100%)`, border:`1.5px solid ${cfg.color}28`, boxShadow:`0 0 0 12px ${cfg.color}06,0 0 0 28px ${cfg.color}02,0 0 70px ${cfg.glow},inset 0 0 40px ${cfg.color}04`, transition:'all 0.7s' }}/>
          <div style={{ position:'relative', zIndex:2, textAlign:'center', userSelect:'none' }}>
            {appState==='idle' && (
              <><div style={{ fontSize:'28px', fontWeight:'900', color:cfg.color, textShadow:`0 0 24px ${cfg.color}`, lineHeight:1 }}>IRA</div>
              <div style={{ fontSize:'8px', color:`${cfg.color}50`, letterSpacing:'0.25em', marginTop:'3px' }}>AI</div></>
            )}
            {appState==='listening' && <div style={{ fontSize:'40px', filter:`drop-shadow(0 0 16px ${cfg.color})`, animation:'glowPulse 0.8s ease-in-out infinite' }}>🎙</div>}
            {appState==='thinking'  && <div style={{ width:'32px', height:'32px', border:`3px solid ${cfg.color}20`, borderTop:`3px solid ${cfg.color}`, borderRadius:'50%', animation:'spin 0.9s linear infinite', margin:'0 auto' }}/>}
            {appState==='speaking'  && <div style={{ fontSize:'40px', filter:`drop-shadow(0 0 16px ${cfg.color})` }}>📡</div>}
          </div>
        </div>

        {/* Status */}
        <div style={{ marginTop:'14px', textAlign:'center', minHeight:'40px' }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:cfg.color, letterSpacing:'0.04em', transition:'color 0.5s' }}>{cfg.sub}</div>
          {transcript && <div style={{ fontSize:'12px', color:'#555', fontStyle:'italic', marginTop:'5px', maxWidth:'260px' }}>"{transcript}"</div>}
          {appState==='speaking' && (
            <button onClick={stopSpeaking}
              style={{ marginTop:'8px', background:'rgba(255,76,76,0.1)', border:'1px solid rgba(255,76,76,0.25)', borderRadius:'20px', padding:'5px 14px', color:'#FF4C4C', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
              ⏹ Stop Speaking
            </button>
          )}
        </div>

        {/* Info strip */}
        <div style={{ display:'flex', gap:'24px', marginTop:'14px', padding:'10px 24px', background:'rgba(255,255,255,0.02)', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.04)' }}>
          {[{label:'MODE',value:appState.toUpperCase()},{label:'VOICE',value:voiceOn?'ON':'OFF'},{label:'MSGS',value:String(messages.length)}].map(d => (
            <div key={d.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'8px', color:'#2A2A2A', fontWeight:'700', letterSpacing:'0.14em', marginBottom:'2px' }}>{d.label}</div>
              <div style={{ fontSize:'11px', color:cfg.color, fontWeight:'800', letterSpacing:'0.06em', transition:'color 0.5s' }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px', display:'flex', flexDirection:'column', gap:'10px', maxHeight:'280px', zIndex:10, position:'relative' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', gap:'8px', alignItems:'flex-end', animation:'fadeSlide 0.35s ease both' }}>
            {msg.role==='ira' && (
              <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:`linear-gradient(135deg,${cfg.color},#22C55E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'900', color:'#000', flexShrink:0, boxShadow:`0 0 10px ${cfg.glow}`, transition:'background 0.7s' }}>I</div>
            )}
            <div style={{ maxWidth:'80%', display:'flex', flexDirection:'column', alignItems:msg.role==='user'?'flex-end':'flex-start', gap:'3px' }}>
              <div
                onClick={() => { if (msg.role==='ira' && voiceOn) speak(msg.text) }}
                style={{ padding:'11px 15px', borderRadius:msg.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px', background:msg.role==='user'?`linear-gradient(135deg,${cfg.color}16,rgba(34,197,94,0.08))`:'rgba(255,255,255,0.045)', border:`1px solid ${msg.role==='user'?cfg.color+'22':'rgba(255,255,255,0.07)'}`, color:msg.role==='user'?'#E8FFD0':'#E2E2E2', fontSize:'13.5px', lineHeight:'1.75', backdropFilter:'blur(8px)', wordBreak:'break-word', cursor:msg.role==='ira'?'pointer':'default', transition:'border-color 0.7s' }}>
                {msg.text}
              </div>
              <div style={{ fontSize:'10px', color:'#272727', paddingInline:'4px' }}>
                {msg.role==='ira'?'IRA':'You'} · {msg.time}
                {msg.role==='ira' && voiceOn && <span style={{ marginLeft:'6px', color:`${cfg.color}40`, fontSize:'9px' }}>tap to replay</span>}
              </div>
            </div>
            {msg.role==='user' && (
              <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>👤</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', animation:'fadeSlide 0.3s ease both' }}>
            <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:`linear-gradient(135deg,${cfg.color},#22C55E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'900', color:'#000', flexShrink:0 }}>I</div>
            <div style={{ padding:'12px 18px', borderRadius:'18px 18px 18px 4px', background:'rgba(255,255,255,0.045)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'5px', alignItems:'center' }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width:'6px', height:'6px', borderRadius:'50%', background:cfg.color, animation:'bounce 1.2s ease infinite', animationDelay:`${j*0.22}s`, transition:'background 0.5s' }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick commands */}
      <div style={{ padding:'10px 16px 8px', overflowX:'auto', zIndex:10, position:'relative' }}>
        <div style={{ display:'flex', gap:'7px', width:'max-content' }}>
          {QUICK_CMDS.map((c, i) => (
            <button key={i} onClick={() => sendMessage(c.text)} disabled={loading||appState==='listening'}
              style={{ flexShrink:0, background:`${cfg.color}06`, border:`1px solid ${cfg.color}18`, borderRadius:'20px', padding:'7px 14px', color:`${cfg.color}90`, fontSize:'11px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap', opacity:loading?0.45:1, transition:'all 0.3s' }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${cfg.color}14`;e.currentTarget.style.color=cfg.color}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${cfg.color}06`;e.currentTarget.style.color=`${cfg.color}90`}}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'0 16px 12px', display:'flex', gap:'10px', zIndex:10, position:'relative' }}>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()} placeholder={voiceSupported?'Type or tap orb to speak...':'Ask IRA anything...'} disabled={loading||appState==='listening'}
          style={{ flex:1, background:'rgba(255,255,255,0.04)', border:`1.5px solid ${input?cfg.color+'40':cfg.color+'18'}`, borderRadius:'16px', padding:'13px 18px', color:'#fff', fontSize:'14px', outline:'none', fontFamily:'inherit', transition:'border-color 0.3s', opacity:loading?0.65:1 }}
          onFocus={e=>e.target.style.borderColor=`${cfg.color}55`} onBlur={e=>e.target.style.borderColor=`${input?cfg.color+'40':cfg.color+'18'}`}/>
        <button onClick={handleSend} disabled={loading||!input.trim()||appState==='listening'}
          style={{ width:'50px', height:'50px', borderRadius:'16px', background:input.trim()&&!loading?`linear-gradient(135deg,${cfg.color},#22C55E)`:'rgba(255,255,255,0.05)', border:'none', cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:input.trim()&&!loading?`0 0 22px ${cfg.glow}`:'none', transition:'all 0.3s' }}>
          {loading
            ? <div style={{ width:'18px', height:'18px', border:`2px solid ${cfg.color}25`, borderTop:`2px solid ${cfg.color}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={input.trim()?'#000':'#333'} strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
        </button>
      </div>

      {!voiceSupported && (
        <div style={{ padding:'0 16px 8px', zIndex:10, position:'relative' }}>
          <div style={{ background:'rgba(234,179,8,0.06)', border:'1px solid rgba(234,179,8,0.15)', borderRadius:'12px', padding:'8px 14px', fontSize:'11px', color:'#EAB308', textAlign:'center' }}>
            💡 Voice input requires Chrome or Edge. Text input works everywhere.
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(6,6,8,0.97)', backdropFilter:'blur(28px)', borderTop:`1px solid ${cfg.color}10`, padding:'10px 24px 28px', transition:'border-color 0.7s' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/ai',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,label:'Aria'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'54px',height:'54px',borderRadius:'50%',background:`linear-gradient(135deg,${cfg.color},#22C55E)`,display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-14px',flexShrink:0,textDecoration:'none',boxShadow:`0 0 24px ${cfg.glow}`,transition:'all 0.7s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
            {href:'/ira',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,label:'IRA'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:n.href==='/ira'?cfg.color:'#3A3A3A',fontWeight:n.href==='/ira'?'700':'600',transition:'color 0.5s' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}