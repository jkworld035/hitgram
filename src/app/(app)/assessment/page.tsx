'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const steps = [
  'personal', 'body', 'lifestyle', 'goals', 'diet', 'sleep', 'stress', 'result'
]

export default function AssessmentPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [aiPlan, setAiPlan] = useState<any>(null)
  const [data, setData] = useState({
    // Personal
    name: '', age: '', gender: '',
    // Body
    weight: '', height: '', bodyType: '', activityLevel: '',
    // Lifestyle
    occupation: '', workHours: '', smokingStatus: '', alcoholStatus: '',
    // Goals
    primaryGoal: '', targetWeight: '', timeframe: '', motivation: '',
    // Diet
    dietType: '', foodAllergies: '', mealsPerDay: '', waterIntake: '',
    // Sleep
    sleepHours: '', sleepQuality: '', wakeTime: '', bedTime: '',
    // Stress
    stressLevel: '', stressors: [], currentExercise: '', exerciseFrequency: '',
  })
  const router = useRouter()
  const supabase = createClient()

  const set = (key: string, val: any) => setData(p => ({ ...p, [key]: val }))

  const generateAIPlan = async () => {
    setLoading(true)
    const prompt = `You are a world-class health AI. Create a comprehensive, deeply personalized health transformation plan for this person. Return a valid JSON object only, no other text.

User Profile:
- Name: ${data.name}, Age: ${data.age}, Gender: ${data.gender}
- Weight: ${data.weight}kg, Height: ${data.height}cm
- Body Type: ${data.bodyType}, Activity Level: ${data.activityLevel}
- Occupation: ${data.occupation}, Works ${data.workHours} hours/day
- Smoking: ${data.smokingStatus}, Alcohol: ${data.alcoholStatus}
- Primary Goal: ${data.primaryGoal}, Target Weight: ${data.targetWeight}kg
- Timeframe: ${data.timeframe}, Motivation: ${data.motivation}
- Diet Type: ${data.dietType}, Food Allergies: ${data.foodAllergies}
- Meals per day: ${data.mealsPerDay}, Water intake: ${data.waterIntake}L
- Sleep: ${data.sleepHours}h, Quality: ${data.sleepQuality}
- Wake time: ${data.wakeTime}, Bed time: ${data.bedTime}
- Stress level: ${data.stressLevel}/10
- Current exercise: ${data.currentExercise}, Frequency: ${data.exerciseFrequency}

Return this exact JSON structure:
{
  "healthScore": 72,
  "bmi": 24.5,
  "bmiCategory": "Normal",
  "metabolicAge": 28,
  "summary": "Two sentence personalized health summary",
  "keyInsights": ["insight1", "insight2", "insight3", "insight4"],
  "risks": ["risk1", "risk2"],
  "dailyRoutine": {
    "wakeUp": "6:00 AM",
    "morning": "Morning routine description",
    "breakfast": "Specific breakfast",
    "midMorning": "Activity",
    "lunch": "Specific lunch",
    "afternoon": "Activity",
    "preworkout": "Pre-workout snack",
    "workout": "Workout description",
    "dinner": "Specific dinner",
    "evening": "Evening routine",
    "sleep": "10:30 PM"
  },
  "weeklyWorkoutPlan": {
    "monday": { "name": "workout name", "exercises": ["ex1", "ex2", "ex3"], "duration": "45 min", "calories": 320 },
    "tuesday": { "name": "workout name", "exercises": ["ex1", "ex2"], "duration": "30 min", "calories": 200 },
    "wednesday": { "name": "workout name", "exercises": ["ex1", "ex2", "ex3"], "duration": "45 min", "calories": 350 },
    "thursday": { "name": "workout name", "exercises": ["ex1", "ex2"], "duration": "30 min", "calories": 180 },
    "friday": { "name": "workout name", "exercises": ["ex1", "ex2", "ex3"], "duration": "50 min", "calories": 400 },
    "saturday": { "name": "workout name", "exercises": ["ex1", "ex2"], "duration": "60 min", "calories": 450 },
    "sunday": { "name": "Rest & Recovery", "exercises": ["light walk", "stretching"], "duration": "20 min", "calories": 80 }
  },
  "mealPlan": {
    "dailyCalories": 2100,
    "protein": 165,
    "carbs": 210,
    "fat": 70,
    "breakfast": { "name": "meal name", "calories": 450, "protein": 35, "items": ["item1", "item2", "item3"] },
    "lunch": { "name": "meal name", "calories": 600, "protein": 45, "items": ["item1", "item2", "item3"] },
    "dinner": { "name": "meal name", "calories": 550, "protein": 40, "items": ["item1", "item2", "item3"] },
    "snacks": [{ "name": "snack", "calories": 200, "time": "3:00 PM" }, { "name": "snack", "calories": 150, "time": "9:00 PM" }]
  },
  "habits": [
    { "name": "habit name", "icon": "💧", "time": "7:00 AM", "benefit": "specific benefit", "streak": 0 },
    { "name": "habit name", "icon": "🏃", "time": "6:30 AM", "benefit": "specific benefit", "streak": 0 },
    { "name": "habit name", "icon": "🧘", "time": "9:00 PM", "benefit": "specific benefit", "streak": 0 },
    { "name": "habit name", "icon": "📚", "time": "8:00 PM", "benefit": "specific benefit", "streak": 0 },
    { "name": "habit name", "icon": "💊", "time": "8:00 AM", "benefit": "specific benefit", "streak": 0 }
  ],
  "supplements": [
    { "name": "supplement", "dose": "dose", "timing": "when", "benefit": "why" }
  ],
  "weeklyGoals": ["goal1", "goal2", "goal3", "goal4"],
  "monthlyMilestones": ["month 1 milestone", "month 2 milestone", "month 3 milestone"],
  "benefits": [
    { "title": "benefit title", "description": "description", "timeframe": "2 weeks", "icon": "⚡" },
    { "title": "benefit title", "description": "description", "timeframe": "1 month", "icon": "💪" },
    { "title": "benefit title", "description": "description", "timeframe": "3 months", "icon": "🏆" }
  ],
  "focusAreas": ["area1", "area2", "area3"],
  "motivationalMessage": "Personalized motivational message for this specific person"
}`

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'jarvis',
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const d = await res.json()
      const text = d.message.replace(/```json|```/g, '').trim()
      const plan = JSON.parse(text)
      setAiPlan(plan)

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          full_name: data.name,
          bio: `${data.primaryGoal} • ${data.dietType} • ${data.activityLevel}`,
          fitness_goal: data.primaryGoal,
          diet_type: data.dietType,
        }).eq('id', user.id)
      }
    } catch (e) {
      // Fallback plan
      setAiPlan(getFallbackPlan(data))
    }
    setLoading(false)
    setStep(7)
  }

  const next = () => {
    if (step === 6) { generateAIPlan(); return }
    setStep(p => p + 1)
  }
  const back = () => setStep(p => p - 1)

  const inp = {
    width: '100%', background: '#0D0D0D',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '13px 16px',
    color: '#fff', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties

  const OptionBtn = ({ value, current, onSelect, label, sub, icon }: any) => (
    <button onClick={() => onSelect(value)}
      style={{
        background: current === value ? 'rgba(170,255,0,0.08)' : '#111',
        border: `1.5px solid ${current === value ? '#AAFF00' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '14px', padding: '14px 16px',
        textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}
      onMouseEnter={e => { if (current !== value) e.currentTarget.style.borderColor = 'rgba(170,255,0,0.3)' }}
      onMouseLeave={e => { if (current !== value) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}>
      {icon && <span style={{ fontSize: '24px' }}>{icon}</span>}
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: current === value ? '#AAFF00' : '#fff' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: '#3A3A3A', marginTop: '2px' }}>{sub}</div>}
      </div>
      {current === value && (
        <div style={{ marginLeft: 'auto', width: '20px', height: '20px', borderRadius: '50%', background: '#AAFF00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
      )}
    </button>
  )

  const progress = ((step) / (steps.length - 1)) * 100

  // ── RESULT PAGE ──
  if (step === 7 && aiPlan) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', fontFamily: 'Inter,sans-serif', paddingBottom: '40px' }}>
        <style>{`
          @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(170,255,0,0.3)}50%{box-shadow:0 0 50px rgba(170,255,0,0.7)}}
          @keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          *::-webkit-scrollbar{display:none}
        `}</style>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,rgba(170,255,0,0.1),rgba(34,197,94,0.05))', borderBottom: '1px solid rgba(170,255,0,0.15)', padding: '48px 20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'fadeInUp 0.5s ease both' }}>🧬</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff', marginBottom: '6px', animation: 'fadeInUp 0.5s ease 0.1s both' }}>
            Your AI Health Plan is Ready!
          </div>
          <div style={{ fontSize: '13px', color: '#AAFF00', fontWeight: '600', animation: 'fadeInUp 0.5s ease 0.2s both' }}>
            Personalized for {data.name} • {data.primaryGoal}
          </div>
        </div>

        <div style={{ padding: '16px 20px', maxWidth: '480px', margin: '0 auto' }}>

          {/* Health Score */}
          <div style={{ background: '#111', border: '1px solid rgba(170,255,0,0.2)', borderRadius: '24px', padding: '24px', marginBottom: '14px', textAlign: 'center', animation: 'fadeInUp 0.5s ease 0.1s both', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(170,255,0,0.08),transparent)' }} />
            <div style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Your Health Score</div>
            <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 16px' }}>
              <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#AAFF00"/>
                    <stop offset="100%" stopColor="#22C55E"/>
                  </linearGradient>
                </defs>
                <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
                <circle cx="70" cy="70" r="62" fill="none" stroke="url(#scoreGrad)" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*62}`}
                  strokeDashoffset={`${2*Math.PI*62*(1-aiPlan.healthScore/100)}`}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(170,255,0,0.8))', transition: 'stroke-dashoffset 2s ease' }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '40px', fontWeight: '900', color: '#AAFF00', lineHeight: 1 }}>{aiPlan.healthScore}</div>
                <div style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '600' }}>/ 100</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {[
                { label: 'BMI', value: aiPlan.bmi, sub: aiPlan.bmiCategory, color: '#AAFF00' },
                { label: 'Metabolic Age', value: aiPlan.metabolicAge, sub: 'years', color: '#3B82F6' },
                { label: 'Daily Calories', value: aiPlan.mealPlan?.dailyCalories, sub: 'kcal', color: '#F97316' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0D0D0D', borderRadius: '12px', padding: '10px', textAlign: 'center', border: `1px solid ${s.color}15` }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: '#3A3A3A', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: '9px', color: s.color, marginTop: '1px' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: 'linear-gradient(135deg,rgba(170,255,0,0.06),rgba(34,197,94,0.02))', border: '1px solid rgba(170,255,0,0.12)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.2s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#000' }}>I</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>IRA Analysis</div>
            </div>
            <div style={{ fontSize: '14px', color: '#C0C0C0', lineHeight: '1.7' }}>{aiPlan.summary}</div>
          </div>

          {/* Key Insights */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.3s both' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>🔍 Key Health Insights</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiPlan.keyInsights?.map((insight: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: '#0D0D0D', borderRadius: '12px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(170,255,0,0.12)', border: '1px solid rgba(170,255,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: '#AAFF00', flexShrink: 0 }}>{i+1}</div>
                  <div style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: '1.5' }}>{insight}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Routine */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.35s both' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>📅 Your Daily Routine</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aiPlan.dailyRoutine && Object.entries(aiPlan.dailyRoutine).map(([key, val]: any, i) => {
                const timeColors = ['#AAFF00','#F97316','#22C55E','#3B82F6','#8B5CF6','#EAB308','#00CFFF','#EF4444','#22C55E','#8B5CF6','#3B82F6']
                const icons: Record<string,string> = { wakeUp:'☀️', morning:'🌅', breakfast:'🌅', midMorning:'⚡', lunch:'☀️', afternoon:'💼', preworkout:'⚡', workout:'💪', dinner:'🌙', evening:'🌙', sleep:'😴' }
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', background: '#0D0D0D', borderRadius: '12px', border: `1px solid ${timeColors[i%timeColors.length]}10` }}>
                    <div style={{ fontSize: '18px', flexShrink: 0 }}>{icons[key]||'⏰'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: timeColors[i%timeColors.length], fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                        {key.replace(/([A-Z])/g,' $1').trim()}
                      </div>
                      <div style={{ fontSize: '13px', color: '#fff', lineHeight: '1.4' }}>{val as string}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weekly Workout Plan */}
          <div style={{ background: '#111', border: '1px solid rgba(249,115,22,0.12)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.4s both' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>💪 Weekly Workout Plan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aiPlan.weeklyWorkoutPlan && Object.entries(aiPlan.weeklyWorkoutPlan).map(([day, workout]: any) => (
                <div key={day} style={{ background: '#0D0D0D', borderRadius: '14px', padding: '14px', border: '1px solid rgba(249,115,22,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#F97316', textTransform: 'capitalize' }}>{day}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#3A3A3A', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '20px' }}>⏱️ {workout.duration}</div>
                      <div style={{ fontSize: '11px', color: '#F97316', background: 'rgba(249,115,22,0.08)', padding: '2px 8px', borderRadius: '20px' }}>🔥 {workout.calories}kcal</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>{workout.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {workout.exercises?.map((ex: string, i: number) => (
                      <div key={i} style={{ fontSize: '11px', color: '#A1A1AA', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '8px' }}>{ex}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meal Plan */}
          <div style={{ background: '#111', border: '1px solid rgba(34,197,94,0.12)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.45s both' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>🥗 Personalized Meal Plan</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'Calories', value: `${aiPlan.mealPlan?.dailyCalories}`, color: '#AAFF00' },
                { label: 'Protein', value: `${aiPlan.mealPlan?.protein}g`, color: '#22C55E' },
                { label: 'Carbs', value: `${aiPlan.mealPlan?.carbs}g`, color: '#F97316' },
              ].map(m => (
                <div key={m.label} style={{ background: '#0D0D0D', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: '10px', color: '#3A3A3A', fontWeight: '600', marginTop: '2px' }}>{m.label}</div>
                </div>
              ))}
            </div>
            {['breakfast', 'lunch', 'dinner'].map(meal => {
              const m = aiPlan.mealPlan?.[meal]
              if (!m) return null
              const colors: Record<string,string> = { breakfast: '#FBBF24', lunch: '#22C55E', dinner: '#6366F1' }
              const icons: Record<string,string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }
              return (
                <div key={meal} style={{ background: '#0D0D0D', borderRadius: '14px', padding: '14px', marginBottom: '8px', border: `1px solid ${colors[meal]}15` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{icons[meal]}</span>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: colors[meal], textTransform: 'capitalize' }}>{meal}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: colors[meal], fontWeight: '700' }}>{m.calories} kcal</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>{m.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {m.items?.map((item: string, i: number) => (
                      <div key={i} style={{ fontSize: '11px', color: '#A1A1AA', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '8px' }}>{item}</div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Daily Habits */}
          <div style={{ background: '#111', border: '1px solid rgba(234,179,8,0.12)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.5s both' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>✅ Daily Habits Plan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aiPlan.habits?.map((habit: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#0D0D0D', borderRadius: '14px', border: '1px solid rgba(234,179,8,0.08)' }}>
                  <div style={{ fontSize: '22px' }}>{habit.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{habit.name}</div>
                    <div style={{ fontSize: '11px', color: '#3A3A3A' }}>{habit.time} • {habit.benefit}</div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#EAB308', fontWeight: '700', background: 'rgba(234,179,8,0.1)', padding: '3px 8px', borderRadius: '20px' }}>DAILY</div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits Timeline */}
          <div style={{ background: '#111', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.55s both' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>🏆 What You Will Gain</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiPlan.benefits?.map((b: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '14px', background: '#0D0D0D', borderRadius: '14px', border: '1px solid rgba(139,92,246,0.08)' }}>
                  <div style={{ fontSize: '28px', flexShrink: 0 }}>{b.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{b.title}</div>
                      <div style={{ fontSize: '10px', color: '#8B5CF6', fontWeight: '700', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: '20px' }}>In {b.timeframe}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: '1.5' }}>{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Milestones */}
          <div style={{ background: '#111', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '20px', padding: '18px', marginBottom: '14px', animation: 'fadeInUp 0.5s ease 0.6s both' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>📈 Monthly Milestones</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aiPlan.monthlyMilestones?.map((m: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0D0D0D', borderRadius: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#3B82F6', flexShrink: 0 }}>M{i+1}</div>
                  <div style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: '1.4' }}>{m}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational message */}
          <div style={{ background: 'linear-gradient(135deg,rgba(170,255,0,0.08),rgba(34,197,94,0.04))', border: '1px solid rgba(170,255,0,0.2)', borderRadius: '20px', padding: '20px', marginBottom: '20px', textAlign: 'center', animation: 'fadeInUp 0.5s ease 0.65s both' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>✨</div>
            <div style={{ fontSize: '14px', color: '#A1A1AA', lineHeight: '1.7', fontStyle: 'italic' }}>"{aiPlan.motivationalMessage}"</div>
            <div style={{ fontSize: '11px', color: '#AAFF00', fontWeight: '700', marginTop: '10px' }}>— IRA, Your AI Health Coach</div>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => router.push('/dashboard')}
              style={{ width: '100%', background: '#AAFF00', color: '#000', border: 'none', borderRadius: '16px', padding: '16px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 30px rgba(170,255,0,0.4)' }}>
              Start My Journey →
            </button>
            <button onClick={() => router.push('/jarvis')}
              style={{ width: '100%', background: 'transparent', color: '#AAFF00', border: '1px solid rgba(170,255,0,0.3)', borderRadius: '16px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              Talk to IRA About My Plan
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── LOADING SCREEN ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '900', color: '#000', margin: '0 auto 24px', boxShadow: '0 0 60px rgba(170,255,0,0.5)', animation: 'glow 1.5s ease-in-out infinite' }}>I</div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>IRA is analyzing your health...</div>
        <div style={{ fontSize: '13px', color: '#3A3A3A', marginBottom: '24px' }}>Creating your personalized plan</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '260px', margin: '0 auto' }}>
          {['Analyzing body metrics...','Calculating nutrition needs...','Designing workout plan...','Building daily routine...','Generating insights...'].map((t,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: '#111', borderRadius: '20px', border: '1px solid rgba(170,255,0,0.1)', animation: `fadeInUp 0.4s ease ${i*0.2}s both` }}>
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(170,255,0,0.2)', borderTop: '2px solid #AAFF00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }}/>
              <span style={{ fontSize: '12px', color: '#A1A1AA' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── QUESTION STEPS ──
  const StepWrapper = ({ title, sub, children }: any) => (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: 'Inter,sans-serif', animation: 'fadeInUp 0.4s ease both' }}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(170,255,0,0.3)}50%{box-shadow:0 0 50px rgba(170,255,0,0.7)}} *::-webkit-scrollbar{display:none}`}</style>

      {/* Progress bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step > 0 && (
              <button onClick={back} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>←</button>
            )}
            <div style={{ fontSize: '12px', color: '#AAFF00', fontWeight: '700' }}>Step {step+1} of {steps.length-1}</div>
          </div>
          <div style={{ fontSize: '12px', color: '#3A3A3A' }}>{Math.round(progress)}% complete</div>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#AAFF00,#22C55E)', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.5s ease', boxShadow: '0 0 8px rgba(170,255,0,0.5)' }}/>
        </div>
      </div>

      <div style={{ padding: '24px 20px 120px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px', lineHeight: 1.2 }}>{title}</div>
          {sub && <div style={{ fontSize: '14px', color: '#52525B', lineHeight: '1.6' }}>{sub}</div>}
        </div>
        {children}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 32px', background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={next}
          style={{ width: '100%', background: '#AAFF00', color: '#000', border: 'none', borderRadius: '16px', padding: '16px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 30px rgba(170,255,0,0.4)', animation: 'glow 2s ease-in-out infinite' }}>
          {step === 6 ? '✨ Generate My AI Health Plan' : 'Continue →'}
        </button>
      </div>
    </div>
  )

  const gridTwo = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }

  // STEP 0 — Personal
  if (step === 0) return (
    <StepWrapper title="Let's personalize your journey 🧬" sub="Tell IRA about yourself to create your perfect health plan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Your Name</div>
          <input placeholder="Enter your full name" value={data.name} onChange={e => set('name', e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Age</div>
          <input type="number" placeholder="Your age" value={data.age} onChange={e => set('age', e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Gender</div>
          <div style={gridTwo}>
            {[{v:'male',l:'Male',i:'👨'},{v:'female',l:'Female',i:'👩'},{v:'non-binary',l:'Non-binary',i:'🧑'},{v:'prefer-not',l:'Prefer not to say',i:'🤍'}].map(g => (
              <OptionBtn key={g.v} value={g.v} current={data.gender} onSelect={(v:string) => set('gender',v)} label={g.l} icon={g.i}/>
            ))}
          </div>
        </div>
      </div>
    </StepWrapper>
  )

  // STEP 1 — Body
  if (step === 1) return (
    <StepWrapper title="Your body stats 💪" sub="This helps IRA calculate your exact nutritional and fitness needs">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={gridTwo}>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Weight (kg)</div>
            <input type="number" placeholder="70" value={data.weight} onChange={e => set('weight', e.target.value)} style={inp}
              onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Height (cm)</div>
            <input type="number" placeholder="175" value={data.height} onChange={e => set('height', e.target.value)} style={inp}
              onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Body Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {v:'ectomorph',l:'Ectomorph',s:'Lean and long, struggles to gain weight',i:'🏃'},
              {v:'mesomorph',l:'Mesomorph',s:'Athletic build, gains muscle easily',i:'💪'},
              {v:'endomorph',l:'Endomorph',s:'Larger frame, stores fat easily',i:'🏋️'},
              {v:'mixed',l:'Mixed',s:'Combination of body types',i:'⚖️'},
            ].map(t => <OptionBtn key={t.v} value={t.v} current={data.bodyType} onSelect={(v:string) => set('bodyType',v)} label={t.l} sub={t.s} icon={t.i}/>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Current Activity Level</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {v:'sedentary',l:'Sedentary',s:'Desk job, little to no exercise',i:'🪑'},
              {v:'light',l:'Lightly Active',s:'Light exercise 1-2 days/week',i:'🚶'},
              {v:'moderate',l:'Moderately Active',s:'Exercise 3-4 days/week',i:'🏃'},
              {v:'very',l:'Very Active',s:'Hard exercise 5-6 days/week',i:'⚡'},
              {v:'athlete',l:'Athlete',s:'Professional level training',i:'🏆'},
            ].map(t => <OptionBtn key={t.v} value={t.v} current={data.activityLevel} onSelect={(v:string) => set('activityLevel',v)} label={t.l} sub={t.s} icon={t.i}/>)}
          </div>
        </div>
      </div>
    </StepWrapper>
  )

  // STEP 2 — Lifestyle
  if (step === 2) return (
    <StepWrapper title="Your lifestyle 🌍" sub="Understanding your daily life helps IRA create a realistic plan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Occupation</div>
          <input placeholder="e.g. Software Engineer, Teacher, Student" value={data.occupation} onChange={e => set('occupation', e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Daily Work Hours</div>
          <div style={gridTwo}>
            {[{v:'4',l:'Part-time',s:'Under 4h'},{v:'6',l:'Normal',s:'4-6h'},{v:'8',l:'Full-time',s:'6-8h'},{v:'10+',l:'Overwork',s:'10h+'}].map(h => (
              <OptionBtn key={h.v} value={h.v} current={data.workHours} onSelect={(v:string) => set('workHours',v)} label={h.l} sub={h.s}/>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Smoking Status</div>
          <div style={gridTwo}>
            {[{v:'never',l:'Never',i:'✅'},{v:'quit',l:'Quit',i:'🚭'},{v:'social',l:'Social',i:'🤝'},{v:'daily',l:'Daily',i:'🚬'}].map(s => (
              <OptionBtn key={s.v} value={s.v} current={data.smokingStatus} onSelect={(v:string) => set('smokingStatus',v)} label={s.l} icon={s.i}/>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Alcohol Consumption</div>
          <div style={gridTwo}>
            {[{v:'never',l:'Never',i:'✅'},{v:'rarely',l:'Rarely',i:'🥂'},{v:'weekly',l:'Weekly',i:'🍷'},{v:'daily',l:'Daily',i:'🍺'}].map(a => (
              <OptionBtn key={a.v} value={a.v} current={data.alcoholStatus} onSelect={(v:string) => set('alcoholStatus',v)} label={a.l} icon={a.i}/>
            ))}
          </div>
        </div>
      </div>
    </StepWrapper>
  )

  // STEP 3 — Goals
  if (step === 3) return (
    <StepWrapper title="What's your goal? 🎯" sub="IRA will build everything around your primary objective">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Primary Goal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {v:'weight_loss',l:'Lose Weight',s:'Reduce body fat and reach healthy BMI',i:'⚡'},
              {v:'muscle_gain',l:'Build Muscle',s:'Increase strength and muscle mass',i:'💪'},
              {v:'endurance',l:'Improve Endurance',s:'Build cardiovascular fitness and stamina',i:'🏃'},
              {v:'flexibility',l:'Flexibility & Mobility',s:'Improve range of motion and reduce pain',i:'🧘'},
              {v:'health',l:'General Health',s:'Improve overall wellbeing and energy',i:'❤️'},
              {v:'stress',l:'Reduce Stress',s:'Better mental health and work-life balance',i:'🧠'},
              {v:'sports',l:'Sports Performance',s:'Train for specific sport or competition',i:'🏆'},
            ].map(g => <OptionBtn key={g.v} value={g.v} current={data.primaryGoal} onSelect={(v:string) => set('primaryGoal',v)} label={g.l} sub={g.s} icon={g.i}/>)}
          </div>
        </div>
        <div style={gridTwo}>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Target Weight (kg)</div>
            <input type="number" placeholder="65" value={data.targetWeight} onChange={e => set('targetWeight', e.target.value)} style={inp}/>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Timeframe</div>
            <select value={data.timeframe} onChange={e => set('timeframe', e.target.value)} style={inp}>
              <option value="">Select</option>
              <option value="1 month">1 Month</option>
              <option value="3 months">3 Months</option>
              <option value="6 months">6 Months</option>
              <option value="1 year">1 Year</option>
            </select>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>What motivates you most?</div>
          <input placeholder="e.g. I want to feel energetic for my kids..." value={data.motivation} onChange={e => set('motivation', e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
        </div>
      </div>
    </StepWrapper>
  )

  // STEP 4 — Diet
  if (step === 4) return (
    <StepWrapper title="Your nutrition preferences 🥗" sub="IRA will create a meal plan perfectly suited to your needs">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Diet Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {v:'omnivore',l:'Omnivore',s:'Eat everything — meat, fish, dairy, vegetables',i:'🍽️'},
              {v:'vegetarian',l:'Vegetarian',s:'No meat but eat dairy and eggs',i:'🥗'},
              {v:'vegan',l:'Vegan',s:'100% plant-based diet',i:'🌱'},
              {v:'keto',l:'Ketogenic',s:'High fat, low carb approach',i:'🥩'},
              {v:'mediterranean',l:'Mediterranean',s:'Olive oil, fish, vegetables, whole grains',i:'🫒'},
              {v:'indian',l:'Indian Vegetarian',s:'Indian cuisine based plant diet',i:'🍛'},
              {v:'intermittent',l:'Intermittent Fasting',s:'Time-restricted eating windows',i:'⏰'},
            ].map(d => <OptionBtn key={d.v} value={d.v} current={data.dietType} onSelect={(v:string) => set('dietType',v)} label={d.l} sub={d.s} icon={d.i}/>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Food Allergies / Intolerances</div>
          <input placeholder="e.g. Lactose, Gluten, Nuts, or None" value={data.foodAllergies} onChange={e => set('foodAllergies', e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
        </div>
        <div style={gridTwo}>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Meals per Day</div>
            <select value={data.mealsPerDay} onChange={e => set('mealsPerDay', e.target.value)} style={inp}>
              <option value="">Select</option>
              <option value="2">2 meals</option>
              <option value="3">3 meals</option>
              <option value="4">4 meals</option>
              <option value="5">5+ meals</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Daily Water (L)</div>
            <select value={data.waterIntake} onChange={e => set('waterIntake', e.target.value)} style={inp}>
              <option value="">Select</option>
              <option value="1">Under 1L</option>
              <option value="1.5">1-1.5L</option>
              <option value="2">2L</option>
              <option value="3">3L+</option>
            </select>
          </div>
        </div>
      </div>
    </StepWrapper>
  )

  // STEP 5 — Sleep
  if (step === 5) return (
    <StepWrapper title="Your sleep patterns 😴" sub="Sleep is the foundation of health — IRA needs this to optimize your recovery">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={gridTwo}>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Wake Up Time</div>
            <input type="time" value={data.wakeTime} onChange={e => set('wakeTime', e.target.value)} style={inp}/>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Bed Time</div>
            <input type="time" value={data.bedTime} onChange={e => set('bedTime', e.target.value)} style={inp}/>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Average Sleep Hours</div>
          <div style={gridTwo}>
            {[{v:'5',l:'Under 5h',i:'😴'},{v:'6',l:'6 hours',i:'😪'},{v:'7',l:'7 hours',i:'🙂'},{v:'8',l:'8 hours',i:'😊'},{v:'9',l:'9+ hours',i:'💤'}].map(s => (
              <OptionBtn key={s.v} value={s.v} current={data.sleepHours} onSelect={(v:string) => set('sleepHours',v)} label={s.l} icon={s.i}/>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Sleep Quality</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {v:'poor',l:'Poor',s:'Wake up multiple times, feel exhausted',i:'😫'},
              {v:'fair',l:'Fair',s:'Sometimes wake up, moderate rest',i:'😐'},
              {v:'good',l:'Good',s:'Mostly uninterrupted, feel okay',i:'😊'},
              {v:'excellent',l:'Excellent',s:'Deep, refreshing sleep every night',i:'😄'},
            ].map(q => <OptionBtn key={q.v} value={q.v} current={data.sleepQuality} onSelect={(v:string) => set('sleepQuality',v)} label={q.l} sub={q.s} icon={q.i}/>)}
          </div>
        </div>
      </div>
    </StepWrapper>
  )

  // STEP 6 — Stress & Exercise
  if (step === 6) return (
    <StepWrapper title="Stress & current fitness 🧠" sub="Last step — IRA will use this to balance your plan perfectly">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Stress Level (1-10)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => set('stressLevel', String(n))}
                style={{ padding: '12px', borderRadius: '12px', border: `1.5px solid ${data.stressLevel===String(n)?'#AAFF00':'rgba(255,255,255,0.07)'}`, background: data.stressLevel===String(n)?'rgba(170,255,0,0.08)':'#111', color: data.stressLevel===String(n)?'#AAFF00':'#fff', fontSize: '16px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#22C55E' }}>😊 Very calm</span>
            <span style={{ fontSize: '11px', color: '#EF4444' }}>😰 Extremely stressed</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Current Exercise</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {v:'none',l:'No Exercise',s:'Currently not exercising',i:'🪑'},
              {v:'walking',l:'Walking',s:'Regular walks only',i:'🚶'},
              {v:'gym',l:'Gym Training',s:'Weight training and cardio',i:'🏋️'},
              {v:'sports',l:'Sports',s:'Playing sports regularly',i:'⚽'},
              {v:'yoga',l:'Yoga / Pilates',s:'Mind-body exercise',i:'🧘'},
              {v:'mixed',l:'Mixed Training',s:'Combination of activities',i:'💪'},
            ].map(e => <OptionBtn key={e.v} value={e.v} current={data.currentExercise} onSelect={(v:string) => set('currentExercise',v)} label={e.l} sub={e.s} icon={e.i}/>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Exercise Frequency</div>
          <div style={gridTwo}>
            {[{v:'0',l:'Never',i:'😔'},{v:'1-2',l:'1-2x/week',i:'🚶'},{v:'3-4',l:'3-4x/week',i:'🏃'},{v:'5+',l:'5+x/week',i:'⚡'}].map(f => (
              <OptionBtn key={f.v} value={f.v} current={data.exerciseFrequency} onSelect={(v:string) => set('exerciseFrequency',v)} label={f.l} icon={f.i}/>
            ))}
          </div>
        </div>
      </div>
    </StepWrapper>
  )

  return null
}

// ── FALLBACK PLAN ──────────────────────────────────────────────
function getFallbackPlan(data: any) {
  return {
    healthScore: 68,
    bmi: data.weight && data.height ? parseFloat((data.weight / ((data.height/100)**2)).toFixed(1)) : 23.5,
    bmiCategory: 'Normal',
    metabolicAge: parseInt(data.age)||25,
    summary: `Based on your profile as a ${data.age}-year-old ${data.gender} aiming for ${data.primaryGoal?.replace(/_/g,' ')}, IRA has created a comprehensive plan combining ${data.dietType} nutrition, progressive fitness training, and lifestyle optimization. Your personalized approach accounts for your ${data.activityLevel} activity level and ${data.sleepQuality} sleep quality to maximize results within your ${data.timeframe} timeframe.`,
    keyInsights: [
      `Your BMI indicates ${data.weight && data.height && data.weight/((data.height/100)**2) < 25 ? 'a healthy weight range — focus on body composition and strength' : 'room for improvement — consistent nutrition and exercise will create dramatic changes'}`,
      `As a ${data.activityLevel} individual working ${data.workHours} hours daily, your plan is designed around your energy availability and recovery needs`,
      `Your ${data.dietType} dietary preference is fully supported — all meal recommendations align with your nutritional philosophy`,
      `Sleep optimization is critical for your goals — targeting ${data.sleepHours}h of quality sleep will accelerate your progress by up to 40%`,
    ],
    risks: ['Insufficient hydration may slow metabolism and reduce workout performance', 'High stress levels without management can elevate cortisol and hinder fat loss'],
    dailyRoutine: {
      wakeUp: data.wakeTime || '6:00 AM',
      morning: 'Drink 500ml water, 5 min stretching, review daily goals',
      breakfast: 'High-protein breakfast within 60 minutes of waking',
      midMorning: 'Light movement break, herbal tea or water',
      lunch: 'Balanced meal with protein, complex carbs and vegetables',
      afternoon: '10-minute walk, breathing exercise to manage energy dip',
      preworkout: 'Light snack 90 minutes before training if applicable',
      workout: `${data.primaryGoal === 'weight_loss' ? '45 min HIIT + strength training' : data.primaryGoal === 'muscle_gain' ? '60 min progressive strength training' : '45 min mixed cardio and strength'}`,
      dinner: 'Protein-rich dinner, light on carbohydrates',
      evening: 'Screen-free wind down, journaling, light stretching',
      sleep: data.bedTime || '10:30 PM',
    },
    weeklyWorkoutPlan: {
      monday: { name: 'Upper Body Strength', exercises: ['Push-ups 3×15', 'Pull-ups 3×10', 'Shoulder press 3×12', 'Bicep curls 3×15'], duration: '45 min', calories: 320 },
      tuesday: { name: 'Cardio & Core', exercises: ['30 min run', 'Plank 3×60s', 'Mountain climbers 3×30s', 'Crunches 3×20'], duration: '45 min', calories: 380 },
      wednesday: { name: 'Lower Body Power', exercises: ['Squats 4×15', 'Lunges 3×12 each', 'Deadlifts 3×10', 'Calf raises 4×20'], duration: '50 min', calories: 420 },
      thursday: { name: 'Active Recovery', exercises: ['20 min yoga', 'Foam rolling', 'Light stretching', 'Deep breathing'], duration: '30 min', calories: 150 },
      friday: { name: 'Full Body HIIT', exercises: ['Burpees 3×10', 'Jump squats 3×15', 'Push-up variations 3×12', 'High knees 3×30s'], duration: '40 min', calories: 480 },
      saturday: { name: 'Outdoor Activity', exercises: ['60 min brisk walk or jog', 'Bodyweight circuit', 'Sports or recreational activity'], duration: '60 min', calories: 450 },
      sunday: { name: 'Rest & Recovery', exercises: ['Gentle walk 20 min', 'Full body stretch', 'Meditation 10 min'], duration: '20 min', calories: 80 },
    },
    mealPlan: {
      dailyCalories: data.primaryGoal === 'weight_loss' ? 1600 : data.primaryGoal === 'muscle_gain' ? 2800 : 2200,
      protein: 150,
      carbs: 200,
      fat: 65,
      breakfast: { name: 'Power Breakfast Bowl', calories: 480, protein: 38, items: ['4 egg whites + 2 whole eggs', 'Rolled oats 60g', 'Banana', 'Almond milk', 'Handful of berries'] },
      lunch: { name: 'Performance Lunch Plate', calories: 620, protein: 52, items: ['Grilled chicken 180g', 'Brown rice 150g', 'Roasted vegetables 200g', 'Olive oil dressing', 'Mixed greens'] },
      dinner: { name: 'Recovery Dinner', calories: 540, protein: 45, items: ['Baked salmon 160g', 'Sweet potato 200g', 'Steamed broccoli 200g', 'Lemon herb dressing'] },
      snacks: [{ name: 'Greek yogurt + nuts', calories: 220, time: '3:30 PM' }, { name: 'Protein shake or warm milk', calories: 180, time: '9:00 PM' }],
    },
    habits: [
      { name: 'Morning Hydration', icon: '💧', time: data.wakeTime || '6:00 AM', benefit: 'Kickstarts metabolism, rehydrates after sleep', streak: 0 },
      { name: 'Daily Movement', icon: '🏃', time: '7:00 AM', benefit: 'Increases energy and mood for the entire day', streak: 0 },
      { name: 'Mindful Eating', icon: '🥗', time: 'Each Meal', benefit: 'Improves digestion and prevents overeating', streak: 0 },
      { name: 'Evening Meditation', icon: '🧘', time: '9:00 PM', benefit: 'Reduces cortisol by 23%, improves sleep quality', streak: 0 },
      { name: 'Progress Journaling', icon: '📔', time: '9:30 PM', benefit: 'Maintains motivation and tracks patterns', streak: 0 },
    ],
    supplements: [
      { name: 'Vitamin D3', dose: '2000 IU', timing: 'With breakfast', benefit: 'Immune function and bone health' },
      { name: 'Omega-3 Fish Oil', dose: '2g EPA+DHA', timing: 'With lunch', benefit: 'Reduces inflammation and supports heart health' },
      { name: 'Magnesium Glycinate', dose: '400mg', timing: '30 min before sleep', benefit: 'Improves sleep quality and muscle recovery' },
    ],
    weeklyGoals: [
      'Complete all 6 planned workout sessions',
      'Drink 2.5L of water every single day',
      'Sleep 7-8 hours for all 7 nights',
      'Log all meals in Hitgram app',
    ],
    monthlyMilestones: [
      'Week 1-2: Establish routine and notice improved energy levels',
      'Week 3-4: First visible physical changes, strength increasing',
      'Month 2: Significant body composition changes, habits are automatic',
      'Month 3: Major transformation milestone, new baseline established',
    ],
    benefits: [
      { title: 'Energy Boost', description: 'You will experience significantly higher energy levels throughout the day', timeframe: '1-2 weeks', icon: '⚡' },
      { title: 'Body Transformation', description: 'Visible changes in body composition, strength and muscle tone', timeframe: '4-6 weeks', icon: '💪' },
      { title: 'Peak Performance', description: 'Dramatic improvement in all health markers, fitness and mental clarity', timeframe: '3 months', icon: '🏆' },
    ],
    focusAreas: ['Nutrition optimization', 'Progressive overload training', 'Sleep quality improvement'],
    monthlyMilestones: ['Month 1: Build foundation habits and baseline fitness', 'Month 2: Accelerate results with progressive overload', 'Month 3: Peak transformation — measurable results in all areas'],
    motivationalMessage: `${data.name}, you have taken the most important step today — deciding to invest in yourself. Your body is capable of extraordinary transformation when given the right inputs consistently. IRA will be with you every step of this journey. The person you want to become is already inside you — we are simply going to reveal them together.`,
  }
}