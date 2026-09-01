'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href:'/dashboard', label:'Dashboard', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href:'/health', label:'Health', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, badge:'Live' },
  { href:'/workout', label:'Workout', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 6.5h11M6.5 17.5h11M3 12h18"/></svg> },
  { href:'/meals', label:'Nutrition', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg> },
  { href:'/habits', label:'Habits', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/></svg> },
  { href:'/goals', label:'Goals', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { href:'/health-live', label:'Live Sensors', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, badge:'Live' },
  { href:'/social', label:'Social', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href:'/ai', label:'Aria AI', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { href:'/IRA', label:'IRA Voice AI', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, badge:'AI' },
  { href:'/reminders', label:'Reminders', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  { href:'/profile', label:'Profile', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg> },
]

export default function WebLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  const isAuth = ['/', '/login', '/signup', '/onboarding'].includes(pathname)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
      }
    }
    if (!isAuth) getUser()
  }, [pathname])

  if (isAuth) return <>{children}</>

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0A0A0A' }}>
      <style>{`
        .sidebar-link { transition: all 0.18s ease; }
        .sidebar-link:hover { background: rgba(255,255,255,0.05) !important; color: #fff !important; }
        .sidebar-link.active { background: rgba(170,255,0,0.08) !important; color: #AAFF00 !important; border-color: rgba(170,255,0,0.15) !important; }
        @media(max-width:768px) { .sidebar { display:none !important; } .main-content { margin-left:0 !important; } }
        @media(min-width:1280px) { .right-panel { display:flex !important; } }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar" style={{ width:open?'240px':'68px', flexShrink:0, background:'#080808', borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:200, transition:'width 0.3s cubic-bezier(0.4,0,0.2,1)', overflow:'hidden' }}>

        {/* Logo */}
        <div style={{ padding:'20px 14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:'10px', minHeight:'70px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'12px', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'900', color:'#000', flexShrink:0, boxShadow:'0 0 20px rgba(170,255,0,0.25)' }}>H</div>
          {open && (
            <div>
              <div style={{ fontSize:'16px', fontWeight:'800', color:'#fff', letterSpacing:'-0.02em', whiteSpace:'nowrap' }}>Hitgram</div>
              <div style={{ fontSize:'10px', color:'#AAFF00', fontWeight:'600', letterSpacing:'0.06em' }}>BUILD YOUR BEST SELF</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setOpen(!open)}
          style={{ margin:'10px 10px 4px', padding:'8px', borderRadius:'10px', background:'transparent', border:'1px solid rgba(255,255,255,0.06)', color:'#3A3A3A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(170,255,0,0.2)'; e.currentTarget.style.color='#AAFF00' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#3A3A3A' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M19 12H5M12 5l-7 7 7 7"/> : <path d="M5 12h14M12 5l7 7-7 7"/>}
          </svg>
        </button>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'4px 8px', display:'flex', flexDirection:'column', gap:'2px' }}>
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <a key={item.href} href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 10px', borderRadius:'10px', textDecoration:'none', color:active?'#AAFF00':'#52525B', background:active?'rgba(170,255,0,0.08)':'transparent', border:`1px solid ${active?'rgba(170,255,0,0.15)':'transparent'}`, whiteSpace:'nowrap', position:'relative' }}>
                <div style={{ flexShrink:0 }}>{item.icon}</div>
                {open && (
                  <>
                    <span style={{ fontSize:'13px', fontWeight:active?'700':'500', flex:1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{ fontSize:'9px', fontWeight:'700', padding:'2px 6px', borderRadius:'20px', background:active?'rgba(170,255,0,0.15)':'rgba(255,255,255,0.06)', color:active?'#AAFF00':'#52525B', letterSpacing:'0.06em' }}>
                        {item.badge}
                      </span>
                    )}
                    {active && <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#AAFF00', flexShrink:0, boxShadow:'0 0 6px #AAFF00' }}/>}
                  </>
                )}
                {!open && item.badge && (
                  <div style={{ position:'absolute', top:'6px', right:'6px', width:'6px', height:'6px', borderRadius:'50%', background:'#AAFF00' }}/>
                )}
              </a>
            )
          })}
        </nav>

        {/* Create Post */}
        <div style={{ padding:'10px 8px 16px' }}>
          <a href="/create-post"
            style={{ display:'flex', alignItems:'center', justifyContent:open?'flex-start':'center', gap:'10px', padding:'11px 12px', borderRadius:'12px', background:'linear-gradient(135deg,#AAFF00,#22C55E)', textDecoration:'none', boxShadow:'0 0 18px rgba(170,255,0,0.25)', transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow='0 0 28px rgba(170,255,0,0.5)'; e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow='0 0 18px rgba(170,255,0,0.25)'; e.currentTarget.style.transform='translateY(0)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
            {open && <span style={{ fontSize:'13px', fontWeight:'800', color:'#000', whiteSpace:'nowrap' }}>Create Post</span>}
          </a>
        </div>

        {/* User info at bottom */}
        {open && user && (
          <div style={{ padding:'12px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'900', color:'#000', flexShrink:0 }}>
              {(profile?.full_name || user.email)?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {profile?.full_name || user.email?.split('@')[0]}
              </div>
              <div style={{ fontSize:'10px', color:'#3A3A3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ flex:1, marginLeft:open?'240px':'68px', transition:'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)', display:'flex', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ width:'100%', maxWidth:'480px', minHeight:'100vh', position:'relative' }}>
          {children}
        </div>
      </div>

      {/* Right Panel */}
      <div className="right-panel" style={{ width:'260px', flexShrink:0, background:'#080808', borderLeft:'1px solid rgba(255,255,255,0.05)', padding:'24px 16px', position:'fixed', right:0, top:0, bottom:0, overflowY:'auto', flexDirection:'column', gap:'16px', display:'none', zIndex:100 }}>

        {/* Quick stats */}
        <div>
          <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>Quick Actions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {[
              {href:'/health', label:'Log Health', icon:'❤️', color:'#EF4444'},
              {href:'/workout', label:'Log Workout', icon:'💪', color:'#F97316'},
              {href:'/meals', label:'Log Meal', icon:'🥗', color:'#22C55E'},
              {href:'/habits', label:'Check Habits', icon:'✅', color:'#EAB308'},
              {href:'/IRA', label:'Talk to IRA', icon:'◎', color:'#AAFF00'},
              {href:'/health-live', label:'Live Sensors', icon:'⚡', color:'#00CFFF'},
            ].map(a => (
              <a key={a.href} href={a.href}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'12px', background:'#111', border:'1px solid rgba(255,255,255,0.05)', textDecoration:'none', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=`${a.color}25`; e.currentTarget.style.transform='translateX(4px)'; e.currentTarget.style.background='#161616' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; e.currentTarget.style.transform='translateX(0)'; e.currentTarget.style.background='#111' }}>
                <span style={{ fontSize:'18px' }}>{a.icon}</span>
                <span style={{ fontSize:'13px', fontWeight:'500', color:'#fff', flex:1 }}>{a.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </a>
            ))}
          </div>
        </div>

        {/* App info */}
        <div style={{ marginTop:'auto', padding:'14px', background:'rgba(170,255,0,0.04)', borderRadius:'14px', border:'1px solid rgba(170,255,0,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'900', color:'#000' }}>H</div>
            <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff' }}>Hitgram v1.0</div>
          </div>
          <div style={{ fontSize:'11px', color:'#3A3A3A', lineHeight:'1.6' }}>AI-powered fitness and health tracking platform by JKWorld Technologies</div>
          <div style={{ marginTop:'8px', display:'flex', gap:'6px' }}>
            <div style={{ fontSize:'9px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.1)', padding:'2px 8px', borderRadius:'20px' }}>IRA AI</div>
            <div style={{ fontSize:'9px', color:'#3B82F6', fontWeight:'700', background:'rgba(59,130,246,0.1)', padding:'2px 8px', borderRadius:'20px' }}>Live Sensors</div>
          </div>
        </div>
      </div>
    </div>
  )
}
