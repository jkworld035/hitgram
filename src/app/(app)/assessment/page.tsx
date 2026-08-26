'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────
interface AssessmentData {
  name: string; age: string; gender: string
  weight: string; height: string; bodyType: string; activityLevel: string
  occupation: string; workHours: string; smokingStatus: string; alcoholStatus: string
  primaryGoal: string; targetWeight: string; timeframe: string; motivation: string
  dietType: string; foodAllergies: string; mealsPerDay: string; waterIntake: string
  sleepHours: string; sleepQuality: string; wakeTime: string; bedTime: string
  stressLevel: string; currentExercise: string; exerciseFrequency: string
  medicalConditions: string; medications: string
}

interface AIPlan {
  healthScore:       number
  bmi:               number
  bmiCategory:       string
  metabolicAge:      number
  tdee:              number
  summary:           string
  keyInsights:       string[]
  warnings:          string[]
  dailyCalories:     number
  proteinTarget:     number
  waterTarget:       number
  dailyRoutine:      Record<string, string>
  weeklyWorkout:     { day: string; name: string; exercises: string[]; duration: string; calories: number; intensity: string }[]
  mealPlan: {
    breakfast: { name: string; items: string[]; calories: number; protein: number }
    lunch:     { name: string; items: string[]; calories: number; protein: number }
    dinner:    { name: string; items: string[]; calories: number; protein: number }
    snacks:    { name: string; calories: number; time: string }[]
  }
  habits:      { name: string; icon: string; time: string; why: string }[]
  supplements: { name: string; dose: string; timing: string; reason: string }[]
  benefits:    { title: string; timeframe: string; icon: string; detail: string }[]
  milestones:  { month: number; goal: string; metric: string }[]
  focusAreas:  string[]
  avoidList:   string[]
  motivation:  string
  doctorNote:  string | null
}

const EMPTY: AssessmentData = {
  name:'', age:'', gender:'',
  weight:'', height:'', bodyType:'', activityLevel:'',
  occupation:'', workHours:'', smokingStatus:'', alcoholStatus:'',
  primaryGoal:'', targetWeight:'', timeframe:'', motivation:'',
  dietType:'', foodAllergies:'', mealsPerDay:'', waterIntake:'',
  sleepHours:'', sleepQuality:'', wakeTime:'', bedTime:'',
  stressLevel:'', currentExercise:'', exerciseFrequency:'',
  medicalConditions:'', medications:'',
}

