'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [healthLogs, setHealthLogs] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [workouts, setWorkouts] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [tab, setTab] = useState('Progress')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    const [{ data:p },{ data:po },{ data:hl },{ data:ha },{ data:wo },{ data:go }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_posts').select('*').eq('user_id', user.id).order('created_at',{ ascending:false }),
      supabase.from('health_logs').select('*').eq('user_id', user.id).order('log_date',{ ascending:false }).limit(7),
      supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active',true),
      supabase.from('workouts').select('*').eq('user_id', user.id).order('created_at',{ ascending:false }).limit(5),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('status','active'),
    ])
    if (p) { setProfile(p); setEditName(p.full_name||''); setEditBio(p.bio||'') }
    if (po) setPosts(po)
    if (hl) setHealthLogs(hl)
    if (ha) setHabits(ha)
    if (wo) setWorkouts(wo)
    if (go) setGoals(go)
    setLoading(false)
  }

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({
      id:user.id, full_name:editName, bio:editBio,
      username:editName.toLowerCase().replace(/\s/g,'_')||user.email?.split('@')[0],
    })
    setEditing(false); fetchAll()
  }

  const logout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return (
    <div style={{ minHeight:'100vh',background:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ width:'28px',height:'28px',border:'3px solid rgba(170,255,0,0.2)',borderTop:'3px solid #AAFF00',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  const maxStreak = habits.reduce((max,h) => Math.max(max,h.current_streak||0),0)
  const level = Math.floor((profile?.xp_points||0)/100)+1
  const xpProgress = (profile?.xp_points||0)%100
  const latestWeight = healthLogs.find(h=>h.weight_kg)?.weight_kg
  const avgSteps = healthLogs.length>0?Math.round(healthLogs.reduce((s,h)=>s+(h.steps||0),0)/healthLogs.length):0
  const inp = { width:'100%', background:'#0D0D0D', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'10px', padding:'9px 12px', color:'#fff', fontSize:'14px', outline:'none', marginBottom:'8px' } as React.CSSProperties

  return (
    <div style={{ minHeight:'100vh',background:'#0A0A0A',paddingBottom:'100px',animation:'fadeInUp 0.4s ease both' }}>
      <div style={{ position:'sticky',top:0,zIndex:50,background:'rgba(10,10,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.04)',padding:'52px 20px 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ fontSize:'18px',fontWeight:'800',color:'#fff' }}>Profile</div>
        <div style={{ display:'flex',gap:'8px' }}>
          <button onClick={() => setEditing(!editing)}
            style={{ background:'#111',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'20px',padding:'8px 16px',color:'#A1A1AA',fontSize:'12px',fontWeight:'600',cursor:'pointer' }}>
            ✏️ Edit
          </button>
          <button onClick={logout}
            style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'20px',padding:'8px 16px',color:'#EF4444',fontSize:'12px',fontWeight:'600',cursor:'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Profile card */}
        <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'24px',padding:'24px',marginBottom:'14px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'16px',marginBottom:'16px' }}>
            <div style={{ width:'72px',height:'72px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:'900',color:'#000',boxShadow:'0 0 24px rgba(170,255,0,0.3)',flexShrink:0 }}>
              {(profile?.full_name||user?.email)?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              {editing ? (
                <>
                  <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" style={inp}/>
                  <input value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Your bio..." style={inp}/>
                  <button onClick={saveProfile}
                    style={{ background:'#AAFF00',color:'#000',border:'none',borderRadius:'10px',padding:'8px 16px',fontSize:'13px',fontWeight:'800',cursor:'pointer' }}>
                    Save ✓
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'20px',fontWeight:'800',color:'#fff' }}>{profile?.full_name||user?.email?.split('@')[0]}</div>
                  <div style={{ fontSize:'13px',color:'#3A3A3A',marginTop:'2px' }}>@{profile?.username||user?.email?.split('@')[0]}</div>
                  {profile?.bio && <div style={{ fontSize:'13px',color:'#A1A1AA',marginTop:'6px',lineHeight:'1.5' }}>{profile.bio}</div>}
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1px',background:'rgba(255,255,255,0.06)',borderRadius:'14px',overflow:'hidden',marginBottom:'16px' }}>
            {[{ label:'Posts',value:posts.length },{ label:'Workouts',value:workouts.length },{ label:'Streak',value:`${maxStreak}d` }].map(s => (
              <div key={s.label} style={{ background:'#111',padding:'14px',textAlign:'center' }}>
                <div style={{ fontSize:'20px',fontWeight:'800',color:'#fff' }}>{s.value}</div>
                <div style={{ fontSize:'11px',color:'#3A3A3A',fontWeight:'600',marginTop:'2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* XP */}
          <div style={{ background:'#0D0D0D',borderRadius:'14px',padding:'14px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                <div style={{ width:'28px',height:'28px',borderRadius:'8px',background:'rgba(170,255,0,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px' }}>⭐</div>
                <div>
                  <div style={{ fontSize:'13px',fontWeight:'700',color:'#fff' }}>Level {level}</div>
                  <div style={{ fontSize:'11px',color:'#3A3A3A' }}>Fit Legend</div>
                </div>
              </div>
              <div style={{ fontSize:'12px',color:'#AAFF00',fontWeight:'700' }}>{xpProgress}/100 XP</div>
            </div>
            <div style={{ height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden' }}>
              <div style={{ height:'100%',background:'linear-gradient(90deg,#AAFF00,#22C55E)',borderRadius:'2px',width:`${xpProgress}%`,boxShadow:'0 0 6px rgba(170,255,0,0.4)',transition:'width 1s ease' }}/>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'4px',marginBottom:'14px',gap:'4px' }}>
          {['Progress','Posts','Stats'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1,padding:'9px',borderRadius:'8px',border:'none',background:tab===t?'#AAFF00':'transparent',color:tab===t?'#000':'#3A3A3A',fontSize:'13px',fontWeight:'700',cursor:'pointer',transition:'all 0.2s' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Progress tab */}
        {tab==='Progress' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
            <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'18px' }}>
              <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'14px' }}>My Progress</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px' }}>
                {[
                  { label:'Weight',value:latestWeight?`${latestWeight}kg`:'--',color:'#AAFF00' },
                  { label:'Avg Steps',value:avgSteps.toLocaleString(),color:'#3B82F6' },
                  { label:'Active Goals',value:goals.length,color:'#8B5CF6' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#0D0D0D',borderRadius:'12px',padding:'12px',textAlign:'center',border:'1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize:'18px',fontWeight:'800',color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600',marginTop:'2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {goals.length>0 && (
              <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'18px' }}>
                <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'12px' }}>Active Goals</div>
                {goals.map(g => {
                  const pct = Math.min(Math.round((g.current_value/g.target_value)*100),100)
                  return (
                    <div key={g.id} style={{ marginBottom:'12px' }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'6px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                          <span style={{ fontSize:'16px' }}>{g.icon}</span>
                          <span style={{ fontSize:'13px',fontWeight:'600',color:'#fff' }}>{g.title}</span>
                        </div>
                        <span style={{ fontSize:'12px',color:'#AAFF00',fontWeight:'700' }}>{pct}%</span>
                      </div>
                      <div style={{ height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden' }}>
                        <div style={{ height:'100%',background:'#AAFF00',width:`${pct}%`,borderRadius:'2px',boxShadow:'0 0 4px rgba(170,255,0,0.4)',transition:'width 1s ease' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Posts tab */}
        {tab==='Posts' && (
          <div>
            {posts.length===0 ? (
              <div style={{ textAlign:'center',padding:'60px 20px',color:'#3A3A3A' }}>
                <div style={{ fontSize:'48px',marginBottom:'16px' }}>📱</div>
                <div style={{ fontSize:'16px',fontWeight:'600',color:'#fff',marginBottom:'8px' }}>No posts yet</div>
                <a href="/create-post" style={{ color:'#AAFF00',fontSize:'13px',fontWeight:'700' }}>Create your first post →</a>
              </div>
            ) : posts.map((post,i) => (
              <div key={post.id} style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'18px',padding:'16px',marginBottom:'12px',animation:`fadeInUp 0.5s ease ${i*0.06}s both` }}>
                <div style={{ fontSize:'14px',color:'#fff',lineHeight:'1.6',marginBottom:'8px' }}>{post.content}</div>
                {post.workout_tag && <div style={{ display:'inline-block',background:'rgba(170,255,0,0.1)',border:'1px solid rgba(170,255,0,0.2)',borderRadius:'20px',padding:'3px 10px',fontSize:'12px',color:'#AAFF00',fontWeight:'600',marginBottom:'6px' }}>{post.workout_tag}</div>}
                <div style={{ fontSize:'11px',color:'#3A3A3A' }}>{new Date(post.created_at).toLocaleDateString('en',{ month:'short',day:'numeric',year:'numeric' })}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stats tab */}
        {tab==='Stats' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
            <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'18px' }}>
              <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'14px' }}>Health History</div>
              {healthLogs.length===0 ? (
                <div style={{ textAlign:'center',padding:'20px',color:'#3A3A3A',fontSize:'13px' }}>No health logs yet. <a href="/health" style={{ color:'#AAFF00' }}>Start tracking →</a></div>
              ) : healthLogs.map((h,i) => (
                <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<healthLogs.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}>
                  <div style={{ fontSize:'12px',color:'#3A3A3A' }}>{new Date(h.log_date).toLocaleDateString('en',{ weekday:'short',month:'short',day:'numeric' })}</div>
                  <div style={{ display:'flex',gap:'12px' }}>
                    {h.weight_kg && <span style={{ fontSize:'12px',color:'#AAFF00',fontWeight:'700' }}>⚖️{h.weight_kg}kg</span>}
                    <span style={{ fontSize:'12px',color:'#3B82F6',fontWeight:'600' }}>👟{(h.steps||0).toLocaleString()}</span>
                    <span style={{ fontSize:'12px',color:'#3A3A3A' }}>💧{h.water_ml||0}ml</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'18px' }}>
              <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'14px' }}>Habit Streaks</div>
              {habits.length===0 ? (
                <div style={{ textAlign:'center',padding:'20px',color:'#3A3A3A',fontSize:'13px' }}>No habits yet. <a href="/habits" style={{ color:'#AAFF00' }}>Add habits →</a></div>
              ) : habits.map(h => (
                <div key={h.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize:'20px' }}>{h.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px',fontWeight:'600',color:'#fff',marginBottom:'4px' }}>{h.name}</div>
                    <div style={{ height:'3px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden' }}>
                      <div style={{ height:'100%',background:'#F97316',width:`${Math.min((h.current_streak/30)*100,100)}%` }}/>
                    </div>
                  </div>
                  <div style={{ fontSize:'13px',color:'#F97316',fontWeight:'700' }}>🔥{h.current_streak}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',zIndex:100,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 24px 28px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <a href="/dashboard" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Home</div>
          </a>
          <a href="/social" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Social</div>
          </a>
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          <a href="/goals" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Goals</div>
          </a>
          <a href="/profile" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            <div style={{ fontSize:'10px',color:'#AAFF00',fontWeight:'700' }}>Profile</div>
          </a>
        </div>
      </div>
    </div>
  )
}