'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────
interface Meal {
  id: string
  user_id: string
  meal_date: string
  meal_type: MealType
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  serving_size?: string
  notes?: string
  created_at: string
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'
type Tab = 'log' | 'ai' | 'targets'

interface MacroTarget { calories: number; protein_g: number; carbs_g: number; fat_g: number }
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

// ─── Constants ──────────────────────────────────────────────────────────────
const MEAL_META: Record<MealType, { icon: string; label: string; color: string; bg: string; time: string }> = {
  breakfast:    { icon: '🌅', label: 'Breakfast',    color: '#FFB84D', bg: 'rgba(255,184,77,0.1)',  time: '6–10 AM' },
  lunch:        { icon: '☀️', label: 'Lunch',        color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  time: '12–2 PM' },
  dinner:       { icon: '🌙', label: 'Dinner',       color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', time: '6–9 PM'  },
  snack:        { icon: '🍎', label: 'Snack',        color: '#FB923C', bg: 'rgba(251,146,60,0.1)',  time: 'Anytime' },
  pre_workout:  { icon: '⚡', label: 'Pre-WO',       color: '#C8FF00', bg: 'rgba(200,255,0,0.1)',   time: 'Pre-WO'  },
  post_workout: { icon: '💪', label: 'Post-WO',      color: '#22D3EE', bg: 'rgba(34,211,238,0.1)',  time: 'Post-WO' },
}

const DIET_PRESETS: Record<string, { label: string; emoji: string; targets: MacroTarget }> = {
  balanced:    { label: 'Balanced',    emoji: '⚖️', targets: { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65  } },
  weightloss:  { label: 'Weight Loss', emoji: '🔥', targets: { calories: 1500, protein_g: 160, carbs_g: 120, fat_g: 50  } },
  musclegain:  { label: 'Muscle',      emoji: '💪', targets: { calories: 2800, protein_g: 200, carbs_g: 300, fat_g: 80  } },
  keto:        { label: 'Keto',        emoji: '🥑', targets: { calories: 1800, protein_g: 140, carbs_g: 30,  fat_g: 140 } },
  vegan:       { label: 'Vegan',       emoji: '🌱', targets: { calories: 1800, protein_g: 100, carbs_g: 250, fat_g: 55  } },
  highprotein: { label: 'High Protein',emoji: '🥩', targets: { calories: 2200, protein_g: 220, carbs_g: 180, fat_g: 60  } },
  indian:      { label: 'Indian',      emoji: '🍛', targets: { calories: 2000, protein_g: 120, carbs_g: 260, fat_g: 60  } },
}

const DEFAULT_TARGETS: MacroTarget = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 }

// ─── Helpers ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)
const clamp = (v: number, lo = 0, hi = 100) => Math.min(Math.max(v, lo), hi)
const pct = (v: number, t: number) => (t > 0 ? clamp((v / t) * 100) : 0)
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')

// ─── SVG Ring ───────────────────────────────────────────────────────────────
function Ring({ value, size = 80, stroke = 5, color = '#C8FF00', bg = 'rgba(255,255,255,0.06)', children }: {
  value: number; size?: number; stroke?: number; color?: string; bg?: string; children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - circ * clamp(value) / 100
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block', overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={value > 100 ? '#F87171' : color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.1,0.64,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Segmented progress bar ─────────────────────────────────────────────────
function MacroRow({ label, value, target, color, unit = 'g' }: {
  label: string; value: number; target: number; color: string; unit?: string
}) {
  const p = pct(value, target)
  const over = value > target
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 80px', alignItems: 'center', gap: '10px', marginBottom: '11px' }}>
      <span style={{ fontSize: '11px', fontWeight: '700', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '99px',
          width: `${p}%`,
          background: over ? 'linear-gradient(90deg,#F87171,#EF4444)' : color,
          transition: 'width 1.2s cubic-bezier(0.34,1.1,0.64,1)',
        }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: '700', textAlign: 'right', color: over ? '#F87171' : '#888' }}>
        <span style={{ color: over ? '#F87171' : '#fff' }}>{Math.round(value)}</span>/{target}{unit}
      </span>
    </div>
  )
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function ToastStack({ toasts, remove }: { toasts: Toast[]; remove: (id: string) => void }) {
  const colors: Record<Toast['type'], [string, string]> = {
    success: ['#C8FF00', '#1A2600'],
    error: ['#F87171', '#2A0A0A'],
    info: ['#22D3EE', '#001A20'],
  }
  return (
    <div style={{ position: 'fixed', top: 56, right: 14, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 280 }}>
      {toasts.map(t => {
        const [accent, bg] = colors[t.type]
        return (
          <div key={t.id} onClick={() => remove(t.id)} style={{
            background: bg, border: `1px solid ${accent}30`, borderLeft: `3px solid ${accent}`,
            borderRadius: 12, padding: '10px 14px', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}

// ─── Meal Card ──────────────────────────────────────────────────────────────
function MealCard({ meal, idx, onDelete }: { meal: Meal; idx: number; onDelete: (id: string) => void }) {
  const meta = MEAL_META[meal.meal_type] ?? MEAL_META.snack
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const extras = [
    meal.fiber_g   != null && `Fiber ${meal.fiber_g}g`,
    meal.sugar_g   != null && `Sugar ${meal.sugar_g}g`,
    meal.sodium_mg != null && `Na ${meal.sodium_mg}mg`,
    meal.serving_size && meal.serving_size,
  ].filter(Boolean)

  const handleDelete = async () => {
    setDeleting(true)
    await new Promise(r => setTimeout(r, 180))
    onDelete(meal.id)
  }

  const calBar = clamp((meal.calories / 600) * 100)

  return (
    <div
      style={{
        background: '#0E0E0E',
        border: expanded ? `1px solid ${meta.color}30` : '1px solid rgba(255,255,255,0.05)',
        borderRadius: 20, overflow: 'hidden',
        animation: `cardIn 0.45s ease ${idx * 0.06}s both`,
        opacity: deleting ? 0 : 1,
        transform: deleting ? 'translateX(48px) scale(0.94)' : 'translateY(0)',
        transition: 'opacity 0.22s ease, transform 0.22s ease, border-color 0.2s',
      }}
    >
      <div
        style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => setExpanded(x => !x)}
      >
        {/* Icon */}
        <div style={{
          width: 46, height: 46, borderRadius: 14, background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0, border: `1px solid ${meta.color}20`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Cal mini-bar at bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, height: 3,
            width: `${calBar}%`, background: meta.color,
            borderRadius: '0 0 0 0', transition: 'width 1s ease',
          }} />
          {meta.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: '#EBEBEB',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{meal.name}</span>
            <span style={{
              fontSize: 9, fontWeight: 800, color: meta.color,
              background: meta.bg, border: `1px solid ${meta.color}25`,
              borderRadius: 6, padding: '1px 6px', flexShrink: 0, letterSpacing: '0.05em',
            }}>{meta.label.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#C8FF00', letterSpacing: '-0.02em' }}>{fmt(meal.calories)}<span style={{ fontSize: 10, color: '#3A3A3A', fontWeight: 600, marginLeft: 1 }}>kcal</span></span>
            {[['P', meal.protein_g, '#C8FF00'], ['C', meal.carbs_g, '#FB923C'], ['F', meal.fat_g, '#60A5FA']].map(([l, v, c]) => (
              <span key={l as string} style={{ fontSize: 11, color: '#3A3A3A', fontWeight: 600 }}>
                <span style={{ color: c as string, fontWeight: 800 }}>{l}</span>{Math.round(v as number)}g
              </span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: 10, color: '#2A2A2A',
            display: 'inline-block',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.25s ease',
          }}>▾</span>
          <button
            onClick={e => { e.stopPropagation(); handleDelete() }}
            title="Delete"
            style={{
              width: 28, height: 28, borderRadius: 8, background: 'transparent',
              border: '1px solid transparent', color: '#2A2A2A',
              cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'rgba(248,113,113,0.1)'; b.style.borderColor = 'rgba(248,113,113,0.25)'; b.style.color = '#F87171' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'transparent'; b.style.borderColor = 'transparent'; b.style.color = '#2A2A2A' }}
          >✕</button>
        </div>
      </div>

      {/* Expanded extras */}
      {expanded && (extras.length > 0 || meal.notes) && (
        <div style={{
          borderTop: `1px solid rgba(255,255,255,0.04)`,
          padding: '10px 14px 14px',
          animation: 'fadeUp 0.2s ease both',
        }}>
          {extras.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: meal.notes ? 8 : 0 }}>
              {extras.map((e, i) => (
                <span key={i} style={{
                  fontSize: 11, color: '#484848', background: '#151515',
                  borderRadius: 6, padding: '3px 9px', border: '1px solid rgba(255,255,255,0.04)',
                }}>{e}</span>
              ))}
            </div>
          )}
          {meal.notes && (
            <p style={{ fontSize: 12, color: '#444', margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
              "{meal.notes}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Stat Chip ───────────────────────────────────────────────────────────────
function StatChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{
      background: '#0A0A0A', borderRadius: 14, padding: '11px 10px',
      textAlign: 'center', border: `1px solid ${color}14`,
      flex: 1,
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(value)}<span style={{ fontSize: 10, fontWeight: 600, opacity: 0.6, marginLeft: 1 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 10, color: '#383838', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}

// ─── Inline input ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12, padding: '11px 13px',
  color: '#EBEBEB', fontSize: 13, outline: 'none', width: '100%',
  fontFamily: 'inherit', transition: 'border-color 0.18s',
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function NAV() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 100,
      background: 'rgba(7,7,7,0.96)', backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      padding: '10px 24px 28px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {[
          { href: '/dashboard', label: 'Home', d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
          { href: '/social',    label: 'Social', d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
          null,
          { href: '/goals',     label: 'Goals',  d: 'M22 12h-4l-3 9L9 3l-3 9H2' },
          { href: '/profile',   label: 'Profile', d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
        ].map((item, i) =>
          item === null ? (
            <a key="add" href="/create-post" style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg,#C8FF00,#4ADE80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -14, textDecoration: 'none', flexShrink: 0,
              boxShadow: '0 0 28px rgba(200,255,0,0.4)',
            }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={3}><path d="M12 5v14M5 12h14" /></svg>
            </a>
          ) : (
            <a key={i} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', flex: 1 }}>
              <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="#303030" strokeWidth={1.8}>
                <path d={item.d} />
              </svg>
              <div style={{ fontSize: 10, color: '#303030', fontWeight: 700 }}>{item.label}</div>
            </a>
          )
        )}
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function MealsPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('log')
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<MealType | 'all'>('all')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [targets, setTargets] = useState<MacroTarget>(DEFAULT_TARGETS)
  const [selectedPreset, setSelectedPreset] = useState('balanced')

  const [aiLoading, setAiLoading] = useState(false)
  const [aiPlan, setAiPlan] = useState('')
  const [aiDiet, setAiDiet] = useState('balanced')
  const [aiGoal, setAiGoal] = useState('')

  const [form, setForm] = useState({
    name: '', meal_type: 'breakfast' as MealType,
    calories: '', protein_g: '', carbs_g: '', fat_g: '',
    fiber_g: '', sugar_g: '', sodium_mg: '', serving_size: '', notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // ── Toasts ────────────────────────────────────────────────────────────────
  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = uid()
    setToasts(t => [...t, { id, message: msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const removeToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchMeals = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('meals').select('*')
        .eq('user_id', user.id).eq('meal_date', today)
        .order('created_at', { ascending: true })
      if (error) throw error
      setMeals(data ?? [])
    } catch {
      toast('Failed to load meals', 'error')
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  // ── Derived ───────────────────────────────────────────────────────────────
  const totals = useMemo(() => meals.reduce((a, m) => ({
    calories: a.calories + (m.calories || 0),
    protein_g: a.protein_g + (m.protein_g || 0),
    carbs_g: a.carbs_g + (m.carbs_g || 0),
    fat_g: a.fat_g + (m.fat_g || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }), [meals])

  const remaining = useMemo(() => ({
    calories: targets.calories - totals.calories,
    protein_g: targets.protein_g - totals.protein_g,
    carbs_g: targets.carbs_g - totals.carbs_g,
    fat_g: targets.fat_g - totals.fat_g,
  }), [totals, targets])

  const filteredMeals = useMemo(() =>
    filterType === 'all' ? meals : meals.filter(m => m.meal_type === filterType),
    [meals, filterType])

  const calPct = pct(totals.calories, targets.calories)
  const isOver = totals.calories > targets.calories

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.calories || isNaN(Number(form.calories))) e.calories = 'Valid number required'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Add Meal ──────────────────────────────────────────────────────────────
  const addMeal = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('meals').insert({
        user_id: user.id, meal_date: today,
        meal_type: form.meal_type, name: form.name.trim(),
        calories: parseInt(form.calories) || 0,
        protein_g: parseFloat(form.protein_g) || 0,
        carbs_g: parseFloat(form.carbs_g) || 0,
        fat_g: parseFloat(form.fat_g) || 0,
        fiber_g: parseFloat(form.fiber_g) || null,
        sugar_g: parseFloat(form.sugar_g) || null,
        sodium_mg: parseFloat(form.sodium_mg) || null,
        serving_size: form.serving_size.trim() || null,
        notes: form.notes.trim() || null,
      })
      if (error) throw error
      setForm({ name: '', meal_type: 'breakfast', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '', serving_size: '', notes: '' })
      setShowForm(false)
      toast(`${form.name} logged ✓`)
      fetchMeals()
    } catch {
      toast('Failed to add meal', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMeal = async (id: string) => {
    const name = meals.find(m => m.id === id)?.name ?? 'Meal'
    try {
      const { error } = await supabase.from('meals').delete().eq('id', id)
      if (error) throw error
      setMeals(p => p.filter(m => m.id !== id))
      toast(`${name} removed`, 'info')
    } catch {
      toast('Failed to delete', 'error')
      fetchMeals()
    }
  }

  // ── AI ────────────────────────────────────────────────────────────────────
  const generateAI = async () => {
    setAiLoading(true); setAiPlan('')
    try {
      const preset = DIET_PRESETS[aiDiet]
      const prompt = `Create a detailed full-day ${preset?.label} meal plan targeting ${targets.calories} calories (${targets.protein_g}g protein, ${targets.carbs_g}g carbs, ${targets.fat_g}g fat).${aiGoal ? ` Goal: ${aiGoal}.` : ''} Include breakfast, lunch, dinner, and 2 snacks. For each meal provide: exact name, calories, protein, carbs, fat. Format clearly with meal headings.`
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meal', messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setAiPlan(data.message)
    } catch {
      toast('AI generation failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const applyPreset = (key: string) => {
    setSelectedPreset(key)
    setAiDiet(key)
    if (DIET_PRESETS[key]) setTargets(DIET_PRESETS[key].targets)
  }

  // ── Global styles ─────────────────────────────────────────────────────────
  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@500;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{background:#080808!important}
      @keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes glow{0%,100%{opacity:0.15}50%{opacity:0.3}}
      @keyframes pulseOp{0%,100%{opacity:1}50%{opacity:0.45}}
      @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      ::-webkit-scrollbar{width:3px;height:3px}
      ::-webkit-scrollbar-thumb{background:#222;border-radius:3px}
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
      input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;outline:none;cursor:pointer}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;cursor:pointer;border:2px solid #080808}
      details>summary{list-style:none}
      details>summary::-webkit-details-marker{display:none}
    `
    document.head.appendChild(s)
    return () => s.remove()
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  const PAGE: React.CSSProperties = {
    minHeight: '100vh', background: '#080808', paddingBottom: 110,
    fontFamily: "'DM Sans', sans-serif", color: '#EBEBEB',
    maxWidth: 480, margin: '0 auto',
  }

  const CARD: React.CSSProperties = {
    background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 22, padding: 18, marginBottom: 12,
  }

  const BTN: React.CSSProperties = {
    background: '#C8FF00', color: '#050505', border: 'none',
    borderRadius: 14, padding: '13px 0', fontSize: 14,
    fontWeight: 800, width: '100%', cursor: 'pointer',
    fontFamily: 'inherit', letterSpacing: '-0.01em',
    transition: 'opacity 0.15s, transform 0.1s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }

  const TAB_BTN = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10,
    background: active ? '#1A1A1A' : 'transparent',
    color: active ? '#fff' : '#383838',
    fontWeight: 700, fontSize: 12, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s',
    letterSpacing: '-0.01em',
  })

  // computed macro split
  const macroSplit = useMemo(() => {
    const p = targets.protein_g * 4
    const c = targets.carbs_g * 4
    const f = targets.fat_g * 9
    const total = p + c + f || 1
    return [
      { label: 'P', pct: (p / total) * 100, color: '#C8FF00' },
      { label: 'C', pct: (c / total) * 100, color: '#FB923C' },
      { label: 'F', pct: (f / total) * 100, color: '#60A5FA' },
    ]
  }, [targets])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={PAGE}>
      <ToastStack toasts={toasts} remove={removeToast} />

      {/* ══════ HEADER ══════ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,8,8,0.96)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '48px 18px 0',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <a href="/dashboard" style={{
              width: 36, height: 36, borderRadius: 11,
              background: '#111', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#555', textDecoration: 'none', fontSize: 15,
            }}>←</a>
            <div>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                Meal Planner
              </div>
              <div style={{ fontSize: 11, color: '#333', marginTop: 3, fontWeight: 500 }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>

          <button
            onClick={() => { setShowForm(x => !x); if (!showForm) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) }}
            style={{
              background: showForm ? 'rgba(200,255,0,0.1)' : '#C8FF00',
              color: showForm ? '#C8FF00' : '#050505',
              border: showForm ? '1px solid rgba(200,255,0,0.25)' : 'none',
              borderRadius: 20, padding: '9px 18px', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
              transition: 'all 0.2s',
            }}
          >{showForm ? '✕ Close' : '+ Log Meal'}</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 3, background: '#0A0A0A',
          borderRadius: 13, padding: 4, marginBottom: 0,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {([['log', '📋 Today'], ['ai', '✨ AI Plan'], ['targets', '🎯 Targets']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={TAB_BTN(tab === t)}>{label}</button>
          ))}
        </div>
        <div style={{ height: 14 }} />
      </div>

      <div ref={bodyRef} style={{ padding: '16px 18px' }}>

        {/* ════════════════ TAB: LOG ════════════════ */}
        {tab === 'log' && (
          <>
            {/* ── Hero Calorie Card ── */}
            <div style={{ ...CARD, position: 'relative', overflow: 'hidden', padding: '20px 18px' }}>
              {/* Ambient glow */}
              <div style={{
                position: 'absolute', top: -60, right: -60,
                width: 180, height: 180, borderRadius: '50%',
                background: `radial-gradient(circle, rgba(200,255,0,${calPct > 100 ? 0 : 0.07}) 0%, transparent 70%)`,
                animation: 'glow 3s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              {/* Row: ring + numbers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
                <Ring value={calPct} size={82} stroke={5} color={isOver ? '#F87171' : '#C8FF00'}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: isOver ? '#F87171' : '#C8FF00', lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
                      {Math.round(calPct)}%
                    </div>
                  </div>
                </Ring>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#383838', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                    Calories today
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: isOver ? '#F87171' : '#C8FF00', lineHeight: 1, letterSpacing: '-0.05em', fontFamily: "'DM Mono', monospace" }}>
                    {fmt(totals.calories)}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 5, fontWeight: 600 }}>
                    <span style={{ color: isOver ? '#F87171' : '#4ADE80' }}>
                      {Math.abs(remaining.calories)} kcal {isOver ? 'over' : 'left'}
                    </span>
                    <span style={{ color: '#272727' }}> · goal {fmt(targets.calories)}</span>
                  </div>
                </div>
              </div>

              {/* Macro bars */}
              <MacroRow label="Protein" value={totals.protein_g} target={targets.protein_g} color="#C8FF00" />
              <MacroRow label="Carbs"   value={totals.carbs_g}   target={targets.carbs_g}   color="#FB923C" />
              <MacroRow label="Fat"     value={totals.fat_g}     target={targets.fat_g}     color="#60A5FA" />

              {/* Stat chips */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <StatChip label="Protein" value={totals.protein_g} unit="g" color="#C8FF00" />
                <StatChip label="Carbs"   value={totals.carbs_g}   unit="g" color="#FB923C" />
                <StatChip label="Fat"     value={totals.fat_g}     unit="g" color="#60A5FA" />
              </div>
            </div>

            {/* ── Quick Info Strip ── */}
            {meals.length > 0 && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12,
              }}>
                {[
                  { label: 'Meals', value: meals.length, suffix: '' },
                  { label: 'Avg/meal', value: Math.round(totals.calories / meals.length), suffix: 'kcal' },
                  { label: 'Remaining', value: Math.max(0, remaining.calories), suffix: 'kcal' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#0A0A0A', borderRadius: 14, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#EBEBEB', letterSpacing: '-0.03em', fontFamily: "'DM Mono', monospace" }}>
                      {s.value}<span style={{ fontSize: 10, color: '#353535', marginLeft: 2 }}>{s.suffix}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Log Form ── */}
            {showForm && (
              <div ref={formRef} style={{ ...CARD, border: '1px solid rgba(200,255,0,0.18)', animation: 'cardIn 0.3s cubic-bezier(0.34,1.4,0.64,1) both' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.03em' }}>
                  Log a Meal
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Meal type */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(Object.keys(MEAL_META) as MealType[]).map(type => {
                      const m = MEAL_META[type]
                      const active = form.meal_type === type
                      return (
                        <button key={type}
                          onClick={() => setForm(p => ({ ...p, meal_type: type }))}
                          style={{
                            padding: '6px 11px', borderRadius: 10,
                            border: `1px solid ${active ? m.color + '50' : 'rgba(255,255,255,0.06)'}`,
                            background: active ? m.bg : 'transparent',
                            color: active ? m.color : '#404040',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.18s',
                          }}
                        >{m.icon} {m.label}</button>
                      )
                    })}
                  </div>

                  {/* Name */}
                  <div>
                    <input
                      placeholder="Meal name *" value={form.name}
                      onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })) }}
                      style={{ ...inputStyle, borderColor: formErrors.name ? '#F87171' : 'rgba(255,255,255,0.07)' }}
                      onFocus={e => { if (!formErrors.name) e.target.style.borderColor = 'rgba(200,255,0,0.35)' }}
                      onBlur={e => { e.target.style.borderColor = formErrors.name ? '#F87171' : 'rgba(255,255,255,0.07)' }}
                    />
                    {formErrors.name && <div style={{ fontSize: 11, color: '#F87171', marginTop: 4 }}>{formErrors.name}</div>}
                  </div>

                  {/* Core macros */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { k: 'calories',  ph: 'Calories (kcal) *', errK: 'calories' },
                      { k: 'protein_g', ph: 'Protein (g)' },
                      { k: 'carbs_g',   ph: 'Carbs (g)' },
                      { k: 'fat_g',     ph: 'Fat (g)' },
                    ].map(f => (
                      <div key={f.k}>
                        <input type="number" placeholder={f.ph}
                          value={form[f.k as keyof typeof form]}
                          onChange={e => { setForm(p => ({ ...p, [f.k]: e.target.value })); if (f.errK) setFormErrors(p => ({ ...p, [f.errK!]: '' })) }}
                          style={{ ...inputStyle, borderColor: f.errK && formErrors[f.errK] ? '#F87171' : 'rgba(255,255,255,0.07)' }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(200,255,0,0.35)' }}
                          onBlur={e => { e.target.style.borderColor = f.errK && formErrors[f.errK] ? '#F87171' : 'rgba(255,255,255,0.07)' }}
                        />
                        {f.errK && formErrors[f.errK] && <div style={{ fontSize: 11, color: '#F87171', marginTop: 3 }}>{formErrors[f.errK]}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Advanced */}
                  <details>
                    <summary style={{ fontSize: 12, color: '#383838', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                      <span style={{ fontSize: 9 }}>▶</span> More details
                    </summary>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                      {[
                        { k: 'fiber_g', ph: 'Fiber (g)' },
                        { k: 'sugar_g', ph: 'Sugar (g)' },
                        { k: 'sodium_mg', ph: 'Sodium (mg)' },
                        { k: 'serving_size', ph: 'Serving size' },
                      ].map(f => (
                        <input key={f.k}
                          type={f.k === 'serving_size' ? 'text' : 'number'}
                          placeholder={f.ph}
                          value={form[f.k as keyof typeof form]}
                          onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                          style={inputStyle}
                          onFocus={e => { e.target.style.borderColor = 'rgba(200,255,0,0.35)' }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
                        />
                      ))}
                    </div>
                    <textarea placeholder="Notes (optional)" value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', marginTop: 8 }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(200,255,0,0.35)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
                    />
                  </details>

                  <button onClick={addMeal} disabled={saving}
                    style={{ ...BTN, marginTop: 4, opacity: saving ? 0.6 : 1 }}>
                    {saving
                      ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #050505', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                      : '✓ Add Meal'
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ── Type Filter Pills ── */}
            {meals.length > 0 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }}>
                {(['all', ...Object.keys(MEAL_META)] as (MealType | 'all')[]).map(type => {
                  const active = filterType === type
                  const m = type !== 'all' ? MEAL_META[type] : null
                  const color = m?.color ?? '#C8FF00'
                  return (
                    <button key={type} onClick={() => setFilterType(type)}
                      style={{
                        padding: '5px 13px', borderRadius: 20, flexShrink: 0,
                        border: `1px solid ${active ? color + '45' : 'rgba(255,255,255,0.06)'}`,
                        background: active ? color + '12' : '#0A0A0A',
                        color: active ? color : '#404040',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.18s',
                      }}>
                      {type === 'all' ? 'All' : `${m?.icon} ${m?.label}`}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Meal List ── */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{
                    height: 73, borderRadius: 20,
                    background: 'linear-gradient(90deg,#0E0E0E 25%,#131313 50%,#0E0E0E 75%)',
                    backgroundSize: '400px 100%', animation: 'shimmer 1.3s infinite',
                  }} />
                ))}
              </div>
            ) : filteredMeals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 14, display: 'inline-block', animation: 'floatY 3s ease-in-out infinite' }}>🥗</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1A1A', marginBottom: 8, letterSpacing: '-0.03em' }}>
                  No meals {filterType !== 'all' ? `for ${MEAL_META[filterType]?.label}` : 'logged today'}
                </div>
                <div style={{ fontSize: 13, color: '#282828' }}>Tap "+ Log Meal" to get started</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredMeals.map((m, i) => <MealCard key={m.id} meal={m} idx={i} onDelete={deleteMeal} />)}
              </div>
            )}
          </>
        )}

        {/* ════════════════ TAB: AI ════════════════ */}
        {tab === 'ai' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            {/* AI Card */}
            <div style={{ ...CARD, border: '1px solid rgba(200,255,0,0.12)', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: -50, right: -50,
                width: 150, height: 150, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(200,255,0,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#C8FF00,#4ADE80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>✨</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>AI Meal Generator</div>
                  <div style={{ fontSize: 11, color: '#C8FF00', fontWeight: 600, marginTop: 2 }}>Personalized nutrition plan</div>
                </div>
              </div>

              {/* Diet chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {Object.entries(DIET_PRESETS).map(([key, { label, emoji }]) => {
                  const active = aiDiet === key
                  return (
                    <button key={key} onClick={() => setAiDiet(key)}
                      style={{
                        padding: '5px 11px', borderRadius: 20,
                        border: `1px solid ${active ? 'rgba(200,255,0,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        background: active ? 'rgba(200,255,0,0.1)' : '#0A0A0A',
                        color: active ? '#C8FF00' : '#404040',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.18s',
                      }}>
                      {emoji} {label}
                    </button>
                  )
                })}
              </div>

              {/* Goal input */}
              <input placeholder="Custom goal (e.g. 'lose 5kg, no nuts')" value={aiGoal}
                onChange={e => setAiGoal(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }}
                onFocus={e => { e.target.style.borderColor = 'rgba(200,255,0,0.35)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
              />

              {/* Target grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { k: 'calories',  label: 'Cal',     unit: 'kcal' },
                  { k: 'protein_g', label: 'Protein', unit: 'g' },
                  { k: 'carbs_g',   label: 'Carbs',   unit: 'g' },
                  { k: 'fat_g',     label: 'Fat',     unit: 'g' },
                ].map(f => (
                  <div key={f.k} style={{ position: 'relative' }}>
                    <input type="number" placeholder={f.label}
                      value={targets[f.k as keyof MacroTarget]}
                      onChange={e => setTargets(p => ({ ...p, [f.k]: parseInt(e.target.value) || 0 }))}
                      style={{ ...inputStyle, paddingRight: 38 }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(200,255,0,0.35)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
                    />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#383838', fontWeight: 700 }}>{f.unit}</span>
                  </div>
                ))}
              </div>

              <button onClick={generateAI} disabled={aiLoading}
                style={{ ...BTN, opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #050505', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Generating…</>
                  : '✨ Generate Full Day Plan'
                }
              </button>
            </div>

            {/* AI loading state */}
            {aiLoading && (
              <div style={{ ...CARD, textAlign: 'center', padding: 36 }}>
                <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulseOp 1.2s ease-in-out infinite', display: 'inline-block' }}>🤖</div>
                <div style={{ fontSize: 14, color: '#C8FF00', fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>Crafting your plan…</div>
                <div style={{ fontSize: 12, color: '#333' }}>Analyzing macros & dietary preferences</div>
              </div>
            )}

            {/* AI Result */}
            {aiPlan && !aiLoading && (
              <div style={{ ...CARD, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Your Meal Plan</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(aiPlan); toast('Copied!') }}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.18)',
                      color: '#C8FF00', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Copy</button>
                </div>
                <div style={{ color: '#A0A0A0', fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>
                  {aiPlan}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TAB: TARGETS ════════════════ */}
        {tab === 'targets' && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            {/* Preset picker */}
            <div style={CARD}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 4 }}>Nutrition Targets</div>
              <div style={{ fontSize: 12, color: '#353535', marginBottom: 16, fontWeight: 500 }}>Choose a preset or adjust manually</div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
                {Object.entries(DIET_PRESETS).map(([key, { label, emoji }]) => {
                  const active = selectedPreset === key
                  return (
                    <button key={key} onClick={() => applyPreset(key)}
                      style={{
                        padding: '7px 13px', borderRadius: 20,
                        border: `1px solid ${active ? 'rgba(200,255,0,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        background: active ? 'rgba(200,255,0,0.1)' : '#0A0A0A',
                        color: active ? '#C8FF00' : '#404040',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.18s',
                      }}>{emoji} {label}</button>
                  )
                })}
              </div>

              {/* Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { k: 'calories',  label: 'Daily Calories', unit: 'kcal', min: 800,  max: 4000, step: 50,  color: '#C8FF00' },
                  { k: 'protein_g', label: 'Protein',        unit: 'g',    min: 20,   max: 300,  step: 5,   color: '#C8FF00' },
                  { k: 'carbs_g',   label: 'Carbohydrates',  unit: 'g',    min: 20,   max: 500,  step: 5,   color: '#FB923C' },
                  { k: 'fat_g',     label: 'Fat',            unit: 'g',    min: 10,   max: 300,  step: 5,   color: '#60A5FA' },
                ].map(f => (
                  <div key={f.k} style={{ background: '#0A0A0A', borderRadius: 15, padding: '14px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#EBEBEB' }}>{f.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: f.color, fontFamily: "'DM Mono', monospace", letterSpacing: '-0.02em' }}>
                        {targets[f.k as keyof MacroTarget]}<span style={{ fontSize: 10, color: '#383838', marginLeft: 2 }}>{f.unit}</span>
                      </span>
                    </div>
                    <input type="range"
                      min={f.min} max={f.max} step={f.step}
                      value={targets[f.k as keyof MacroTarget]}
                      onChange={e => { setTargets(p => ({ ...p, [f.k]: parseInt(e.target.value) })); setSelectedPreset('') }}
                      style={{ width: '100%', accentColor: f.color }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: '#252525' }}>{f.min}{f.unit}</span>
                      <span style={{ fontSize: 10, color: '#252525' }}>{f.max}{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Macro split bar */}
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, color: '#353535', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Macro split by calories</div>
                <div style={{ height: 7, borderRadius: 99, display: 'flex', overflow: 'hidden', gap: 2, marginBottom: 10 }}>
                  {macroSplit.map(s => (
                    <div key={s.label} style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
                  {macroSplit.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                      <span style={{ fontSize: 11, color: '#444', fontWeight: 700 }}>{s.label} {Math.round(s.pct)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today's progress rings */}
            <div style={CARD}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 16 }}>Today's Progress</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Calories', value: totals.calories,  target: targets.calories,  unit: 'kcal', color: '#C8FF00' },
                  { label: 'Protein',  value: totals.protein_g, target: targets.protein_g, unit: 'g',    color: '#C8FF00' },
                  { label: 'Carbs',    value: totals.carbs_g,   target: targets.carbs_g,   unit: 'g',    color: '#FB923C' },
                  { label: 'Fat',      value: totals.fat_g,     target: targets.fat_g,     unit: 'g',    color: '#60A5FA' },
                ].map(m => {
                  const p = pct(m.value, m.target)
                  const over = p > 100
                  return (
                    <div key={m.label} style={{
                      background: '#0A0A0A', borderRadius: 16, padding: '16px 12px',
                      border: `1px solid ${m.color}10`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    }}>
                      <Ring value={p} size={62} stroke={4} color={over ? '#F87171' : m.color} bg="rgba(255,255,255,0.04)">
                        <span style={{ fontSize: 9, fontWeight: 800, color: over ? '#F87171' : m.color, fontFamily: "'DM Mono', monospace" }}>{Math.round(p)}%</span>
                      </Ring>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#EBEBEB', letterSpacing: '-0.02em', fontFamily: "'DM Mono', monospace" }}>
                          {Math.round(m.value)}<span style={{ fontSize: 10, color: '#353535', fontWeight: 600 }}>{m.unit}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#2E2E2E', marginTop: 1 }}>/ {m.target}{m.unit}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: m.color, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <NAV />
    </div>
  )
}