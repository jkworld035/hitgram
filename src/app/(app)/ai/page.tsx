'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Msg = { role:'user'|'ira'; text:string; time:string }
type HistMsg = { role:'user'|'assistant'; content:string }

const CMDS = [
  { label:'Workout plan', cmd:'Create a personalized workout plan for me' },
  { label:'Meal ideas', cmd:'What should I eat today for optimal energy?' },
  { label:'Motivate me', cmd:'Give me a powerful motivational speech right now' },
  { label:'Sleep tips', cmd:'How can I improve my sleep quality tonight?' },
  { label:'Focus mode', cmd:'Help me get into deep focus mode for 2 hours' },
  { label:'Habit stack', cmd:'Build me a morning habit stack for peak performance' },
  { label:'HIIT workout', cmd:'Give me a 20 minute HIIT workout I can do at home' },
  { label:'Stress relief', cmd:'I am stressed help me calm down right now' },
]

export default function IraPage() {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [input, setInput] = useState('')
  const [voiceOn, setVoiceOn] = useState(true)
  const [bars, setBars] = useState<number[]>(Array(28).fill(3))
  const [messages, setMessages] = useState<Msg[]>([{
    role:'ira',
    text:'IRA online. All systems operational. I am your advanced personal AI optimized for health, fitness, nutrition, habits and life performance. How may I assist you today?',
    time: new Date().toLocaleTimeString('en-US',{ hour:'2-digit',minute:'2-digit' })
  }])
  const history = useRef<HistMsg[]>([])
  const recog = useRef<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const animate = () => {
      setBars(prev => prev.map((_, i) => {
        if (listening) return Math.random()*36+4
        if (speaking) return Math.abs(Math.sin(Date.now()/180+i*0.4))*28+6
        return 3+Math.abs(Math.sin(Date.now()/1200+i*0.6))*2
      }))
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [listening, speaking])

  const speak = useCallback((text: string) => {
    if (!voiceOn || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const clean = text.replace(/[*#`>]/g,'').replace(/\n+/g,'. ')
    const u = new SpeechSynthesisUtterance(clean)
    u.rate=1.0; u.pitch=0.75; u.volume=1
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const v = voices.find(v => v.name.includes('Google UK English Female')||v.name.includes('Microsoft Zira')||v.name.includes('Samantha')) || voices.find(v => v.lang.startsWith('en'))
      if (v) u.voice=v
    }
    window.speechSynthesis.getVoices().length>0 ? setVoice() : window.speechSynthesis.addEventListener('voiceschanged',setVoice,{once:true})
    u.onstart=()=>setSpeaking(true)
    u.onend=()=>setSpeaking(false)
    u.onerror=()=>setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [voiceOn])

  const stopSpeak = () => { window.speechSynthesis.cancel(); setSpeaking(false) }

  const startListen = () => {
    if (speaking) stopSpeak()
    const SR = (window as any).SpeechRecognition||(window as any).webkitSpeechRecognition
    if (!SR) { alert('Use Chrome for voice input'); return }
    const r = new SR()
    r.lang='en-US'; r.interimResults=true; r.continuous=false
    recog.current=r
    r.onstart=()=>setListening(true)
    r.onend=()=>{ setListening(false); setTranscript('') }
    r.onresult=(e:any)=>{
      const res=e.results[e.results.length-1]
      const txt=res[0].transcript
      setTranscript(txt)
      if (res.isFinal) { handleMsg(txt); recog.current?.stop() }
    }
    r.onerror=()=>setListening(false)
    r.start()
  }

  const stopListen = () => { recog.current?.stop(); setListening(false) }

  const handleMsg = async (text: string) => {
    if (!text.trim()||loading) return
    const now = new Date().toLocaleTimeString('en-US',{ hour:'2-digit',minute:'2-digit' })
    setMessages(p=>[...p,{ role:'user',text:text.trim(),time:now }])
    history.current.push({ role:'user',content:text.trim() })
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat',{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ type:'jarvis', messages:history.current.slice(-10) })
      })
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      const data = await res.json()
      const reply = data.message||'I encountered an issue. Please try again.'
      history.current.push({ role:'assistant',content:reply })
      setMessages(p=>[...p,{ role:'ira',text:reply,time:new Date().toLocaleTimeString('en-US',{ hour:'2-digit',minute:'2-digit' }) }])
      speak(reply)
    } catch {
      const err='Connection interrupted. Please try again.'
      setMessages(p=>[...p,{ role:'ira',text:err,time:new Date().toLocaleTimeString('en-US',{ hour:'2-digit',minute:'2-digit' }) }])
    }
    setLoading(false)
  }

  const sendText = () => { if (!input.trim()) return; handleMsg(input); setInput('') }

  const state = listening?'listening':speaking?'speaking':loading?'thinking':'idle'
  const clr = { idle:'#AAFF00', listening:'#FF4C4C', speaking:'#00CFFF', thinking:'#FF9500' }[state]
  const glow = { idle:'rgba(170,255,0,0.2)', listening:'rgba(255,76,76,0.3)', speaking:'rgba(0,207,255,0.3)', thinking:'rgba(255,149,0,0.3)' }[state]
  const ring = { idle:'rgba(170,255,0,0.06)', listening:'rgba(255,76,76,0.08)', speaking:'rgba(0,207,255,0.08)', thinking:'rgba(255,149,0,0.08)' }[state]

  return (
    <div style={{ minHeight:'100vh',background:'#080808',display:'flex',flexDirection:'column',fontFamily:'Inter,sans-serif',paddingBottom:'90px',maxWidth:'480px',margin:'0 auto',position:'relative',overflow:'hidden' }}>
      <div style={{ position:'fixed',inset:0,zIndex:0,backgroundImage:`linear-gradient(rgba(170,255,0,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(170,255,0,0.02) 1px,transparent 1px)`,backgroundSize:'40px 40px',pointerEvents:'none' }}/>
      <div style={{ position:'fixed',top:'-100px',left:'50%',transform:'translateX(-50%)',width:'320px',height:'240px',borderRadius:'50%',background:`radial-gradient(ellipse,${glow} 0%,transparent 70%)`,transition:'background 0.8s ease',zIndex:0,pointerEvents:'none' }}/>

      {/* Header */}
      <div style={{ position:'relative',zIndex:10,padding:'52px 20px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.04)',background:'rgba(8,8,8,0.9)',backdropFilter:'blur(20px)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
          <a href="/dashboard" style={{ width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',fontSize:'16px',textDecoration:'none' }}>←</a>
          <div>
            <div style={{ fontSize:'18px',fontWeight:'800',color:'#fff',letterSpacing:'0.06em' }}>I.R.A</div>
            <div style={{ fontSize:'9px',color:clr,fontWeight:'700',letterSpacing:'0.15em',transition:'color 0.4s' }}>
              {state==='listening'?'● LISTENING':state==='speaking'?'◉ SPEAKING':state==='thinking'?'◈ PROCESSING':'◎ ONLINE'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex',gap:'8px' }}>
          <button onClick={() => { setVoiceOn(v=>!v); if(speaking) stopSpeak() }}
            style={{ width:'36px',height:'36px',borderRadius:'10px',background:voiceOn?'rgba(170,255,0,0.08)':'rgba(255,255,255,0.04)',border:`1px solid ${voiceOn?'rgba(170,255,0,0.2)':'rgba(255,255,255,0.06)'}`,color:voiceOn?'#AAFF00':'#555',fontSize:'16px',cursor:'pointer' }}>
            {voiceOn?'🔊':'🔇'}
          </button>
          <button onClick={() => { history.current=[]; setMessages([{ role:'ira',text:'Memory cleared. Fresh session initialized.',time:new Date().toLocaleTimeString('en-US',{ hour:'2-digit',minute:'2-digit' }) }]) }}
            style={{ width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',color:'#555',fontSize:'16px',cursor:'pointer' }}>↺</button>
        </div>
      </div>

      {/* Orb + Visualizer */}
      <div style={{ position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',padding:'20px 20px 14px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'3px',marginBottom:'18px',height:'48px' }}>
          {bars.map((h,i) => (
            <div key={i} style={{ width:'3px',height:`${Math.max(3,h)}px`,borderRadius:'2px',background:`linear-gradient(180deg,${clr},${clr}60)`,opacity:0.3+(h/40)*0.7,transition:'height 0.06s ease,background 0.5s' }}/>
          ))}
        </div>
        <div onClick={listening?stopListen:speaking?stopSpeak:startListen}
          style={{ width:'140px',height:'140px',borderRadius:'50%',cursor:'pointer',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',background:`radial-gradient(circle at 38% 32%,${clr}12 0%,#0a0a0a 60%)`,border:`1.5px solid ${clr}40`,boxShadow:`0 0 0 14px ${ring},0 0 0 30px ${ring.replace('0.06','0.02')},0 0 60px ${glow}`,transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',transform:listening?'scale(1.08)':'scale(1)' }}>
          <div style={{ position:'absolute',inset:'12px',borderRadius:'50%',border:`1px solid ${clr}15`,animation:(listening||speaking)?'spinRing 3s linear infinite':'none' }}/>
          <div style={{ position:'absolute',inset:'22px',borderRadius:'50%',border:`1px solid ${clr}08`,animation:(listening||speaking)?'spinRing 5s linear infinite reverse':'none' }}/>
          <div style={{ fontSize:'52px',position:'relative',zIndex:2,userSelect:'none' }}>
            {state==='listening'?'🎙':state==='speaking'?'📡':state==='thinking'?'⚙️':'◎'}
          </div>
        </div>
        <div style={{ marginTop:'14px',textAlign:'center' }}>
          <div style={{ fontSize:'13px',fontWeight:'700',color:clr,letterSpacing:'0.04em',transition:'color 0.4s' }}>
            {state==='listening'?'Listening — speak now':state==='speaking'?'Speaking — tap to stop':state==='thinking'?'Processing...':'Tap orb to speak'}
          </div>
          {transcript && <div style={{ fontSize:'12px',color:'#3A3A3A',fontStyle:'italic',marginTop:'4px' }}>"{transcript}"</div>}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1,overflowY:'auto',padding:'0 16px',display:'flex',flexDirection:'column',gap:'10px',maxHeight:'280px' }}>
        {messages.map((msg,i) => (
          <div key={i} style={{ display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',gap:'8px',alignItems:'flex-end' }}>
            {msg.role==='ira' && (
              <div style={{ width:'26px',height:'26px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'900',color:'#000',flexShrink:0 }}>I</div>
            )}
            <div style={{ maxWidth:'78%',display:'flex',flexDirection:'column',alignItems:msg.role==='user'?'flex-end':'flex-start',gap:'2px' }}>
              <div style={{ padding:'10px 14px',borderRadius:msg.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:msg.role==='user'?'linear-gradient(135deg,rgba(170,255,0,0.1),rgba(34,197,94,0.06))':'rgba(255,255,255,0.04)',border:`1px solid ${msg.role==='user'?'rgba(170,255,0,0.15)':'rgba(255,255,255,0.06)'}`,color:msg.role==='user'?'#DDFFAA':'#DEDEDE',fontSize:'13.5px',lineHeight:'1.65' }}>
                {msg.text}
              </div>
              <div style={{ fontSize:'10px',color:'#2A2A2A',paddingInline:'4px' }}>{msg.time}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex',gap:'8px',alignItems:'flex-end' }}>
            <div style={{ width:'26px',height:'26px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'900',color:'#000' }}>I</div>
            <div style={{ padding:'11px 15px',borderRadius:'18px 18px 18px 4px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:'5px',alignItems:'center' }}>
              {[0,1,2].map(j => <div key={j} style={{ width:'5px',height:'5px',borderRadius:'50%',background:'#AAFF00',animation:'bounce 1.2s ease infinite',animationDelay:`${j*0.2}s` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick commands */}
      <div style={{ padding:'10px 16px 8px',overflowX:'auto',position:'relative',zIndex:10 }}>
        <div style={{ display:'flex',gap:'7px',width:'max-content' }}>
          {CMDS.map((c,i) => (
            <button key={i} onClick={() => handleMsg(c.cmd)} disabled={loading}
              style={{ flexShrink:0,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'20px',padding:'7px 13px',color:'#555',fontSize:'11px',fontWeight:'500',cursor:'pointer',whiteSpace:'nowrap',opacity:loading?0.5:1 }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'0 16px 12px',display:'flex',gap:'10px',position:'relative',zIndex:10 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter'&&!e.shiftKey&&sendText()}
          placeholder="Ask IRA anything..."
          disabled={loading}
          style={{ flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'13px 16px',color:'#fff',fontSize:'14px',outline:'none',fontFamily:'Inter,sans-serif' }}
          onFocus={e => e.target.style.borderColor=`${clr}40`}
          onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
        <button onClick={sendText} disabled={loading||!input.trim()}
          style={{ width:'48px',height:'48px',borderRadius:'14px',background:input.trim()?'#AAFF00':'rgba(255,255,255,0.06)',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:input.trim()?'0 0 20px rgba(170,255,0,0.35)':'none',transition:'all 0.2s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim()?'#000':'#333'} strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',zIndex:100,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 24px 26px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <a href="/dashboard" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Home</div>
          </a>
          <a href="/social" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Social</div>
          </a>
          <a href="/create-post" style={{ width:'54px',height:'54px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-14px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 24px rgba(170,255,0,0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          <a href="/goals" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Goals</div>
          </a>
          <a href="/jarvis" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            <div style={{ fontSize:'10px',color:'#AAFF00',fontWeight:'700' }}>IRA</div>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:0.5}30%{transform:translateY(-6px);opacity:1}}
        *::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  )
}