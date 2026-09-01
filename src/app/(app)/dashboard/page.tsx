'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [healthLog, setHealthLog] = useState<any>(null)
  const [habits, setHabits] = useState<any[]>([])
  const [completions, setCompletions] = useState<string[]>([])
  const [workouts, setWorkouts] = useState<any[]>([])
  const [meals, setMeals] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [healthScore, setHealthScore] = useState(0)
  const [animScore, setAnimScore] = useState(0)
  const [liveSteps, setLiveSteps] = useState(0)
  const [liveBattery, setLiveBattery] = useState<number | null>(null)
  const [liveTime, setLiveTime] = useState(new Date())
  const supabase = createClient()
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Battery API
  useEffect(() => {
    const getBattery = async () => {
      const nav = navigator as any
      if (nav.getBattery) {
        const b = await nav.getBattery()
        setLiveBattery(Math.round(b.level * 100))
        b.addEventListener('levelchange', () => setLiveBattery(Math.round(b.level * 100)))
      }
    }
    getBattery()
  }, [])

  // Animate health score
  useEffect(() => {
    if (healthScore === 0) return
    let current = 0
    const step = healthScore / 50
    const t = setInterval(() => {
      current += step
      if (current >= healthScore) { setAnimScore(healthScore); clearInterval(t) }
      else setAnimScore(Math.round(current))
    }, 20)
    return () => clearInterval(t)
  }, [healthScore])

  // Auto step tracker — always on
  useEffect(() => {
    const { getAutoTracker } = require('@/lib/autoStepTracker')
    const tracker = getAutoTracker()
    const unsub = tracker.subscribe((data: any) => {
      setLiveSteps(data.steps)
    })
    return unsub
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await Promise.all([
        fetchProfile(user.id),
        fetchHealth(user.id),
        fetchHabits(user.id),
        fetchWorkouts(user.id),
        fetchMeals(user.id),
        fetchGoals(user.id),
        fetchReminders(user.id),
        fetchPosts(user.id),
      ])
      setLoading(false)
    }
    init()

    // Real-time subscription for live updates
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_logs' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => { if (user) fetchHealth(user.id) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => { if (user) fetchHabits(user.id) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => { if (user) fetchWorkouts(user.id) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => { if (user) fetchMeals(user.id) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setProfile(data)
  }

  const fetchHealth = async (uid: string) => {
    const { data } = await supabase.from('health_logs').select('*').eq('user_id', uid).eq('log_date', today).single()
    if (data) {
      setHealthLog(data)
      setLiveSteps(data.steps || 0)
    }
  }

  const fetchHabits = async (uid: string) => {
    const { data: h } = await supabase.from('habits').select('*').eq('user_id', uid).eq('is_active', true)
    const { data: c } = await supabase.from('habit_completions').select('habit_id').eq('user_id', uid).eq('completed_date', today)
    if (h) setHabits(h)
    if (c) setCompletions(c.map((x: any) => x.habit_id))
  }

  const fetchWorkouts = async (uid: string) => {
    const { data } = await supabase.from('workouts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(5)
    if (data) setWorkouts(data)
  }

  const fetchMeals = async (uid: string) => {
    const { data } = await supabase.from('meals').select('*').eq('user_id', uid).eq('meal_date', today)
    if (data) setMeals(data)
  }

  const fetchGoals = async (uid: string) => {
    const { data } = await supabase.from('goals').select('*').eq('user_id', uid).eq('status', 'active').order('created_at', { ascending: false }).limit(4)
    if (data) setGoals(data)
  }

  const fetchReminders = async (uid: string) => {
    const { data } = await supabase.from('reminders').select('*').eq('user_id', uid).eq('is_done', false).limit(3)
    if (data) setReminders(data)
  }

  const fetchPosts = async (uid: string) => {
    const { data } = await supabase.from('user_posts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(3)
    if (data) setPosts(data)
  }

  // Quick complete habit from dashboard
  const toggleHabit = async (habitId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isDone = completions.includes(habitId)
    if (isDone) {
      await supabase.from('habit_completions').delete().eq('habit_id', habitId).eq('completed_date', today)
      setCompletions(p => p.filter(id => id !== habitId))
    } else {
      await supabase.from('habit_completions').insert({ habit_id: habitId, user_id: user.id, completed_date: today })
      setCompletions(p => [...p, habitId])
    }
  }

  // Calculate health score from all data
  useEffect(() => {
    const stepsScore = Math.min(((healthLog?.steps || 0) / 10000) * 25, 25)
    const waterScore = Math.min(((healthLog?.water_ml || 0) / 2500) * 20, 20)
    const habitsScore = habits.length > 0 ? (completions.length / habits.length) * 20 : 0
    const workoutScore = workouts.filter(w => w.workout_date === today && w.completed).length > 0 ? 20 : 0
    const mealsScore = Math.min(meals.length * 3.75, 15)
    const score = Math.round(stepsScore + waterScore + habitsScore + workoutScore + mealsScore)
    setHealthScore(Math.min(score, 100))
  }, [healthLog, habits, completions, workouts, meals])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#000', margin: '0 auto 20px', boxShadow: '0 0 40px rgba(170,255,0,0.4)', animation: 'pulse 1s ease-in-out infinite' }}>H</div>
        <div style={{ width: '24px', height: '24px', border: '3px solid rgba(170,255,0,0.2)', borderTop: '3px solid #AAFF00', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  )

  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0)
  const totalWorkoutCals = workouts.filter(w => w.workout_date === today).reduce((s, w) => s + (w.calories_burned || 0), 0)
  const doneHabits = completions.length
  const totalHabits = habits.length
  const habitPct = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0
  const scoreColor = healthScore >= 70 ? '#AAFF00' : healthScore >= 40 ? '#F97316' : '#EF4444'
  const scoreLabel = healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Good' : 'Needs Work'

  const features = [
    { label: 'Health Assessment', href: '/assessment', color: '#AAFF00', bg: 'rgba(170,255,0,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, stat: 'AI Plan' },
    { label: 'Health', href: '/health', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, stat: `${(healthLog?.steps || 0).toLocaleString()} steps` },
    { label: 'Workout', href: '/workout', color: '#F97316', bg: 'rgba(249,115,22,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><path d="M6.5 6.5h11M6.5 17.5h11M3 12h18"/></svg>, stat: `${workouts.filter(w => w.workout_date === today).length} today` },
    { label: 'Meals', href: '/meals', color: '#22C55E', bg: 'rgba(34,197,94,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>, stat: `${totalCals} kcal` },
    { label: 'Habits', href: '/habits', color: '#EAB308', bg: 'rgba(234,179,8,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/></svg>, stat: `${habitPct}% done` },
    { label: 'Goals', href: '/goals', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, stat: `${goals.length} active` },
    { label: 'IRA', href: '/ira', color: '#AAFF00', bg: 'rgba(170,255,0,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, stat: 'Voice AI' },
    { label: 'Live Health', href: '/health-live', color: '#00CFFF', bg: 'rgba(0,207,255,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00CFFF" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, stat: 'Real-time' },
    { label: 'Social', href: '/social', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>, stat: `${posts.length} posts` },
    { label: 'Reminders', href: '/reminders', color: '#FB923C', bg: 'rgba(251,146,60,0.08)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>, stat: `${reminders.length} pending` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: '100px', fontFamily: 'Inter,sans-serif', animation: 'fadeInUp 0.4s ease both' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(170,255,0,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(170,255,0,0.018) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '52px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: '#000', boxShadow: '0 0 20px rgba(170,255,0,0.3)' }}>
                {(profile?.full_name || user?.email)?.[0]?.toUpperCase()}
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: '#AAFF00', border: '2px solid #0A0A0A', animation: 'pulse 2s infinite' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '500' }}>{greeting} 👋</div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>{profile?.full_name || user?.email?.split('@')[0]}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Live clock */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '6px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#AAFF00', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
                {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {/* Battery */}
            {liveBattery !== null && (
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '12px' }}>🔋</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: liveBattery > 20 ? '#AAFF00' : '#EF4444' }}>{liveBattery}%</div>
              </div>
            )}
            <a href="/profile" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#111', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            </a>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', position: 'relative', zIndex: 10 }}>

        {/* Health Score Card - Main */}
        <div style={{ background: 'linear-gradient(135deg,#111,#0D0D0D)', border: `1px solid ${scoreColor}20`, borderRadius: '24px', padding: '24px', marginBottom: '14px', position: 'relative', overflow: 'hidden', animation: 'fadeInUp 0.5s ease 0.1s both' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: `radial-gradient(circle,${scoreColor}08,transparent)`, pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Health Score</div>
              <div style={{ fontSize: '72px', fontWeight: '900', color: scoreColor, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: '8px', animation: 'countUp 0.6s ease both' }}>{animScore}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${scoreColor}12`, borderRadius: '20px', padding: '5px 12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: scoreColor, animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '12px', color: scoreColor, fontWeight: '700' }}>{scoreLabel}</span>
              </div>
            </div>

            {/* Animated SVG ring */}
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={scoreColor}/>
                    <stop offset="100%" stopColor="#22C55E"/>
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8"/>
                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGrad)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - animScore / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${scoreColor}80)` }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={scoreColor} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <div style={{ fontSize: '10px', color: '#3A3A3A', marginTop: '4px', fontWeight: '600' }}>LIVE</div>
              </div>
            </div>
          </div>

          {/* Live stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {[
              { label: 'Steps', value: liveSteps.toLocaleString(), color: '#AAFF00', icon: '👟' },
              { label: 'Calories', value: `${totalCals}`, color: '#F97316', icon: '🔥' },
              { label: 'Water', value: `${((healthLog?.water_ml || 0) / 1000).toFixed(1)}L`, color: '#3B82F6', icon: '💧' },
              { label: 'Sleep', value: `${Math.round((healthLog?.sleep_minutes || 0) / 60)}h`, color: '#8B5CF6', icon: '🌙' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '16px', marginBottom: '3px' }}>{s.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: '9px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendation */}
        <a href="/IRA" style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'linear-gradient(135deg,rgba(170,255,0,0.07),rgba(34,197,94,0.03))', border: '1px solid rgba(170,255,0,0.14)', borderRadius: '20px', padding: '16px 18px', marginBottom: '14px', textDecoration: 'none', animation: 'fadeInUp 0.5s ease 0.15s both', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(170,255,0,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(170,255,0,0.14)'; e.currentTarget.style.transform = 'translateY(0)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(170,255,0,0.3)', animation: 'glow 2s ease-in-out infinite' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#AAFF00', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>IRA Recommendation</div>
            <div style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: '1.5' }}>
              {healthScore >= 70 ? `Outstanding! ${liveSteps.toLocaleString()} steps done. Try a 20 min strength session to maximize today.` :
               healthScore >= 40 ? `Log your meals and complete ${totalHabits - doneHabits} more habits to boost your score!` :
               'Start with 5 minutes of movement and drink a glass of water right now!'}
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </a>

        {/* Feature Grid */}
        <div style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>All Features</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px', animation: 'fadeInUp 0.5s ease 0.2s both' }}>
          {features.map((f, i) => (
            <a key={f.label} href={f.href}
              style={{ background: f.bg, border: `1px solid ${f.color}18`, borderRadius: '18px', padding: '14px 12px', display: 'flex', flexDirection: 'column', textDecoration: 'none', transition: 'all 0.2s', animationDelay: `${i * 0.04}s`, position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4)`; e.currentTarget.style.borderColor = `${f.color}35` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${f.color}18` }}>
              <div style={{ marginBottom: '8px' }}>{f.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>{f.label}</div>
              <div style={{ fontSize: '10px', color: f.color, fontWeight: '600' }}>{f.stat}</div>
            </a>
          ))}
        </div>

        {/* Today's Summary - All in one */}
        <div style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Today's Summary</div>

        {/* Workout Calories burned + Meals calories */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease 0.25s both' }}>
          <div style={{ background: '#111', border: '1px solid rgba(249,115,22,0.15)', borderRadius: '18px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#F97316', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>🔥 Burned</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#F97316', letterSpacing: '-0.03em' }}>{totalWorkoutCals}</div>
            <div style={{ fontSize: '11px', color: '#3A3A3A', marginTop: '2px' }}>calories from {workouts.filter(w => w.workout_date === today).length} workout{workouts.filter(w => w.workout_date === today).length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ background: '#111', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '18px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#22C55E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>🥗 Consumed</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#22C55E', letterSpacing: '-0.03em' }}>{totalCals}</div>
            <div style={{ fontSize: '11px', color: '#3A3A3A', marginTop: '2px' }}>calories from {meals.length} meal{meals.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Habits Progress */}
        {habits.length > 0 && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease 0.3s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Today's Habits</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#AAFF00', fontWeight: '700' }}>{doneHabits}/{totalHabits}</div>
                <a href="/habits" style={{ fontSize: '11px', color: '#3A3A3A', textDecoration: 'none', fontWeight: '600' }}>See all →</a>
              </div>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#AAFF00,#22C55E)', borderRadius: '2px', width: `${habitPct}%`, transition: 'width 1s ease', boxShadow: '0 0 8px rgba(170,255,0,0.5)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {habits.slice(0, 4).map(h => {
                const done = completions.includes(h.id)
                return (
                  <div key={h.id} onClick={() => toggleHabit(h.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: done ? 'rgba(170,255,0,0.05)' : '#0D0D0D', borderRadius: '12px', border: `1px solid ${done ? 'rgba(170,255,0,0.12)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: done ? '#AAFF00' : 'transparent', border: done ? 'none' : '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                      {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <span style={{ fontSize: '18px' }}>{h.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: done ? '#AAFF00' : '#fff', flex: 1 }}>{h.name}</span>
                    {h.current_streak > 0 && (
                      <span style={{ fontSize: '11px', color: '#F97316', fontWeight: '700', background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: '20px' }}>🔥{h.current_streak}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Goals Progress */}
        {goals.length > 0 && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease 0.35s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Active Goals</div>
              <a href="/goals" style={{ fontSize: '11px', color: '#3A3A3A', textDecoration: 'none', fontWeight: '600' }}>See all →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {goals.map(g => {
                const pct = Math.min(Math.round((g.current_value / g.target_value) * 100), 100)
                const catColors: Record<string, string> = { health: '#AAFF00', fitness: '#F97316', learning: '#3B82F6', finance: '#EAB308', lifestyle: '#8B5CF6' }
                const c = catColors[g.category || 'health'] || '#AAFF00'
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{g.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{g.title}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: c, fontWeight: '700' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg,${c},#22C55E)`, borderRadius: '3px', width: `${pct}%`, transition: 'width 1s ease', boxShadow: `0 0 6px ${c}60` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Workouts */}
        {workouts.length > 0 && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease 0.4s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Recent Workouts</div>
              <a href="/workout" style={{ fontSize: '11px', color: '#3A3A3A', textDecoration: 'none', fontWeight: '600' }}>See all →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workouts.slice(0, 3).map(w => {
                const typeIcon: Record<string, string> = { strength: '💪', cardio: '🏃', yoga: '🧘', hiit: '⚡', sports: '⚽', general: '🏋️' }
                return (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: w.completed ? 'rgba(170,255,0,0.04)' : '#0D0D0D', borderRadius: '12px', border: `1px solid ${w.completed ? 'rgba(170,255,0,0.1)' : 'rgba(255,255,255,0.04)'}` }}>
                    <div style={{ fontSize: '20px' }}>{typeIcon[w.type] || '🏋️'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{w.name}</div>
                      <div style={{ fontSize: '11px', color: '#3A3A3A', marginTop: '1px' }}>{w.duration_minutes}min · {w.calories_burned}kcal</div>
                    </div>
                    {w.completed && <div style={{ fontSize: '10px', color: '#AAFF00', fontWeight: '700', background: 'rgba(170,255,0,0.1)', padding: '2px 8px', borderRadius: '20px' }}>Done ✓</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Today's Meals */}
        {meals.length > 0 && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease 0.45s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Today's Meals</div>
              <a href="/meals" style={{ fontSize: '11px', color: '#3A3A3A', textDecoration: 'none', fontWeight: '600' }}>See all →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {meals.slice(0, 3).map(m => {
                const mealColors: Record<string, string> = { breakfast: '#FBBF24', lunch: '#22C55E', dinner: '#6366F1', snack: '#F97316' }
                const mealIcons: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
                const c = mealColors[m.meal_type] || '#AAFF00'
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0D0D0D', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${c}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{mealIcons[m.meal_type] || '🍽️'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#3A3A3A', marginTop: '1px', textTransform: 'capitalize' }}>{m.meal_type} · P:{m.protein_g}g C:{m.carbs_g}g F:{m.fat_g}g</div>
                    </div>
                    <div style={{ fontSize: '13px', color: c, fontWeight: '700' }}>{m.calories} kcal</div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(170,255,0,0.04)', borderRadius: '10px', border: '1px solid rgba(170,255,0,0.08)' }}>
                <span style={{ fontSize: '12px', color: '#3A3A3A' }}>Total today</span>
                <span style={{ fontSize: '13px', color: '#AAFF00', fontWeight: '800' }}>{totalCals} kcal</span>
              </div>
            </div>
          </div>
        )}

        {/* Reminders */}
        {reminders.length > 0 && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease 0.5s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Pending Reminders</div>
              <a href="/reminders" style={{ fontSize: '11px', color: '#3A3A3A', textDecoration: 'none', fontWeight: '600' }}>See all →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reminders.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0D0D0D', borderRadius: '12px', border: '1px solid rgba(251,146,60,0.1)' }}>
                  <div style={{ fontSize: '20px' }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{r.title}</div>
                    {r.time && <div style={{ fontSize: '11px', color: '#3A3A3A', marginTop: '1px' }}>⏰ {r.time}</div>}
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FB923C', animation: 'pulse 2s infinite' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no data */}
        {habits.length === 0 && goals.length === 0 && meals.length === 0 && workouts.length === 0 && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px 20px', textAlign: 'center', animation: 'fadeInUp 0.5s ease 0.3s both' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>🚀</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Start your journey!</div>
            <div style={{ fontSize: '13px', color: '#3A3A3A', marginBottom: '20px', lineHeight: '1.6' }}>Log your first workout, meal or habit to see your data here</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { href: '/health', label: '📊 Log Health' },
                { href: '/habits', label: '✅ Add Habit' },
                { href: '/workout', label: '💪 Log Workout' },
                { href: '/meals', label: '🥗 Log Meal' },
              ].map(btn => (
                <a key={btn.href} href={btn.href}
                  style={{ background: 'rgba(170,255,0,0.08)', border: '1px solid rgba(170,255,0,0.15)', borderRadius: '20px', padding: '8px 16px', color: '#AAFF00', fontSize: '12px', fontWeight: '700', textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(170,255,0,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(170,255,0,0.08)' }}>
                  {btn.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', zIndex: 100, background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#AAFF00"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div style={{ fontSize: '10px', color: '#AAFF00', fontWeight: '700' }}>Home</div>
          </a>
          <a href="/social" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Social</div>
          </a>
          <a href="/create-post" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-18px', flexShrink: 0, textDecoration: 'none', boxShadow: '0 0 28px rgba(170,255,0,0.5)', animation: 'glow 2s ease-in-out infinite' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          <a href="/goals" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Goals</div>
          </a>
          <a href="/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
            <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600' }}>Profile</div>
          </a>
        </div>
      </div>
    </div>
  )
}
