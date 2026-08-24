'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      router.push(user ? '/dashboard' : '/onboarding')
    }
    check()
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'20px', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'900', color:'#000', margin:'0 auto 20px', boxShadow:'0 0 40px rgba(170,255,0,0.4)' }}>H</div>
        <div style={{ width:'28px', height:'28px', border:'3px solid rgba(170,255,0,0.2)', borderTop:'3px solid #AAFF00', borderRadius:'50%', margin:'0 auto', animation:'spin 0.8s linear infinite' }} />
      </div>
    </div>
  )
}