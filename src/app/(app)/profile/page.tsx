'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  username: string | null
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  fitness_goal: string | null
  diet_type: string | null
  xp_points: number
  level: number
  streak_count: number
  subscription_tier: string
  created_at: string
}

interface Stats {
  totalWorkouts: number
  totalSteps: number
  totalPosts: number
  avgSleep: number
  avgMood: number
  habitsCompleted: number
  goalsActive: number
  daysActive: number
}

export default function ProfilePage() {
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [user,       setUser]       = useState<any>(null)
  const [stats,      setStats]      = useState<Stats | null>(null)
  const [posts,      setPosts]      = useState<any[]>([])
  const [healthLogs, setHealthLogs] = useState<any[]>([])
  const [editing,    setEditing]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [tab,        setTab]        = useState<'overview'|'posts'|'health'|'achievements'>('overview')
  const [uploading,  setUploading]  = useState(false)
  const [form,       setForm]       = useState({
    full_name: '', username: '', bio: '',
    fitness_goal: '', diet_type: '',
  })
  const avatarRef = useRef<HTMLInputElement>(null)
  const supabase  = createClient()
  const router    = useRouter()

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    await Promise.all([
      fetchProfile(user.id),
      fetchStats(user.id),
      fetchPosts(user.id),
      fetchHealthLogs(user.id),
    ])
    setLoading(false)
  }

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) {
      setProfile(data)
      setForm({
        full_name:    data.full_name || '',
        username:     data.username  || '',
        bio:          data.bio       || '',
        fitness_goal: data.fitness_goal || '',
        diet_type:    data.diet_type    || '',
      })
    }
  }

  const fetchStats = async (uid: string) => {
    const [workouts, logs, postsData, habits, goals] = await Promise.all([
      supabase.from('workouts').select('id', { count:'exact' }).eq('user_id', uid).eq('completed', true),
      supabase.from('health_logs').select('steps, sleep_minutes, mood').eq('user_id', uid).order('log_date', { ascending: false }).limit(30),
      supabase.from('user_posts').select('id', { count:'exact' }).eq('user_id', uid),
      supabase.from('habit_completions').select('id', { count:'exact' }).eq('user_id', uid),
      supabase.from('goals').select('id', { count:'exact' }).eq('user_id', uid).eq('status', 'active'),
    ])

    const logsData = logs.data || []
    const totalSteps = logsData.reduce((s, l) => s + (l.steps || 0), 0)
    const avgSleep   = logsData.length > 0 ? Math.round(logsData.reduce((s, l) => s + (l.sleep_minutes || 0), 0) / logsData.length / 60 * 10) / 10 : 0
    const avgMood    = logsData.length > 0 ? Math.round(logsData.reduce((s, l) => s + (l.mood || 3), 0) / logsData.length * 10) / 10 : 0

    setStats({
      totalWorkouts:  workouts.count || 0,
      totalSteps:     totalSteps,
      totalPosts:     postsData.count || 0,
      avgSleep:       avgSleep,
      avgMood:        avgMood,
      habitsCompleted: habits.count || 0,
      goalsActive:    goals.count || 0,
      daysActive:     logsData.length,
    })
  }

  const fetchPosts = async (uid: string) => {
    const { data } = await supabase.from('user_posts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(12)
    if (data) setPosts(data)
  }

  const fetchHealthLogs = async (uid: string) => {
    const { data } = await supabase.from('health_logs').select('*').eq('user_id', uid).order('log_date', { ascending: false }).limit(7)
    if (data) setHealthLogs(data)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name:    form.full_name.trim(),
      username:     form.username.trim().toLowerCase().replace(/\s+/g, '_'),
      bio:          form.bio.trim(),
      fitness_goal: form.fitness_goal,
      diet_type:    form.diet_type,
      updated_at:   new Date().toISOString(),
    }).eq('id', user.id)

    if (!error) {
      await fetchProfile(user.id)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      await fetchProfile(user.id)
    } catch (err) {
      console.error('Avatar upload error:', err)
    }
    setUploading(false)
  }

  const signOut = async () => {
    if (!confirm('Sign out of Hitgram?')) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getLevelInfo = (xp: number) => {
    const level     = Math.floor(xp / 500) + 1
    const progress  = (xp % 500) / 500 * 100
    const nextLevel = (Math.floor(xp / 500) + 1) * 500
    return { level, progress, nextLevel, current: xp % 500 }
  }

  const ACHIEVEMENTS = [
    { id:'first_post',    icon:'📸', name:'First Post',      desc:'Share your first fitness post',         condition: stats?.totalPosts   >= 1 },
    { id:'workout_5',     icon:'💪', name:'Workout Warrior', desc:'Complete 5 workouts',                  condition: stats?.totalWorkouts >= 5 },
    { id:'steps_10k',     icon:'👟', name:'Step Master',     desc:'Log 10,000 steps in a day',            condition: stats?.totalSteps    >= 10000 },
    { id:'habit_7',       icon:'✅', name:'Habit Builder',   desc:'Complete 7 habits',                    condition: (stats?.habitsCompleted || 0) >= 7 },
    { id:'streak_3',      icon:'🔥', name:'On Fire',         desc:'3 day activity streak',                condition: (profile?.streak_count || 0) >= 3 },
    { id:'goals_1',       icon:'🎯', name:'Goal Setter',     desc:'Create your first goal',               condition: (stats?.goalsActive  || 0) >= 1 },
    { id:'health_7',      icon:'📊', name:'Health Tracker',  desc:'Log health data for 7 days',           condition: (stats?.daysActive   || 0) >= 7 },
    { id:'ira_chat',      icon:'🤖', name:'IRA Friend',      desc:'Have your first IRA conversation',     condition: true },
    { id:'assessment',    icon:'🧬', name:'Health Assessed',  desc:'Complete the AI health assessment',   condition: !!profile?.fitness_goal },
    { id:'workout_20',    icon:'🏆', name:'Iron Will',       desc:'Complete 20 workouts',                 condition: (stats?.totalWorkouts || 0) >= 20 },
    { id:'steps_100k',    icon:'🌍', name:'Globe Trotter',   desc:'Walk 100,000 total steps',             condition: (stats?.totalSteps || 0) >= 100000 },
    { id:'posts_10',      icon:'⭐', name:'Content Creator', desc:'Share 10 posts with community',        condition: (stats?.totalPosts || 0) >= 10 },
  ]

  const earned = ACHIEVEMENTS.filter(a => a.condition)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'48px', height:'48px', border:'3px solid rgba(170,255,0,0.2)', borderTop:'3px solid #AAFF00', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }}/>
        <div style={{ fontSize:'14px', color:'#3A3A3A' }}>Loading profile...</div>
      </div>
    </div>
  )

  const levelInfo   = getLevelInfo(profile?.xp_points || 0)
  const moodEmoji   = (m: number) => m >= 4 ? '😄' : m >= 3 ? '🙂' : m >= 2 ? '😐' : '😔'
  const inp: React.CSSProperties = {
    width:'100%', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'14px', outline:'none',
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Cover + Avatar */}
      <div style={{ position:'relative', marginBottom:'60px' }}>
        {/* Cover */}
        <div style={{ height:'160px', background:'linear-gradient(135deg,#0A0A0A,#111,#0A2A0A)', position:'relative', overflow:'hidden' }}>
          {profile?.cover_url
            ? <img src={profile.cover_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(170,255,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(170,255,0,0.03) 1px,transparent 1px)', backgroundSize:'30px 30px' }}/>}
          {/* Header actions */}
          <div style={{ position:'absolute', top:'16px', left:'16px', right:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setEditing(!editing)}
                style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'10px', padding:'8px 16px', color:'#fff', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                {editing ? 'Cancel' : '✏️ Edit'}
              </button>
              <button onClick={signOut}
                style={{ background:'rgba(239,68,68,0.2)', backdropFilter:'blur(8px)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'8px 14px', color:'#EF4444', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div style={{ position:'absolute', bottom:'-50px', left:'20px' }}>
          <div style={{ position:'relative', width:'100px', height:'100px' }}>
            <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', border:'4px solid #080808', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', fontWeight:'900', color:'#000', overflow:'hidden', boxShadow:'0 0 30px rgba(170,255,0,0.3)' }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : (profile?.full_name || user?.email || '?')[0]?.toUpperCase()}
            </div>
            {uploading && (
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:'24px', height:'24px', border:'2px solid rgba(170,255,0,0.3)', borderTop:'2px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              </div>
            )}
            {editing && (
              <button onClick={() => avatarRef.current?.click()}
                style={{ position:'absolute', bottom:0, right:0, width:'32px', height:'32px', borderRadius:'50%', background:'#AAFF00', border:'2px solid #080808', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'14px' }}>
                📷
              </button>
            )}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])}/>
        </div>

        {/* Level badge */}
        <div style={{ position:'absolute', bottom:'-40px', right:'20px', display:'flex', alignItems:'center', gap:'8px', background:'#111', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'20px', padding:'6px 14px' }}>
          <div style={{ fontSize:'14px', fontWeight:'900', color:'#AAFF00' }}>⭐ Lv.{levelInfo.level}</div>
          <div style={{ width:'60px', height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#AAFF00', width:`${levelInfo.progress}%`, borderRadius:'2px' }}/>
          </div>
          <div style={{ fontSize:'10px', color:'#3A3A3A' }}>{levelInfo.current}/{500}</div>
        </div>
      </div>

      <div style={{ padding:'0 20px' }}>

        {/* Name & Bio */}
        <div style={{ marginBottom:'16px', animation:'fadeInUp 0.4s ease both' }}>
          <div style={{ fontSize:'22px', fontWeight:'900', color:'#fff', letterSpacing:'-0.02em' }}>
            {profile?.full_name || user?.email?.split('@')[0] || 'Hitgram User'}
          </div>
          <div style={{ fontSize:'13px', color:'#3A3A3A', marginTop:'2px', marginBottom:'6px' }}>
            @{profile?.username || user?.email?.split('@')[0]}
          </div>
          {profile?.bio && (
            <div style={{ fontSize:'14px', color:'#A1A1AA', lineHeight:'1.6' }}>{profile.bio}</div>
          )}
          <div style={{ display:'flex', gap:'8px', marginTop:'10px', flexWrap:'wrap' }}>
            {profile?.fitness_goal && (
              <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.08)', border:'1px solid rgba(170,255,0,0.15)', borderRadius:'20px', padding:'4px 12px' }}>
                🎯 {profile.fitness_goal.replace(/_/g,' ')}
              </div>
            )}
            {profile?.diet_type && (
              <div style={{ fontSize:'11px', color:'#22C55E', fontWeight:'700', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:'20px', padding:'4px 12px' }}>
                🥗 {profile.diet_type.replace(/_/g,' ')}
              </div>
            )}
            {profile?.subscription_tier === 'pro' && (
              <div style={{ fontSize:'11px', color:'#F97316', fontWeight:'700', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.15)', borderRadius:'20px', padding:'4px 12px' }}>
                ⚡ Pro Member
              </div>
            )}
            <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'4px 12px' }}>
              🔥 {profile?.streak_count || 0} day streak
            </div>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'16px', animation:'fadeInUp 0.4s ease 0.05s both' }}>
            {[
              { label:'Workouts',  value:stats.totalWorkouts,                 color:'#F97316' },
              { label:'Posts',     value:stats.totalPosts,                    color:'#3B82F6' },
              { label:'Habits',    value:stats.habitsCompleted,               color:'#EAB308' },
              { label:'Days Active',value:stats.daysActive,                   color:'#AAFF00' },
            ].map(s => (
              <div key={s.label} style={{ background:'#111', border:`1px solid ${s.color}15`, borderRadius:'14px', padding:'12px 8px', textAlign:'center' }}>
                <div style={{ fontSize:'20px', fontWeight:'900', color:s.color }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px', textTransform:'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px', marginBottom:'16px' }}>
          {(['overview','posts','health','achievements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:'8px 4px', borderRadius:'8px', border:'none', background:tab===t?'#AAFF00':'transparent', color:tab===t?'#000':'#3A3A3A', fontSize:'11px', fontWeight:'700', cursor:'pointer', textTransform:'capitalize', transition:'all 0.2s' }}>
              {t === 'achievements' ? '🏆' : t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* Edit form */}
        {editing && (
          <div style={{ background:'#111', border:'1px solid rgba(170,255,0,0.15)', borderRadius:'20px', padding:'18px', marginBottom:'16px', animation:'fadeInUp 0.3s ease both' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>Edit Profile</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Full Name</div>
                <input value={form.full_name} onChange={e => setForm(p=>({...p,full_name:e.target.value}))} placeholder="Your full name" style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Username</div>
                <input value={form.username} onChange={e => setForm(p=>({...p,username:e.target.value}))} placeholder="username" style={inp}
                  onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Bio</div>
                <textarea value={form.bio} onChange={e => setForm(p=>({...p,bio:e.target.value}))} placeholder="Tell your story..." rows={3} style={{ ...inp, resize:'none' }}
                  onFocus={e=>e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Fitness Goal</div>
                <select value={form.fitness_goal} onChange={e => setForm(p=>({...p,fitness_goal:e.target.value}))} style={inp}>
                  <option value="">Select goal...</option>
                  {['weight_loss','muscle_gain','endurance','flexibility','general_health','stress_management','sports_performance'].map(g => (
                    <option key={g} value={g}>{g.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Diet Type</div>
                <select value={form.diet_type} onChange={e => setForm(p=>({...p,diet_type:e.target.value}))} style={inp}>
                  <option value="">Select diet...</option>
                  {['omnivore','vegetarian','vegan','keto','mediterranean','indian_veg','intermittent_fasting','paleo'].map(d => (
                    <option key={d} value={d}>{d.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <button onClick={saveProfile} disabled={saving}
                style={{ width:'100%', background:'#AAFF00', color:'#000', border:'none', borderRadius:'12px', padding:'13px', fontSize:'14px', fontWeight:'800', cursor:'pointer', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {tab === 'overview' && stats && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {/* Health summary */}
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>📊 Health Summary</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px' }}>
                {[
                  { label:'Total Steps',    value:stats.totalSteps.toLocaleString(), unit:'steps',   icon:'👟', color:'#AAFF00' },
                  { label:'Avg Sleep',      value:`${stats.avgSleep}h`,              unit:'per night', icon:'😴', color:'#8B5CF6' },
                  { label:'Avg Mood',       value:`${moodEmoji(stats.avgMood)} ${stats.avgMood}`, unit:'/5', icon:'', color:'#EAB308' },
                  { label:'Goals Active',   value:String(stats.goalsActive),          unit:'goals',   icon:'🎯', color:'#3B82F6' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'14px', padding:'14px', border:`1px solid ${s.color}15` }}>
                    <div style={{ fontSize:'20px', fontWeight:'800', color:s.color, marginBottom:'2px' }}>{s.value}</div>
                    <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase' }}>{s.label}</div>
                    <div style={{ fontSize:'10px', color:`${s.color}80`, marginTop:'1px' }}>{s.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* XP Progress */}
            <div style={{ background:'#111', border:'1px solid rgba(170,255,0,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>⭐ Level {levelInfo.level} — XP Progress</div>
                <div style={{ fontSize:'12px', color:'#AAFF00', fontWeight:'700' }}>{profile?.xp_points || 0} XP</div>
              </div>
              <div style={{ height:'8px', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden', marginBottom:'8px' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#AAFF00,#22C55E)', width:`${levelInfo.progress}%`, borderRadius:'4px', transition:'width 1s ease', boxShadow:'0 0 8px rgba(170,255,0,0.5)' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#3A3A3A' }}>
                <span>{levelInfo.current} / 500 XP to Level {levelInfo.level + 1}</span>
                <span>{Math.round(levelInfo.progress)}%</span>
              </div>
              <div style={{ marginTop:'12px', fontSize:'12px', color:'#52525B', lineHeight:'1.5' }}>
                Earn XP by logging workouts (+50), completing habits (+20), posting (+30) and hitting daily step goals (+100).
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>Quick Actions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {[
                  {href:'/assessment', label:'Retake AI Health Assessment', icon:'🧬', color:'#AAFF00'},
                  {href:'/jarvis',     label:'Talk to IRA Voice AI',         icon:'🤖', color:'#3B82F6'},
                  {href:'/health',     label:'Log Today\'s Health Data',     icon:'❤️', color:'#EF4444'},
                  {href:'/workout',    label:'Start a Workout',              icon:'💪', color:'#F97316'},
                ].map(a => (
                  <a key={a.href} href={a.href}
                    style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'#0D0D0D', borderRadius:'12px', border:`1px solid ${a.color}12`, textDecoration:'none', transition:'all 0.2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=`${a.color}30`;e.currentTarget.style.transform='translateX(4px)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=`${a.color}12`;e.currentTarget.style.transform='translateX(0)'}}>
                    <span style={{ fontSize:'20px' }}>{a.icon}</span>
                    <span style={{ fontSize:'13px', fontWeight:'600', color:'#fff', flex:1 }}>{a.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POSTS TAB */}
        {tab === 'posts' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>📸</div>
                <div style={{ fontSize:'16px', fontWeight:'600', color:'#fff', marginBottom:'8px' }}>No posts yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'20px' }}>Share your fitness journey with the community</div>
                <a href="/create-post"
                  style={{ background:'#AAFF00', color:'#000', border:'none', borderRadius:'14px', padding:'12px 24px', fontSize:'14px', fontWeight:'800', textDecoration:'none', display:'inline-block' }}>
                  Create First Post
                </a>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'4px' }}>
                {posts.map((post, i) => (
                  <div key={post.id}
                    style={{ aspectRatio:'1', background:'#111', borderRadius:'8px', overflow:'hidden', position:'relative', cursor:'pointer', animation:`fadeInUp 0.5s ease ${i*0.04}s both` }}>
                    {post.image_url ? (
                      <img src={post.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    ) : post.video_url ? (
                      <div style={{ width:'100%', height:'100%', background:'#1A1A1A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px' }}>🎥</div>
                    ) : (
                      <div style={{ width:'100%', height:'100%', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', padding:'10px' }}>
                        <div style={{ fontSize:'11px', color:'#A1A1AA', textAlign:'center', lineHeight:'1.4', overflow:'hidden' }}>
                          {post.content?.slice(0, 60)}{post.content?.length > 60 ? '...' : ''}
                        </div>
                      </div>
                    )}
                    {/* Overlay */}
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', transition:'background 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', opacity:0 }}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,0,0,0.5)';e.currentTarget.style.opacity='1'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0)';e.currentTarget.style.opacity='0'}}>
                      <span style={{ fontSize:'13px', color:'#fff', fontWeight:'700' }}>❤️ {post.like_count}</span>
                      <span style={{ fontSize:'13px', color:'#fff', fontWeight:'700' }}>💬 {post.comment_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HEALTH TAB */}
        {tab === 'health' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {healthLogs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>📊</div>
                <div style={{ fontSize:'16px', fontWeight:'600', color:'#fff', marginBottom:'8px' }}>No health data yet</div>
                <a href="/health"
                  style={{ background:'#AAFF00', color:'#000', borderRadius:'14px', padding:'12px 24px', fontSize:'14px', fontWeight:'800', textDecoration:'none', display:'inline-block' }}>
                  Log Health Data
                </a>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {healthLogs.map((log, i) => (
                  <div key={log.id} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'18px', padding:'16px', animation:`fadeInUp 0.5s ease ${i*0.06}s both` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                      <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>
                        {new Date(log.log_date).toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' })}
                      </div>
                      <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.08)', padding:'3px 8px', borderRadius:'20px' }}>
                        {(log.steps||0) >= 10000 ? '🎯 Goal!' : `${Math.round(((log.steps||0)/10000)*100)}%`}
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                      {[
                        { label:'Steps',  value:(log.steps||0).toLocaleString(), color:'#AAFF00' },
                        { label:'Sleep',  value:`${Math.round((log.sleep_minutes||0)/60)}h`,   color:'#8B5CF6' },
                        { label:'Water',  value:`${((log.water_ml||0)/1000).toFixed(1)}L`,      color:'#3B82F6' },
                        { label:'Mood',   value:moodEmoji(log.mood||3),                          color:'#EAB308' },
                      ].map(s => (
                        <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                          <div style={{ fontSize:'14px', fontWeight:'800', color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {tab === 'achievements' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <div style={{ fontSize:'14px', color:'#3A3A3A', fontWeight:'600' }}>{earned.length}/{ACHIEVEMENTS.length} earned</div>
              <div style={{ fontSize:'12px', color:'#AAFF00', fontWeight:'700' }}>{Math.round(earned.length/ACHIEVEMENTS.length*100)}% complete</div>
            </div>
            <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'2px', overflow:'hidden', marginBottom:'16px' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#AAFF00,#22C55E)', width:`${earned.length/ACHIEVEMENTS.length*100}%`, borderRadius:'2px', boxShadow:'0 0 8px rgba(170,255,0,0.5)', transition:'width 1s ease' }}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {ACHIEVEMENTS.map((a, i) => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'14px', background:a.condition?'rgba(170,255,0,0.04)':'#111', border:`1px solid ${a.condition?'rgba(170,255,0,0.15)':'rgba(255,255,255,0.05)'}`, borderRadius:'16px', padding:'14px 16px', opacity:a.condition?1:0.5, animation:`fadeInUp 0.5s ease ${i*0.05}s both`, transition:'all 0.3s' }}>
                  <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:a.condition?'rgba(170,255,0,0.1)':'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', flexShrink:0, filter:a.condition?'none':'grayscale(1)' }}>
                    {a.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px', fontWeight:'700', color:a.condition?'#fff':'#3A3A3A' }}>{a.name}</div>
                    <div style={{ fontSize:'12px', color:'#3A3A3A', marginTop:'2px' }}>{a.desc}</div>
                  </div>
                  {a.condition ? (
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#AAFF00', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  ) : (
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.1)', flexShrink:0 }}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/social',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Social'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
            {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile',active:true},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?'#AAFF00':'#3A3A3A',fontWeight:(n as any).active?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}