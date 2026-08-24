'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Msg = { role: 'user' | 'ira'; text: string; time: string }
type H = { role: 'user' | 'assistant'; content: string }

const CMDS = [
  { label: '💪 Workout', cmd: 'Create a personalized workout plan for me' },
  { label: '🥗 Meal Plan', cmd: 'What should I eat today for optimal energy?' },
  { label: '⚡ Motivate', cmd: 'Give me a powerful motivational speech right now' },
  { label: '😴 Sleep', cmd: 'How can I improve my sleep quality tonight?' },
  { label: '🧠 Focus', cmd: 'Help me get into deep focus mode for 2 hours' },
  { label: '🔥 Habits', cmd: 'Build me a morning habit stack for peak performance' },
  { label: '🏃 HIIT', cmd: 'Give me a 20 minute HIIT workout I can do at home' },
  { label: '🧘 Calm', cmd: 'I am stressed help me calm down right now' },
]

const STATE_CONFIG = {
  idle:      { main: '#AAFF00', glow: 'rgba(170,255,0,0.25)',  ring: 'rgba(170,255,0,0.07)',  label: '◎  ONLINE', sub: 'Tap orb to speak' },
  listening: { main: '#FF4C4C', glow: 'rgba(255,76,76,0.35)',  ring: 'rgba(255,76,76,0.1)',   label: '●  LISTENING', sub: 'Listening — speak now' },
  speaking:  { main: '#00CFFF', glow: 'rgba(0,207,255,0.35)',  ring: 'rgba(0,207,255,0.1)',   label: '◉  SPEAKING', sub: 'Speaking — tap to stop' },
  thinking:  { main: '#FF9500', glow: 'rgba(255,149,0,0.35)',  ring: 'rgba(255,149,0,0.1)',   label: '◈  PROCESSING', sub: 'Processing your request...' },
}

