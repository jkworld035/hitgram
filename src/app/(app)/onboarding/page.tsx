'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  const goals = [
    { id: 'lose_weight', title: 'Lose Weight', desc: 'Burn calories & fat', gradient: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
    { id: 'build_muscle', title: 'Build Muscle', desc: 'Gain strength', gradient: 'linear-gradient(135deg,#4ECDC4,#44A08D)' },
    { id: 'stay_fit', title: 'Stay Fit', desc: 'Keep healthy', gradient: 'linear-gradient(135deg,#AAFF00,#22C55E)' },
    { id: 'productive', title: 'Be Productive', desc: 'Get things done', gradient: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
    { id: 'learn_skills', title: 'Learn Skills', desc: 'Grow every day', gradient: 'linear-gradient(135deg,#F97316,#FBBF24)' },
    { id: 'consistent', title: 'Stay Consistent', desc: 'Build habits', gradient: 'linear-gradient(135deg,#EC4899,#F43F5E)' },
  ]

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const finish = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }
  await supabase.from('profiles').upsert({
    id: user.id,
    username: user.email?.split('@')[0],
    full_name: user.email?.split('@')[0],
    fitness_goal: selected[0] || 'stay_fit',
  })
  router.push('/assessment')
}

  if (step === 0) return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle,rgba(170,255,0,0.1),transparent)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(170,255,0,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(170,255,0,0.02) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />

      <div style={{ textAlign:'center', marginBottom:'56px', position:'relative', zIndex:1, animation:'fadeInUp 0.6s ease both' }}>
        <div style={{ width:'88px', height:'88px', borderRadius:'28px', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'44px', fontWeight:'900', color:'#000', margin:'0 auto 24px', boxShadow:'0 0 60px rgba(170,255,0,0.5)', animation:'glow 2s ease-in-out infinite' }}>H</div>
        <div style={{ fontSize:'44px', fontWeight:'900', color:'#fff', letterSpacing:'-0.04em', marginBottom:'10px', lineHeight:1 }}>Hitgram</div>
        <div style={{ fontSize:'16px', color:'#AAFF00', fontWeight:'600', marginBottom:'8px' }}>Build Your Best Self</div>
        <div style={{ fontSize:'13px', color:'#3A3A3A', maxWidth:'240px', margin:'0 auto', lineHeight:'1.7' }}>AI powered fitness, health tracking and social platform</div>
      </div>

      <div style={{ width:'100%', maxWidth:'380px', position:'relative', zIndex:1, animation:'fadeInUp 0.6s ease 0.2s both' }}>
        <button onClick={() => setStep(1)}
          style={{ width:'100%', background:'#AAFF00', color:'#000', border:'none', borderRadius:'16px', padding:'18px', fontSize:'16px', fontWeight:'900', marginBottom:'12px', boxShadow:'0 0 40px rgba(170,255,0,0.4)', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 60px rgba(170,255,0,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 0 40px rgba(170,255,0,0.4)' }}>
          Get Started →
        </button>
        <button onClick={() => router.push('/login')}
          style={{ width:'100%', background:'transparent', color:'#52525B', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'18px', fontSize:'14px', fontWeight:'600', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(170,255,0,0.2)'; e.currentTarget.style.color='#AAFF00' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#52525B' }}>
          Already have an account
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', padding:'52px 24px 40px', animation:'fadeInUp 0.4s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'32px' }}>
        <button onClick={() => setStep(0)} style={{ background:'transparent', border:'none', color:'#52525B', fontSize:'24px' }}>←</button>
        <button onClick={finish} style={{ background:'transparent', border:'none', color:'#AAFF00', fontSize:'14px', fontWeight:'700' }}>Skip</button>
      </div>
      <div style={{ marginBottom:'32px' }}>
        <div style={{ fontSize:'28px', fontWeight:'900', color:'#fff', letterSpacing:'-0.02em', marginBottom:'8px' }}>What's your<br/>main goal?</div>
        <div style={{ fontSize:'14px', color:'#52525B' }}>Choose your primary focus</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'32px' }}>
        {goals.map(goal => (
          <button key={goal.id} onClick={() => toggle(goal.id)}
            style={{ background:selected.includes(goal.id)?'rgba(170,255,0,0.08)':'#111', border:'1px solid', borderColor:selected.includes(goal.id)?'#AAFF00':'rgba(255,255,255,0.07)', borderRadius:'20px', padding:'20px 16px', textAlign:'left', position:'relative', overflow:'hidden', transition:'all 0.2s' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:goal.gradient, marginBottom:'12px' }} />
            <div style={{ fontSize:'14px', fontWeight:'700', color:selected.includes(goal.id)?'#AAFF00':'#fff', marginBottom:'4px' }}>{goal.title}</div>
            <div style={{ fontSize:'12px', color:'#52525B' }}>{goal.desc}</div>
            {selected.includes(goal.id) && (
              <div style={{ position:'absolute', top:'12px', right:'12px', width:'20px', height:'20px', borderRadius:'50%', background:'#AAFF00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'900', color:'#000' }}>✓</div>
            )}
          </button>
        ))}
      </div>
      <button onClick={finish}
        style={{ width:'100%', background:selected.length>0?'#AAFF00':'#1A1A1A', color:selected.length>0?'#000':'#52525B', border:'none', borderRadius:'16px', padding:'18px', fontSize:'16px', fontWeight:'900', boxShadow:selected.length>0?'0 0 30px rgba(170,255,0,0.3)':'none', transition:'all 0.3s' }}>
        Next →
      </button>
    </div>
  )
}