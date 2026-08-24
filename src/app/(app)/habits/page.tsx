'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  target_days: number[]
  current_streak: number
  longest_streak: number
  total_completions: number
  category: string
  created_at: string
  is_active: boolean
  reminder_time?: string | null
  notes?: string | null
  difficulty?: 'easy' | 'medium' | 'hard'
  xp_reward?: number
}

interface Completion {
  habit_id: string
  completed_date: string
  user_id?: string
}

interface ParticleState {
  id: number; x: number; y: number; vx: number; vy: number; life: number; color: string; size: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ICONS = ['✅','💪','🧘','📚','💧','🏃','🥗','😴','🎯','🔥','🧠','☀️','🎵','✍️','🏋️','🚴','🧗','🏊','🍎','🧹','💊','🤸','📝','🎨','🧃','🛁','🌿','🧘','💬','🎤','🏆','⚡','🌱','❤️','🦷','🌙']
const COLORS = [
  { hex: '#AAFF00', label: 'Lime' }, { hex: '#00FFA3', label: 'Mint' },
  { hex: '#00C6FF', label: 'Sky' }, { hex: '#A855F7', label: 'Violet' },
  { hex: '#F97316', label: 'Orange' }, { hex: '#FF4D4D', label: 'Red' },
  { hex: '#FFB800', label: 'Gold' }, { hex: '#EC4899', label: 'Pink' },
  { hex: '#38BDF8', label: 'Cyan' }, { hex: '#34D399', label: 'Emerald' },
]
const CATEGORIES = ['Health', 'Fitness', 'Mind', 'Productivity', 'Social', 'Learning', 'Finance', 'Other']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DIFFICULTY = [
  { value: 'easy', label: '😌 Easy', xp: 10, color: '#00FFA3' },
  { value: 'medium', label: '⚡ Medium', xp: 25, color: '#FFB800' },
  { value: 'hard', label: '🔥 Hard', xp: 50, color: '#FF4D4D' },
]

// ─── Particle Hook ────────────────────────────────────────────────────────────
function useParticles() {
  const [particles, setParticles] = useState<ParticleState[]>([])
  const idRef = useRef(0)
  const burst = useCallback((x: number, y: number, color: string) => {
    const newP: ParticleState[] = Array.from({ length: 18 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      return { id: idRef.current++, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, life: 1, color, size: 3 + Math.random() * 5 }
    })
    setParticles(p => [...p, ...newP])
    const tick = () => setParticles(p => {
      const next = p.map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.18, life: pt.life - 0.03 })).filter(pt => pt.life > 0)
      if (next.length > 0) requestAnimationFrame(tick)
      return next
    })
    requestAnimationFrame(tick)
  }, [])
  return { particles, burst }
}

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const startRef = useRef(0); const startValRef = useRef(value)
  useEffect(() => {
    startValRef.current = display; startRef.current = performance.now()
    const animate = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(startValRef.current + (value - startValRef.current) * ease))
      if (t < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])
  return <>{display}</>
}

// ─── Streak Flame ─────────────────────────────────────────────────────────────
function StreakFlame({ count }: { count: number }) {
  if (!count) return null
  const intensity = Math.min(count / 30, 1)
  const color = count >= 30 ? '#FF6B00' : count >= 14 ? '#FF9500' : count >= 7 ? '#FFB800' : '#FFDD00'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 12, filter: `drop-shadow(0 0 ${4 + intensity * 6}px ${color})` }}>🔥</span>
      <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '-0.3px' }}>{count}</span>
    </span>
  )
}

// ─── Week Heatmap ─────────────────────────────────────────────────────────────
function WeekHeatmap({ completions, color }: { completions: string[]; color: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {days.map((day, i) => {
        const done = completions.includes(day)
        const dayName = new Date(day).toLocaleDateString('en', { weekday: 'short' })
        return (
          <div key={day} title={`${dayName}: ${done ? '✓' : '✗'}`}
            style={{ width: 10, height: 10, borderRadius: 3, background: done ? color : 'rgba(255,255,255,0.05)', transition: 'all 0.3s', boxShadow: done ? `0 0 6px ${color}60` : 'none', transform: done ? 'scale(1.15)' : 'scale(1)' }} />
        )
      })}
    </div>
  )
}

// ─── Ring Progress ────────────────────────────────────────────────────────────
function RingProgress({ pct, size = 96, stroke = 8, color = '#AAFF00', children }: { pct: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

// ─── XP Badge ─────────────────────────────────────────────────────────────────
function XPBadge({ xp }: { xp: number }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: '#FFB800', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)', padding: '2px 7px', borderRadius: 8, letterSpacing: '0.04em' }}>
      +{xp} XP
    </span>
  )
}