export default function IRAPage() {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [input, setInput] = useState('')
  const [voiceOn, setVoiceOn] = useState(true)
  const [bars, setBars] = useState<number[]>(Array(32).fill(3))
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'ira',
text: 'Hi there! I am IRA, your personal AI wellness companion. I am here to support your health journey with expert guidance on fitness, nutrition, sleep and healthy habits. What would you like to work on today? I am excited to help you become your best self!',    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }])
  const history = useRef<H[]>([])
  const recog = useRef<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const orbRef = useRef<HTMLDivElement>(null)

  const state = listening ? 'listening' : speaking ? 'speaking' : loading ? 'thinking' : 'idle'
  const cfg = STATE_CONFIG[state]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const animate = () => {
      setBars(prev => prev.map((_, i) => {
        if (listening) return Math.random() * 40 + 4
        if (speaking) return Math.abs(Math.sin(Date.now() / 160 + i * 0.35)) * 32 + 6
        return 3 + Math.abs(Math.sin(Date.now() / 1400 + i * 0.55)) * 2.5
      }))
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [listening, speaking])

  const speak = useCallback((text: string) => {
    if (!voiceOn || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const clean = text.replace(/[*#`>]/g, '').replace(/\n+/g, '. ')
    const u = new SpeechSynthesisUtterance(clean)
    u.rate = 0.92
    u.pitch = 1.35
    u.volume = 1

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices()

      // Priority list — sweetest female voices across all platforms
      const preferred = 
        voices.find(v => v.name === 'Google UK English Female') ||
        voices.find(v => v.name === 'Microsoft Zira - English (United States)') ||
        voices.find(v => v.name === 'Microsoft Aria Online (Natural) - English (United States)') ||
        voices.find(v => v.name === 'Microsoft Aria') ||
        voices.find(v => v.name === 'Samantha') ||
        voices.find(v => v.name === 'Karen') ||
        voices.find(v => v.name === 'Moira') ||
        voices.find(v => v.name === 'Tessa') ||
        voices.find(v => v.name.includes('Google') && v.name.includes('Female')) ||
        voices.find(v => v.name.includes('Zira')) ||
        voices.find(v => v.name.includes('Aria')) ||
        voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Female')) ||
        voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('female')) ||
        voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
        voices.find(v => v.lang.startsWith('en-'))

      if (preferred) {
        u.voice = preferred
        // Fine-tune pitch and rate per voice for sweetest sound
        if (preferred.name.includes('Zira')) { u.pitch = 1.4; u.rate = 0.9 }
        else if (preferred.name.includes('Aria')) { u.pitch = 1.2; u.rate = 0.95 }
        else if (preferred.name.includes('Samantha')) { u.pitch = 1.3; u.rate = 0.92 }
        else if (preferred.name.includes('Karen')) { u.pitch = 1.25; u.rate = 0.9 }
        else if (preferred.name.includes('Google UK English Female')) { u.pitch = 1.3; u.rate = 0.9 }
      }
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true })
    }

    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [voiceOn])

  const stopSpeak = () => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const startListen = () => {
    if (speaking) stopSpeak()
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Use Chrome for voice input'); return }
    const r = new SR()
    r.lang = 'en-US'; r.interimResults = true; r.continuous = false
    recog.current = r
    r.onstart = () => setListening(true)
    r.onend = () => { setListening(false); setTranscript('') }
    r.onresult = (e: any) => {
      const res = e.results[e.results.length - 1]
      const txt = res[0].transcript
      setTranscript(txt)
      if (res.isFinal) { handleMsg(txt); recog.current?.stop() }
    }
    r.onerror = () => setListening(false)
    r.start()
  }

  const stopListen = () => { recog.current?.stop(); setListening(false) }

  const handleMsg = async (text: string) => {
    if (!text.trim() || loading) return
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    setMessages(p => [...p, { role: 'user', text: text.trim(), time: now }])
    history.current.push({ role: 'user', content: text.trim() })
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'jarvis', messages: history.current.slice(-10) })
      })
      const data = await res.json()
      const reply = data.message || 'I encountered an issue. Please try again.'
      history.current.push({ role: 'assistant', content: reply })
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setMessages(p => [...p, { role: 'ira', text: reply, time: replyTime }])
      speak(reply)
    } catch {
      setMessages(p => [...p, { role: 'ira', text: 'Connection interrupted. Please try again.', time: now }])
    }
    setLoading(false)
  }

  const sendText = () => { if (!input.trim()) return; handleMsg(input); setInput('') }

  const clearHistory = () => {
    history.current = []
    setMessages([{
      role: 'ira',
text: 'Memory cleared! Fresh start — I am ready to help you again. What shall we work on together today?',      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }])
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', flexDirection: 'column', fontFamily: '"SF Pro Display",-apple-system,sans-serif', paddingBottom: '90px', maxWidth: '480px', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @keyframes spinRing  { to { transform: rotate(360deg) } }
        @keyframes spinRingR { to { transform: rotate(-360deg) } }
        @keyframes bounce    { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-7px);opacity:1} }
        @keyframes iraGlow   { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes iraFloat  { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.01)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hexPulse  { 0%,100%{opacity:.08} 50%{opacity:.18} }
        @keyframes orb1      { 0%,100%{transform:scale(1) rotate(0deg)} 33%{transform:scale(1.15) rotate(120deg)} 66%{transform:scale(.9) rotate(240deg)} }
        @keyframes scanline  { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        *::-webkit-scrollbar { display:none }
        * { scrollbar-width:none }
      `}</style>

      {/* Animated hex grid background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Hex pattern */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
              <polygon points="28,2 52,14 52,34 28,46 4,34 4,14" fill="none" stroke={cfg.main} strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)"/>
        </svg>

        {/* Scanline effect */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)', pointerEvents: 'none' }} />

        {/* Top ambient */}
        <div style={{ position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)', width: '480px', height: '360px', borderRadius: '50%', background: `radial-gradient(ellipse, ${cfg.glow} 0%, transparent 70%)`, transition: 'background 1s ease', animation: 'iraGlow 3s ease-in-out infinite' }} />

        {/* Bottom ambient */}
        <div style={{ position: 'absolute', bottom: '-80px', left: '50%', transform: 'translateX(-50%)', width: '320px', height: '200px', borderRadius: '50%', background: `radial-gradient(ellipse, ${cfg.glow.replace('0.25', '0.1')} 0%, transparent 70%)`, transition: 'background 1s ease' }} />
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 20, padding: '52px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${cfg.main}15`, background: 'rgba(6,6,8,0.85)', backdropFilter: 'blur(24px)', transition: 'border-color 0.6s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/dashboard" style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '16px', textDecoration: 'none', transition: 'all 0.2s' }}>←</a>
          <div>
            {/* IRA Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `linear-gradient(135deg, ${cfg.main}, #22C55E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#000', boxShadow: `0 0 16px ${cfg.glow}`, transition: 'all 0.6s' }}>I</div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', letterSpacing: '0.12em' }}>I.R.A</div>
                <div style={{ fontSize: '8px', color: '#3A3A3A', letterSpacing: '0.15em', marginTop: '-1px' }}>INTELLIGENT RESPONSE ASSISTANT</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: `${cfg.main}10`, border: `1px solid ${cfg.main}25`, borderRadius: '20px', padding: '5px 10px', transition: 'all 0.4s' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.main, animation: 'iraGlow 1.5s infinite', transition: 'background 0.4s' }} />
            <div style={{ fontSize: '9px', color: cfg.main, fontWeight: '700', letterSpacing: '0.12em', transition: 'color 0.4s' }}>{cfg.label}</div>
          </div>
          <button onClick={() => { setVoiceOn(v => !v); if (speaking) stopSpeak() }}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: voiceOn ? `${cfg.main}12` : 'rgba(255,255,255,0.04)', border: `1px solid ${voiceOn ? cfg.main + '30' : 'rgba(255,255,255,0.07)'}`, color: voiceOn ? cfg.main : '#444', fontSize: '15px', cursor: 'pointer', transition: 'all 0.3s' }}>
            {voiceOn ? '🔊' : '🔇'}
          </button>
          <button onClick={clearHistory}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#444', fontSize: '15px', cursor: 'pointer' }}>↺</button>
        </div>
      </div>

      {/* Orb Section */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px' }}>

        {/* Visualizer bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5px', marginBottom: '24px', height: '56px' }}>
          {bars.map((h, i) => {
            const center = bars.length / 2
            const distFromCenter = Math.abs(i - center) / center
            return (
              <div key={i} style={{
                width: '2.5px',
                height: `${Math.max(3, h)}px`,
                borderRadius: '2px',
                background: `linear-gradient(180deg, ${cfg.main}, ${cfg.main}40)`,
                opacity: (0.2 + (h / 44) * 0.8) * (1 - distFromCenter * 0.3),
                transition: 'height 0.055s ease, background 0.6s',
              }} />
            )
          })}
        </div>

        {/* Main Orb */}
        <div ref={orbRef}
          onClick={listening ? stopListen : speaking ? stopSpeak : startListen}
          style={{
            width: '160px', height: '160px', borderRadius: '50%', cursor: 'pointer',
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: listening ? 'scale(1.1)' : 'scale(1)',
            animation: state === 'idle' ? 'iraFloat 4s ease-in-out infinite' : 'none',
          }}>

          {/* Outer glow rings */}
          <div style={{ position: 'absolute', inset: '-20px', borderRadius: '50%', border: `1px solid ${cfg.main}12`, animation: (listening || speaking) ? 'spinRing 8s linear infinite' : 'none', transition: 'border-color 0.6s' }} />
          <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', border: `1px solid ${cfg.main}18`, animation: (listening || speaking) ? 'spinRingR 5s linear infinite' : 'none', transition: 'border-color 0.6s' }} />

          {/* Main circle */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${cfg.main}20 0%, #080810 55%, #060608 100%)`,
            border: `1.5px solid ${cfg.main}35`,
            boxShadow: `0 0 0 12px ${cfg.ring}, 0 0 0 28px ${cfg.ring.replace('0.07', '0.03')}, 0 0 80px ${cfg.glow}, inset 0 0 40px ${cfg.main}06`,
            transition: 'all 0.6s ease',
          }} />

          {/* Inner spinning rings */}
          <div style={{ position: 'absolute', inset: '14px', borderRadius: '50%', border: `1px dashed ${cfg.main}20`, animation: (listening || speaking) ? 'spinRing 3s linear infinite' : 'none', transition: 'border-color 0.6s' }} />
          <div style={{ position: 'absolute', inset: '24px', borderRadius: '50%', border: `1px solid ${cfg.main}12`, animation: (listening || speaking) ? 'spinRingR 4s linear infinite' : 'none', transition: 'border-color 0.6s' }} />

          {/* IRA monogram / state icon */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {state === 'idle' ? (
              <>
                <div style={{ fontSize: '28px', fontWeight: '900', color: cfg.main, letterSpacing: '0.08em', textShadow: `0 0 20px ${cfg.main}`, lineHeight: 1 }}>IRA</div>
                <div style={{ fontSize: '8px', color: `${cfg.main}70`, letterSpacing: '0.2em', fontWeight: '600' }}>A.I</div>
              </>
            ) : state === 'listening' ? (
              <div style={{ fontSize: '48px', filter: `drop-shadow(0 0 12px ${cfg.main})` }}>🎙</div>
            ) : state === 'speaking' ? (
              <div style={{ fontSize: '48px', filter: `drop-shadow(0 0 12px ${cfg.main})` }}>📡</div>
            ) : (
              <div style={{ fontSize: '48px', filter: `drop-shadow(0 0 12px ${cfg.main})`, animation: 'spinRing 2s linear infinite' }}>⚙️</div>
            )}
          </div>
        </div>

        {/* Status text */}
        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: cfg.main, letterSpacing: '0.04em', transition: 'color 0.4s' }}>{cfg.sub}</div>
          {transcript && (
            <div style={{ fontSize: '12px', color: '#444', fontStyle: 'italic', marginTop: '6px', maxWidth: '280px', lineHeight: 1.5 }}>
              "{transcript}"
            </div>
          )}
        </div>

        {/* Horizontal data readout */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '18px', padding: '10px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'MODE', value: state.toUpperCase() },
            { label: 'VOICE', value: voiceOn ? 'ON' : 'OFF' },
            { label: 'MSGS', value: String(messages.length) },
          ].map(d => (
            <div key={d.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '8px', color: '#3A3A3A', fontWeight: '700', letterSpacing: '0.12em', marginBottom: '2px' }}>{d.label}</div>
              <div style={{ fontSize: '11px', color: cfg.main, fontWeight: '800', letterSpacing: '0.06em', transition: 'color 0.4s' }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end', animation: 'fadeSlide 0.3s ease both' }}>
            {msg.role === 'ira' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg, ${cfg.main}, #22C55E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#000', flexShrink: 0, boxShadow: `0 0 10px ${cfg.glow}`, transition: 'background 0.6s, box-shadow 0.6s' }}>I</div>
            )}
            <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '3px' }}>
              <div style={{
                padding: '11px 15px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user'
                  ? `linear-gradient(135deg, ${cfg.main}14, rgba(34,197,94,0.08))`
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${msg.role === 'user' ? cfg.main + '20' : 'rgba(255,255,255,0.06)'}`,
                color: msg.role === 'user' ? '#DDFFA0' : '#DEDEDE',
                fontSize: '13.5px', lineHeight: '1.7',
                backdropFilter: 'blur(8px)',
              }}>
                {msg.text}
              </div>
              <div style={{ fontSize: '10px', color: '#2A2A2A', paddingInline: '4px' }}>{msg.time}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', animation: 'fadeSlide 0.3s ease both' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg, ${cfg.main}, #22C55E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#000', flexShrink: 0 }}>I</div>
            <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.main, animation: 'bounce 1.2s ease infinite', animationDelay: `${j * 0.2}s`, transition: 'background 0.4s' }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick commands */}
      <div style={{ padding: '10px 16px 8px', overflowX: 'auto', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '7px', width: 'max-content' }}>
          {CMDS.map((c, i) => (
            <button key={i} onClick={() => handleMsg(c.cmd)} disabled={loading}
              style={{ flexShrink: 0, background: `${cfg.main}06`, border: `1px solid ${cfg.main}18`, borderRadius: '20px', padding: '7px 14px', color: cfg.main + 'AA', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: loading ? 0.5 : 1, transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${cfg.main}14`; e.currentTarget.style.color = cfg.main }}
              onMouseLeave={e => { e.currentTarget.style.background = `${cfg.main}06`; e.currentTarget.style.color = cfg.main + 'AA' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: '10px', position: 'relative', zIndex: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
          placeholder="Ask IRA anything..."
          disabled={loading}
          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.main}20`, borderRadius: '16px', padding: '14px 18px', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: 'inherit', backdropFilter: 'blur(8px)', transition: 'border-color 0.3s' }}
          onFocus={e => e.target.style.borderColor = `${cfg.main}50`}
          onBlur={e => e.target.style.borderColor = `${cfg.main}20`}
        />
        <button onClick={sendText} disabled={loading || !input.trim()}
          style={{ width: '50px', height: '50px', borderRadius: '16px', background: input.trim() ? `linear-gradient(135deg, ${cfg.main}, #22C55E)` : 'rgba(255,255,255,0.05)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: input.trim() ? `0 0 24px ${cfg.glow}` : 'none', transition: 'all 0.3s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#000' : '#333'} strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', zIndex: 100, background: 'rgba(6,6,8,0.97)', backdropFilter: 'blur(28px)', borderTop: `1px solid ${cfg.main}12`, padding: '10px 24px 28px', transition: 'border-color 0.6s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Home</div>
          </a>
          <a href="/ai" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Aria</div>
          </a>
          <a href="/create-post" style={{ width: '54px', height: '54px', borderRadius: '50%', background: `linear-gradient(135deg, ${cfg.main}, #22C55E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-14px', flexShrink: 0, textDecoration: 'none', boxShadow: `0 0 28px ${cfg.glow}`, transition: 'all 0.6s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          <a href="/goals" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Goals</div>
          </a>
          <a href="/jarvis" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cfg.main} strokeWidth="2" style={{ transition: 'stroke 0.4s' }}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            <div style={{ fontSize: '10px', color: cfg.main, fontWeight: '700', transition: 'color 0.4s' }}>IRA</div>
          </a>
        </div>
      </div>
    </div>
  )
}