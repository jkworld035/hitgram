'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  const inp = {
    width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'14px', padding:'14px 16px', color:'#fff', fontSize:'14px', outline:'none',
  } as React.CSSProperties

  if (done) return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ textAlign:'center', animation:'scaleIn 0.5s ease both' }}>
        <div style={{ fontSize:'64px', marginBottom:'20px', animation:'float 3s ease-in-out infinite' }}>📧</div>
        <div style={{ fontSize:'24px', fontWeight:'800', color:'#fff', marginBottom:'12px' }}>Check your email!</div>
        <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.7' }}>
          We sent a confirmation link to<br/>
          <span style={{ color:'#AAFF00', fontWeight:'600' }}>{email}</span>
        </div>
        <Link href="/login" style={{ display:'inline-block', marginTop:'24px', color:'#AAFF00', fontSize:'14px', fontWeight:'600' }}>
          Back to login →
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(170,255,0,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(170,255,0,0.02) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'400px', position:'relative', zIndex:1, animation:'fadeInUp 0.5s ease both' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'20px', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'900', color:'#000', margin:'0 auto 20px', boxShadow:'0 0 40px rgba(170,255,0,0.4)' }}>H</div>
          <div style={{ fontSize:'24px', fontWeight:'800', color:'#fff', marginBottom:'8px' }}>Create account</div>
          <div style={{ fontSize:'14px', color:'#52525B' }}>Start your self-improvement journey</div>
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'12px', padding:'12px 16px', color:'#EF4444', fontSize:'13px', marginBottom:'20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {[
            { label:'Full Name', type:'text', placeholder:'Your name', value:fullName, set:setFullName },
            { label:'Email', type:'email', placeholder:'you@example.com', value:email, set:setEmail },
            { label:'Password', type:'password', placeholder:'Min 6 characters', value:password, set:setPassword },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize:'12px', color:'#52525B', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>{f.label}</div>
              <input type={f.type} placeholder={f.placeholder} value={f.value}
                onChange={e => f.set(e.target.value)} required
                minLength={f.type==='password'?6:undefined}
                style={inp}
                onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ width:'100%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', color:'#000', border:'none', borderRadius:'14px', padding:'16px', fontSize:'15px', fontWeight:'900', marginTop:'8px', boxShadow:'0 0 24px rgba(170,255,0,0.35)', opacity:loading?0.7:1, transition:'all 0.2s' }}>
            {loading ? 'Creating account...' : 'Create Free Account →'}
          </button>
        </form>

        <p style={{ textAlign:'center', color:'#52525B', fontSize:'13px', marginTop:'24px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color:'#AAFF00', fontWeight:'700' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}