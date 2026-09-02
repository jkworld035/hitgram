'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Exercise {
  name: string
  sets: number
  reps: string
  rest: number
  muscle: string
  difficulty: string
  calories: number
  instruction: string
}

interface Workout {
  id: string
  name: string
  type: string
  duration_minutes: number
  calories_burned: number
  exercises: Exercise[]
  completed: boolean
  workout_date: string
}

const WORKOUT_PLANS: { id: string; name: string; icon: string; color: string; duration: number; calories: number; difficulty: string; desc: string; exercises: Exercise[] }[] = [
  {
    id: 'hiit',
    name: 'HIIT Blast',
    icon: '🔥',
    color: '#EF4444',
    duration: 25,
    calories: 320,
    difficulty: 'High',
    desc: 'High intensity interval training to maximize fat burn',
    exercises: [
      { name:'Jumping Jacks',    sets:3, reps:'45 sec', rest:15, muscle:'Full Body', difficulty:'Easy',   calories:15, instruction:'Jump feet wide while raising arms overhead, return to start' },
      { name:'Burpees',          sets:3, reps:'10 reps', rest:30, muscle:'Full Body', difficulty:'Hard',   calories:25, instruction:'Drop to pushup, jump feet to hands, explode upward' },
      { name:'High Knees',       sets:3, reps:'45 sec', rest:15, muscle:'Legs/Core', difficulty:'Medium', calories:18, instruction:'Run in place driving knees above hip level' },
      { name:'Mountain Climbers',sets:3, reps:'40 sec', rest:20, muscle:'Core',      difficulty:'Medium', calories:16, instruction:'In plank position, drive knees to chest alternately' },
      { name:'Jump Squats',      sets:3, reps:'12 reps',rest:30, muscle:'Legs',      difficulty:'Hard',   calories:20, instruction:'Squat deep then explode up, land softly' },
      { name:'Push-ups',         sets:3, reps:'15 reps',rest:30, muscle:'Chest',     difficulty:'Medium', calories:12, instruction:'Lower chest to floor keeping body straight, push back up' },
    ]
  },
  {
    id: 'strength',
    name: 'Strength Builder',
    icon: '💪',
    color: '#F97316',
    duration: 45,
    calories: 380,
    difficulty: 'Medium',
    desc: 'Progressive overload strength training for muscle growth',
    exercises: [
      { name:'Squats',            sets:4, reps:'12 reps',rest:60, muscle:'Quads/Glutes', difficulty:'Medium', calories:20, instruction:'Feet shoulder width, lower until thighs parallel, drive up' },
      { name:'Push-ups',          sets:4, reps:'15 reps',rest:45, muscle:'Chest/Triceps', difficulty:'Medium', calories:12, instruction:'Keep core tight, lower chest to floor, push back up' },
      { name:'Lunges',            sets:3, reps:'12 each', rest:45, muscle:'Legs',         difficulty:'Medium', calories:16, instruction:'Step forward, lower back knee toward floor, push back up' },
      { name:'Plank Hold',        sets:3, reps:'60 sec',  rest:30, muscle:'Core',         difficulty:'Medium', calories:8,  instruction:'Hold body straight, elbows below shoulders' },
      { name:'Glute Bridges',     sets:3, reps:'20 reps', rest:30, muscle:'Glutes',       difficulty:'Easy',   calories:10, instruction:'Lie on back, thrust hips upward squeezing glutes' },
      { name:'Tricep Dips',       sets:3, reps:'12 reps', rest:45, muscle:'Triceps',      difficulty:'Medium', calories:10, instruction:'Using chair behind you, lower body by bending elbows' },
      { name:'Bicycle Crunches',  sets:3, reps:'20 reps', rest:30, muscle:'Core',         difficulty:'Medium', calories:12, instruction:'Alternate elbow to opposite knee in cycling motion' },
    ]
  },
  {
    id: 'yoga',
    name: 'Yoga Flow',
    icon: '🧘',
    color: '#8B5CF6',
    duration: 30,
    calories: 150,
    difficulty: 'Low',
    desc: 'Mindful yoga flow for flexibility, balance and peace',
    exercises: [
      { name:'Child\'s Pose',       sets:1, reps:'90 sec', rest:0,  muscle:'Back/Hips',   difficulty:'Easy',   calories:3,  instruction:'Kneel and extend arms forward, rest forehead on mat' },
      { name:'Cat-Cow Stretch',     sets:2, reps:'60 sec', rest:10, muscle:'Spine',       difficulty:'Easy',   calories:4,  instruction:'Alternate arching and rounding spine in sync with breath' },
      { name:'Downward Dog',        sets:3, reps:'45 sec', rest:15, muscle:'Full Body',   difficulty:'Easy',   calories:6,  instruction:'Inverted V shape, press heels down, lengthen spine' },
      { name:'Warrior I',           sets:2, reps:'45 sec', rest:15, muscle:'Legs/Core',  difficulty:'Medium', calories:8,  instruction:'Lunge forward, raise arms overhead, square hips forward' },
      { name:'Warrior II',          sets:2, reps:'45 sec', rest:15, muscle:'Legs',       difficulty:'Medium', calories:8,  instruction:'Wide stance, arms parallel to floor, gaze over front hand' },
      { name:'Tree Pose',           sets:2, reps:'30 sec', rest:10, muscle:'Balance',    difficulty:'Medium', calories:5,  instruction:'Balance on one leg, place other foot on inner thigh' },
      { name:'Seated Forward Fold', sets:2, reps:'60 sec', rest:10, muscle:'Hamstrings', difficulty:'Easy',   calories:4,  instruction:'Reach forward over straight legs, hold for deep breathing' },
    ]
  },
  {
    id: 'cardio',
    name: 'Cardio Endurance',
    icon: '🏃',
    color: '#3B82F6',
    duration: 35,
    calories: 420,
    difficulty: 'Medium',
    desc: 'Sustained cardio to build aerobic capacity and endurance',
    exercises: [
      { name:'Warm-up Jog',       sets:1, reps:'5 min',  rest:0,  muscle:'Full Body', difficulty:'Easy',   calories:40, instruction:'Light jog to warm up muscles and increase heart rate' },
      { name:'High Knees Sprint', sets:4, reps:'30 sec', rest:30, muscle:'Legs/Core', difficulty:'Hard',   calories:25, instruction:'Sprint with high knee drive as fast as possible' },
      { name:'Jump Rope',         sets:4, reps:'60 sec', rest:30, muscle:'Full Body', difficulty:'Medium', calories:15, instruction:'Jump rope continuously, maintain rhythm' },
      { name:'Lateral Shuffles',  sets:3, reps:'45 sec', rest:20, muscle:'Legs',      difficulty:'Medium', calories:12, instruction:'Shuffle sideways rapidly keeping low athletic stance' },
      { name:'Box Steps',         sets:3, reps:'60 sec', rest:20, muscle:'Legs',      difficulty:'Easy',   calories:10, instruction:'Step up and down from platform or step, alternate lead foot' },
      { name:'Cool-down Walk',    sets:1, reps:'5 min',  rest:0,  muscle:'Full Body', difficulty:'Easy',   calories:20, instruction:'Walk slowly to bring heart rate down gradually' },
    ]
  },
  {
    id: 'core',
    name: 'Core Crusher',
    icon: '⚡',
    color: '#AAFF00',
    duration: 20,
    calories: 200,
    difficulty: 'Medium',
    desc: 'Intense core workout for a stronger, more defined midsection',
    exercises: [
      { name:'Plank',              sets:3, reps:'60 sec', rest:20, muscle:'Core',     difficulty:'Medium', calories:8,  instruction:'Hold straight body position on forearms and toes' },
      { name:'Crunches',           sets:3, reps:'25 reps',rest:20, muscle:'Abs',      difficulty:'Easy',   calories:10, instruction:'Lift shoulders off floor contracting abs, lower slowly' },
      { name:'Leg Raises',         sets:3, reps:'15 reps',rest:20, muscle:'Lower Abs',difficulty:'Medium', calories:10, instruction:'Lie flat, raise straight legs to 90 degrees, lower slowly' },
      { name:'Russian Twists',     sets:3, reps:'20 reps',rest:20, muscle:'Obliques', difficulty:'Medium', calories:12, instruction:'Seated lean back, rotate torso side to side with weight' },
      { name:'Dead Bug',           sets:3, reps:'12 reps',rest:20, muscle:'Core',     difficulty:'Medium', calories:8,  instruction:'Alternate lowering opposite arm and leg while maintaining lower back contact' },
      { name:'Side Plank',         sets:2, reps:'30 sec', rest:15, muscle:'Obliques', difficulty:'Medium', calories:6,  instruction:'Hold body in side plank on one forearm, keep hips raised' },
    ]
  },
  {
    id: 'upper',
    name: 'Upper Body Power',
    icon: '🏋️',
    color: '#22C55E',
    duration: 40,
    calories: 300,
    difficulty: 'Medium',
    desc: 'Complete upper body workout targeting chest, back, shoulders and arms',
    exercises: [
      { name:'Wide Push-ups',      sets:4, reps:'15 reps',rest:45, muscle:'Chest',    difficulty:'Medium', calories:12, instruction:'Push-ups with hands wider than shoulders to target chest' },
      { name:'Diamond Push-ups',   sets:3, reps:'12 reps',rest:45, muscle:'Triceps',  difficulty:'Hard',   calories:10, instruction:'Hands form diamond shape below chest, elbows back' },
      { name:'Pike Push-ups',      sets:3, reps:'10 reps',rest:45, muscle:'Shoulders',difficulty:'Hard',   calories:10, instruction:'Inverted V position, lower head toward floor' },
      { name:'Superman Hold',      sets:3, reps:'45 sec', rest:30, muscle:'Back',     difficulty:'Easy',   calories:8,  instruction:'Lie face down, raise arms and legs simultaneously' },
      { name:'Shoulder Taps',      sets:3, reps:'20 reps',rest:30, muscle:'Core',     difficulty:'Medium', calories:8,  instruction:'In plank, tap each shoulder alternately keeping hips stable' },
      { name:'Tricep Dips',        sets:3, reps:'15 reps',rest:45, muscle:'Triceps',  difficulty:'Medium', calories:10, instruction:'Use chair, lower body by bending elbows to 90 degrees' },
      { name:'Arm Circles',        sets:2, reps:'30 sec', rest:15, muscle:'Shoulders',difficulty:'Easy',   calories:4,  instruction:'Extend arms, make small then large circles forward and back' },
    ]
  },
]