// ─── Calendar Month View ──────────────────────────────────────────────────────
function MiniCalendar({ completions, color }: { completions: string[]; color: string }) {
  const today = new Date()
  const year = today.getFullYear(); const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)])
  return (
    <div style={{ padding: '16px 16px 8px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {today.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
          {week.map((day, di) => {
            if (!day) return <div key={di} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const done = completions.includes(dateStr)
            const isToday = day === today.getDate()
            return (
              <div key={di} style={{ width: '100%', aspectRatio: '1', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: done ? 800 : 500, background: done ? color : isToday ? 'rgba(255,255,255,0.08)' : 'transparent', color: done ? '#000' : isToday ? '#fff' : 'var(--text-dim)', boxShadow: done ? `0 0 8px ${color}60` : 'none', border: isToday && !done ? '1px solid rgba(255,255,255,0.15)' : 'none', transition: 'all 0.2s' }}>
                {day}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Habit Detail Modal ───────────────────────────────────────────────────────
function HabitDetailModal({ habit, completions, onClose, onDelete }: { habit: Habit; completions: string[]; onClose: () => void; onDelete: () => void }) {
  const pct = habit.target_days.length > 0 ? Math.round((completions.length / Math.max(habit.target_days.length * 4, 1)) * 100) : 0
  const avgPerWeek = (habit.total_completions / Math.max(1, Math.ceil((Date.now() - new Date(habit.created_at).getTime()) / (7 * 86400000)))).toFixed(1)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0D0F15', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 20px 40px', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `${habit.color}15`, border: `2px solid ${habit.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            {habit.icon}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)' }}>{habit.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{habit.category} · {habit.target_days.length}×/week</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#666', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Streak', value: `${habit.current_streak}d`, color: '#FFB800' },
            { label: 'Best', value: `${habit.longest_streak}d`, color: '#AAFF00' },
            { label: 'Total', value: habit.total_completions, color: '#00FFA3' },
            { label: 'Avg/wk', value: avgPerWeek, color: '#00C6FF' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
          <MiniCalendar completions={completions} color={habit.color} />
        </div>

        {/* Target days */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Scheduled days</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAY_LABELS.map((d, i) => (
              <div key={i} style={{ flex: 1, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: habit.target_days.includes(i) ? `${habit.color}20` : 'rgba(255,255,255,0.03)', color: habit.target_days.includes(i) ? habit.color : 'var(--text-dim)', border: `1px solid ${habit.target_days.includes(i) ? habit.color + '40' : 'rgba(255,255,255,0.06)'}` }}>
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {habit.notes && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{habit.notes}</div>
          </div>
        )}

        <button onClick={onDelete}
          style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', color: '#FF4D4D', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
          🗑 Delete Habit
        </button>
      </div>
    </div>
  )
}

// ─── Auto-Detect Suggestions ──────────────────────────────────────────────────
const SMART_SUGGESTIONS = [
  { name: 'Drink 2L water', icon: '💧', color: '#00C6FF', category: 'Health', targetDays: [0,1,2,3,4,5,6], difficulty: 'easy', xp: 10, notes: 'Stay hydrated throughout the day' },
  { name: 'Morning workout', icon: '🏋️', color: '#AAFF00', category: 'Fitness', targetDays: [1,3,5], difficulty: 'hard', xp: 50, notes: '30 min minimum' },
  { name: 'Read 20 pages', icon: '📚', color: '#A855F7', category: 'Learning', targetDays: [0,1,2,3,4,5,6], difficulty: 'medium', xp: 25, notes: 'Any book counts!' },
  { name: 'Meditate 10 min', icon: '🧘', color: '#00FFA3', category: 'Mind', targetDays: [0,1,2,3,4,5,6], difficulty: 'easy', xp: 15, notes: 'Use Headspace or just breathe' },
  { name: '8 hours sleep', icon: '😴', color: '#38BDF8', category: 'Health', targetDays: [0,1,2,3,4,5,6], difficulty: 'medium', xp: 20 },
  { name: 'No social media', icon: '📵', color: '#FF4D4D', category: 'Mind', targetDays: [1,2,3,4,5], difficulty: 'hard', xp: 50 },
  { name: 'Journaling', icon: '✍️', color: '#FFB800', category: 'Mind', targetDays: [0,1,2,3,4,5,6], difficulty: 'easy', xp: 15 },
  { name: 'Walk 10k steps', icon: '🏃', color: '#34D399', category: 'Fitness', targetDays: [1,2,3,4,5], difficulty: 'medium', xp: 30 },
]

// ─── NAV ─────────────────────────────────────────────────────────────────────
function NAV({ active = 'habits' }: { active?: string }) {
  const items = [
    { href: '/dashboard', label: 'Home', icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
    { href: '/social', label: 'Social', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></> },
  ]
  const rightItems = [
    { href: '/goals', label: 'Goals', icon: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> },
    { href: '/profile', label: 'Profile', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></> },
  ]
  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 100, background: 'rgba(5,5,8,0.98)', backdropFilter: 'blur(32px)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 24px 30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {items.map(n => (
          <a key={n.label} href={n.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active === n.label.toLowerCase() ? '#AAFF00' : '#2A2A2A'} strokeWidth="2">{n.icon}</svg>
            <span style={{ fontSize: 10, color: active === n.label.toLowerCase() ? '#AAFF00' : '#2A2A2A', fontWeight: 700 }}>{n.label}</span>
          </a>
        ))}
        <a href="/habits" style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -20, flexShrink: 0, textDecoration: 'none', boxShadow: '0 0 28px rgba(170,255,0,0.45)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </a>
        {rightItems.map(n => (
          <a key={n.label} href={n.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', flex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active === n.label.toLowerCase() ? '#AAFF00' : '#2A2A2A'} strokeWidth="2">{n.icon}</svg>
            <span style={{ fontSize: 10, color: active === n.label.toLowerCase() ? '#AAFF00' : '#2A2A2A', fontWeight: 700 }}>{n.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HabitsPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const todayDay = new Date().getDay()

  // Core state
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<string[]>([])
  const [habitHistory, setHabitHistory] = useState<Record<string, string[]>>({})
  const [allTimeHistory, setAllTimeHistory] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)

  // UI state
  const [showAdd, setShowAdd] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards')
  const [sortBy, setSortBy] = useState<'order' | 'streak' | 'completion' | 'xp'>('order')
  const [showDetailFor, setShowDetailFor] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [totalXP, setTotalXP] = useState(0)
  const [activeTab, setActiveTab] = useState<'habits' | 'stats' | 'insights'>('habits')

  // Form state
  const [form, setForm] = useState({
    name: '', icon: '🎯', color: '#AAFF00', category: 'Health',
    targetDays: [0, 1, 2, 3, 4, 5, 6] as number[],
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    notes: '', reminderTime: '',
  })

  const { particles, burst } = useParticles()
  const formRef = useRef<HTMLDivElement>(null)

  // ─── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

      const [{ data: h }, { data: todayC }, { data: weekC }, { data: allC }] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }),
        supabase.from('habit_completions').select('habit_id').eq('user_id', user.id).eq('completed_date', today),
        supabase.from('habit_completions').select('habit_id,completed_date').eq('user_id', user.id)
          .gte('completed_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
        supabase.from('habit_completions').select('habit_id,completed_date').eq('user_id', user.id)
          .gte('completed_date', thirtyDaysAgo),
      ])

      if (h) setHabits(h as Habit[])
      if (todayC) setCompletions(todayC.map((x: any) => x.habit_id))

      if (weekC) {
        const map: Record<string, string[]> = {}
        weekC.forEach((x: any) => { if (!map[x.habit_id]) map[x.habit_id] = []; map[x.habit_id].push(x.completed_date) })
        setHabitHistory(map)
      }
      if (allC) {
        const map: Record<string, string[]> = {}
        allC.forEach((x: any) => { if (!map[x.habit_id]) map[x.habit_id] = []; map[x.habit_id].push(x.completed_date) })
        setAllTimeHistory(map)

        // Calculate XP
        const xp = (h as Habit[] || []).reduce((total, habit) => {
          const xpPerCompletion = habit.xp_reward || (habit.difficulty === 'hard' ? 50 : habit.difficulty === 'easy' ? 10 : 25)
          return total + (habit.total_completions || 0) * xpPerCompletion
        }, 0)
        setTotalXP(xp)
      }
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => { fetchAll() }, [])

  // ─── Auto-detect habit from name ────────────────────────────────────────────
  const autoDetect = (name: string) => {
    const lower = name.toLowerCase()
    const match = SMART_SUGGESTIONS.find(s =>
      lower.includes(s.name.toLowerCase().split(' ')[0]) ||
      lower.includes(s.name.toLowerCase().split(' ')[1] || '')
    )
    if (match && !form.icon) {
      setForm(f => ({ ...f, icon: match.icon, color: match.color, category: match.category, notes: match.notes || f.notes }))
    }
    // Smart keyword detection
    if (lower.includes('water') || lower.includes('drink')) setForm(f => ({ ...f, icon: '💧', color: '#00C6FF', category: 'Health' }))
    else if (lower.includes('workout') || lower.includes('gym') || lower.includes('exercise')) setForm(f => ({ ...f, icon: '🏋️', color: '#AAFF00', category: 'Fitness' }))
    else if (lower.includes('read') || lower.includes('book')) setForm(f => ({ ...f, icon: '📚', color: '#A855F7', category: 'Learning' }))
    else if (lower.includes('meditat') || lower.includes('mindful')) setForm(f => ({ ...f, icon: '🧘', color: '#00FFA3', category: 'Mind' }))
    else if (lower.includes('sleep') || lower.includes('wake')) setForm(f => ({ ...f, icon: '😴', color: '#38BDF8', category: 'Health' }))
    else if (lower.includes('run') || lower.includes('walk') || lower.includes('step')) setForm(f => ({ ...f, icon: '🏃', color: '#34D399', category: 'Fitness' }))
    else if (lower.includes('journal') || lower.includes('writ') || lower.includes('diary')) setForm(f => ({ ...f, icon: '✍️', color: '#FFB800', category: 'Mind' }))
    else if (lower.includes('diet') || lower.includes('eat') || lower.includes('food') || lower.includes('veg')) setForm(f => ({ ...f, icon: '🥗', color: '#34D399', category: 'Health' }))
  }

  // ─── Add habit ──────────────────────────────────────────────────────────────
  const addHabit = async () => {
    if (!form.name.trim() || saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const xpReward = form.difficulty === 'hard' ? 50 : form.difficulty === 'easy' ? 10 : 25
      const { data } = await supabase.from('habits').insert({
        user_id: user.id, name: form.name, icon: form.icon, color: form.color,
        category: form.category, target_days: form.targetDays,
        difficulty: form.difficulty, xp_reward: xpReward,
        notes: form.notes || null, reminder_time: form.reminderTime || null,
        current_streak: 0, longest_streak: 0, total_completions: 0,
      }).select().single()
      setForm({ name: '', icon: '🎯', color: '#AAFF00', category: 'Health', targetDays: [0, 1, 2, 3, 4, 5, 6], difficulty: 'medium', notes: '', reminderTime: '' })
      setShowAdd(false)
      showSuccess('✨ Habit created!')
      fetchAll()
    } finally {
      setSaving(false)
    }
  }

  // ─── Toggle completion ──────────────────────────────────────────────────────
  const toggleHabit = async (habit: Habit, e: React.MouseEvent) => {
    if (toggling) return
    setToggling(habit.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const isDone = completions.includes(habit.id)

      if (!isDone) {
        burst(e.clientX, e.clientY, habit.color || '#AAFF00')
        setJustCompleted(habit.id)
        setTimeout(() => setJustCompleted(null), 900)

        await supabase.from('habit_completions').insert({ habit_id: habit.id, user_id: user.id, completed_date: today })
        const newStreak = (habit.current_streak || 0) + 1
        const xpReward = habit.xp_reward || 25
        await supabase.from('habits').update({
          current_streak: newStreak,
          longest_streak: Math.max(habit.longest_streak || 0, newStreak),
          total_completions: (habit.total_completions || 0) + 1,
        }).eq('id', habit.id)

        setCompletions(p => [...p, habit.id])
        setHabits(p => p.map(h => h.id === habit.id ? { ...h, current_streak: newStreak, total_completions: h.total_completions + 1 } : h))
        setHabitHistory(p => ({ ...p, [habit.id]: [...(p[habit.id] || []), today] }))
        setTotalXP(x => x + xpReward)

        if (newStreak === 7) showSuccess('🎉 7-day streak!')
        else if (newStreak === 30) showSuccess('🏆 30-day streak! Legend!')
      } else {
        await supabase.from('habit_completions').delete().eq('habit_id', habit.id).eq('completed_date', today)
        const newStreak = Math.max(0, (habit.current_streak || 1) - 1)
        await supabase.from('habits').update({ current_streak: newStreak }).eq('id', habit.id)
        setCompletions(p => p.filter(id => id !== habit.id))
        setHabits(p => p.map(h => h.id === habit.id ? { ...h, current_streak: newStreak } : h))
        setHabitHistory(p => ({ ...p, [habit.id]: (p[habit.id] || []).filter(d => d !== today) }))
        setTotalXP(x => Math.max(0, x - (habit.xp_reward || 25)))
      }
    } finally {
      setToggling(null)
    }
  }

  // ─── Delete habit ───────────────────────────────────────────────────────────
  const deleteHabit = async (id: string) => {
    setHabits(p => p.filter(h => h.id !== id))
    setSwipedId(null); setShowDetailFor(null)
    await supabase.from('habits').update({ is_active: false }).eq('id', id)
    showSuccess('Habit removed')
  }

  // ─── Quick add from suggestion ──────────────────────────────────────────────
  const addSuggestion = async (s: typeof SMART_SUGGESTIONS[0]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('habits').insert({
      user_id: user.id, name: s.name, icon: s.icon, color: s.color,
      category: s.category, target_days: s.targetDays,
      difficulty: s.difficulty, xp_reward: s.xp, notes: s.notes || null,
      current_streak: 0, longest_streak: 0, total_completions: 0,
    })
    showSuccess(`✨ "${s.name}" added!`)
    fetchAll()
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  // ─── Derived data ───────────────────────────────────────────────────────────
  const todayHabits = habits.filter(h => h.target_days.includes(todayDay))
  const todayDone = completions.length
  const todayTotal = todayHabits.length
  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0
  const allDone = todayTotal > 0 && todayDone >= todayTotal

  const filteredHabits = (activeFilter === 'All' ? habits : habits.filter(h => h.category === activeFilter))
    .sort((a, b) => {
      if (sortBy === 'streak') return (b.current_streak || 0) - (a.current_streak || 0)
      if (sortBy === 'completion') return (b.total_completions || 0) - (a.total_completions || 0)
      if (sortBy === 'xp') return (b.xp_reward || 25) - (a.xp_reward || 25)
      return 0
    })

  const usedCategories = ['All', ...Array.from(new Set(habits.map(h => h.category).filter(Boolean)))]
  const detailHabit = habits.find(h => h.id === showDetailFor)

  // ─── Insights ───────────────────────────────────────────────────────────────
  const bestHabit = [...habits].sort((a, b) => b.current_streak - a.current_streak)[0]
  const hardestHabit = filteredHabits.filter(h => completions.includes(h.id) && h.difficulty === 'hard')[0]
  const weeklyRate = habits.length > 0
    ? Math.round(habits.reduce((sum, h) => sum + ((habitHistory[h.id] || []).length / 7) * 100, 0) / habits.length)
    : 0

  const xpLevel = Math.floor(totalXP / 500) + 1
  const xpProgress = totalXP % 500
  const xpToNext = 500

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --bg: #060709;
          --surface: #0D0F15;
          --surface2: #13151D;
          --border: rgba(255,255,255,0.05);
          --border2: rgba(255,255,255,0.09);
          --muted: #333645;
          --text-dim: #4A4E60;
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 70%{transform:scale(0.9)} 100%{transform:scale(1)} }
        @keyframes checkIn { from{opacity:0;transform:scale(0) rotate(-90deg)} to{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes ripple { 0%{transform:scale(0);opacity:0.6} 100%{transform:scale(3);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:none} }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:none} }
        @keyframes toastIn { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:none} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes celebBounce { 0%,100%{transform:scale(1)} 25%{transform:scale(1.15)} 60%{transform:scale(0.95)} 80%{transform:scale(1.07)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(170,255,0,0.3)} 50%{box-shadow:0 0 36px rgba(170,255,0,0.7)} }
        @keyframes xpFill { from{width:0} to{width:var(--xp-pct)} }
        .habit-card { user-select:none; -webkit-user-select:none; }
        .habit-card:active { transform:scale(0.97) !important; }
        .skeleton { background:linear-gradient(90deg,#0D0F15 25%,#13151D 50%,#0D0F15 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:16px; }
        input:focus, textarea:focus { outline:none; }
        ::-webkit-scrollbar { width:0; }
        .tab-pill { transition:all 0.2s ease; }
        .tab-pill:active { transform:scale(0.95); }
      `}</style>

      {/* ── Particles ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
        {particles.map(p => (
          <div key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: '50%', background: p.color, opacity: p.life, transform: 'translate(-50%,-50%)', boxShadow: `0 0 ${p.size * 2}px ${p.color}` }} />
        ))}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {successMsg && (
        <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: '#0D0F15', border: '1px solid rgba(170,255,0,0.3)', borderRadius: 20, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#AAFF00', animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', whiteSpace: 'nowrap' }}>
          {successMsg}
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {showDetailFor && detailHabit && (
        <HabitDetailModal
          habit={detailHabit}
          completions={allTimeHistory[detailHabit.id] || []}
          onClose={() => setShowDetailFor(null)}
          onDelete={() => deleteHabit(detailHabit.id)}
        />
      )}

      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#fff', fontFamily: 'var(--font-body)', paddingBottom: 120 }}>

        {/* ── STICKY HEADER ─────────────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,7,9,0.97)', backdropFilter: 'blur(28px)', borderBottom: '1px solid var(--border)', padding: '52px 20px 0' }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a href="/dashboard" style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', textDecoration: 'none', fontSize: 16, flexShrink: 0 }}>←</a>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}>Habit Stack</h1>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {new Date().toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* XP Level badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)', borderRadius: 20, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#FFB800', lineHeight: 1 }}>Lv.{xpLevel}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,184,0,0.5)', fontWeight: 700 }}>{totalXP} XP</div>
                </div>
              </div>
              <button onClick={() => setShowAdd(s => !s)} style={{ width: 34, height: 34, borderRadius: 10, background: showAdd ? '#AAFF00' : 'var(--surface)', border: '1px solid', borderColor: showAdd ? '#AAFF00' : 'var(--border2)', color: showAdd ? '#000' : '#666', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s', transform: showAdd ? 'rotate(45deg)' : 'none', boxShadow: showAdd ? '0 0 20px rgba(170,255,0,0.4)' : 'none', flexShrink: 0 }}>+</button>
            </div>
          </div>

          {/* Progress Ring + Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <RingProgress pct={pct} size={76} stroke={6} color={allDone ? '#AAFF00' : pct > 50 ? '#00FFA3' : '#00C6FF'}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: allDone ? '#AAFF00' : '#fff', lineHeight: 1, animation: allDone ? 'celebBounce 0.6s ease' : 'none' }}>
                <AnimatedNumber value={pct} />%
              </span>
            </RingProgress>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
                  <AnimatedNumber value={todayDone} /><span style={{ color: 'var(--muted)', fontSize: 18 }}>/{todayTotal}</span>
                </span>
                {allDone && habits.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#AAFF00', animation: 'slideIn 0.4s ease' }}>🎊 All done!</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 7 }}>today's habits · <span style={{ color: '#FFB800' }}>{weeklyRate}% weekly avg</span></div>
              <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: allDone ? 'linear-gradient(90deg,#AAFF00,#22C55E)' : 'linear-gradient(90deg,#00C6FF,#00FFA3)', width: `${pct}%`, transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: allDone ? '0 0 12px rgba(170,255,0,0.5)' : '0 0 8px rgba(0,198,255,0.4)' }} />
              </div>
              {/* XP Progress */}
              <div style={{ height: 3, background: 'rgba(255,184,0,0.1)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#FFB800,#FF9500)', width: `${(xpProgress / xpToNext) * 100}%`, transition: 'width 1s ease', boxShadow: '0 0 6px rgba(255,184,0,0.4)' }} />
              </div>
            </div>
          </div>

          {/* Tab Row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['habits', 'stats', 'insights'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="tab-pill"
                style={{ flex: 1, padding: '7px 4px', borderRadius: 20, border: '1px solid', borderColor: activeTab === tab ? '#AAFF00' : 'var(--border2)', background: activeTab === tab ? 'rgba(170,255,0,0.1)' : 'transparent', color: activeTab === tab ? '#AAFF00' : 'var(--text-dim)', fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {tab === 'habits' ? '✦ Habits' : tab === 'stats' ? '◈ Stats' : '◎ Insights'}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          {activeTab === 'habits' && usedCategories.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, maskImage: 'linear-gradient(90deg,transparent,black 5%,black 95%,transparent)' }}>
              {usedCategories.map(cat => (
                <button key={cat} onClick={() => setActiveFilter(cat)} className="tab-pill"
                  style={{ padding: '5px 13px', borderRadius: 20, border: '1px solid', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, borderColor: activeFilter === cat ? '#AAFF00' : 'var(--border2)', background: activeFilter === cat ? 'rgba(170,255,0,0.1)' : 'transparent', color: activeFilter === cat ? '#AAFF00' : 'var(--text-dim)' }}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 16px' }}>

          {/* ── ADD FORM ───────────────────────────────────────────────────── */}
          {showAdd && (
            <div ref={formRef} style={{ background: 'var(--surface)', border: '1px solid rgba(170,255,0,0.2)', borderRadius: 22, padding: 20, marginBottom: 14, animation: 'fadeUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.3px' }}>New Habit</div>

              {/* Habit name with auto-detect */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Habit Name <span style={{ color: '#AAFF00' }}>· auto-detect ✦</span></div>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder="e.g. Drink 2L water…"
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); autoDetect(e.target.value) }}
                    onKeyDown={e => e.key === 'Enter' && addHabit()}
                    autoFocus
                    style={{ width: '100%', background: 'var(--surface2)', border: '1.5px solid var(--border2)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 15, fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'border-color 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = '#AAFF00'; e.target.style.boxShadow = '0 0 0 3px rgba(170,255,0,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.boxShadow = 'none' }}
                  />
                  {form.icon && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 20, transition: 'all 0.3s' }}>{form.icon}</span>}
                </div>
              </div>

              {/* Smart suggestions strip */}
              <div style={{ marginBottom: 14 }}>
                <button onClick={() => setShowSuggestions(s => !s)}
                  style={{ fontSize: 11, color: '#AAFF00', background: 'rgba(170,255,0,0.08)', border: '1px solid rgba(170,255,0,0.2)', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.04em', marginBottom: showSuggestions ? 10 : 0 }}>
                  {showSuggestions ? '▴ Hide' : '▾ Smart suggestions'}
                </button>
                {showSuggestions && (
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                    {SMART_SUGGESTIONS.map(s => (
                      <button key={s.name} onClick={() => { setForm(f => ({ ...f, name: s.name, icon: s.icon, color: s.color, category: s.category, targetDays: s.targetDays, difficulty: s.difficulty as any, notes: s.notes || f.notes })); setShowSuggestions(false) }}
                        style={{ flexShrink: 0, background: 'var(--surface2)', border: `1px solid ${s.color}30`, borderRadius: 12, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>+{s.xp} XP</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Icon picker */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Icon</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                      style={{ width: 38, height: 38, borderRadius: 10, border: '1.5px solid', borderColor: form.icon === icon ? form.color : 'var(--border)', background: form.icon === icon ? `${form.color}15` : 'var(--surface2)', fontSize: 18, cursor: 'pointer', transition: 'all 0.15s', transform: form.icon === icon ? 'scale(1.15)' : 'scale(1)' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Color</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c.hex} onClick={() => setForm(f => ({ ...f, color: c.hex }))} title={c.label}
                      style={{ width: 30, height: 30, borderRadius: '50%', background: c.hex, border: '3px solid', borderColor: form.color === c.hex ? '#fff' : 'transparent', cursor: 'pointer', transition: 'all 0.18s', transform: form.color === c.hex ? 'scale(1.2)' : 'scale(1)', boxShadow: form.color === c.hex ? `0 0 14px ${c.hex}80` : 'none' }} />
                  ))}
                </div>
              </div>

              {/* Category */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Category</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                      style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid', borderColor: form.category === cat ? form.color : 'var(--border2)', background: form.category === cat ? `${form.color}15` : 'transparent', color: form.category === cat ? form.color : 'var(--text-dim)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Difficulty & XP</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DIFFICULTY.map(d => (
                    <button key={d.value} onClick={() => setForm(f => ({ ...f, difficulty: d.value as any }))}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 12, border: '1px solid', borderColor: form.difficulty === d.value ? d.color : 'var(--border2)', background: form.difficulty === d.value ? `${d.color}12` : 'transparent', color: form.difficulty === d.value ? d.color : 'var(--text-dim)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                      <div>{d.label}</div>
                      <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>+{d.xp} XP</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target days */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Repeat</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {DAY_LABELS.map((d, i) => (
                    <button key={i} onClick={() => setForm(f => ({ ...f, targetDays: f.targetDays.includes(i) ? f.targetDays.filter(x => x !== i) : [...f.targetDays, i] }))}
                      style={{ flex: 1, height: 34, borderRadius: 9, border: '1.5px solid', borderColor: form.targetDays.includes(i) ? form.color : 'var(--border)', background: form.targetDays.includes(i) ? `${form.color}18` : 'transparent', color: form.targetDays.includes(i) ? form.color : 'var(--text-dim)', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.18s' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Notes (optional)</div>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Why this habit matters to you…" rows={2}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1.5px solid var(--border2)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-body)', resize: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = '#AAFF00' }} onBlur={e => { e.target.style.borderColor = 'var(--border2)' }} />
              </div>

              {/* Reminder time */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Reminder time (optional)</div>
                <input type="time" value={form.reminderTime} onChange={e => setForm(f => ({ ...f, reminderTime: e.target.value }))}
                  style={{ background: 'var(--surface2)', border: '1.5px solid var(--border2)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14, fontFamily: 'var(--font-body)', width: '100%', colorScheme: 'dark' }} />
              </div>

              {/* Preview */}
              <div style={{ background: 'var(--surface2)', border: `1px solid ${form.color}20`, borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24, transition: 'all 0.3s' }}>{form.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: form.name ? '#fff' : 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>{form.name || 'Preview'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{form.category} · {form.targetDays.length}×/week · {form.difficulty}</div>
                </div>
                <XPBadge xp={form.difficulty === 'hard' ? 50 : form.difficulty === 'easy' ? 10 : 25} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 13, borderRadius: 13, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={addHabit} disabled={!form.name.trim() || saving}
                  style={{ flex: 2, padding: 13, borderRadius: 13, background: form.name.trim() ? form.color : 'var(--surface2)', color: form.name.trim() ? '#000' : 'var(--text-dim)', border: 'none', fontSize: 14, fontWeight: 800, cursor: form.name.trim() ? 'pointer' : 'default', transition: 'all 0.2s', fontFamily: 'var(--font-display)', boxShadow: form.name.trim() ? `0 8px 24px ${form.color}30` : 'none', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Adding…' : `Add ${form.icon} Habit`}
                </button>
              </div>
            </div>
          )}

          {/* ── TABS CONTENT ──────────────────────────────────────────────── */}

          {activeTab === 'habits' && (
            <>
              {/* Sort pills */}
              {habits.length > 0 && (
                <div style={{ display: 'flex', gap: 5, marginBottom: 12, overflowX: 'auto' }}>
                  {[
                    { key: 'order', label: '⊞ Default' },
                    { key: 'streak', label: '🔥 Streak' },
                    { key: 'completion', label: '✓ Most done' },
                    { key: 'xp', label: '⚡ XP' },
                  ].map(s => (
                    <button key={s.key} onClick={() => setSortBy(s.key as any)} className="tab-pill"
                      style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid', borderColor: sortBy === s.key ? '#AAFF00' : 'var(--border2)', background: sortBy === s.key ? 'rgba(170,255,0,0.1)' : 'transparent', color: sortBy === s.key ? '#AAFF00' : 'var(--text-dim)', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0, letterSpacing: '0.04em' }}>
                      {s.label}
                    </button>
                  ))}
                  <button onClick={() => setViewMode(v => v === 'cards' ? 'compact' : 'cards')} className="tab-pill"
                    style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    {viewMode === 'cards' ? '▤ Compact' : '▦ Cards'}
                  </button>
                </div>
              )}

              {/* Skeleton */}
              {loading && habits.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 82 }} />)}
                </div>
              )}

              {/* Empty state */}
              {!loading && habits.length === 0 && !showAdd && (
                <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp 0.5s ease' }}>
                  <div style={{ fontSize: 64, animation: 'float 3s ease-in-out infinite', marginBottom: 16 }}>🎯</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.5px' }}>Stack your first habit</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500, maxWidth: 240, margin: '0 auto 24px', lineHeight: 1.6 }}>Small habits compound into extraordinary results over time.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setShowAdd(true)} style={{ padding: '14px 28px', borderRadius: 20, background: 'linear-gradient(135deg,#AAFF00,#22C55E)', color: '#000', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 28px rgba(170,255,0,0.4)', fontFamily: 'var(--font-display)' }}>
                      + Add First Habit
                    </button>
                    <button onClick={() => { setShowAdd(true); setShowSuggestions(true) }} style={{ padding: '10px 20px', borderRadius: 20, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text-dim)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Browse Suggestions
                    </button>
                  </div>
                </div>
              )}

              {/* Habit Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: viewMode === 'compact' ? 5 : 9 }}>
                {filteredHabits.map((habit, index) => {
                  const done = completions.includes(habit.id)
                  const color = habit.color || '#AAFF00'
                  const isJust = justCompleted === habit.id
                  const isSwiped = swipedId === habit.id
                  const weekDates = habitHistory[habit.id] || []
                  const isScheduledToday = habit.target_days.includes(todayDay)
                  const xpReward = habit.xp_reward || (habit.difficulty === 'hard' ? 50 : habit.difficulty === 'easy' ? 10 : 25)

                  return (
                    <div key={habit.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, animation: `fadeUp 0.5s ease ${index * 0.055}s both` }}>
                      {/* Swipe delete reveal */}
                      {isSwiped && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,77,77,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 16, borderRadius: 20, gap: 8 }}>
                          <button onClick={() => setShowDetailFor(habit.id)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Details</button>
                          <button onClick={() => deleteHabit(habit.id)} style={{ background: 'rgba(255,77,77,0.3)', border: 'none', color: '#FF4D4D', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                          <button onClick={() => setSwipedId(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: '4px 6px' }}>✕</button>
                        </div>
                      )}

                      <div
                        className="habit-card"
                        onClick={e => !isSwiped && toggleHabit(habit, e)}
                        onContextMenu={e => { e.preventDefault(); setSwipedId(isSwiped ? null : habit.id) }}
                        style={{
                          background: done ? `linear-gradient(135deg,${color}0D,${color}05)` : 'var(--surface)',
                          border: '1px solid', borderColor: done ? `${color}28` : isJust ? `${color}55` : 'var(--border)',
                          borderRadius: 20, padding: viewMode === 'compact' ? '11px 14px' : '15px',
                          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                          position: 'relative', overflow: 'hidden',
                          boxShadow: isJust ? `0 0 0 3px ${color}35, 0 8px 32px ${color}18` : done ? `0 2px 20px ${color}0E` : 'none',
                          transform: isJust ? 'scale(1.015)' : 'scale(1)',
                          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                          opacity: !isScheduledToday ? 0.55 : 1,
                        }}>

                        {/* Completion ripple */}
                        {isJust && <div style={{ position: 'absolute', inset: 0, borderRadius: 20, border: `2px solid ${color}`, animation: 'ripple 0.6s ease forwards', pointerEvents: 'none' }} />}

                        {/* Left bar */}
                        <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: color, opacity: done ? 1 : 0.2, transition: 'opacity 0.3s' }} />

                        {/* Checkbox */}
                        <div style={{ width: viewMode === 'compact' ? 28 : 32, height: viewMode === 'compact' ? 28 : 32, borderRadius: viewMode === 'compact' ? 9 : 11, border: '2px solid', borderColor: done ? color : 'var(--border2)', background: done ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: done ? `0 0 16px ${color}55` : 'none', animation: done && isJust ? 'pop 0.5s ease' : 'none' }}>
                          {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" style={{ animation: 'checkIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}><path d="M20 6L9 17l-5-5" /></svg>}
                        </div>

                        {/* Icon */}
                        <div style={{ width: viewMode === 'compact' ? 36 : 44, height: viewMode === 'compact' ? 36 : 44, borderRadius: viewMode === 'compact' ? 10 : 13, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: viewMode === 'compact' ? 18 : 22, flexShrink: 0, transition: 'transform 0.3s', transform: isJust ? 'rotate(10deg) scale(1.2)' : 'scale(1)' }}>
                          {habit.icon}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: viewMode === 'compact' ? 0 : 4 }}>
                            <span style={{ fontSize: viewMode === 'compact' ? 13 : 14, fontWeight: 700, color: done ? color : '#fff', textDecoration: done ? 'line-through' : 'none', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.3s, opacity 0.3s', opacity: done ? 0.75 : 1, fontFamily: 'var(--font-display)' }}>
                              {habit.name}
                            </span>
                            {!isScheduledToday && <span style={{ fontSize: 9, color: 'var(--text-dim)', background: 'var(--surface2)', borderRadius: 6, padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>rest day</span>}
                          </div>
                          {viewMode === 'cards' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <StreakFlame count={habit.current_streak || 0} />
                              {habit.category && <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 6, letterSpacing: '0.04em' }}>{habit.category}</span>}
                              <WeekHeatmap completions={weekDates} color={color} />
                            </div>
                          )}
                        </div>

                        {/* Right actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {viewMode === 'cards' && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: done ? color : 'var(--text-dim)', fontFamily: 'var(--font-display)', lineHeight: 1, transition: 'color 0.3s' }}>{habit.total_completions || 0}</div>
                              <div style={{ fontSize: 8, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>done</div>
                            </div>
                          )}
                          {viewMode === 'compact' && habit.current_streak > 0 && <StreakFlame count={habit.current_streak} />}
                          <button onClick={e => { e.stopPropagation(); setSwipedId(isSwiped ? null : habit.id) }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: '4px 2px', opacity: 0.5, transition: 'opacity 0.2s', lineHeight: 1 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>⋯</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── STATS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'stats' && (
            <div style={{ animation: 'fadeUp 0.4s ease' }}>
              {/* XP Level card */}
              <div style={{ background: 'linear-gradient(135deg,rgba(255,184,0,0.1),rgba(255,184,0,0.04))', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 20, padding: '20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 56, opacity: 0.15 }}>⚡</div>
                <div style={{ fontSize: 11, color: 'rgba(255,184,0,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>XP Level</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 900, color: '#FFB800' }}>{xpLevel}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,184,0,0.5)' }}>{totalXP} total XP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,184,0,0.5)', fontWeight: 700, marginBottom: 5 }}>
                  <span>{xpProgress} XP</span><span>{xpToNext - xpProgress} to next level</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,184,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#FFB800,#FF9500)', width: `${(xpProgress / xpToNext) * 100}%`, transition: 'width 1s ease', boxShadow: '0 0 8px rgba(255,184,0,0.5)' }} />
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Best Streak', value: `${Math.max(...habits.map(h => h.longest_streak || 0), 0)}d`, icon: '🏆', color: '#FFB800', sub: bestHabit?.name || '—' },
                  { label: 'Weekly Rate', value: `${weeklyRate}%`, icon: '📈', color: '#00FFA3', sub: 'avg completion' },
                  { label: 'Total Done', value: habits.reduce((a, h) => a + (h.total_completions || 0), 0), icon: '✅', color: '#AAFF00', sub: 'all time' },
                  { label: 'Active Habits', value: habits.length, icon: '⚡', color: '#00C6FF', sub: `${todayHabits.length} due today` },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 14px' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Per-habit completion bars */}
              {habits.length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Habit Performance</div>
                  {habits.map(h => {
                    const rate = h.target_days.length > 0 ? Math.min(100, Math.round(((h.total_completions || 0) / Math.max(h.target_days.length * 4, 1)) * 100)) : 0
                    return (
                      <div key={h.id} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{h.icon} {h.name}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <StreakFlame count={h.current_streak || 0} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: h.color }}>{rate}%</span>
                          </div>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: h.color, width: `${rate}%`, transition: 'width 1s ease', boxShadow: `0 0 6px ${h.color}60` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── INSIGHTS TAB ───────────────────────────────────────────────── */}
          {activeTab === 'insights' && (
            <div style={{ animation: 'fadeUp 0.4s ease' }}>
              {/* Motivational card */}
              <div style={{ background: 'linear-gradient(135deg,rgba(170,255,0,0.08),rgba(34,197,94,0.04))', border: '1px solid rgba(170,255,0,0.18)', borderRadius: 20, padding: '20px', marginBottom: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🌱</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 6, lineHeight: 1.2 }}>
                  {allDone ? "Perfect day! You crushed it! 🎊" : pct >= 50 ? "More than halfway there! Keep going!" : "Every habit counts. Start with one."}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  {todayDone} of {todayTotal} habits done today · {weeklyRate}% avg this week
                </div>
              </div>

              {/* AI-style insights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bestHabit && bestHabit.current_streak > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>🔥</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Hot streak on "{bestHabit.name}"</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{bestHabit.current_streak} days in a row. Only {7 - bestHabit.current_streak % 7} more days to the next milestone!</div>
                    </div>
                  </div>
                )}
                {hardestHabit && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>💪</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Crushing the hard stuff</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>You completed "{hardestHabit.name}" today — that's worth 50 XP. Hard habits build character.</div>
                    </div>
                  </div>
                )}
                {habits.length > 0 && weeklyRate < 50 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>💡</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Consistency tip</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>Your weekly rate is {weeklyRate}%. Try linking habits together — do them right after each other to build momentum.</div>
                    </div>
                  </div>
                )}
                {totalXP > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>⚡</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>You're Level {xpLevel}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>Earned {totalXP} XP total. {xpToNext - xpProgress} more XP until Level {xpLevel + 1}. Complete your remaining habits today!</div>
                    </div>
                  </div>
                )}
                {habits.length === 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>Add some habits to see personalized insights!</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STATS FOOTER (habits tab) ────────────────────────────────── */}
          {activeTab === 'habits' && habits.length > 0 && (
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { label: 'Best Streak', value: `${Math.max(...habits.map(h => h.longest_streak || 0), 0)}d`, icon: '🏆', color: '#FFB800' },
                { label: 'Total Done', value: habits.reduce((a, h) => a + (h.total_completions || 0), 0).toString(), icon: '✅', color: '#00FFA3' },
                { label: 'Weekly Avg', value: `${weeklyRate}%`, icon: '📈', color: '#00C6FF' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 5 }}>{s.icon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NAV active="habits" />
    </>
  )
}