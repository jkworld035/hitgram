'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const inp = {
    width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'14px', padding:'14px 16px', color:'#fff', fontSize:'14px',
    outline:'none', transition:'border-color 0.2s',
  } as React.CSSProperties

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden', animation:'fadeIn 0.4s ease both' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(170,255,0,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(170,255,0,0.02) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'-100px', left:'50%', transform:'translateX(-50%)', width:'400px', height:'300px', background:'radial-gradient(ellipse,rgba(170,255,0,0.06),transparent)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'400px', position:'relative', zIndex:1, animation:'fadeInUp 0.5s ease both' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'20px', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'900', color:'#000', margin:'0 auto 20px', boxShadow:'0 0 40px rgba(170,255,0,0.4)' }}>H</div>
          <div style={{ fontSize:'24px', fontWeight:'800', color:'#fff', marginBottom:'8px' }}>Welcome back</div>
          <div style={{ fontSize:'14px', color:'#52525B' }}>Sign in to your Hitgram account</div>
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'12px', padding:'12px 16px', color:'#EF4444', fontSize:'13px', marginBottom:'20px', animation:'fadeIn 0.3s ease both' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div>
            <div style={{ fontSize:'12px', color:'#52525B', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Email</div>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required style={inp}
              onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
          </div>
          <div>
            <div style={{ fontSize:'12px', color:'#52525B', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Password</div>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required style={inp}
              onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', background:'#AAFF00', color:'#000', border:'none', borderRadius:'14px', padding:'16px', fontSize:'15px', fontWeight:'900', marginTop:'8px', boxShadow:'0 0 24px rgba(170,255,0,0.35)', opacity:loading?0.7:1, transition:'all 0.2s' }}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'20px 0' }}>
          <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.06)' }} />
          <span style={{ color:'#3A3A3A', fontSize:'12px' }}>or</span>
          <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.06)' }} />
        </div>

        <button onClick={handleGoogle}
          style={{ width:'100%', background:'#111', color:'#fff', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'14px', fontSize:'14px', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(170,255,0,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <p style={{ textAlign:'center', color:'#52525B', fontSize:'13px', marginTop:'24px' }}>
          No account?{' '}
          <Link href="/signup" style={{ color:'#AAFF00', fontWeight:'700' }}>Sign up free</Link>
        </p>
      </div>
    </div>
  )
}