// ── SVG Exercise Animations ───────────────────────────────────
const ExerciseAnimation = ({ exercise, isActive, color }: { exercise: Exercise; isActive: boolean; color: string }) => {
  const [frame, setFrame] = useState(0)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isActive) {
      animRef.current = setInterval(() => setFrame(f => (f + 1) % 4), 600)
    } else {
      if (animRef.current) clearInterval(animRef.current)
      setFrame(0)
    }
    return () => { if (animRef.current) clearInterval(animRef.current) }
  }, [isActive])

  const name = exercise.name.toLowerCase()

  // ── Stick figure animations ───────────────────────────────
  const figures: Record<string, JSX.Element[]> = {
    'push-ups': [
      <svg key="0" width="120" height="80" viewBox="0 0 120 80">
        <circle cx="90" cy="15" r="8" fill={color}/>
        <line x1="90" y1="23" x2="60" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="40" x2="30" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="40" x2="60" y2="65" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="90" y1="23" x2="95" y2="45" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="65" x2="40" y2="72" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="65" x2="80" y2="72" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
      <svg key="1" width="120" height="80" viewBox="0 0 120 80">
        <circle cx="85" cy="25" r="8" fill={color}/>
        <line x1="85" y1="33" x2="60" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="50" x2="35" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="50" x2="60" y2="65" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="85" y1="33" x2="90" y2="55" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="65" x2="40" y2="72" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="65" x2="80" y2="72" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
    ],
    'squats': [
      <svg key="0" width="80" height="100" viewBox="0 0 80 100">
        <circle cx="40" cy="12" r="8" fill={color}/>
        <line x1="40" y1="20" x2="40" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="30" x2="20" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="30" x2="60" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="50" x2="28" y2="75" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="50" x2="52" y2="75" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="28" y1="75" x2="22" y2="92" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="52" y1="75" x2="58" y2="92" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
      <svg key="1" width="80" height="100" viewBox="0 0 80 100">
        <circle cx="40" cy="38" r="8" fill={color}/>
        <line x1="40" y1="46" x2="40" y2="65" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="52" x2="18" y2="58" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="52" x2="62" y2="58" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="65" x2="25" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="65" x2="55" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="25" y1="82" x2="18" y2="92" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="55" y1="82" x2="62" y2="92" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
    ],
    'plank': [
      <svg key="0" width="140" height="60" viewBox="0 0 140 60">
        <circle cx="115" cy="18" r="8" fill={color}/>
        <line x1="115" y1="26" x2="70" y2="35" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="70" y1="35" x2="30" y2="35" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="100" y1="30" x2="105" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="34" x2="55" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="90" y1="30" x2="75" y2="45" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="110" y2="50" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
      </svg>,
    ],
    'jumping jacks': [
      <svg key="0" width="80" height="110" viewBox="0 0 80 110">
        <circle cx="40" cy="12" r="8" fill={color}/>
        <line x1="40" y1="20" x2="40" y2="60" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="35" x2="12" y2="20" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="35" x2="68" y2="20" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="60" x2="20" y2="90" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="60" x2="60" y2="90" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="20" y1="90" x2="12" y2="105" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="90" x2="68" y2="105" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
      <svg key="1" width="80" height="110" viewBox="0 0 80 110">
        <circle cx="40" cy="12" r="8" fill={color}/>
        <line x1="40" y1="20" x2="40" y2="60" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="35" x2="20" y2="48" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="35" x2="60" y2="48" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="60" x2="30" y2="88" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="60" x2="50" y2="88" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="30" y1="88" x2="25" y2="105" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="50" y1="88" x2="55" y2="105" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
    ],
    'burpees': [
      <svg key="0" width="80" height="110" viewBox="0 0 80 110">
        <circle cx="40" cy="12" r="8" fill={color}/>
        <line x1="40" y1="20" x2="40" y2="55" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="32" x2="20" y2="45" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="32" x2="60" y2="45" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="55" x2="28" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="55" x2="52" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="28" y1="80" x2="22" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="52" y1="80" x2="58" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
      <svg key="1" width="140" height="60" viewBox="0 0 140 60">
        <circle cx="115" cy="18" r="8" fill={color}/>
        <line x1="115" y1="26" x2="70" y2="35" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="70" y1="35" x2="30" y2="35" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="100" y1="30" x2="105" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="60" y1="34" x2="55" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="90" y1="30" x2="75" y2="45" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
    ],
    'lunges': [
      <svg key="0" width="80" height="110" viewBox="0 0 80 110">
        <circle cx="40" cy="12" r="8" fill={color}/>
        <line x1="40" y1="20" x2="40" y2="55" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="32" x2="22" y2="44" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="32" x2="58" y2="44" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="55" x2="55" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="55" x2="28" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="55" y1="80" x2="60" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="28" y1="80" x2="15" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
      <svg key="1" width="80" height="110" viewBox="0 0 80 110">
        <circle cx="40" cy="22" r="8" fill={color}/>
        <line x1="40" y1="30" x2="40" y2="65" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="42" x2="22" y2="54" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="42" x2="58" y2="54" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="65" x2="58" y2="88" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="65" x2="28" y2="85" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="58" y1="88" x2="62" y2="105" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <line x1="28" y1="85" x2="18" y2="105" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>,
    ],
  }

  // Default running figure
  const defaultFigures = [
    <svg key="0" width="80" height="110" viewBox="0 0 80 110">
      <circle cx="40" cy="12" r="8" fill={color}/>
      <line x1="40" y1="20" x2="40" y2="58" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="35" x2="18" y2="48" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="35" x2="62" y2="48" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="58" x2="28" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="58" x2="52" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="28" y1="82" x2="22" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="52" y1="82" x2="58" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>,
    <svg key="1" width="80" height="110" viewBox="0 0 80 110">
      <circle cx="40" cy="12" r="8" fill={color}/>
      <line x1="40" y1="20" x2="38" y2="58" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="35" x2="15" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="40" y1="35" x2="64" y2="52" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="38" y1="58" x2="52" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="38" y1="58" x2="22" y2="75" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="52" y1="80" x2="62" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <line x1="22" y1="75" x2="14" y2="96" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>,
  ]

  const matchKey = Object.keys(figures).find(k => name.includes(k))
  const fig = matchKey ? figures[matchKey] : defaultFigures
  const currentFrame = fig[frame % fig.length]

  return (
    <div style={{ width:'100%', height:'120px', display:'flex', alignItems:'center', justifyContent:'center', background:`${color}06`, borderRadius:'16px', border:`1px solid ${color}15`, position:'relative', overflow:'hidden' }}>
      {/* Background pulse when active */}
      {isActive && <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle,${color}08,transparent)`, animation:'pulse 1s ease-in-out infinite' }}/>}
      {currentFrame}
      {isActive && (
        <div style={{ position:'absolute', bottom:'8px', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'3px' }}>
          {[0,1,2].map(i => <div key={i} style={{ width:'4px', height:'4px', borderRadius:'50%', background:color, animation:`bounce 0.8s ease infinite`, animationDelay:`${i*0.2}s` }}/>)}
        </div>
      )}
    </div>
  )
}

export default function WorkoutPage() {
  const [selectedPlan,  setSelectedPlan]  = useState<typeof WORKOUT_PLANS[0] | null>(null)
  const [activeEx,      setActiveEx]      = useState(-1)
  const [timer,         setTimer]         = useState(0)
  const [timerRunning,  setTimerRunning]  = useState(false)
  const [restTimer,     setRestTimer]     = useState(0)
  const [restRunning,   setRestRunning]   = useState(false)
  const [completedExs,  setCompletedExs]  = useState<Set<number>>(new Set())
  const [workoutActive, setWorkoutActive] = useState(false)
  const [workoutDone,   setWorkoutDone]   = useState(false)
  const [totalTime,     setTotalTime]     = useState(0)
  const [logs,          setLogs]          = useState<Workout[]>([])
  const [tab,           setTab]           = useState<'plans'|'active'|'history'>('plans')
  const [userId,        setUserId]        = useState('')
  const [saving,        setSaving]        = useState(false)
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase      = createClient()
  const router        = useRouter()

  useEffect(() => {
    init()
    return () => {
      if (timerRef.current)  clearInterval(timerRef.current)
      if (restRef.current)   clearInterval(restRef.current)
      if (totalRef.current)  clearInterval(totalRef.current)
    }
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    await supabase.from('profiles').upsert({ id:user.id, username:user.email?.split('@')[0], full_name:user.email?.split('@')[0] }, { onConflict:'id' })
    fetchLogs(user.id)
  }

  const fetchLogs = async (uid: string) => {
    const { data } = await supabase.from('workouts').select('*').eq('user_id', uid).order('workout_date', { ascending:false }).limit(10)
    if (data) setLogs(data as Workout[])
  }

  // ── Timer controls ────────────────────────────────────────
  const startTimer = () => {
    setTimerRunning(true)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }

  const stopTimer = () => {
    setTimerRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const resetTimer = () => { stopTimer(); setTimer(0) }

  const startRest = (secs: number) => {
    setRestTimer(secs)
    setRestRunning(true)
    if (restRef.current) clearInterval(restRef.current)
    restRef.current = setInterval(() => {
      setRestTimer(t => {
        if (t <= 1) {
          setRestRunning(false)
          clearInterval(restRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  const skipRest = () => {
    setRestRunning(false)
    setRestTimer(0)
    if (restRef.current) clearInterval(restRef.current)
  }

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // ── Start workout ─────────────────────────────────────────
  const startWorkout = (plan: typeof WORKOUT_PLANS[0]) => {
    setSelectedPlan(plan)
    setActiveEx(0)
    setCompletedExs(new Set())
    setWorkoutActive(true)
    setWorkoutDone(false)
    setTotalTime(0)
    setTimer(0)
    setTab('active')
    totalRef.current = setInterval(() => setTotalTime(t => t + 1), 1000)
  }

  // ── Complete exercise ─────────────────────────────────────
  const completeExercise = (idx: number) => {
    const newCompleted = new Set(completedExs)
    newCompleted.add(idx)
    setCompletedExs(newCompleted)
    resetTimer()

    if (selectedPlan && idx < selectedPlan.exercises.length - 1) {
      const nextIdx = idx + 1
      setActiveEx(nextIdx)
      startRest(selectedPlan.exercises[idx].rest)
    } else {
      // Workout complete!
      if (totalRef.current) clearInterval(totalRef.current)
      setWorkoutActive(false)
      setWorkoutDone(true)
      setActiveEx(-1)
      saveWorkout()
    }
  }

  const saveWorkout = async () => {
    if (!selectedPlan || !userId) return
    setSaving(true)
    await supabase.from('workouts').insert({
      user_id:          userId,
      workout_date:     new Date().toISOString().split('T')[0],
      name:             selectedPlan.name,
      type:             selectedPlan.id,
      duration_minutes: Math.round(totalTime / 60),
      calories_burned:  selectedPlan.calories,
      exercises:        selectedPlan.exercises,
      completed:        true,
    })
    await fetchLogs(userId)
    setSaving(false)
  }

  const endWorkout = () => {
    if (totalRef.current) clearInterval(totalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (restRef.current)  clearInterval(restRef.current)
    setWorkoutActive(false)
    setWorkoutDone(false)
    setSelectedPlan(null)
    setActiveEx(-1)
    setTab('plans')
  }

  const diffColor = (d: string) => d==='High'?'#EF4444':d==='Medium'?'#F97316':'#22C55E'

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes bounce   { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(170,255,0,0.3)} 50%{box-shadow:0 0 40px rgba(170,255,0,0.7)} }
        *::-webkit-scrollbar { display:none }
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/dashboard" style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', textDecoration:'none', fontSize:'16px' }}>←</a>
            <div>
              <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff' }}>Workout</div>
              <div style={{ fontSize:'11px', color:'#F97316', fontWeight:'600' }}>
                {workoutActive ? `⏱ ${fmt(totalTime)} elapsed` : `${WORKOUT_PLANS.length} programs ready`}
              </div>
            </div>
          </div>
          {workoutActive && (
            <button onClick={endWorkout}
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'20px', padding:'8px 16px', color:'#EF4444', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
              End Workout
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'4px', gap:'4px' }}>
          {[
            { id:'plans',   label:'Plans'   },
            { id:'active',  label:'Active'  },
            { id:'history', label:'History' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex:1, padding:'8px', borderRadius:'8px', border:'none', background:tab===t.id?'#F97316':'transparent', color:tab===t.id?'#fff':'#3A3A3A', fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>

        {/* ── PLANS TAB ── */}
        {tab === 'plans' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            <div style={{ fontSize:'12px', color:'#3A3A3A', fontWeight:'600', marginBottom:'14px' }}>Choose your workout program</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {WORKOUT_PLANS.map((plan, i) => (
                <div key={plan.id}
                  style={{ background:'#111', border:`1px solid ${plan.color}20`, borderRadius:'20px', padding:'18px', animation:`fadeInUp 0.5s ease ${i*0.07}s both`, cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=`${plan.color}40`;e.currentTarget.style.transform='translateY(-2px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=`${plan.color}20`;e.currentTarget.style.transform='translateY(0)'}}>

                  <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'12px' }}>
                    <div style={{ width:'52px', height:'52px', borderRadius:'16px', background:`${plan.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', border:`1px solid ${plan.color}25`, flexShrink:0 }}>
                      {plan.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'16px', fontWeight:'800', color:'#fff', marginBottom:'3px' }}>{plan.name}</div>
                      <div style={{ fontSize:'12px', color:'#52525B', lineHeight:'1.4' }}>{plan.desc}</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'14px' }}>
                    {[
                      { label:'Duration',   value:`${plan.duration}m`,        color:plan.color },
                      { label:'Calories',   value:`${plan.calories}`,          color:'#F97316'  },
                      { label:'Exercises',  value:`${plan.exercises.length}`,  color:'#3B82F6'  },
                      { label:'Intensity',  value:plan.difficulty,             color:diffColor(plan.difficulty) },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'8px 4px', textAlign:'center' }}>
                        <div style={{ fontSize:'13px', fontWeight:'800', color:s.color }}>{s.value}</div>
                        <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'1px', textTransform:'uppercase' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Exercise preview */}
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
                    {plan.exercises.slice(0,4).map((ex, j) => (
                      <div key={j} style={{ fontSize:'11px', color:'#A1A1AA', background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:'8px' }}>{ex.name}</div>
                    ))}
                    {plan.exercises.length > 4 && (
                      <div style={{ fontSize:'11px', color:'#3A3A3A', background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:'8px' }}>+{plan.exercises.length-4} more</div>
                    )}
                  </div>

                  <button onClick={() => startWorkout(plan)}
                    style={{ width:'100%', background:`linear-gradient(135deg,${plan.color},${plan.color}90)`, color:'#000', border:'none', borderRadius:'12px', padding:'13px', fontSize:'14px', fontWeight:'800', cursor:'pointer', boxShadow:`0 0 20px ${plan.color}30` }}>
                    Start {plan.name} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIVE TAB ── */}
        {tab === 'active' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {!selectedPlan ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px' }}>💪</div>
                <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>No active workout</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'24px' }}>Select a workout plan to start training</div>
                <button onClick={() => setTab('plans')}
                  style={{ background:'#F97316', color:'#fff', border:'none', borderRadius:'14px', padding:'13px 28px', fontSize:'15px', fontWeight:'800', cursor:'pointer' }}>
                  Choose Plan
                </button>
              </div>
            ) : workoutDone ? (
              // ── WORKOUT COMPLETE ──
              <div style={{ textAlign:'center', padding:'40px 20px', animation:'fadeInUp 0.5s ease both' }}>
                <div style={{ fontSize:'64px', marginBottom:'20px' }}>🏆</div>
                <div style={{ fontSize:'26px', fontWeight:'900', color:'#AAFF00', marginBottom:'8px' }}>Workout Complete!</div>
                <div style={{ fontSize:'15px', color:'#52525B', marginBottom:'28px' }}>Amazing work! You crushed it!</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'28px' }}>
                  {[
                    { label:'Time',      value:fmt(totalTime),            color:'#AAFF00' },
                    { label:'Calories',  value:`${selectedPlan.calories}`,color:'#F97316' },
                    { label:'Exercises', value:`${completedExs.size}/${selectedPlan.exercises.length}`, color:'#3B82F6' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'#111', borderRadius:'16px', padding:'16px', border:`1px solid ${s.color}20` }}>
                      <div style={{ fontSize:'22px', fontWeight:'900', color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:'10px', color:'#3A3A3A', fontWeight:'600', marginTop:'4px', textTransform:'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  <button onClick={() => { setTab('plans'); setSelectedPlan(null); setWorkoutDone(false) }}
                    style={{ width:'100%', background:'#AAFF00', color:'#000', border:'none', borderRadius:'14px', padding:'15px', fontSize:'15px', fontWeight:'900', cursor:'pointer', boxShadow:'0 0 24px rgba(170,255,0,0.4)', animation:'glow 2s ease-in-out infinite' }}>
                    Start Another Workout
                  </button>
                  <button onClick={() => { setTab('history'); setSelectedPlan(null); setWorkoutDone(false) }}
                    style={{ width:'100%', background:'transparent', color:'#3A3A3A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'13px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>
                    View History
                  </button>
                </div>
              </div>
            ) : (
              // ── ACTIVE WORKOUT ──
              <>
                {/* Progress header */}
                <div style={{ background:'#111', border:`1px solid ${selectedPlan.color}20`, borderRadius:'20px', padding:'16px', marginBottom:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                    <div>
                      <div style={{ fontSize:'15px', fontWeight:'800', color:'#fff' }}>{selectedPlan.name}</div>
                      <div style={{ fontSize:'11px', color:selectedPlan.color }}>{completedExs.size}/{selectedPlan.exercises.length} exercises done</div>
                    </div>
                    <div style={{ fontSize:'22px', fontWeight:'900', color:selectedPlan.color }}>{fmt(totalTime)}</div>
                  </div>
                  <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', background:`linear-gradient(90deg,${selectedPlan.color},${selectedPlan.color}80)`, width:`${(completedExs.size/selectedPlan.exercises.length)*100}%`, borderRadius:'3px', transition:'width 0.5s ease', boxShadow:`0 0 8px ${selectedPlan.color}60` }}/>
                  </div>
                </div>

                {/* Rest timer */}
                {restRunning && (
                  <div style={{ background:`rgba(59,130,246,0.08)`, border:'1px solid rgba(59,130,246,0.2)', borderRadius:'18px', padding:'20px', marginBottom:'14px', textAlign:'center', animation:'fadeInUp 0.3s ease both' }}>
                    <div style={{ fontSize:'13px', color:'#3B82F6', fontWeight:'700', marginBottom:'8px' }}>REST TIME</div>
                    <div style={{ fontSize:'48px', fontWeight:'900', color:'#3B82F6', marginBottom:'12px' }}>{restTimer}s</div>
                    <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden', marginBottom:'12px' }}>
                      <div style={{ height:'100%', background:'#3B82F6', width:`${(restTimer/(selectedPlan.exercises[activeEx-1]?.rest||30))*100}%`, borderRadius:'3px', transition:'width 1s linear' }}/>
                    </div>
                    <button onClick={skipRest}
                      style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'12px', padding:'10px 24px', color:'#3B82F6', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                      Skip Rest →
                    </button>
                  </div>
                )}

                {/* Exercise list */}
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {selectedPlan.exercises.map((ex, idx) => {
                    const isActive    = activeEx === idx && !restRunning
                    const isCompleted = completedExs.has(idx)
                    const isLocked    = idx > activeEx

                    return (
                      <div key={idx}
                        style={{ background: isCompleted?'rgba(170,255,0,0.04)':isActive?`${selectedPlan.color}06`:'#111', border:`1px solid ${isCompleted?'rgba(170,255,0,0.15)':isActive?`${selectedPlan.color}25`:'rgba(255,255,255,0.06)'}`, borderRadius:'20px', padding:'16px', opacity:isLocked?0.4:1, transition:'all 0.3s', animation:`fadeInUp 0.5s ease ${idx*0.04}s both` }}>

                        {/* Exercise header */}
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:isActive?'14px':'0' }}>
                          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background: isCompleted?'#AAFF00':isActive?selectedPlan.color:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.3s' }}>
                            {isCompleted
                              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                              : <span style={{ fontSize:'12px', fontWeight:'800', color: isActive?'#000':'#3A3A3A' }}>{idx+1}</span>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'15px', fontWeight:'700', color: isCompleted?'#AAFF00':isActive?'#fff':'#A1A1AA' }}>{ex.name}</div>
                            <div style={{ display:'flex', gap:'8px', marginTop:'3px', flexWrap:'wrap' }}>
                              <span style={{ fontSize:'11px', color:selectedPlan.color, fontWeight:'700' }}>{ex.sets} sets × {ex.reps}</span>
                              <span style={{ fontSize:'11px', color:'#3A3A3A' }}>{ex.muscle}</span>
                              <span style={{ fontSize:'11px', color:'#3A3A3A' }}>🔥 {ex.calories} cal</span>
                            </div>
                          </div>
                          {isCompleted && <div style={{ fontSize:'12px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.1)', padding:'3px 10px', borderRadius:'20px', flexShrink:0 }}>Done ✓</div>}
                        </div>

                        {/* Active exercise details */}
                        {isActive && !restRunning && (
                          <div style={{ animation:'fadeInUp 0.3s ease both' }}>
                            {/* Animation */}
                            <div style={{ marginBottom:'14px' }}>
                              <ExerciseAnimation exercise={ex} isActive={true} color={selectedPlan.color}/>
                            </div>

                            {/* Instruction */}
                            <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'12px', padding:'12px 14px', marginBottom:'14px' }}>
                              <div style={{ fontSize:'11px', color:selectedPlan.color, fontWeight:'700', marginBottom:'4px', letterSpacing:'0.06em' }}>HOW TO DO IT</div>
                              <div style={{ fontSize:'13px', color:'#A1A1AA', lineHeight:'1.6' }}>{ex.instruction}</div>
                            </div>

                            {/* Set/Rep info */}
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'14px' }}>
                              {[
                                { label:'Sets',  value:String(ex.sets),  color:selectedPlan.color },
                                { label:'Reps',  value:ex.reps,           color:'#F97316' },
                                { label:'Rest',  value:`${ex.rest}s`,     color:'#3B82F6' },
                              ].map(s => (
                                <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                                  <div style={{ fontSize:'16px', fontWeight:'800', color:s.color }}>{s.value}</div>
                                  <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px', textTransform:'uppercase' }}>{s.label}</div>
                                </div>
                              ))}
                            </div>

                            {/* Stopwatch */}
                            <div style={{ background:'#0D0D0D', borderRadius:'14px', padding:'14px', marginBottom:'14px', textAlign:'center' }}>
                              <div style={{ fontSize:'11px', color:'#3A3A3A', fontWeight:'600', marginBottom:'6px', letterSpacing:'0.08em' }}>EXERCISE TIMER</div>
                              <div style={{ fontSize:'36px', fontWeight:'900', color:selectedPlan.color, fontVariantNumeric:'tabular-nums', marginBottom:'10px' }}>{fmt(timer)}</div>
                              <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
                                <button onClick={timerRunning ? stopTimer : startTimer}
                                  style={{ background:timerRunning?'rgba(239,68,68,0.1)':`${selectedPlan.color}15`, border:`1px solid ${timerRunning?'rgba(239,68,68,0.3)':selectedPlan.color+'30'}`, borderRadius:'10px', padding:'8px 20px', color:timerRunning?'#EF4444':selectedPlan.color, fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                                  {timerRunning ? '⏸ Pause' : '▶ Start'}
                                </button>
                                <button onClick={resetTimer}
                                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'8px 16px', color:'#3A3A3A', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
                                  ↺ Reset
                                </button>
                              </div>
                            </div>

                            {/* Complete button */}
                            <button onClick={() => completeExercise(idx)}
                              style={{ width:'100%', background:`linear-gradient(135deg,${selectedPlan.color},${selectedPlan.color}80)`, color:'#000', border:'none', borderRadius:'14px', padding:'15px', fontSize:'15px', fontWeight:'900', cursor:'pointer', boxShadow:`0 0 20px ${selectedPlan.color}40`, animation:'glow 2s ease-in-out infinite' }}>
                              {idx === selectedPlan.exercises.length - 1 ? '🏆 Complete Workout!' : `Done! Next Exercise →`}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div style={{ animation:'fadeInUp 0.4s ease both' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'56px', marginBottom:'16px' }}>📊</div>
                <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>No workouts yet</div>
                <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'24px' }}>Complete your first workout to see history</div>
                <button onClick={() => setTab('plans')}
                  style={{ background:'#F97316', color:'#fff', border:'none', borderRadius:'14px', padding:'12px 24px', fontSize:'14px', fontWeight:'800', cursor:'pointer' }}>
                  Start Workout
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {logs.map((log, i) => {
                  const plan = WORKOUT_PLANS.find(p => p.id === log.type) || WORKOUT_PLANS[0]
                  return (
                    <div key={log.id} style={{ background:'#111', border:`1px solid ${plan.color}15`, borderRadius:'18px', padding:'16px', animation:`fadeInUp 0.5s ease ${i*0.06}s both` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                        <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:`${plan.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                          {plan.icon}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff' }}>{log.name}</div>
                          <div style={{ fontSize:'11px', color:'#3A3A3A', marginTop:'2px' }}>
                            {new Date(log.workout_date).toLocaleDateString('en', { weekday:'short', month:'short', day:'numeric' })}
                          </div>
                        </div>
                        <div style={{ fontSize:'11px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.08)', padding:'3px 10px', borderRadius:'20px' }}>✓ Done</div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                        {[
                          { label:'Duration',  value:`${log.duration_minutes}m`, color:plan.color },
                          { label:'Calories',  value:`${log.calories_burned}`,   color:'#F97316'  },
                          { label:'Exercises', value:`${(log.exercises as any[])?.length || 0}`, color:'#3B82F6' },
                        ].map(s => (
                          <div key={s.label} style={{ background:'#0D0D0D', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                            <div style={{ fontSize:'14px', fontWeight:'800', color:s.color }}>{s.value}</div>
                            <div style={{ fontSize:'9px', color:'#3A3A3A', fontWeight:'600', marginTop:'2px', textTransform:'uppercase' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/health',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,label:'Health'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/workout',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M7 3v18M17 3v18"/></svg>,label:'Workout',active:true},
            {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?'#F97316':'#3A3A3A',fontWeight:(n as any).active?'700':'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}