// ── Option Button ─────────────────────────────────────────────
const Opt = ({ value, current, onSelect, label, sub, icon, color='#AAFF00' }: any) => (
  <button onClick={() => onSelect(value)}
    style={{
      background:   current===value ? `rgba(170,255,0,0.08)` : '#111',
      border:       `1.5px solid ${current===value ? color : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '14px', padding:'14px 16px',
      textAlign:'left', cursor:'pointer', transition:'all 0.2s',
      display:'flex', alignItems:'center', gap:'12px', width:'100%',
    }}
    onMouseEnter={e => { if (current!==value) e.currentTarget.style.borderColor='rgba(170,255,0,0.25)' }}
    onMouseLeave={e => { if (current!==value) e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}>
    {icon && <span style={{ fontSize:'22px', flexShrink:0 }}>{icon}</span>}
    <div style={{ flex:1 }}>
      <div style={{ fontSize:'14px', fontWeight:'600', color: current===value ? color : '#fff' }}>{label}</div>
      {sub && <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'2px' }}>{sub}</div>}
    </div>
    {current===value && (
      <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
    )}
  </button>
)

// ── Input style ───────────────────────────────────────────────
const inp: React.CSSProperties = {
  width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.08)',
  borderRadius:'12px', padding:'13px 16px', color:'#fff', fontSize:'14px', outline:'none',
}

export default function AssessmentPage() {
  const [step,    setStep]    = useState(0)
  const [data,    setData]    = useState<AssessmentData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [plan,    setPlan]    = useState<AIPlan | null>(null)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const set = (k: keyof AssessmentData, v: string) => setData(p => ({ ...p, [k]: v }))
  const TOTAL = 7
  const pct   = Math.round((step / TOTAL) * 100)

  // ── Calculate BMI ─────────────────────────────────────────
  const calcBMI = () => {
    const w = parseFloat(data.weight)
    const h = parseFloat(data.height) / 100
    if (!w || !h) return 0
    return parseFloat((w / (h * h)).toFixed(1))
  }

  // ── Calculate TDEE ────────────────────────────────────────
  const calcTDEE = () => {
    const w = parseFloat(data.weight) || 70
    const h = parseFloat(data.height) || 170
    const a = parseInt(data.age) || 25
    const g = data.gender
    // Mifflin-St Jeor
    const bmr = g === 'female'
      ? 10*w + 6.25*h - 5*a - 161
      : 10*w + 6.25*h - 5*a + 5
    const mults: Record<string, number> = {
      sedentary:1.2, light:1.375, moderate:1.55, very:1.725, athlete:1.9
    }
    return Math.round(bmr * (mults[data.activityLevel] || 1.375))
  }

  // ── Validate step ─────────────────────────────────────────
  const canProceed = () => {
    if (step === 0) return data.name && data.age && data.gender
    if (step === 1) return data.weight && data.height && data.activityLevel
    if (step === 2) return data.occupation && data.smokingStatus && data.alcoholStatus
    if (step === 3) return data.primaryGoal && data.timeframe
    if (step === 4) return data.dietType && data.mealsPerDay
    if (step === 5) return data.sleepHours && data.sleepQuality
    if (step === 6) return data.stressLevel && data.currentExercise
    return true
  }

  // ── Generate plan ─────────────────────────────────────────
  const generatePlan = async () => {
    setLoading(true)
    setError('')

    const bmi  = calcBMI()
    const tdee = calcTDEE()

    const loadingMsgs = [
      '🔍 Analyzing your health profile...',
      '📊 Calculating BMI and TDEE...',
      '🧬 Assessing body composition...',
      '🥗 Designing nutrition plan...',
      '💪 Building workout program...',
      '😴 Optimizing sleep schedule...',
      '✅ Creating habit system...',
      '✨ IRA is finalizing your plan...',
    ]

    let msgIdx = 0
    setLoadMsg(loadingMsgs[0])
    const msgTimer = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, loadingMsgs.length - 1)
      setLoadMsg(loadingMsgs[msgIdx])
    }, 1500)

    const prompt = `You are IRA — an expert AI health coach. Create a comprehensive, medically responsible, personalized health plan. Return ONLY valid JSON, no other text.

USER PROFILE:
Name: ${data.name}, Age: ${data.age}, Gender: ${data.gender}
Weight: ${data.weight}kg, Height: ${data.height}cm, BMI: ${bmi}
Body Type: ${data.bodyType}, Activity: ${data.activityLevel}
Occupation: ${data.occupation}, Work hours: ${data.workHours}h/day
Smoking: ${data.smokingStatus}, Alcohol: ${data.alcoholStatus}
Primary Goal: ${data.primaryGoal}, Target Weight: ${data.targetWeight}kg
Timeframe: ${data.timeframe}, Motivation: "${data.motivation}"
Diet: ${data.dietType}, Allergies: ${data.foodAllergies || 'none'}
Meals/day: ${data.mealsPerDay}, Water: ${data.waterIntake}L/day
Sleep: ${data.sleepHours}h, Quality: ${data.sleepQuality}
Wake: ${data.wakeTime}, Bed: ${data.bedTime}
Stress: ${data.stressLevel}/10
Exercise: ${data.currentExercise}, Frequency: ${data.exerciseFrequency}
Medical conditions: ${data.medicalConditions || 'none'}
Medications: ${data.medications || 'none'}
Calculated TDEE: ${tdee} calories

Return this exact JSON:
{
  "healthScore": <0-100 based on all factors>,
  "bmi": ${bmi},
  "bmiCategory": "<Underweight/Normal/Overweight/Obese>",
  "metabolicAge": <estimate>,
  "tdee": ${tdee},
  "summary": "<2 sentences — warm, personalized, specific to their data>",
  "keyInsights": ["<insight with specific number>", "<insight>", "<insight>", "<insight>"],
  "warnings": ${data.medicalConditions && data.medicalConditions !== 'none' ? `["Important: discuss this plan with your doctor given your medical conditions before starting"]` : '[]'},
  "dailyCalories": <tdee adjusted for goal>,
  "proteinTarget": <grams based on weight and goal>,
  "waterTarget": <liters based on weight>,
  "dailyRoutine": {
    "wakeUp": "${data.wakeTime || '6:30 AM'}",
    "morningRoutine": "<specific 5-min morning routine>",
    "breakfast": "<specific breakfast matching diet type>",
    "midMorning": "<activity or snack>",
    "lunch": "<specific lunch>",
    "afternoon": "<energy management tip>",
    "preWorkout": "<if applicable>",
    "workout": "<specific workout for today>",
    "postWorkout": "<recovery meal/action>",
    "dinner": "<specific dinner>",
    "eveningWindDown": "<specific evening routine>",
    "sleep": "${data.bedTime || '10:30 PM'}"
  },
  "weeklyWorkout": [
    {"day":"Monday","name":"<workout>","exercises":["<ex1>","<ex2>","<ex3>","<ex4>"],"duration":"<X min>","calories":<num>,"intensity":"<Low/Medium/High>"},
    {"day":"Tuesday","name":"<workout>","exercises":["<ex1>","<ex2>","<ex3>"],"duration":"<X min>","calories":<num>,"intensity":"<Low/Medium/High>"},
    {"day":"Wednesday","name":"<workout>","exercises":["<ex1>","<ex2>","<ex3>","<ex4>"],"duration":"<X min>","calories":<num>,"intensity":"<Low/Medium/High>"},
    {"day":"Thursday","name":"<workout>","exercises":["<ex1>","<ex2>"],"duration":"<X min>","calories":<num>,"intensity":"Low"},
    {"day":"Friday","name":"<workout>","exercises":["<ex1>","<ex2>","<ex3>","<ex4>"],"duration":"<X min>","calories":<num>,"intensity":"<Low/Medium/High>"},
    {"day":"Saturday","name":"<workout>","exercises":["<ex1>","<ex2>","<ex3>"],"duration":"<X min>","calories":<num>,"intensity":"<Low/Medium/High>"},
    {"day":"Sunday","name":"Rest & Recovery","exercises":["Light walk","Stretching","Meditation"],"duration":"20 min","calories":80,"intensity":"Low"}
  ],
  "mealPlan": {
    "breakfast": {"name":"<meal name>","items":["<item1>","<item2>","<item3>","<item4>"],"calories":<num>,"protein":<num>},
    "lunch":     {"name":"<meal name>","items":["<item1>","<item2>","<item3>","<item4>"],"calories":<num>,"protein":<num>},
    "dinner":    {"name":"<meal name>","items":["<item1>","<item2>","<item3>","<item4>"],"calories":<num>,"protein":<num>},
    "snacks":    [{"name":"<snack>","calories":<num>,"time":"<time>"},{"name":"<snack>","calories":<num>,"time":"<time>"}]
  },
  "habits": [
    {"name":"<habit>","icon":"💧","time":"<time>","why":"<specific benefit with number>"},
    {"name":"<habit>","icon":"🏃","time":"<time>","why":"<specific benefit>"},
    {"name":"<habit>","icon":"🧘","time":"<time>","why":"<specific benefit>"},
    {"name":"<habit>","icon":"📚","time":"<time>","why":"<specific benefit>"},
    {"name":"<habit>","icon":"😴","time":"<time>","why":"<specific benefit>"}
  ],
  "supplements": [
    {"name":"<supplement>","dose":"<dose>","timing":"<when>","reason":"<why for this person>"}
  ],
  "benefits": [
    {"title":"<benefit>","timeframe":"2 weeks","icon":"⚡","detail":"<specific change>"},
    {"title":"<benefit>","timeframe":"1 month","icon":"💪","detail":"<specific change>"},
    {"title":"<benefit>","timeframe":"3 months","icon":"🏆","detail":"<specific change>"}
  ],
  "milestones": [
    {"month":1,"goal":"<specific measurable goal>","metric":"<how to measure>"},
    {"month":2,"goal":"<specific measurable goal>","metric":"<how to measure>"},
    {"month":3,"goal":"<specific measurable goal>","metric":"<how to measure>"}
  ],
  "focusAreas": ["<area1>","<area2>","<area3>"],
  "avoidList":  ["<avoid1>","<avoid2>","<avoid3>"],
  "motivation": "<personalized motivational message using their name and specific goal>",
  "doctorNote": ${data.medicalConditions && data.medicalConditions !== 'none' ? '"Please consult your doctor before starting this plan given your medical history."' : 'null'}
}`

    try {
      const res  = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:     'jarvis',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const d    = await res.json()
      const text = (d.message || '').replace(/```json|```/g, '').trim()

      // Find JSON in response
      const start = text.indexOf('{')
      const end   = text.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('No JSON in response')

      const parsed: AIPlan = JSON.parse(text.slice(start, end + 1))
      setPlan(parsed)

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          full_name:    data.name,
          fitness_goal: data.primaryGoal,
          diet_type:    data.dietType,
          bio:          `${data.primaryGoal} · ${data.dietType} · ${data.activityLevel}`,
        }).eq('id', user.id)

        // Save health baseline
        await supabase.from('health_logs').upsert({
          user_id:          user.id,
          log_date:         new Date().toISOString().split('T')[0],
          weight_kg:        parseFloat(data.weight) || null,
          sleep_minutes:    parseInt(data.sleepHours) * 60 || null,
          mood:             Math.round(10 - parseInt(data.stressLevel || '5')),
        }, { onConflict: 'user_id,log_date' })

        // Save habits from plan
        if (parsed.habits?.length) {
          const habits = parsed.habits.map(h => ({
            user_id:     user.id,
            name:        h.name,
            icon:        h.icon,
            description: h.why,
            frequency:   'daily',
            is_active:   true,
          }))
          await supabase.from('habits').insert(habits)
        }
      }

      clearInterval(msgTimer)
      setStep(8) // results step

    } catch (err: any) {
      clearInterval(msgTimer)
      console.error('Plan generation error:', err)
      // Use fallback plan
      const fallback = buildFallback(data, calcBMI(), calcTDEE())
      setPlan(fallback)
      setStep(8)
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    if (!canProceed()) { setError('Please fill in all required fields'); return }
    setError('')
    if (step === 6) { generatePlan(); return }
    setStep(p => p + 1)
  }
  const back = () => { setError(''); setStep(p => p - 1) }

  // ── LOADING ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(170,255,0,0.3)}50%{box-shadow:0 0 60px rgba(170,255,0,0.8)}}`}</style>
      <div style={{ textAlign:'center', padding:'24px' }}>
        <div style={{ width:'88px', height:'88px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:'40px', animation:'glow 1.5s ease-in-out infinite' }}>I</div>
        <div style={{ fontSize:'22px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>IRA is building your plan</div>
        <div style={{ fontSize:'14px', color:'#AAFF00', marginBottom:'32px', fontWeight:'600' }}>{loadMsg}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxWidth:'280px', margin:'0 auto' }}>
          {['Health profile analysis','BMI & metabolic calculation','Personalized nutrition','Custom workout program','Daily routine design','Habit system creation','Final optimization'].map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 14px', background:'#111', borderRadius:'20px', border:'1px solid rgba(170,255,0,0.08)', animation:`fadeInUp 0.4s ease ${i*0.15}s both` }}>
              <div style={{ width:'14px', height:'14px', border:'2px solid rgba(170,255,0,0.2)', borderTop:'2px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
              <span style={{ fontSize:'12px', color:'#A1A1AA' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── RESULTS ───────────────────────────────────────────────
  if (step === 8 && plan) return (
    <ResultPage plan={plan} data={data} router={router} supabase={supabase}/>
  )

  // ── STEP WRAPPER ──────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#0A0A0A', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(170,255,0,0.3)}50%{box-shadow:0 0 50px rgba(170,255,0,0.6)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(10,10,10,0.97)', backdropFilter:'blur(20px)', padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {step > 0 && (
              <button onClick={back} style={{ width:'34px', height:'34px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', color:'#666', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
            )}
            <div style={{ fontSize:'13px', color:'#AAFF00', fontWeight:'700' }}>Step {step+1} of {TOTAL}</div>
          </div>
          <div style={{ fontSize:'12px', color:'#3A3A3A' }}>{pct}% complete</div>
        </div>
        <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'2px', overflow:'hidden' }}>
          <div style={{ height:'100%', background:'linear-gradient(90deg,#AAFF00,#22C55E)', width:`${pct}%`, transition:'width 0.5s ease', borderRadius:'2px', boxShadow:'0 0 8px rgba(170,255,0,0.5)' }}/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 140px', maxWidth:'480px', margin:'0 auto', animation:'fadeInUp 0.4s ease both' }}>
        {error && (
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px', fontSize:'13px', color:'#EF4444', display:'flex', alignItems:'center', gap:'8px' }}>
            <span>⚠️</span>{error}
            <button onClick={() => setError('')} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#EF4444', cursor:'pointer' }}>✕</button>
          </div>
        )}

        {/* ── STEP 0 — Personal ── */}
        {step === 0 && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'26px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>Let's start your journey 🧬</div>
              <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.6' }}>IRA needs to understand you to create a truly personalized health plan.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Your Name *</div>
                <input placeholder="e.g. Junaid Shaik" value={data.name} onChange={e => set('name', e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Age *</div>
                <input type="number" min="13" max="100" placeholder="Your age" value={data.age} onChange={e => set('age', e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Gender *</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {[{v:'male',l:'Male',i:'👨'},{v:'female',l:'Female',i:'👩'},{v:'non-binary',l:'Non-binary',i:'🧑'},{v:'prefer-not',l:'Prefer not to say',i:'🤍'}].map(g => (
                    <Opt key={g.v} value={g.v} current={data.gender} onSelect={(v:string)=>set('gender',v)} label={g.l} icon={g.i}/>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 1 — Body Stats ── */}
        {step === 1 && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'26px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>Your body stats 💪</div>
              <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.6' }}>IRA uses this to calculate your exact BMI, TDEE and nutritional needs.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Weight (kg) *</div>
                  <input type="number" placeholder="70" value={data.weight} onChange={e => set('weight', e.target.value)} style={inp}
                    onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Height (cm) *</div>
                  <input type="number" placeholder="175" value={data.height} onChange={e => set('height', e.target.value)} style={inp}
                    onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
              </div>
              {/* Live BMI preview */}
              {data.weight && data.height && (
                <div style={{ background:'rgba(170,255,0,0.06)', border:'1px solid rgba(170,255,0,0.15)', borderRadius:'12px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'24px', fontWeight:'900', color:'#AAFF00' }}>{calcBMI()}</div>
                    <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600' }}>BMI</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff' }}>
                      {calcBMI() < 18.5 ? 'Underweight' : calcBMI() < 25 ? 'Normal weight' : calcBMI() < 30 ? 'Overweight' : 'Obese'}
                    </div>
                    <div style={{ fontSize:'11px', color:'#3A3A3A' }}>TDEE: ~{calcTDEE()} cal/day</div>
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Activity Level *</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    {v:'sedentary',l:'Sedentary',s:'Desk job, little or no exercise',i:'🪑'},
                    {v:'light',l:'Lightly Active',s:'Light exercise 1-3 days/week',i:'🚶'},
                    {v:'moderate',l:'Moderately Active',s:'Moderate exercise 3-5 days/week',i:'🏃'},
                    {v:'very',l:'Very Active',s:'Hard exercise 6-7 days/week',i:'⚡'},
                    {v:'athlete',l:'Athlete',s:'Very hard exercise, physical job',i:'🏆'},
                  ].map(t => <Opt key={t.v} value={t.v} current={data.activityLevel} onSelect={(v:string)=>set('activityLevel',v)} label={t.l} sub={t.s} icon={t.i}/>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Body Type</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {[{v:'ectomorph',l:'Ectomorph',i:'🏃',s:'Lean, hard to gain'},{v:'mesomorph',l:'Mesomorph',i:'💪',s:'Athletic, gains easily'},{v:'endomorph',l:'Endomorph',i:'🏋️',s:'Larger, stores fat'},{v:'mixed',l:'Mixed',i:'⚖️',s:'Combination'}].map(t => (
                    <Opt key={t.v} value={t.v} current={data.bodyType} onSelect={(v:string)=>set('bodyType',v)} label={t.l} sub={t.s} icon={t.i}/>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2 — Lifestyle ── */}
        {step === 2 && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'26px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>Your lifestyle 🌍</div>
              <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.6' }}>Understanding your daily life creates a realistic, sustainable plan.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Occupation *</div>
                <input placeholder="e.g. Software Engineer, Teacher, Student" value={data.occupation} onChange={e => set('occupation', e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Daily Work Hours</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                  {[{v:'4',l:'<4h'},{v:'6',l:'6h'},{v:'8',l:'8h'},{v:'10+',l:'10h+'}].map(h => (
                    <Opt key={h.v} value={h.v} current={data.workHours} onSelect={(v:string)=>set('workHours',v)} label={h.l}/>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Smoking *</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                  {[{v:'never',l:'Never',i:'✅'},{v:'quit',l:'Quit',i:'🚭'},{v:'social',l:'Social',i:'🤝'},{v:'daily',l:'Daily',i:'🚬'}].map(s => (
                    <Opt key={s.v} value={s.v} current={data.smokingStatus} onSelect={(v:string)=>set('smokingStatus',v)} label={s.l} icon={s.i}/>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Alcohol *</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                  {[{v:'never',l:'Never',i:'✅'},{v:'rarely',l:'Rarely',i:'🥂'},{v:'weekly',l:'Weekly',i:'🍷'},{v:'daily',l:'Daily',i:'🍺'}].map(a => (
                    <Opt key={a.v} value={a.v} current={data.alcoholStatus} onSelect={(v:string)=>set('alcoholStatus',v)} label={a.l} icon={a.i}/>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3 — Goals ── */}
        {step === 3 && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'26px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>Your goals 🎯</div>
              <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.6' }}>IRA builds your entire plan around your primary objective.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Primary Goal *</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    {v:'weight_loss',l:'Lose Weight',s:'Reduce body fat and reach healthy BMI',i:'⚡'},
                    {v:'muscle_gain',l:'Build Muscle',s:'Increase strength and muscle mass',i:'💪'},
                    {v:'endurance',l:'Improve Endurance',s:'Build cardiovascular fitness and stamina',i:'🏃'},
                    {v:'flexibility',l:'Flexibility & Mobility',s:'Improve range of motion, reduce pain',i:'🧘'},
                    {v:'general_health',l:'General Wellness',s:'Improve overall energy and wellbeing',i:'❤️'},
                    {v:'stress_management',l:'Stress & Mental Health',s:'Better mental health, work-life balance',i:'🧠'},
                    {v:'sports_performance',l:'Sports Performance',s:'Train for specific sport or competition',i:'🏆'},
                  ].map(g => <Opt key={g.v} value={g.v} current={data.primaryGoal} onSelect={(v:string)=>set('primaryGoal',v)} label={g.l} sub={g.s} icon={g.i}/>)}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Target Weight (kg)</div>
                  <input type="number" placeholder="65" value={data.targetWeight} onChange={e => set('targetWeight', e.target.value)} style={inp}
                    onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Timeframe *</div>
                  <select value={data.timeframe} onChange={e => set('timeframe', e.target.value)} style={inp}>
                    <option value="">Select...</option>
                    <option value="1 month">1 Month</option>
                    <option value="3 months">3 Months</option>
                    <option value="6 months">6 Months</option>
                    <option value="1 year">1 Year</option>
                    <option value="ongoing">Ongoing lifestyle</option>
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>What motivates you most?</div>
                <textarea placeholder="e.g. I want to have more energy for my family..." value={data.motivation} onChange={e => set('motivation', e.target.value)} rows={3} style={{ ...inp, resize:'none' }}
                  onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 4 — Diet ── */}
        {step === 4 && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'26px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>Nutrition preferences 🥗</div>
              <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.6' }}>IRA creates a meal plan perfectly matched to your dietary needs.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Diet Type *</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    {v:'omnivore',l:'Omnivore',s:'Eat everything — meat, fish, dairy, vegetables',i:'🍽️'},
                    {v:'vegetarian',l:'Vegetarian',s:'No meat but eat dairy and eggs',i:'🥗'},
                    {v:'vegan',l:'Vegan',s:'100% plant-based',i:'🌱'},
                    {v:'keto',l:'Ketogenic',s:'High fat, very low carbs',i:'🥩'},
                    {v:'mediterranean',l:'Mediterranean',s:'Fish, olive oil, whole grains, vegetables',i:'🫒'},
                    {v:'indian_veg',l:'Indian Vegetarian',s:'Indian cuisine based plant diet',i:'🍛'},
                    {v:'intermittent_fasting',l:'Intermittent Fasting',s:'Time-restricted eating window',i:'⏰'},
                    {v:'paleo',l:'Paleo',s:'Whole foods, no processed grains or dairy',i:'🦴'},
                  ].map(d => <Opt key={d.v} value={d.v} current={data.dietType} onSelect={(v:string)=>set('dietType',v)} label={d.l} sub={d.s} icon={d.i}/>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Food Allergies / Intolerances</div>
                <input placeholder="e.g. Lactose, Gluten, Nuts — or type None" value={data.foodAllergies} onChange={e => set('foodAllergies', e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Meals Per Day *</div>
                  <select value={data.mealsPerDay} onChange={e => set('mealsPerDay', e.target.value)} style={inp}>
                    <option value="">Select...</option>
                    <option value="2">2 meals</option>
                    <option value="3">3 meals</option>
                    <option value="4">4 meals</option>
                    <option value="5">5+ meals</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Daily Water (L)</div>
                  <select value={data.waterIntake} onChange={e => set('waterIntake', e.target.value)} style={inp}>
                    <option value="">Select...</option>
                    <option value="1">Less than 1L</option>
                    <option value="1.5">1 to 1.5L</option>
                    <option value="2">2L</option>
                    <option value="3">3L or more</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 5 — Sleep ── */}
        {step === 5 && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'26px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>Sleep patterns 😴</div>
              <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.6' }}>Sleep is the foundation of health. IRA will optimize your recovery schedule.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Wake Up Time</div>
                  <input type="time" value={data.wakeTime} onChange={e => set('wakeTime', e.target.value)} style={inp}/>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Bed Time</div>
                  <input type="time" value={data.bedTime} onChange={e => set('bedTime', e.target.value)} style={inp}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Average Sleep Hours *</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px' }}>
                  {[{v:'4',l:'4h',i:'😫'},{v:'5',l:'5h',i:'😴'},{v:'6',l:'6h',i:'😪'},{v:'7',l:'7h',i:'🙂'},{v:'8',l:'8h',i:'😊'},{v:'9',l:'9h+',i:'💤'}].map(s => (
                    <Opt key={s.v} value={s.v} current={data.sleepHours} onSelect={(v:string)=>set('sleepHours',v)} label={s.l} icon={s.i}/>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Sleep Quality *</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    {v:'poor',l:'Poor',s:'Wake up often, feel exhausted all day',i:'😫'},
                    {v:'fair',l:'Fair',s:'Sometimes wake up, moderate rest',i:'😐'},
                    {v:'good',l:'Good',s:'Mostly uninterrupted, feel okay',i:'😊'},
                    {v:'excellent',l:'Excellent',s:'Deep, refreshing sleep every night',i:'🌟'},
                  ].map(q => <Opt key={q.v} value={q.v} current={data.sleepQuality} onSelect={(v:string)=>set('sleepQuality',v)} label={q.l} sub={q.s} icon={q.i}/>)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 6 — Stress & Exercise ── */}
        {step === 6 && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <div style={{ fontSize:'26px', fontWeight:'900', color:'#fff', marginBottom:'8px' }}>Stress & fitness 🧠</div>
              <div style={{ fontSize:'14px', color:'#52525B', lineHeight:'1.6' }}>Last step — IRA will balance your plan for stress management and recovery.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Daily Stress Level *</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'6px', marginBottom:'6px' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => set('stressLevel', String(n))}
                      style={{ padding:'12px 4px', borderRadius:'12px', border:`1.5px solid ${data.stressLevel===String(n)?'#AAFF00':'rgba(255,255,255,0.07)'}`, background:data.stressLevel===String(n)?'rgba(170,255,0,0.08)':'#111', color:data.stressLevel===String(n)?'#AAFF00':'#fff', fontSize:'15px', fontWeight:'800', cursor:'pointer', transition:'all 0.2s' }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'11px', color:'#22C55E' }}>😊 Very calm</span>
                  <span style={{ fontSize:'11px', color:'#EF4444' }}>😰 Extremely stressed</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Current Exercise *</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    {v:'none',l:'No Exercise',s:'Currently not exercising at all',i:'🪑'},
                    {v:'walking',l:'Walking Only',s:'Regular walks, nothing intense',i:'🚶'},
                    {v:'gym',l:'Gym Training',s:'Weight training and cardio',i:'🏋️'},
                    {v:'sports',l:'Sports',s:'Playing team or individual sports',i:'⚽'},
                    {v:'yoga_pilates',l:'Yoga / Pilates',s:'Mind-body exercise practice',i:'🧘'},
                    {v:'mixed',l:'Mixed Training',s:'Combination of multiple activities',i:'💪'},
                  ].map(e => <Opt key={e.v} value={e.v} current={data.currentExercise} onSelect={(v:string)=>set('currentExercise',v)} label={e.l} sub={e.s} icon={e.i}/>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Exercise Frequency</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                  {[{v:'0',l:'Never'},{v:'1-2',l:'1-2x/wk'},{v:'3-4',l:'3-4x/wk'},{v:'5+',l:'5+x/wk'}].map(f => (
                    <Opt key={f.v} value={f.v} current={data.exerciseFrequency} onSelect={(v:string)=>set('exerciseFrequency',v)} label={f.l}/>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Medical Conditions</div>
                <input placeholder="e.g. Diabetes, Hypertension, Back pain — or None" value={data.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Current Medications</div>
                <input placeholder="e.g. Metformin, Blood pressure meds — or None" value={data.medications} onChange={e => set('medications', e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              {/* Safety note */}
              <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'12px', padding:'12px 14px', fontSize:'12px', color:'#52525B', lineHeight:'1.5' }}>
                🔒 Your health information is used only to personalize your plan. IRA does not diagnose conditions. Always consult a doctor for medical concerns.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'16px 20px 32px', background:'rgba(10,10,10,0.97)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={next} disabled={!canProceed()}
          style={{ width:'100%', background:canProceed()?'#AAFF00':'#1A1A1A', color:canProceed()?'#000':'#3A3A3A', border:'none', borderRadius:'16px', padding:'16px', fontSize:'16px', fontWeight:'900', cursor:canProceed()?'pointer':'not-allowed', boxShadow:canProceed()?'0 0 30px rgba(170,255,0,0.4)':'none', transition:'all 0.3s', animation:canProceed()?'glow 2s ease-in-out infinite':'none' }}>
          {step === 6 ? '✨ Generate My AI Health Plan' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

// ── Results Page ──────────────────────────────────────────────
function ResultPage({ plan, data, router, supabase }: { plan: AIPlan; data: AssessmentData; router: any; supabase: any }) {
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const saveAndGo = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Save goals from plan
        const goals = [
          { user_id:user.id, title:`Reach ${data.targetWeight}kg`, category:'health', icon:'⚖️', target_value:parseFloat(data.targetWeight)||70, current_value:parseFloat(data.weight)||70, unit:'kg', status:'active' },
          { user_id:user.id, title:'Hit 10,000 daily steps', category:'fitness', icon:'👟', target_value:10000, current_value:0, unit:'steps', status:'active' },
          { user_id:user.id, title:`Sleep ${data.sleepHours || 8} hours nightly`, category:'health', icon:'😴', target_value:parseFloat(data.sleepHours||'8'), current_value:parseFloat(data.sleepHours||'6'), unit:'hours', status:'active' },
        ]
        await supabase.from('goals').insert(goals)
      }
    } catch {}
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push('/dashboard'), 1000)
  }

  const scoreColor = plan.healthScore >= 70 ? '#AAFF00' : plan.healthScore >= 50 ? '#F97316' : '#EF4444'
  const intensityColor = (i: string) => i === 'High' ? '#EF4444' : i === 'Medium' ? '#F97316' : '#22C55E'

  return (
    <div style={{ minHeight:'100vh', background:'#080808', fontFamily:'Inter,sans-serif', paddingBottom:'40px' }}>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} *::-webkit-scrollbar{display:none}`}</style>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.08),rgba(34,197,94,0.04))', borderBottom:'1px solid rgba(170,255,0,0.12)', padding:'48px 20px 28px', textAlign:'center' }}>
        <div style={{ fontSize:'44px', marginBottom:'12px', animation:'fadeInUp 0.5s ease both' }}>🎉</div>
        <div style={{ fontSize:'24px', fontWeight:'900', color:'#fff', marginBottom:'6px', animation:'fadeInUp 0.5s ease 0.1s both' }}>Your AI Health Plan is Ready!</div>
        <div style={{ fontSize:'14px', color:'#AAFF00', fontWeight:'600', animation:'fadeInUp 0.5s ease 0.2s both' }}>
          Personalized for {data.name} · {data.primaryGoal?.replace(/_/g,' ')} · {data.timeframe}
        </div>
      </div>

      <div style={{ padding:'16px 20px', maxWidth:'480px', margin:'0 auto' }}>

        {/* Doctor note */}
        {plan.doctorNote && (
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'16px', padding:'14px 16px', marginBottom:'14px', display:'flex', gap:'10px', animation:'fadeInUp 0.4s ease both' }}>
            <span style={{ fontSize:'20px', flexShrink:0 }}>⚕️</span>
            <div style={{ fontSize:'13px', color:'#EF4444', lineHeight:'1.5' }}>{plan.doctorNote}</div>
          </div>
        )}

        {/* Health Score */}
        <div style={{ background:'#111', border:`1px solid ${scoreColor}20`, borderRadius:'24px', padding:'24px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.1s both', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-50px', right:'-50px', width:'180px', height:'180px', borderRadius:'50%', background:`radial-gradient(circle,${scoreColor}08,transparent)` }}/>
          <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'12px' }}>YOUR HEALTH SCORE</div>
          <div style={{ position:'relative', width:'130px', height:'130px', margin:'0 auto 16px' }}>
            <svg width="130" height="130" style={{ transform:'rotate(-90deg)' }}>
              <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={scoreColor}/><stop offset="100%" stopColor="#22C55E"/></linearGradient></defs>
              <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
              <circle cx="65" cy="65" r="56" fill="none" stroke={`url(#hg)`} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2*Math.PI*56}`} strokeDashoffset={`${2*Math.PI*56*(1-plan.healthScore/100)}`}
                style={{ filter:`drop-shadow(0 0 8px ${scoreColor}80)`, transition:'stroke-dashoffset 2s ease' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontSize:'38px', fontWeight:'900', color:scoreColor, lineHeight:1 }}>{plan.healthScore}</div>
              <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600' }}>/ 100</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
            {[
              { l:'BMI',        v:plan.bmi,            s:plan.bmiCategory,  c:'#AAFF00' },
              { l:'Met. Age',   v:plan.metabolicAge,   s:'years',           c:'#3B82F6' },
              { l:'Daily Cal',  v:plan.dailyCalories,  s:'kcal',            c:'#F97316' },
              { l:'Protein',    v:`${plan.proteinTarget}g`, s:'target',     c:'#8B5CF6' },
            ].map(s => (
              <div key={s.l} style={{ background:'#0D0D0D', borderRadius:'12px', padding:'10px 6px', textAlign:'center', border:`1px solid ${s.c}15` }}>
                <div style={{ fontSize:'16px', fontWeight:'800', color:s.c }}>{s.v}</div>
                <div style={{ fontSize:'8px', color:'#3A3A3A', fontWeight:'600', textTransform:'uppercase', marginTop:'2px' }}>{s.l}</div>
                <div style={{ fontSize:'8px', color:s.c, marginTop:'1px' }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* IRA Summary */}
        <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.06),rgba(34,197,94,0.02))', border:'1px solid rgba(170,255,0,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.15s both' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:'900', color:'#000' }}>I</div>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>IRA Analysis</div>
              <div style={{ fontSize:'10px', color:'#AAFF00' }}>Personalized for {data.name}</div>
            </div>
          </div>
          <div style={{ fontSize:'14px', color:'#C0C0C0', lineHeight:'1.8' }}>{plan.summary}</div>
        </div>

        {/* Key Insights */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.2s both' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>🔍 Key Health Insights</div>
          {plan.keyInsights?.map((ins, i) => (
            <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'10px 12px', background:'#0D0D0D', borderRadius:'12px', marginBottom:'8px' }}>
              <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'rgba(170,255,0,0.12)', border:'1px solid rgba(170,255,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'900', color:'#AAFF00', flexShrink:0, marginTop:'1px' }}>{i+1}</div>
              <div style={{ fontSize:'13px', color:'#A1A1AA', lineHeight:'1.5' }}>{ins}</div>
            </div>
          ))}
        </div>

        {/* Daily Routine */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.25s both' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>📅 Your Daily Routine</div>
          {plan.dailyRoutine && Object.entries(plan.dailyRoutine).map(([key, val], i) => {
            const icons: Record<string,string> = { wakeUp:'☀️', morningRoutine:'🌅', breakfast:'🍳', midMorning:'⚡', lunch:'☀️', afternoon:'💼', preWorkout:'⚡', workout:'💪', postWorkout:'🥤', dinner:'🌙', eveningWindDown:'🌙', sleep:'😴' }
            const colors = ['#AAFF00','#F97316','#22C55E','#3B82F6','#8B5CF6','#EAB308','#00CFFF','#EF4444','#22C55E','#8B5CF6','#3B82F6','#AAFF00']
            return (
              <div key={key} style={{ display:'flex', gap:'12px', padding:'10px', background:'#0D0D0D', borderRadius:'12px', marginBottom:'8px', border:`1px solid ${colors[i%colors.length]}10` }}>
                <span style={{ fontSize:'18px', flexShrink:0 }}>{icons[key]||'⏰'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'10px', color:colors[i%colors.length], fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'2px' }}>
                    {key.replace(/([A-Z])/g,' $1').trim()}
                  </div>
                  <div style={{ fontSize:'13px', color:'#fff', lineHeight:'1.4' }}>{val as string}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Weekly Workout */}
        <div style={{ background:'#111', border:'1px solid rgba(249,115,22,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.3s both' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>💪 Weekly Workout Plan</div>
          {plan.weeklyWorkout?.map((day, i) => (
            <div key={i} style={{ background:'#0D0D0D', borderRadius:'14px', padding:'14px', marginBottom:'8px', border:'1px solid rgba(249,115,22,0.08)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                <div style={{ fontSize:'13px', fontWeight:'800', color:'#F97316' }}>{day.day}</div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <div style={{ fontSize:'9px', color:intensityColor(day.intensity), background:`${intensityColor(day.intensity)}12`, padding:'2px 8px', borderRadius:'20px', fontWeight:'700' }}>{day.intensity}</div>
                  <div style={{ fontSize:'9px', color:'#3A3A3A', background:'rgba(255,255,255,0.04)', padding:'2px 8px', borderRadius:'20px' }}>⏱️{day.duration}</div>
                  <div style={{ fontSize:'9px', color:'#F97316', background:'rgba(249,115,22,0.08)', padding:'2px 8px', borderRadius:'20px' }}>🔥{day.calories}kcal</div>
                </div>
              </div>
              <div style={{ fontSize:'14px', fontWeight:'600', color:'#fff', marginBottom:'6px' }}>{day.name}</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {day.exercises?.map((ex: string, j: number) => (
                  <div key={j} style={{ fontSize:'11px', color:'#A1A1AA', background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:'8px' }}>{ex}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Meal Plan */}
        <div style={{ background:'#111', border:'1px solid rgba(34,197,94,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.35s both' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>🥗 Personalized Meal Plan</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'14px' }}>
            {[
              { l:'Calories',v:plan.dailyCalories,c:'#AAFF00' },
              { l:'Protein', v:`${plan.proteinTarget}g`,c:'#22C55E' },
              { l:'Water',   v:`${plan.waterTarget}L`,c:'#3B82F6' },
            ].map(m => (
              <div key={m.l} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:'16px', fontWeight:'800', color:m.c }}>{m.v}</div>
                <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px' }}>{m.l}</div>
              </div>
            ))}
          </div>
          {['breakfast','lunch','dinner'].map(meal => {
            const m = plan.mealPlan?.[meal as keyof typeof plan.mealPlan] as any
            if (!m || !m.name) return null
            const colors: Record<string,string> = { breakfast:'#FBBF24', lunch:'#22C55E', dinner:'#6366F1' }
            const icons:  Record<string,string>  = { breakfast:'🌅', lunch:'☀️', dinner:'🌙' }
            return (
              <div key={meal} style={{ background:'#0D0D0D', borderRadius:'14px', padding:'14px', marginBottom:'8px', border:`1px solid ${colors[meal]}15` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'18px' }}>{icons[meal]}</span>
                    <div style={{ fontSize:'13px', fontWeight:'700', color:colors[meal], textTransform:'capitalize' }}>{meal}</div>
                  </div>
                  <div style={{ fontSize:'12px', color:colors[meal], fontWeight:'700' }}>{m.calories} kcal · {m.protein}g protein</div>
                </div>
                <div style={{ fontSize:'14px', fontWeight:'600', color:'#fff', marginBottom:'6px' }}>{m.name}</div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {m.items?.map((item: string, i: number) => (
                    <div key={i} style={{ fontSize:'11px', color:'#A1A1AA', background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:'8px' }}>{item}</div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Habits */}
        <div style={{ background:'#111', border:'1px solid rgba(234,179,8,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.4s both' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>✅ Daily Habits — Auto-Added to Your App</div>
          {plan.habits?.map((h, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'#0D0D0D', borderRadius:'14px', marginBottom:'8px', border:'1px solid rgba(234,179,8,0.08)' }}>
              <span style={{ fontSize:'22px' }}>{h.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:'600', color:'#fff' }}>{h.name}</div>
                <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'2px' }}>{h.time} · {h.why}</div>
              </div>
              <div style={{ fontSize:'9px', color:'#EAB308', fontWeight:'700', background:'rgba(234,179,8,0.1)', padding:'3px 8px', borderRadius:'20px' }}>DAILY</div>
            </div>
          ))}
        </div>

        {/* Benefits Timeline */}
        <div style={{ background:'#111', border:'1px solid rgba(139,92,246,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.45s both' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>🏆 What You Will Gain</div>
          {plan.benefits?.map((b, i) => (
            <div key={i} style={{ display:'flex', gap:'14px', padding:'14px', background:'#0D0D0D', borderRadius:'14px', marginBottom:'8px', border:'1px solid rgba(139,92,246,0.08)' }}>
              <span style={{ fontSize:'28px', flexShrink:0 }}>{b.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>{b.title}</div>
                  <div style={{ fontSize:'9px', color:'#8B5CF6', fontWeight:'700', background:'rgba(139,92,246,0.1)', padding:'2px 8px', borderRadius:'20px' }}>In {b.timeframe}</div>
                </div>
                <div style={{ fontSize:'12px', color:'#A1A1AA', lineHeight:'1.5' }}>{b.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly Milestones */}
        <div style={{ background:'#111', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.5s both' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>📈 Monthly Milestones</div>
          {plan.milestones?.map((m, i) => (
            <div key={i} style={{ display:'flex', gap:'12px', padding:'12px', background:'#0D0D0D', borderRadius:'12px', marginBottom:'8px' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'800', color:'#3B82F6', flexShrink:0 }}>M{m.month}</div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff', marginBottom:'2px' }}>{m.goal}</div>
                <div style={{ fontSize:'11px', color:'#3A3A3A' }}>Measure: {m.metric}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Things to avoid */}
        {plan.avoidList?.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.12)', borderRadius:'20px', padding:'18px', marginBottom:'14px', animation:'fadeInUp 0.5s ease 0.52s both' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#EF4444', marginBottom:'12px' }}>🚫 Things to Avoid</div>
            {plan.avoidList.map((a, i) => (
              <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', padding:'8px 12px', background:'#0D0D0D', borderRadius:'10px', marginBottom:'6px' }}>
                <span style={{ color:'#EF4444', fontWeight:'700', flexShrink:0 }}>✗</span>
                <span style={{ fontSize:'13px', color:'#A1A1AA' }}>{a}</span>
              </div>
            ))}
          </div>
        )}

        {/* Motivational message */}
        <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.08),rgba(34,197,94,0.04))', border:'1px solid rgba(170,255,0,0.2)', borderRadius:'20px', padding:'20px', marginBottom:'20px', textAlign:'center', animation:'fadeInUp 0.5s ease 0.55s both' }}>
          <div style={{ fontSize:'32px', marginBottom:'12px' }}>✨</div>
          <div style={{ fontSize:'14px', color:'#A1A1AA', lineHeight:'1.8', fontStyle:'italic' }}>"{plan.motivation}"</div>
          <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'700', marginTop:'10px' }}>— IRA, Your AI Health Coach</div>
        </div>

        {/* CTAs */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <button onClick={saveAndGo} disabled={saving}
            style={{ width:'100%', background:'#AAFF00', color:'#000', border:'none', borderRadius:'16px', padding:'16px', fontSize:'16px', fontWeight:'900', cursor:'pointer', boxShadow:'0 0 30px rgba(170,255,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
            {saving ? '⏳ Saving...' : saved ? '✓ Saved!' : '🚀 Start My Journey'}
          </button>
          <button onClick={() => router.push('/jarvis')}
            style={{ width:'100%', background:'transparent', color:'#AAFF00', border:'1px solid rgba(170,255,0,0.3)', borderRadius:'16px', padding:'14px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
            Talk to IRA About My Plan
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ width:'100%', background:'transparent', color:'#52525B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'14px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fallback plan when AI unavailable ────────────────────────
function buildFallback(data: AssessmentData, bmi: number, tdee: number): AIPlan {
  const isWeightLoss = data.primaryGoal === 'weight_loss'
  const isMuscle     = data.primaryGoal === 'muscle_gain'
  const dailyCal     = isWeightLoss ? tdee - 400 : isMuscle ? tdee + 300 : tdee
  const protein      = Math.round((parseFloat(data.weight)||70) * (isMuscle ? 2.2 : 1.8))

  return {
    healthScore:   Math.min(95, Math.max(30, 100 - Math.abs(bmi-22)*3 - (parseInt(data.stressLevel)||5)*2 + (data.sleepHours==='8'?10:0))),
    bmi, bmiCategory: bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obese',
    metabolicAge:  Math.max(18, (parseInt(data.age)||25) - (data.activityLevel==='very'||data.activityLevel==='athlete'?5:0)),
    tdee, summary: `${data.name}, based on your profile as a ${data.age}-year-old ${data.gender} aiming for ${(data.primaryGoal||'general health').replace(/_/g,' ')}, IRA has created a comprehensive plan combining ${data.dietType} nutrition with ${data.activityLevel} training intensity. Your ${data.timeframe} journey starts today.`,
    keyInsights: [
      `Your BMI of ${bmi} indicates ${bmi<18.5?'you are underweight — focus on healthy weight gain':bmi<25?'healthy weight — focus on body composition':bmi<30?'overweight — a 400 calorie deficit will create 0.5kg weekly loss':'obesity — medical consultation recommended alongside this plan'}`,
      `Your TDEE is ${tdee} calories — ${isWeightLoss?`eat ${dailyCal} daily to lose ~0.5kg/week`:isMuscle?`eat ${dailyCal} daily to gain lean muscle`:' match this to maintain your current weight'}`,
      `As a ${data.activityLevel} individual, ${data.activityLevel==='sedentary'?'adding 30 min daily walking reduces mortality risk by 35%':'your activity level is excellent — focus on recovery quality'}`,
      `${data.sleepHours==='7'||data.sleepHours==='8'?'Your sleep is optimal — protect this as your primary recovery tool':'Improving sleep to 7-8 hours will accelerate your results by up to 40%'}`,
    ],
    warnings:       [],
    dailyCalories:  dailyCal,
    proteinTarget:  protein,
    waterTarget:    parseFloat((parseFloat(data.weight||'70') * 0.035).toFixed(1)),
    dailyRoutine: {
      wakeUp:          data.wakeTime || '6:30 AM',
      morningRoutine:  'Drink 500ml water, 5 min stretching, set daily intentions',
      breakfast:       `High-protein ${data.dietType} breakfast within 60 minutes of waking`,
      midMorning:      'Light movement break, herbal tea',
      lunch:           'Balanced meal with protein, complex carbs and vegetables',
      afternoon:       '10-minute walk, manage energy dip with water not caffeine',
      preWorkout:      'Light snack 90 minutes before training',
      workout:         `${isWeightLoss?'45 min HIIT + strength':isMuscle?'60 min progressive strength':'45 min mixed training'}`,
      postWorkout:     'Protein meal within 30 minutes',
      dinner:          'Protein-rich dinner, light on carbohydrates',
      eveningWindDown: 'Screen-free wind down, journaling, stretching',
      sleep:           data.bedTime || '10:30 PM',
    },
    weeklyWorkout: [
      {day:'Monday',   name:'Upper Body Strength',    exercises:['Push-ups 3×15','Pull-ups 3×10','Shoulder press 3×12','Bicep curls 3×15'],          duration:'45 min',calories:320,intensity:'Medium'},
      {day:'Tuesday',  name:'Cardio & Core',          exercises:['30 min brisk walk','Plank 3×45s','Mountain climbers 3×30s','Crunches 3×20'],        duration:'40 min',calories:350,intensity:'Medium'},
      {day:'Wednesday',name:'Lower Body Power',       exercises:['Squats 4×15','Lunges 3×12 each','Glute bridges 3×20','Calf raises 4×20'],           duration:'50 min',calories:420,intensity:'High'},
      {day:'Thursday', name:'Active Recovery',        exercises:['20 min gentle walk','Full body stretching','Foam rolling','Deep breathing'],         duration:'30 min',calories:120,intensity:'Low'},
      {day:'Friday',   name:'Full Body HIIT',         exercises:['Burpees 3×10','Jump squats 3×15','Push-up variations 3×12','High knees 3×30s'],     duration:'40 min',calories:480,intensity:'High'},
      {day:'Saturday', name:'Outdoor Activity',       exercises:['45 min walk or jog','Bodyweight circuit','Sports or recreation'],                    duration:'60 min',calories:400,intensity:'Medium'},
      {day:'Sunday',   name:'Rest & Recovery',        exercises:['Gentle walk','Full body stretch','Meditation 10 min'],                               duration:'20 min',calories:80,intensity:'Low'},
    ],
    mealPlan: {
      breakfast: {name:'Power Breakfast Bowl',    items:['4 egg whites + 1 whole egg',`${data.dietType==='vegan'?'Oat milk smoothie':'Greek yogurt 150g'}`,'Rolled oats 60g','Mixed berries 100g'],    calories:Math.round(dailyCal*0.25),protein:Math.round(protein*0.3)},
      lunch:     {name:'Performance Lunch Plate', items:[`${data.dietType==='vegan'?'Chickpeas 150g':'Grilled chicken 180g'}`,'Brown rice 150g','Roasted vegetables 200g','Olive oil 1 tbsp'],           calories:Math.round(dailyCal*0.32),protein:Math.round(protein*0.35)},
      dinner:    {name:'Recovery Dinner',         items:[`${data.dietType==='vegan'?'Lentil curry':'Baked salmon 160g'}`,'Sweet potato 200g','Steamed broccoli 200g','Lemon herb dressing'],            calories:Math.round(dailyCal*0.28),protein:Math.round(protein*0.3)},
      snacks:    [{name:`${data.dietType==='vegan'?'Almond butter on rice cake':'Greek yogurt + nuts'}`,calories:Math.round(dailyCal*0.08),time:'3:30 PM'},{name:'Protein shake or warm milk',calories:Math.round(dailyCal*0.07),time:'9:00 PM'}],
    },
    habits: [
      {name:'Morning Hydration',  icon:'💧',time:data.wakeTime||'6:30 AM', why:'Drinking 500ml water on waking kickstarts metabolism by 24% for 60 minutes'},
      {name:'Daily Movement',     icon:'🏃',time:'7:00 AM',                 why:'Morning movement raises cortisol naturally, improving alertness and mood all day'},
      {name:'Mindful Eating',     icon:'🥗',time:'Each meal',               why:'Eating slowly increases satiety hormones reducing caloric intake by 15%'},
      {name:'Evening Meditation', icon:'🧘',time:'9:00 PM',                 why:'10 min meditation reduces cortisol by 23% and improves sleep quality significantly'},
      {name:'Sleep Consistency',  icon:'😴',time:data.bedTime||'10:30 PM',  why:'Same bedtime daily anchors circadian rhythm improving deep sleep by 40%'},
    ],
    supplements: [
      {name:'Vitamin D3',           dose:'2000 IU',  timing:'With breakfast',    reason:'Most people are deficient, critical for immunity and mood'},
      {name:'Omega-3 Fish Oil',     dose:'2g EPA+DHA',timing:'With lunch',       reason:'Reduces inflammation, supports cardiovascular and brain health'},
      {name:'Magnesium Glycinate',  dose:'400mg',    timing:'30 min before bed', reason:'Improves sleep quality and muscle recovery'},
    ],
    benefits: [
      {title:'Energy Boost',        timeframe:'1-2 weeks', icon:'⚡', detail:'Consistent sleep and nutrition dramatically increase daily energy levels'},
      {title:'Body Composition',    timeframe:'4-6 weeks', icon:'💪', detail:'Visible changes in muscle tone and body fat percentage'},
      {title:'Peak Performance',    timeframe:'3 months',  icon:'🏆', detail:'Major improvement in all health markers, fitness and mental clarity'},
    ],
    milestones: [
      {month:1, goal:'Establish all 5 daily habits consistently',    metric:'Habit completion rate >80%'},
      {month:2, goal:`${isWeightLoss?'Lose 3-4kg':'Gain 1-2kg lean muscle'}`,                              metric:`${isWeightLoss?'Weekly weigh-in':'Strength increase in key lifts'}`},
      {month:3, goal:'Transform energy, sleep and body composition', metric:'Health score improvement >20 points'},
    ],
    focusAreas: [isWeightLoss?'Caloric deficit':'Caloric surplus', 'Progressive overload', 'Sleep optimization'],
    avoidList:  [isWeightLoss?'Ultra-processed foods and sugary drinks':'Skipping meals or eating below TDEE', 'Training without adequate recovery', 'Comparing progress to others — focus on your own journey'],
    motivation: `${data.name}, you have taken the most important step today — the decision to invest in yourself. Your body is capable of extraordinary transformation when given the right inputs consistently. Every great physique, every athletic achievement, every health transformation started with exactly this moment. IRA will be with you every step of this journey. The person you want to become is already inside you — we are simply going to reveal them together.`,
    doctorNote: data.medicalConditions && data.medicalConditions !== 'none' && data.medicalConditions !== '' ? 'Please consult your doctor before starting this plan given your medical history.' : null,
  }
}