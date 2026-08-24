'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── REALISTIC HUMAN FIGURE ANIMATIONS ────────────────────────

const HumanPushUp = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%100), 30); return () => clearInterval(i) }, [])
  const phase = Math.sin(t / 100 * Math.PI * 2)
  const down = (phase + 1) / 2
  const elbowY = 58 + down * 18
  const hipY = 52 + down * 6
  const chestY = 44 + down * 18
  return (
    <svg viewBox="0 0 280 140" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="pp_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/>
          <stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="pp_shirt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#AAFF00"/>
          <stop offset="100%" stopColor="#22C55E"/>
        </linearGradient>
        <linearGradient id="pp_pants" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E3A5F"/>
          <stop offset="100%" stopColor="#0F1E30"/>
        </linearGradient>
        <linearGradient id="pp_floor" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#111"/>
          <stop offset="50%" stopColor="#1A1A1A"/>
          <stop offset="100%" stopColor="#111"/>
        </linearGradient>
        <filter id="pp_shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#AAFF00" floodOpacity="0.15"/>
        </filter>
      </defs>
      {/* Floor with mat */}
      <rect x="20" y="110" width="240" height="20" rx="4" fill="url(#pp_floor)"/>
      <rect x="40" y="108" width="200" height="6" rx="3" fill="#AAFF0015" stroke="#AAFF0030" strokeWidth="1"/>
      <text x="140" y="114" textAnchor="middle" fill="#AAFF0040" fontSize="7" fontWeight="600">EXERCISE MAT</text>

      <g filter="url(#pp_shadow)">
        {/* RIGHT HAND */}
        <ellipse cx="210" cy="108" rx="8" ry="5" fill="url(#pp_skin)" transform="rotate(-10 210 108)"/>
        {/* LEFT HAND */}
        <ellipse cx="150" cy="108" rx="8" ry="5" fill="url(#pp_skin)" transform="rotate(10 150 108)"/>

        {/* RIGHT FOREARM */}
        <path d={`M 210 108 Q 218 ${elbowY+8} 220 ${elbowY}`} stroke="url(#pp_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
        {/* LEFT FOREARM */}
        <path d={`M 150 108 Q 142 ${elbowY+8} 140 ${elbowY}`} stroke="url(#pp_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>

        {/* RIGHT UPPER ARM */}
        <path d={`M 220 ${elbowY} Q 225 ${chestY+8} 215 ${chestY}`} stroke="url(#pp_shirt)" strokeWidth="11" fill="none" strokeLinecap="round"/>
        {/* LEFT UPPER ARM */}
        <path d={`M 140 ${elbowY} Q 135 ${chestY+8} 145 ${chestY}`} stroke="url(#pp_shirt)" strokeWidth="11" fill="none" strokeLinecap="round"/>

        {/* TORSO (shirt) */}
        <path d={`M 145 ${chestY} Q 155 ${chestY-4} 180 ${chestY-2} Q 205 ${chestY} 215 ${chestY} L 215 ${hipY} Q 205 ${hipY+4} 180 ${hipY+3} Q 155 ${hipY+4} 145 ${hipY} Z`}
          fill="url(#pp_shirt)" rx="4"/>
        {/* Shirt detail line */}
        <path d={`M 180 ${chestY} L 180 ${hipY}`} stroke="#AAFF0040" strokeWidth="1.5"/>

        {/* HIPS/WAIST */}
        <ellipse cx="180" cy={hipY+2} rx="32" ry="8" fill="#2A4A6F"/>

        {/* RIGHT THIGH */}
        <path d={`M 195 ${hipY+8} Q 200 90 205 108`} stroke="url(#pp_pants)" strokeWidth="14" fill="none" strokeLinecap="round"/>
        {/* LEFT THIGH */}
        <path d={`M 165 ${hipY+8} Q 160 90 155 108`} stroke="url(#pp_pants)" strokeWidth="14" fill="none" strokeLinecap="round"/>

        {/* RIGHT SHOE */}
        <ellipse cx="207" cy="110" rx="12" ry="5" fill="#222" stroke="#333" strokeWidth="1"/>
        <ellipse cx="213" cy="109" rx="5" ry="3" fill="#333"/>
        {/* LEFT SHOE */}
        <ellipse cx="153" cy="110" rx="12" ry="5" fill="#222" stroke="#333" strokeWidth="1"/>
        <ellipse cx="147" cy="109" rx="5" ry="3" fill="#333"/>

        {/* NECK */}
        <rect x="216" y={chestY-12} width="11" height="14" rx="5" fill="url(#pp_skin)"/>
        {/* HEAD */}
        <ellipse cx="222" cy={chestY-20} rx="14" ry="16" fill="url(#pp_skin)"/>
        {/* HAIR */}
        <path d={`M 208 ${chestY-30} Q 222 ${chestY-40} 236 ${chestY-30} Q 235 ${chestY-24} 208 ${chestY-24} Z`} fill="#2C1810"/>
        {/* EYE */}
        <circle cx="218" cy={chestY-22} r="2.5" fill="#FFF"/>
        <circle cx="218" cy={chestY-22} r="1.5" fill="#2C1810"/>
        {/* NOSE */}
        <path d={`M 225 ${chestY-20} Q 227 ${chestY-17} 225 ${chestY-16}`} stroke="#E8956D" strokeWidth="1.5" fill="none"/>
        {/* MOUTH */}
        <path d={`M 220 ${chestY-14} Q 224 ${chestY-11} 228 ${chestY-14}`} stroke="#C8756D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* EAR */}
        <ellipse cx="208" cy={chestY-20} rx="3" ry="5" fill="#E8956D"/>
      </g>

      {/* Phase indicator */}
      <text x="50" y="30" fill="#AAFF0080" fontSize="9" fontWeight="700" textAnchor="middle">
        {down > 0.5 ? 'DOWN ↓' : 'UP ↑'}
      </text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#AAFF00" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-t/100)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #AAFF00)', transition:'stroke-dashoffset 0.03s' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#AAFF00" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

const HumanSquat = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%100), 35); return () => clearInterval(i) }, [])
  const phase = Math.sin(t / 100 * Math.PI * 2)
  const squat = (phase + 1) / 2
  const hipY = 55 + squat * 28
  const kneeY = 75 + squat * 18
  const torsoAngle = squat * 10
  return (
    <svg viewBox="0 0 280 160" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="sq_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="sq_shirt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B"/><stop offset="100%" stopColor="#EE5A24"/>
        </linearGradient>
        <filter id="sq_sh"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#FF6B6B" floodOpacity="0.2"/></filter>
      </defs>
      <rect x="20" y="128" width="240" height="18" rx="4" fill="#1A1A1A"/>
      <rect x="40" y="126" width="200" height="5" rx="2" fill="#FF6B6B15" stroke="#FF6B6B30" strokeWidth="1"/>

      <g filter="url(#sq_sh)">
        {/* HEAD */}
        <ellipse cx="140" cy="28" rx="15" ry="17" fill="url(#sq_skin)"/>
        <path d="M 125 20 Q 140 8 155 20 Q 154 13 125 13 Z" fill="#1A0A00"/>
        <circle cx="135" cy="26" r="2.5" fill="#FFF"/><circle cx="135" cy="26" r="1.5" fill="#1A0A00"/>
        <path d="M 143 30 Q 145 27 143 26" stroke="#E8956D" strokeWidth="1.5" fill="none"/>
        <path d="M 138 34 Q 141 37 145 34" stroke="#C8756D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="125" cy="28" rx="3" ry="5" fill="#E8956D"/>
        {/* NECK */}
        <rect x="133" y="43" width="12" height="12" rx="5" fill="url(#sq_skin)"/>

        {/* TORSO tilted slightly forward */}
        <path d={`M ${130-torsoAngle*0.5} 54 Q 140 52 ${150+torsoAngle*0.5} 54 L ${152+torsoAngle} ${hipY} Q 140 ${hipY+3} ${128-torsoAngle} ${hipY} Z`}
          fill="url(#sq_shirt)"/>
        {/* Shirt logo */}
        <circle cx="140" cy={54 + (hipY-54)/2} r="6" fill="#FFFFFF15" stroke="#FFFFFF20" strokeWidth="1"/>

        {/* ARMS - out front for balance */}
        <path d={`M ${130-torsoAngle*0.5} 60 Q 105 ${60 + squat*8} 98 ${60 + squat*15}`}
          stroke="url(#sq_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={`M ${150+torsoAngle*0.5} 60 Q 175 ${60 + squat*8} 182 ${60 + squat*15}`}
          stroke="url(#sq_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        {/* FOREARMS */}
        <path d={`M 98 ${60 + squat*15} Q 92 ${65 + squat*10} 88 ${68 + squat*8}`}
          stroke="url(#sq_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d={`M 182 ${60 + squat*15} Q 188 ${65 + squat*10} 192 ${68 + squat*8}`}
          stroke="url(#sq_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* HANDS */}
        <ellipse cx="86" cy={70 + squat*8} rx="8" ry="6" fill="url(#sq_skin)"/>
        <ellipse cx="194" cy={70 + squat*8} rx="8" ry="6" fill="url(#sq_skin)"/>

        {/* WAIST */}
        <ellipse cx="140" cy={hipY} rx="22" ry="8" fill="#1E3A5F"/>

        {/* LEFT THIGH */}
        <path d={`M 128 ${hipY+6} Q ${118 - squat*12} ${kneeY-5} ${116 - squat*10} ${kneeY}`}
          stroke="#1E3A5F" strokeWidth="16" fill="none" strokeLinecap="round"/>
        {/* RIGHT THIGH */}
        <path d={`M 152 ${hipY+6} Q ${162 + squat*12} ${kneeY-5} ${164 + squat*10} ${kneeY}`}
          stroke="#1E3A5F" strokeWidth="16" fill="none" strokeLinecap="round"/>

        {/* LEFT SHIN */}
        <path d={`M ${116 - squat*10} ${kneeY} Q ${120 - squat*4} ${115 + squat*6} 122 128`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>
        {/* RIGHT SHIN */}
        <path d={`M ${164 + squat*10} ${kneeY} Q ${160 + squat*4} ${115 + squat*6} 158 128`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>

        {/* LEFT SHOE */}
        <ellipse cx="120" cy="130" rx="16" ry="6" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="112" cy="129" rx="6" ry="4" fill="#222"/>
        {/* RIGHT SHOE */}
        <ellipse cx="160" cy="130" rx="16" ry="6" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="168" cy="129" rx="6" ry="4" fill="#222"/>
      </g>
      {/* Status */}
      <text x="50" y="28" fill="#FF6B6B80" fontSize="9" fontWeight="700" textAnchor="middle">
        {squat > 0.5 ? 'SQUAT ↓' : 'RISE ↑'}
      </text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#FF6B6B" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-t/100)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #FF6B6B)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#FF6B6B" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

const HumanPlank = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%120), 50); return () => clearInterval(i) }, [])
  const breathe = Math.sin(t / 120 * Math.PI * 2) * 2
  return (
    <svg viewBox="0 0 300 120" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="pl_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="pl_shirt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4ECDC4"/><stop offset="100%" stopColor="#45B7D1"/>
        </linearGradient>
        <filter id="pl_sh"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#4ECDC4" floodOpacity="0.2"/></filter>
      </defs>
      <rect x="10" y="98" width="280" height="15" rx="4" fill="#1A1A1A"/>
      <rect x="20" y="96" width="260" height="5" rx="2" fill="#4ECDC415" stroke="#4ECDC430" strokeWidth="1"/>

      <g filter="url(#pl_sh)" transform={`translate(0, ${breathe})`}>
        {/* HEAD - looking forward */}
        <ellipse cx="252" cy="52" rx="14" ry="15" fill="url(#pl_skin)"/>
        <path d="M 238 44 Q 252 34 266 44 Q 264 38 238 38 Z" fill="#2C1810"/>
        <circle cx="248" cy="50" r="2.5" fill="#FFF"/>
        <circle cx="248" cy="50" r="1.5" fill="#2C1810"/>
        <ellipse cx="238" cy="53" rx="3" ry="4" fill="#E8956D"/>
        <path d="M 254 57 Q 257 60 261 57" stroke="#C8756D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

        {/* NECK */}
        <path d="M 246 66 Q 240 72 238 76" stroke="url(#pl_skin)" strokeWidth="10" fill="none" strokeLinecap="round"/>

        {/* TORSO */}
        <path d="M 238 76 Q 200 78 170 80 Q 140 80 110 82 L 110 90 Q 140 90 170 90 Q 200 90 238 88 Z"
          fill="url(#pl_shirt)"/>
        {/* Shirt stripe */}
        <path d="M 238 80 Q 200 82 170 84" stroke="#FFFFFF20" strokeWidth="3" fill="none"/>

        {/* WAIST + HIPS */}
        <path d="M 110 82 Q 100 83 94 86 L 94 92 Q 100 91 110 90 Z" fill="#2A4A6F"/>

        {/* RIGHT FOREARM on ground */}
        <path d="M 238 76 Q 240 88 242 97" stroke="url(#pl_skin)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        {/* LEFT FOREARM on ground */}
        <path d="M 200 78 Q 202 88 204 97" stroke="url(#pl_skin)" strokeWidth="10" fill="none" strokeLinecap="round"/>

        {/* RIGHT HAND */}
        <ellipse cx="244" cy="97" rx="10" ry="5" fill="url(#pl_skin)" transform="rotate(-5 244 97)"/>
        {/* LEFT HAND */}
        <ellipse cx="205" cy="97" rx="10" ry="5" fill="url(#pl_skin)" transform="rotate(-5 205 97)"/>

        {/* LEFT LEG */}
        <path d="M 110 82 Q 72 85 52 86" stroke="#1E3A5F" strokeWidth="18" fill="none" strokeLinecap="round"/>
        {/* RIGHT LEG (slightly apart) */}
        <path d="M 108 88 Q 70 91 50 93" stroke="#1E3A5F" strokeWidth="15" fill="none" strokeLinecap="round"/>

        {/* LEFT SHOE */}
        <ellipse cx="44" cy="87" rx="14" ry="6" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="36" cy="86" rx="6" ry="4" fill="#222"/>
        {/* RIGHT SHOE */}
        <ellipse cx="43" cy="94" rx="13" ry="5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="35" cy="93" rx="5" ry="3.5" fill="#222"/>
      </g>

      {/* Breathing indicator */}
      <circle cx="170" cy={80 + breathe} r={4 + Math.abs(breathe) * 0.8} fill="none" stroke="#4ECDC460" strokeWidth="1.5"/>

      <text x="50" y="28" fill="#4ECDC480" fontSize="9" fontWeight="700" textAnchor="middle">HOLD ●</text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#4ECDC4" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-t/120)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #4ECDC4)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#4ECDC4" fontSize="8" fontWeight="800">{Math.round(t/120*45)}s</text>
    </svg>
  )
}

const HumanBurpee = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%100), 35); return () => clearInterval(i) }, [])
  const p = t / 100
  const isJump = p < 0.3
  const isDown = p >= 0.4 && p < 0.75
  const jumpH = isJump ? Math.sin(p / 0.3 * Math.PI) * 35 : 0
  return (
    <svg viewBox="0 0 280 160" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="bu_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="bu_shirt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EE5A24"/><stop offset="100%" stopColor="#F0932B"/>
        </linearGradient>
        <filter id="bu_sh"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#EE5A24" floodOpacity="0.25"/></filter>
      </defs>
      <rect x="20" y="132" width="240" height="16" rx="4" fill="#1A1A1A"/>

      <g filter="url(#bu_sh)" transform={`translate(0, ${-jumpH})`}>
        {isDown ? (
          <>
            {/* PUSH UP POSITION */}
            <ellipse cx="228" cy="68" rx="13" ry="14" fill="url(#bu_skin)"/>
            <path d="M 215 60 Q 228 50 241 60 Z" fill="#2C1810"/>
            <circle cx="224" cy="66" r="2" fill="#FFF"/>
            <circle cx="224" cy="66" r="1.2" fill="#2C1810"/>
            <path d="M 215 76 Q 175 80 135 83 Q 105 84 90 86 L 90 96 Q 105 95 135 93 Q 175 91 215 88 Z"
              fill="url(#bu_shirt)"/>
            <path d="M 215 80 Q 215 90 218 130" stroke="url(#bu_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
            <path d="M 175 82 Q 175 92 178 130" stroke="url(#bu_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
            <ellipse cx="220" cy="131" rx="12" ry="5" fill="url(#bu_skin)"/>
            <ellipse cx="180" cy="131" rx="12" ry="5" fill="url(#bu_skin)"/>
            <path d="M 90 86 Q 65 88 45 90" stroke="#1E3A5F" strokeWidth="17" fill="none" strokeLinecap="round"/>
            <path d="M 88 93 Q 63 95 43 97" stroke="#1E3A5F" strokeWidth="14" fill="none" strokeLinecap="round"/>
            <ellipse cx="37" cy="91" rx="12" ry="5" fill="#111" stroke="#222" strokeWidth="1"/>
            <ellipse cx="35" cy="98" rx="11" ry="5" fill="#111" stroke="#222" strokeWidth="1"/>
          </>
        ) : (
          <>
            {/* STANDING / JUMPING */}
            <ellipse cx="140" cy="30" rx="14" ry="16" fill="url(#bu_skin)"/>
            <path d="M 126 22 Q 140 12 154 22 Z" fill="#2C1810"/>
            <circle cx="136" cy="28" r="2.5" fill="#FFF"/>
            <circle cx="136" cy="28" r="1.5" fill="#2C1810"/>
            <ellipse cx="126" cy="30" rx="3" ry="5" fill="#E8956D"/>
            <path d="M 133 44 Q 140 41 148 44 L 148 80 Q 140 83 133 80 Z" fill="url(#bu_shirt)"/>
            {/* ARMS UP when jumping */}
            {isJump ? (
              <>
                <path d="M 133 50 Q 112 35 100 22" stroke="url(#bu_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
                <path d="M 148 50 Q 168 35 180 22" stroke="url(#bu_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
                <path d="M 100 22 Q 93 16 88 10" stroke="url(#bu_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
                <path d="M 180 22 Q 187 16 192 10" stroke="url(#bu_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
                <ellipse cx="86" cy="8" rx="8" ry="5" fill="url(#bu_skin)"/>
                <ellipse cx="194" cy="8" rx="8" ry="5" fill="url(#bu_skin)"/>
              </>
            ) : (
              <>
                <path d="M 133 52 Q 110 58 100 68" stroke="url(#bu_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
                <path d="M 148 52 Q 168 58 178 68" stroke="url(#bu_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
                <path d="M 100 68 Q 94 72 90 78" stroke="url(#bu_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
                <path d="M 178 68 Q 184 72 188 78" stroke="url(#bu_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
                <ellipse cx="88" cy="80" rx="8" ry="5" fill="url(#bu_skin)"/>
                <ellipse cx="190" cy="80" rx="8" ry="5" fill="url(#bu_skin)"/>
              </>
            )}
            <ellipse cx="140" cy="82" rx="16" ry="7" fill="#2A4A6F"/>
            <path d="M 130 86 Q 122 105 118 132" stroke="#1E3A5F" strokeWidth="15" fill="none" strokeLinecap="round"/>
            <path d="M 150 86 Q 158 105 162 132" stroke="#1E3A5F" strokeWidth="15" fill="none" strokeLinecap="round"/>
            <ellipse cx="116" cy="132" rx="14" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
            <ellipse cx="164" cy="132" rx="14" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
          </>
        )}
      </g>

      {/* Shadow on floor when jumping */}
      {jumpH > 5 && <ellipse cx="140" cy="133" rx={16 - jumpH * 0.2} ry={4 - jumpH * 0.05} fill="#AAFF0015"/>}

      <text x="50" y="28" fill="#EE5A2480" fontSize="9" fontWeight="700" textAnchor="middle">
        {isJump ? 'JUMP!' : isDown ? 'PLANK ↓' : 'STAND ↑'}
      </text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#EE5A24" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-p)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #EE5A24)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#EE5A24" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

const HumanLunge = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%100), 40); return () => clearInterval(i) }, [])
  const phase = Math.sin(t / 100 * Math.PI * 2)
  const dip = (phase + 1) / 2
  const hipDrop = dip * 22
  return (
    <svg viewBox="0 0 280 160" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="lu_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="lu_shirt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A29BFE"/><stop offset="100%" stopColor="#6C5CE7"/>
        </linearGradient>
        <filter id="lu_sh"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#6C5CE7" floodOpacity="0.25"/></filter>
      </defs>
      <rect x="20" y="138" width="240" height="14" rx="4" fill="#1A1A1A"/>

      <g filter="url(#lu_sh)">
        {/* HEAD */}
        <ellipse cx="160" cy="28" rx="14" ry="16" fill="url(#lu_skin)"/>
        <path d="M 146 20 Q 160 10 174 20 Z" fill="#2C1810"/>
        <circle cx="156" cy="26" r="2.5" fill="#FFF"/>
        <circle cx="156" cy="26" r="1.5" fill="#2C1810"/>
        <ellipse cx="146" cy="29" rx="3" ry="5" fill="#E8956D"/>
        <path d="M 158 34 Q 161 37 165 34" stroke="#C8756D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* NECK */}
        <rect x="153" y="43" width="11" height="12" rx="5" fill="url(#lu_skin)"/>
        {/* TORSO */}
        <path d={`M 148 54 Q 160 51 172 54 L 172 ${74 + hipDrop*0.4} Q 160 ${77+hipDrop*0.4} 148 ${74+hipDrop*0.4} Z`}
          fill="url(#lu_shirt)"/>
        {/* ARMS - natural position */}
        <path d={`M 148 60 Q 130 ${65+hipDrop*0.3} 122 ${72+hipDrop*0.3}`}
          stroke="url(#lu_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={`M 172 60 Q 190 ${65+hipDrop*0.3} 198 ${72+hipDrop*0.3}`}
          stroke="url(#lu_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={`M 122 ${72+hipDrop*0.3} Q 116 ${78+hipDrop*0.2} 112 ${84+hipDrop*0.2}`}
          stroke="url(#lu_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d={`M 198 ${72+hipDrop*0.3} Q 204 ${78+hipDrop*0.2} 208 ${84+hipDrop*0.2}`}
          stroke="url(#lu_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <ellipse cx="110" cy={86+hipDrop*0.2} rx="9" ry="6" fill="url(#lu_skin)"/>
        <ellipse cx="210" cy={86+hipDrop*0.2} rx="9" ry="6" fill="url(#lu_skin)"/>

        {/* WAIST */}
        <ellipse cx="160" cy={76+hipDrop*0.4} rx="20" ry="7" fill="#2A4A6F"/>

        {/* FRONT LEG (right - bent) */}
        <path d={`M 165 ${80+hipDrop*0.4} Q ${175+dip*8} ${100+hipDrop*0.5} ${178+dip*10} ${110+hipDrop*0.4}`}
          stroke="#1E3A5F" strokeWidth="15" fill="none" strokeLinecap="round"/>
        <path d={`M ${178+dip*10} ${110+hipDrop*0.4} Q ${182+dip*4} ${124+hipDrop*0.2} ${180+dip*2} 138`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>

        {/* BACK LEG (left - extended back, knee near floor) */}
        <path d={`M 155 ${80+hipDrop*0.4} Q ${138-dip*6} ${100+hipDrop*0.6} ${128-dip*8} ${112+hipDrop*0.5}`}
          stroke="#1E3A5F" strokeWidth="15" fill="none" strokeLinecap="round"/>
        <path d={`M ${128-dip*8} ${112+hipDrop*0.5} Q ${122-dip*4} ${125+hipDrop*0.3} ${118} 138`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>

        {/* SHOES */}
        <ellipse cx={182+dip*2} cy="138" rx="15" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx={190+dip} cy="137" rx="6" ry="3.5" fill="#222"/>
        <ellipse cx="116" cy="138" rx="14" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="108" cy="137" rx="6" ry="3.5" fill="#222"/>
      </g>

      <text x="50" y="28" fill="#6C5CE780" fontSize="9" fontWeight="700" textAnchor="middle">
        {dip > 0.5 ? 'DOWN ↓' : 'UP ↑'}
      </text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#6C5CE7" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-t/100)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #6C5CE7)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#6C5CE7" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

const HumanDeadlift = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%100), 45); return () => clearInterval(i) }, [])
  const phase = Math.sin(t / 100 * Math.PI * 2)
  const down = (phase + 1) / 2
  const hipAngle = down * 35
  const kneeAngle = down * 20
  return (
    <svg viewBox="0 0 280 160" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="dl_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="dl_shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E17055"/><stop offset="100%" stopColor="#D63031"/>
        </linearGradient>
        <filter id="dl_sh"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#D63031" floodOpacity="0.25"/></filter>
      </defs>
      {/* Floor */}
      <rect x="20" y="140" width="240" height="14" rx="4" fill="#1A1A1A"/>
      {/* Barbell */}
      <rect x="60" y="130" width="160" height="10" rx="5" fill="#555"/>
      <rect x="62" y="128" width="156" height="2" rx="1" fill="#777"/>
      {/* Weight plates */}
      <ellipse cx="68" cy="135" rx="12" ry="20" fill="#333" stroke="#555" strokeWidth="2"/>
      <ellipse cx="68" cy="135" rx="8" ry="15" fill="#222" stroke="#444" strokeWidth="1"/>
      <ellipse cx="212" cy="135" rx="12" ry="20" fill="#333" stroke="#555" strokeWidth="2"/>
      <ellipse cx="212" cy="135" rx="8" ry="15" fill="#222" stroke="#444" strokeWidth="1"/>
      {/* Smaller plates */}
      <ellipse cx="82" cy="135" rx="8" ry="16" fill="#444" stroke="#555" strokeWidth="1.5"/>
      <ellipse cx="198" cy="135" rx="8" ry="16" fill="#444" stroke="#555" strokeWidth="1.5"/>

      <g filter="url(#dl_sh)">
        {/* HEAD - angled based on position */}
        <ellipse cx={140 + hipAngle*0.1} cy={28 + hipAngle*0.3} rx="14" ry="15" fill="url(#dl_skin)"/>
        <path d={`M ${126+hipAngle*0.1} ${20+hipAngle*0.3} Q ${140+hipAngle*0.1} ${10+hipAngle*0.3} ${154+hipAngle*0.1} ${20+hipAngle*0.3} Z`} fill="#2C1810"/>
        <circle cx={136+hipAngle*0.1} cy={26+hipAngle*0.3} r="2.5" fill="#FFF"/>
        <circle cx={136+hipAngle*0.1} cy={26+hipAngle*0.3} r="1.5" fill="#2C1810"/>

        {/* TORSO - hinges at hip */}
        <path d={`
          M ${125+hipAngle*0.4} ${43+hipAngle*0.3}
          Q ${140+hipAngle*0.3} ${40+hipAngle*0.2} ${155+hipAngle*0.4} ${43+hipAngle*0.3}
          L ${152+hipAngle*0.2} ${78+hipAngle*0.8}
          Q ${140} ${81+hipAngle*0.8} ${128+hipAngle*0.2} ${78+hipAngle*0.8} Z`}
          fill="url(#dl_shirt)"/>

        {/* ARMS reaching down */}
        <path d={`M ${128+hipAngle*0.3} 55 Q ${120+hipAngle*0.5} ${75+hipAngle*0.5} ${112+hipAngle*0.6} ${98+hipAngle*0.3}`}
          stroke="url(#dl_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={`M ${152+hipAngle*0.3} 55 Q ${160+hipAngle*0.5} ${75+hipAngle*0.5} ${168+hipAngle*0.6} ${98+hipAngle*0.3}`}
          stroke="url(#dl_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={`M ${112+hipAngle*0.6} ${98+hipAngle*0.3} Q ${106+hipAngle*0.5} ${112+hipAngle*0.3} ${100+hipAngle*0.4} 130`}
          stroke="url(#dl_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d={`M ${168+hipAngle*0.6} ${98+hipAngle*0.3} Q ${174+hipAngle*0.5} ${112+hipAngle*0.3} ${180+hipAngle*0.4} 130`}
          stroke="url(#dl_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* HANDS gripping bar */}
        <ellipse cx={100+hipAngle*0.4} cy="130" rx="11" ry="5" fill="url(#dl_skin)"/>
        <ellipse cx={180+hipAngle*0.4} cy="130" rx="11" ry="5" fill="url(#dl_skin)"/>

        {/* HIPS */}
        <ellipse cx="140" cy={80+hipAngle*0.8} rx="22" ry="8" fill="#2A4A6F"/>

        {/* LEFT THIGH */}
        <path d={`M 132 ${82+hipAngle*0.8} Q ${124-kneeAngle*0.3} ${106+hipAngle*0.2} ${120-kneeAngle*0.5} ${118+kneeAngle*0.2}`}
          stroke="#1E3A5F" strokeWidth="16" fill="none" strokeLinecap="round"/>
        {/* RIGHT THIGH */}
        <path d={`M 148 ${82+hipAngle*0.8} Q ${156+kneeAngle*0.3} ${106+hipAngle*0.2} ${160+kneeAngle*0.5} ${118+kneeAngle*0.2}`}
          stroke="#1E3A5F" strokeWidth="16" fill="none" strokeLinecap="round"/>
        {/* LEFT SHIN */}
        <path d={`M ${120-kneeAngle*0.5} ${118+kneeAngle*0.2} Q 118 128 120 140`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>
        {/* RIGHT SHIN */}
        <path d={`M ${160+kneeAngle*0.5} ${118+kneeAngle*0.2} Q 162 128 160 140`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>
        {/* SHOES */}
        <ellipse cx="118" cy="140" rx="15" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="110" cy="139" rx="6" ry="3.5" fill="#222"/>
        <ellipse cx="162" cy="140" rx="15" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="170" cy="139" rx="6" ry="3.5" fill="#222"/>
      </g>

      <text x="50" y="28" fill="#D6303180" fontSize="9" fontWeight="700" textAnchor="middle">
        {down > 0.5 ? 'LOWER ↓' : 'LIFT ↑'}
      </text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#D63031" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-t/100)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #D63031)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#D63031" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

const HumanMountainClimber = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%50), 30); return () => clearInterval(i) }, [])
  const p = t / 50
  const leftKnee = Math.sin(p * Math.PI * 2) * 28
  const rightKnee = Math.sin(p * Math.PI * 2 + Math.PI) * 28
  return (
    <svg viewBox="0 0 300 120" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="mc_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="mc_shirt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00B894"/><stop offset="100%" stopColor="#00CEC9"/>
        </linearGradient>
        <filter id="mc_sh"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#00B894" floodOpacity="0.2"/></filter>
      </defs>
      <rect x="10" y="100" width="280" height="14" rx="4" fill="#1A1A1A"/>

      <g filter="url(#mc_sh)">
        {/* HEAD */}
        <ellipse cx="252" cy="38" rx="13" ry="14" fill="url(#mc_skin)"/>
        <path d="M 239 30 Q 252 20 265 30 Z" fill="#2C1810"/>
        <circle cx="248" cy="36" r="2" fill="#FFF"/><circle cx="248" cy="36" r="1.2" fill="#2C1810"/>
        {/* NECK */}
        <path d="M 250 52 Q 244 58 242 62" stroke="url(#mc_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
        {/* TORSO */}
        <path d="M 242 62 Q 200 68 165 72 Q 130 74 108 76 L 108 86 Q 130 84 165 82 Q 200 79 242 74 Z"
          fill="url(#mc_shirt)"/>
        {/* ARMS on ground */}
        <path d="M 230 66 Q 232 80 234 100" stroke="url(#mc_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
        <path d="M 192 70 Q 194 84 196 100" stroke="url(#mc_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
        <ellipse cx="236" cy="100" rx="10" ry="4.5" fill="url(#mc_skin)"/>
        <ellipse cx="197" cy="100" rx="10" ry="4.5" fill="url(#mc_skin)"/>

        {/* WAIST */}
        <path d="M 108 76 Q 90 77 75 78 L 75 86 Q 90 85 108 84 Z" fill="#2A4A6F"/>

        {/* LEFT LEG - alternating */}
        <path d={`M 100 78 Q ${85 + leftKnee*0.4} ${78 - Math.abs(leftKnee)*0.4} ${78 + leftKnee*0.5} ${100 - Math.abs(leftKnee)*0.3}`}
          stroke="#1E3A5F" strokeWidth="14" fill="none" strokeLinecap="round"/>
        <path d={`M ${78 + leftKnee*0.5} ${100 - Math.abs(leftKnee)*0.3} Q ${72+leftKnee*0.3} ${100} ${68+leftKnee*0.2} 100`}
          stroke="#152A45" strokeWidth="11" fill="none" strokeLinecap="round"/>
        {/* RIGHT LEG - alternating */}
        <path d={`M 100 83 Q ${85 + rightKnee*0.4} ${83 - Math.abs(rightKnee)*0.4} ${78 + rightKnee*0.5} ${100 - Math.abs(rightKnee)*0.3}`}
          stroke="#1E3A5F" strokeWidth="12" fill="none" strokeLinecap="round"/>
        <path d={`M ${78 + rightKnee*0.5} ${100 - Math.abs(rightKnee)*0.3} Q ${72+rightKnee*0.3} ${100} ${68+rightKnee*0.2} 100`}
          stroke="#152A45" strokeWidth="10" fill="none" strokeLinecap="round"/>

        {/* SHOES */}
        <ellipse cx={66+leftKnee*0.2} cy="100" rx="11" ry="4" fill="#111" stroke="#222" strokeWidth="1"/>
        <ellipse cx={66+rightKnee*0.2} cy="101" rx="10" ry="3.5" fill="#111" stroke="#222" strokeWidth="1"/>
      </g>

      <text x="50" y="28" fill="#00B89480" fontSize="9" fontWeight="700" textAnchor="middle">FAST ⚡</text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#00B894" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-p)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #00B894)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#00B894" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

const HumanJumpingJack = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%60), 35); return () => clearInterval(i) }, [])
  const open = Math.sin(t / 60 * Math.PI * 2)
  const spread = Math.abs(open)
  const armUp = open > 0
  return (
    <svg viewBox="0 0 280 170" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="jj_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="jj_shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDCB6E"/><stop offset="100%" stopColor="#E17055"/>
        </linearGradient>
        <filter id="jj_sh"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#FDCB6E" floodOpacity="0.2"/></filter>
      </defs>
      <rect x="20" y="148" width="240" height="14" rx="4" fill="#1A1A1A"/>

      <g filter="url(#jj_sh)">
        {/* HEAD */}
        <ellipse cx="140" cy="26" rx="15" ry="17" fill="url(#jj_skin)"/>
        <path d="M 125 18 Q 140 8 155 18 Z" fill="#2C1810"/>
        <circle cx="136" cy="24" r="2.5" fill="#FFF"/><circle cx="136" cy="24" r="1.5" fill="#2C1810"/>
        <ellipse cx="125" cy="27" rx="3" ry="5" fill="#E8956D"/>
        <path d="M 138 32 Q 141 35 145 32" stroke="#C8756D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* NECK */}
        <rect x="133" y="42" width="12" height="12" rx="5" fill="url(#jj_skin)"/>
        {/* TORSO */}
        <path d="M 128 53 Q 140 50 152 53 L 152 88 Q 140 91 128 88 Z" fill="url(#jj_shirt)"/>
        {/* Logo */}
        <circle cx="140" cy="70" r="7" fill="#FFFFFF15" stroke="#FFFFFF25" strokeWidth="1"/>

        {/* ARMS */}
        {armUp ? (
          <>
            {/* Arms UP */}
            <path d={`M 128 60 Q ${108 - spread*22} ${48 - spread*20} ${100 - spread*30} ${32 - spread*18}`}
              stroke="url(#jj_shirt)" strokeWidth="11" fill="none" strokeLinecap="round"/>
            <path d={`M 152 60 Q ${172 + spread*22} ${48 - spread*20} ${180 + spread*30} ${32 - spread*18}`}
              stroke="url(#jj_shirt)" strokeWidth="11" fill="none" strokeLinecap="round"/>
            <path d={`M ${100 - spread*30} ${32 - spread*18} Q ${94 - spread*10} ${24 - spread*8} ${88 - spread*10} ${20 - spread*6}`}
              stroke="url(#jj_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
            <path d={`M ${180 + spread*30} ${32 - spread*18} Q ${186 + spread*10} ${24 - spread*8} ${192 + spread*10} ${20 - spread*6}`}
              stroke="url(#jj_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
            <ellipse cx={86 - spread*10} cy={18 - spread*6} rx="9" ry="6" fill="url(#jj_skin)"/>
            <ellipse cx={194 + spread*10} cy={18 - spread*6} rx="9" ry="6" fill="url(#jj_skin)"/>
          </>
        ) : (
          <>
            {/* Arms DOWN */}
            <path d={`M 128 60 Q ${112 - spread*5} ${75 + spread*5} ${108 - spread*8} ${90 + spread*5}`}
              stroke="url(#jj_shirt)" strokeWidth="11" fill="none" strokeLinecap="round"/>
            <path d={`M 152 60 Q ${168 + spread*5} ${75 + spread*5} ${172 + spread*8} ${90 + spread*5}`}
              stroke="url(#jj_shirt)" strokeWidth="11" fill="none" strokeLinecap="round"/>
            <path d={`M ${108 - spread*8} ${90 + spread*5} Q ${104} ${100} ${102} ${108}`}
              stroke="url(#jj_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
            <path d={`M ${172 + spread*8} ${90 + spread*5} Q ${176} ${100} ${178} ${108}`}
              stroke="url(#jj_skin)" strokeWidth="9" fill="none" strokeLinecap="round"/>
            <ellipse cx="101" cy="110" rx="9" ry="6" fill="url(#jj_skin)"/>
            <ellipse cx="179" cy="110" rx="9" ry="6" fill="url(#jj_skin)"/>
          </>
        )}

        {/* WAIST */}
        <ellipse cx="140" cy="90" rx="20" ry="8" fill="#2A4A6F"/>

        {/* LEFT THIGH */}
        <path d={`M 133 95 Q ${125 - spread*20} ${115} ${122 - spread*24} ${130}`}
          stroke="#1E3A5F" strokeWidth="16" fill="none" strokeLinecap="round"/>
        {/* RIGHT THIGH */}
        <path d={`M 147 95 Q ${155 + spread*20} ${115} ${158 + spread*24} ${130}`}
          stroke="#1E3A5F" strokeWidth="16" fill="none" strokeLinecap="round"/>
        {/* LEFT SHIN */}
        <path d={`M ${122 - spread*24} ${130} Q ${120 - spread*10} ${138} ${118 - spread*8} 148`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>
        {/* RIGHT SHIN */}
        <path d={`M ${158 + spread*24} ${130} Q ${160 + spread*10} ${138} ${162 + spread*8} 148`}
          stroke="#152A45" strokeWidth="13" fill="none" strokeLinecap="round"/>
        {/* SHOES */}
        <ellipse cx={116 - spread*8} cy="148" rx="14" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx={108 - spread*5} cy="147" rx="5.5" ry="3.5" fill="#222"/>
        <ellipse cx={164 + spread*8} cy="148" rx="14" ry="5.5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx={172 + spread*5} cy="147" rx="5.5" ry="3.5" fill="#222"/>
      </g>

      <text x="50" y="28" fill="#FDCB6E80" fontSize="9" fontWeight="700" textAnchor="middle">
        {armUp ? 'OPEN ↑' : 'CLOSE ↓'}
      </text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#FDCB6E" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-t/60)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #FDCB6E)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#FDCB6E" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

const HumanHighKnees = () => {
  const [t, setT] = useState(0)
  useEffect(() => { const i = setInterval(() => setT(p => (p+1)%40), 28); return () => clearInterval(i) }, [])
  const p = t / 40
  const leftUp = Math.max(0, Math.sin(p * Math.PI * 2)) * 35
  const rightUp = Math.max(0, Math.sin(p * Math.PI * 2 + Math.PI)) * 35
  const armSwing = Math.sin(p * Math.PI * 2) * 15
  return (
    <svg viewBox="0 0 280 160" style={{ width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id="hk_skin" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDBCB4"/><stop offset="100%" stopColor="#E8956D"/>
        </radialGradient>
        <linearGradient id="hk_shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#74B9FF"/><stop offset="100%" stopColor="#0984E3"/>
        </linearGradient>
        <filter id="hk_sh"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0984E3" floodOpacity="0.25"/></filter>
      </defs>
      <rect x="20" y="138" width="240" height="14" rx="4" fill="#1A1A1A"/>

      <g filter="url(#hk_sh)">
        {/* HEAD */}
        <ellipse cx="140" cy="26" rx="14" ry="16" fill="url(#hk_skin)"/>
        <path d="M 126 18 Q 140 8 154 18 Z" fill="#2C1810"/>
        <circle cx="136" cy="24" r="2.5" fill="#FFF"/><circle cx="136" cy="24" r="1.5" fill="#2C1810"/>
        <ellipse cx="126" cy="27" rx="3" ry="5" fill="#E8956D"/>
        <path d="M 138 32 Q 141 35 145 32" stroke="#C8756D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* NECK */}
        <rect x="133" y="41" width="11" height="12" rx="5" fill="url(#hk_skin)"/>
        {/* TORSO */}
        <path d="M 128 52 Q 140 49 152 52 L 152 88 Q 140 91 128 88 Z" fill="url(#hk_shirt)"/>
        {/* Stripe */}
        <path d="M 128 70 Q 140 68 152 70" stroke="#FFFFFF30" strokeWidth="4"/>

        {/* ARM - left (opposite to right knee) */}
        <path d={`M 128 58 Q ${112 - armSwing*0.8} ${68 + armSwing*0.3} ${104 - armSwing} ${80 + armSwing*0.2}`}
          stroke="url(#hk_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={`M ${104 - armSwing} ${80 + armSwing*0.2} Q ${98 - armSwing*0.5} ${90} ${94 - armSwing*0.3} ${100}`}
          stroke="url(#hk_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <ellipse cx={92 - armSwing*0.3} cy="102" rx="8" ry="5" fill="url(#hk_skin)"/>

        {/* ARM - right */}
        <path d={`M 152 58 Q ${168 + armSwing*0.8} ${68 - armSwing*0.3} ${176 + armSwing} ${80 - armSwing*0.2}`}
          stroke="url(#hk_shirt)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={`M ${176 + armSwing} ${80 - armSwing*0.2} Q ${182 + armSwing*0.5} ${90} ${186 + armSwing*0.3} ${100}`}
          stroke="url(#hk_skin)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <ellipse cx={188 + armSwing*0.3} cy="102" rx="8" ry="5" fill="url(#hk_skin)"/>

        {/* WAIST */}
        <ellipse cx="140" cy="90" rx="20" ry="7" fill="#2A4A6F"/>

        {/* LEFT THIGH - up */}
        <path d={`M 132 92 Q ${126 - leftUp*0.2} ${105 - leftUp*0.5} ${122 - leftUp*0.3} ${112 - leftUp*0.6}`}
          stroke="#1E3A5F" strokeWidth="15" fill="none" strokeLinecap="round"/>
        {/* LEFT SHIN */}
        <path d={`M ${122 - leftUp*0.3} ${112 - leftUp*0.6} Q ${118} ${124 - leftUp*0.3} ${116} 138`}
          stroke="#152A45" strokeWidth="12" fill="none" strokeLinecap="round"/>

        {/* RIGHT THIGH - up */}
        <path d={`M 148 92 Q ${154 + rightUp*0.2} ${105 - rightUp*0.5} ${158 + rightUp*0.3} ${112 - rightUp*0.6}`}
          stroke="#1E3A5F" strokeWidth="15" fill="none" strokeLinecap="round"/>
        {/* RIGHT SHIN */}
        <path d={`M ${158 + rightUp*0.3} ${112 - rightUp*0.6} Q ${162} ${124 - rightUp*0.3} ${164} 138`}
          stroke="#152A45" strokeWidth="12" fill="none" strokeLinecap="round"/>

        {/* SHOES */}
        <ellipse cx="114" cy="138" rx="14" ry="5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="106" cy="137" rx="5.5" ry="3.5" fill="#222"/>
        <ellipse cx="166" cy="138" rx="14" ry="5" fill="#111" stroke="#222" strokeWidth="1.5"/>
        <ellipse cx="174" cy="137" rx="5.5" ry="3.5" fill="#222"/>
      </g>

      <text x="50" y="28" fill="#0984E380" fontSize="9" fontWeight="700" textAnchor="middle">SPRINT ⚡</text>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#0984E3" strokeWidth="3"
        strokeDasharray={`${2*Math.PI*18}`}
        strokeDashoffset={`${2*Math.PI*18*(1-p)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ filter:'drop-shadow(0 0 6px #0984E3)' }}/>
      <text x="50" y="54" textAnchor="middle" fill="#0984E3" fontSize="8" fontWeight="800">{t}%</text>
    </svg>
  )
}

// ── EXERCISE DATA ─────────────────────────────────────────────
const EXERCISES = [
  {
    id:'pushup', name:'Push-Up', muscle:'Chest · Shoulders · Triceps',
    sets:'3 × 15 reps', rest:'45 sec', difficulty:'Beginner',
    color:'#AAFF00', calories:8, mets:8.0,
    tips:['Keep core tight throughout','Lower chest to floor','Elbows at 45 degrees','Exhale on the way up'],
    muscles:['Pectorals','Anterior Deltoids','Triceps','Core'],
    animation: <HumanPushUp/>,
  },
  {
    id:'squat', name:'Bodyweight Squat', muscle:'Quads · Glutes · Hamstrings',
    sets:'3 × 20 reps', rest:'45 sec', difficulty:'Beginner',
    color:'#FF6B6B', calories:10, mets:5.0,
    tips:['Feet shoulder-width apart','Knees track over toes','Chest stays upright','Thighs parallel to floor'],
    muscles:['Quadriceps','Gluteus Maximus','Hamstrings','Calves'],
    animation: <HumanSquat/>,
  },
  {
    id:'plank', name:'Plank Hold', muscle:'Core · Shoulders · Glutes',
    sets:'3 × 45 sec', rest:'30 sec', difficulty:'Beginner',
    color:'#4ECDC4', calories:4, mets:4.0,
    tips:['Straight line head to heel','Breathe steadily','Squeeze glutes and abs','Don\'t drop hips'],
    muscles:['Rectus Abdominis','Transverse Abdominis','Deltoids','Glutes'],
    animation: <HumanPlank/>,
  },
  {
    id:'burpee', name:'Burpee', muscle:'Full Body · Cardio Power',
    sets:'3 × 8 reps', rest:'90 sec', difficulty:'Advanced',
    color:'#EE5A24', calories:14, mets:8.0,
    tips:['Explosive jump at top','Soft landing on feet','Fast push-up transition','Full hip extension'],
    muscles:['Full Body','Cardiovascular','Core','Legs'],
    animation: <HumanBurpee/>,
  },
  {
    id:'lunge', name:'Reverse Lunge', muscle:'Quads · Glutes · Balance',
    sets:'3 × 12 each leg', rest:'45 sec', difficulty:'Beginner',
    color:'#6C5CE7', calories:9, mets:4.0,
    tips:['Step back not forward','Front knee stays over ankle','Torso upright and tall','Drive through front heel'],
    muscles:['Quadriceps','Gluteus Medius','Hip Flexors','Balance'],
    animation: <HumanLunge/>,
  },
  {
    id:'deadlift', name:'Romanian Deadlift', muscle:'Hamstrings · Glutes · Back',
    sets:'3 × 12 reps', rest:'60 sec', difficulty:'Intermediate',
    color:'#D63031', calories:12, mets:6.0,
    tips:['Neutral spine always','Push hips back — not down','Bar stays close to legs','Feel hamstring stretch'],
    muscles:['Hamstrings','Gluteus Maximus','Erector Spinae','Traps'],
    animation: <HumanDeadlift/>,
  },
  {
    id:'mountain', name:'Mountain Climber', muscle:'Core · Cardio · Shoulders',
    sets:'3 × 30 sec', rest:'30 sec', difficulty:'Intermediate',
    color:'#00B894', calories:11, mets:8.0,
    tips:['Hips stay level with shoulders','Drive knees explosively','Keep arms straight','Alternate fast'],
    muscles:['Core','Hip Flexors','Shoulders','Cardiovascular'],
    animation: <HumanMountainClimber/>,
  },
  {
    id:'jumpingjack', name:'Jumping Jack', muscle:'Full Body · Warm-Up',
    sets:'3 × 30 reps', rest:'20 sec', difficulty:'Beginner',
    color:'#FDCB6E', calories:6, mets:8.0,
    tips:['Land softly on balls of feet','Arms fully extended overhead','Maintain steady rhythm','Keep core engaged'],
    muscles:['Full Body','Cardiovascular','Shoulders','Legs'],
    animation: <HumanJumpingJack/>,
  },
  {
    id:'highknees', name:'High Knees', muscle:'Hip Flexors · Cardio · Core',
    sets:'3 × 30 sec', rest:'30 sec', difficulty:'Intermediate',
    color:'#0984E3', calories:12, mets:8.0,
    tips:['Drive knees to hip height','Pump arms in sync','Land on balls of feet','Maximum sprint pace'],
    muscles:['Hip Flexors','Quadriceps','Core','Cardiovascular'],
    animation: <HumanHighKnees/>,
  },
]

const DIFF_COLOR: Record<string,string> = {
  Beginner:'#22C55E', Intermediate:'#F97316', Advanced:'#EF4444'
}

const NAV = () => (
  <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',zIndex:100,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 24px 28px' }}>
    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
      {[
        {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
        {href:'/social',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Social'},
      ].map(n=>(
        <a key={n.href} href={n.href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1}}>
          {n.icon}<div style={{fontSize:'10px',color:'#3A3A3A',fontWeight:'600'}}>{n.label}</div>
        </a>
      ))}
      <a href="/create-post" style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)'}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
      </a>
      {[
        {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
        {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile'},
      ].map(n=>(
        <a key={n.href} href={n.href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1}}>
          {n.icon}<div style={{fontSize:'10px',color:'#3A3A3A',fontWeight:'600'}}>{n.label}</div>
        </a>
      ))}
    </div>
  </div>
)

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function WorkoutPage() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPlan, setAiPlan] = useState('')
  const [loading, setLoading] = useState(false)
  const [level, setLevel] = useState('beginner')
  const [wType, setWType] = useState('home')
  const [duration, setDuration] = useState('30')
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [activeTab, setActiveTab] = useState('exercises')
  const [selected, setSelected] = useState<typeof EXERCISES[0]|null>(null)
  const [filter, setFilter] = useState('All')
  const [newW, setNewW] = useState({name:'',type:'strength',duration_minutes:'',calories_burned:''})
  const timerRef = useRef<ReturnType<typeof setInterval>|undefined>(undefined)
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchWorkouts() }, [])
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s+1), 1000)
    } else {
      if (timerRef.current !== undefined) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current !== undefined) clearInterval(timerRef.current) }
  }, [timerActive])

  const fetchWorkouts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('workouts').select('*').eq('user_id', user.id).order('created_at',{ascending:false}).limit(10)
    if (data) setWorkouts(data)
  }

  const addWorkout = async () => {
    if (!newW.name.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('workouts').insert({
      user_id:user.id, workout_date:today, name:newW.name, type:newW.type,
      duration_minutes:parseInt(newW.duration_minutes)||0,
      calories_burned:parseInt(newW.calories_burned)||0, completed:true,
    })
    setNewW({name:'',type:'strength',duration_minutes:'',calories_burned:''})
    setShowAdd(false); setLoading(false); fetchWorkouts()
  }

  const toggleComplete = async (id:string, completed:boolean) => {
    await supabase.from('workouts').update({completed:!completed}).eq('id',id); fetchWorkouts()
  }
  const deleteWorkout = async (id:string) => {
    await supabase.from('workouts').delete().eq('id',id); fetchWorkouts()
  }

  const generateAI = async () => {
    setAiLoading(true); setAiPlan('')
    const res = await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'workout',messages:[{role:'user',content:`Create a ${duration} minute ${wType} workout for ${level}. Include exercise name, sets, reps, rest time and calories.`}]})})
    const data = await res.json()
    setAiPlan(data.message); setAiLoading(false)
  }

  const fmt = (s:number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const todayW = workouts.filter(w=>w.workout_date===today)
  const totalCals = todayW.reduce((s,w)=>s+(w.calories_burned||0),0)
  const totalMins = todayW.reduce((s,w)=>s+(w.duration_minutes||0),0)
  const filtered = filter==='All' ? EXERCISES : EXERCISES.filter(e=>e.difficulty===filter)
  const inp = {background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'11px 14px',color:'#fff',fontSize:'13px',outline:'none'} as React.CSSProperties
  const typeIcon: Record<string,string> = {strength:'💪',cardio:'🏃',yoga:'🧘',hiit:'⚡',sports:'⚽',general:'🏋️'}

  return (
    <div style={{minHeight:'100vh',background:'#080808',paddingBottom:'100px',fontFamily:'Inter,sans-serif',animation:'fadeInUp 0.4s ease both'}}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Background grid */}
      <div style={{position:'fixed',inset:0,backgroundImage:'linear-gradient(rgba(249,115,22,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.015) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none',zIndex:0}}/>

      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:50,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(249,115,22,0.1)',padding:'52px 20px 16px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <a href="/dashboard" style={{width:'36px',height:'36px',borderRadius:'10px',background:'#111',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',textDecoration:'none',fontSize:'16px'}}>←</a>
            <div>
              <div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>Fitness Trainer</div>
              <div style={{fontSize:'11px',color:'#F97316',fontWeight:'600'}}>Human animated workout guide</div>
            </div>
          </div>
          <button onClick={()=>setShowAdd(!showAdd)}
            style={{background:'linear-gradient(135deg,#F97316,#EE5A24)',color:'#fff',border:'none',borderRadius:'20px',padding:'9px 18px',fontSize:'13px',fontWeight:'800',boxShadow:'0 0 20px rgba(249,115,22,0.4)'}}>
            + Log
          </button>
        </div>
        <div style={{display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'4px',gap:'4px'}}>
          {['exercises','ai','history'].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{flex:1,padding:'9px',borderRadius:'8px',border:'none',background:activeTab===tab?'linear-gradient(135deg,#F97316,#EE5A24)':'transparent',color:activeTab===tab?'#fff':'#3A3A3A',fontSize:'12px',fontWeight:'700',cursor:'pointer',transition:'all 0.2s'}}>
              {tab==='ai'?'AI Plan':tab==='history'?'History':'Exercises'}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'16px 20px',position:'relative',zIndex:10}}>

        {/* ── EXERCISES TAB ── */}
        {activeTab==='exercises' && (
          <div style={{animation:'fadeInUp 0.4s ease both'}}>

            {/* Full-screen exercise modal */}
            {selected && (
              <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.95)',backdropFilter:'blur(16px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}
                onClick={()=>setSelected(null)}>
                <div style={{width:'100%',maxWidth:'480px',background:'#0A0A0A',borderRadius:'28px 28px 0 0',padding:'0 0 40px',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',maxHeight:'92vh',overflowY:'auto',animation:'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both'}}
                  onClick={e=>e.stopPropagation()}>
                  {/* Handle */}
                  <div style={{display:'flex',justifyContent:'center',padding:'12px 0'}}>
                    <div style={{width:'40px',height:'4px',background:'rgba(255,255,255,0.15)',borderRadius:'2px'}}/>
                  </div>

                  {/* LARGE ANIMATION */}
                  <div style={{background:'linear-gradient(135deg,#0D0D0D,#111)',margin:'0 16px 16px',borderRadius:'20px',height:'260px',position:'relative',overflow:'hidden',border:`1px solid ${selected.color}20`}}>
                    <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 50%, ${selected.color}06, transparent 70%)`}}/>
                    <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${selected.color}08 1px,transparent 1px),linear-gradient(90deg,${selected.color}08 1px,transparent 1px)`,backgroundSize:'30px 30px'}}/>
                    {selected.animation}
                    {/* Live badge */}
                    <div style={{position:'absolute',top:'14px',right:'14px',display:'flex',alignItems:'center',gap:'6px',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',borderRadius:'20px',padding:'5px 12px',border:`1px solid ${selected.color}30`}}>
                      <div style={{width:'6px',height:'6px',borderRadius:'50%',background:selected.color,animation:'pulse 1.5s infinite'}}/>
                      <span style={{fontSize:'10px',color:selected.color,fontWeight:'700'}}>LIVE ANIMATION</span>
                    </div>
                  </div>

                  <div style={{padding:'0 20px'}}>
                    {/* Title */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                      <div style={{fontSize:'22px',fontWeight:'900',color:'#fff'}}>{selected.name}</div>
                      <div style={{fontSize:'11px',color:DIFF_COLOR[selected.difficulty],fontWeight:'700',background:`${DIFF_COLOR[selected.difficulty]}15`,padding:'4px 12px',borderRadius:'20px',border:`1px solid ${DIFF_COLOR[selected.difficulty]}30`}}>
                        {selected.difficulty}
                      </div>
                    </div>
                    <div style={{fontSize:'13px',color:'#52525B',marginBottom:'16px'}}>{selected.muscle}</div>

                    {/* Stats */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'16px'}}>
                      {[
                        {label:'Sets & Reps',value:selected.sets,color:selected.color,icon:'🔄'},
                        {label:'Rest Time',value:selected.rest,color:'#3B82F6',icon:'⏱️'},
                        {label:'Calories',value:`~${selected.calories}`,color:'#F97316',icon:'🔥'},
                      ].map(s=>(
                        <div key={s.label} style={{background:'#111',borderRadius:'16px',padding:'14px 10px',textAlign:'center',border:`1px solid ${s.color}15`}}>
                          <div style={{fontSize:'18px',marginBottom:'4px'}}>{s.icon}</div>
                          <div style={{fontSize:'14px',fontWeight:'800',color:s.color}}>{s.value}</div>
                          <div style={{fontSize:'9px',color:'#3A3A3A',fontWeight:'600',marginTop:'2px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Muscles worked */}
                    <div style={{background:'#111',borderRadius:'16px',padding:'14px 16px',marginBottom:'14px',border:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{fontSize:'11px',color:'#3A3A3A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>MUSCLES WORKED</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                        {selected.muscles.map(m=>(
                          <div key={m} style={{background:`${selected.color}12`,border:`1px solid ${selected.color}25`,borderRadius:'20px',padding:'4px 12px',fontSize:'12px',color:selected.color,fontWeight:'600'}}>
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Form tips */}
                    <div style={{background:`linear-gradient(135deg,${selected.color}06,rgba(0,0,0,0))`,border:`1px solid ${selected.color}15`,borderRadius:'16px',padding:'14px 16px',marginBottom:'16px'}}>
                      <div style={{fontSize:'11px',color:selected.color,fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'12px'}}>PERFECT FORM TIPS</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        {selected.tips.map((tip,i)=>(
                          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
                            <div style={{width:'20px',height:'20px',borderRadius:'50%',background:`${selected.color}15`,border:`1px solid ${selected.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'900',color:selected.color,flexShrink:0}}>{i+1}</div>
                            <div style={{fontSize:'13px',color:'#C0C0C0',lineHeight:'1.5',paddingTop:'2px'}}>{tip}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={()=>setSelected(null)}
                      style={{width:'100%',background:'#111',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'14px',color:'#fff',fontSize:'14px',fontWeight:'700',cursor:'pointer',transition:'all 0.2s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='#1A1A1A'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#111'}}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Timer */}
            <div style={{background:'#111',border:`1px solid ${timerActive?'rgba(249,115,22,0.25)':'rgba(255,255,255,0.06)'}`,borderRadius:'20px',padding:'18px',marginBottom:'14px',transition:'all 0.3s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                <div style={{fontSize:'13px',fontWeight:'700',color:'#fff'}}>Workout Timer</div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',background:timerActive?'rgba(249,115,22,0.1)':'rgba(255,255,255,0.04)',borderRadius:'20px',padding:'4px 10px'}}>
                  <div style={{width:'5px',height:'5px',borderRadius:'50%',background:timerActive?'#F97316':'#3A3A3A',animation:timerActive?'pulse 1s infinite':'none'}}/>
                  <div style={{fontSize:'10px',color:timerActive?'#F97316':'#3A3A3A',fontWeight:'700',letterSpacing:'0.1em'}}>{timerActive?'ACTIVE':'READY'}</div>
                </div>
              </div>
              <div style={{textAlign:'center',marginBottom:'14px'}}>
                <div style={{fontSize:'56px',fontWeight:'900',color:timerActive?'#F97316':'#fff',letterSpacing:'-0.04em',fontVariantNumeric:'tabular-nums',transition:'all 0.3s',textShadow:timerActive?'0 0 40px rgba(249,115,22,0.4)':'none'}}>
                  {fmt(timerSeconds)}
                </div>
              </div>
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={()=>setTimerActive(!timerActive)}
                  style={{flex:1,background:timerActive?'rgba(239,68,68,0.1)':'rgba(249,115,22,0.1)',border:`1px solid ${timerActive?'rgba(239,68,68,0.3)':'rgba(249,115,22,0.3)'}`,borderRadius:'12px',padding:'11px',color:timerActive?'#EF4444':'#F97316',fontSize:'14px',fontWeight:'800',cursor:'pointer',transition:'all 0.2s'}}>
                  {timerActive?'⏸ Pause':'▶ Start'}
                </button>
                <button onClick={()=>{setTimerActive(false);setTimerSeconds(0)}}
                  style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'11px',color:'#3A3A3A',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
                  ↺ Reset
                </button>
              </div>
            </div>

            {/* Today stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'16px'}}>
              {[
                {label:'Burned',value:totalCals,unit:'kcal',color:'#F97316',icon:'🔥'},
                {label:'Time',value:totalMins,unit:'min',color:'#AAFF00',icon:'⏱️'},
                {label:'Sessions',value:todayW.length,unit:'today',color:'#22C55E',icon:'💪'},
              ].map(s=>(
                <div key={s.label} style={{background:'#111',border:`1px solid ${s.color}20`,borderRadius:'16px',padding:'14px',textAlign:'center',transition:'all 0.2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=`${s.color}40`;e.currentTarget.style.transform='translateY(-2px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=`${s.color}20`;e.currentTarget.style.transform='translateY(0)'}}>
                  <div style={{fontSize:'22px',marginBottom:'6px'}}>{s.icon}</div>
                  <div style={{fontSize:'22px',fontWeight:'900',color:s.color,letterSpacing:'-0.02em'}}>{s.value}</div>
                  <div style={{fontSize:'9px',color:'#3A3A3A',fontWeight:'600',marginTop:'2px',textTransform:'uppercase'}}>{s.unit}</div>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div style={{display:'flex',gap:'8px',marginBottom:'14px',overflowX:'auto'}}>
              {['All','Beginner','Intermediate','Advanced'].map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{flexShrink:0,padding:'7px 16px',borderRadius:'20px',border:'1px solid',borderColor:filter===f?'#F97316':'rgba(255,255,255,0.07)',background:filter===f?'rgba(249,115,22,0.12)':'#111',color:filter===f?'#F97316':'#3A3A3A',fontSize:'12px',fontWeight:'600',cursor:'pointer',transition:'all 0.2s'}}>
                  {f}
                </button>
              ))}
            </div>

            {/* Section title */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
              <div style={{fontSize:'11px',color:'#3A3A3A',fontWeight:'700',letterSpacing:'0.1em',textTransform:'uppercase'}}>
                Human Animated Exercises · {filtered.length}
              </div>
              <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.04)'}}/>
              <div style={{fontSize:'10px',color:'#F97316',fontWeight:'600'}}>Tap to view</div>
            </div>

            {/* Exercise cards */}
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {filtered.map((ex,i)=>(
                <div key={ex.id} onClick={()=>setSelected(ex)}
                  style={{background:'linear-gradient(135deg,#111,#0D0D0D)',border:`1px solid ${ex.color}12`,borderRadius:'22px',overflow:'hidden',cursor:'pointer',transition:'all 0.25s',animation:`fadeInUp 0.5s ease ${i*0.05}s both`,position:'relative'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor=`${ex.color}30`;e.currentTarget.style.boxShadow=`0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${ex.color}10`}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor=`${ex.color}12`;e.currentTarget.style.boxShadow='none'}}>

                  {/* Color accent left bar */}
                  <div style={{position:'absolute',left:0,top:0,bottom:0,width:'3px',background:`linear-gradient(180deg,${ex.color},${ex.color}40)`}}/>

                  <div style={{display:'flex',alignItems:'stretch'}}>
                    {/* Animation preview */}
                    <div style={{width:'140px',height:'110px',background:'#0D0D0D',flexShrink:0,position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 60% 50%, ${ex.color}06, transparent 70%)`}}/>
                      {ex.animation}
                      {/* Live dot */}
                      <div style={{position:'absolute',bottom:'8px',left:'8px',display:'flex',alignItems:'center',gap:'4px'}}>
                        <div style={{width:'5px',height:'5px',borderRadius:'50%',background:ex.color,animation:'pulse 1.5s infinite'}}/>
                        <span style={{fontSize:'8px',color:ex.color,fontWeight:'700'}}>LIVE</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{flex:1,padding:'14px 14px 14px 16px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'5px'}}>
                        <div style={{fontSize:'15px',fontWeight:'800',color:'#fff',lineHeight:1.2}}>{ex.name}</div>
                        <div style={{fontSize:'9px',color:DIFF_COLOR[ex.difficulty],fontWeight:'700',background:`${DIFF_COLOR[ex.difficulty]}15`,padding:'3px 8px',borderRadius:'20px',border:`1px solid ${DIFF_COLOR[ex.difficulty]}25`,flexShrink:0,marginLeft:'8px'}}>
                          {ex.difficulty}
                        </div>
                      </div>
                      <div style={{fontSize:'11px',color:'#52525B',marginBottom:'10px'}}>{ex.muscle}</div>
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}}>
                        <div style={{fontSize:'11px',color:ex.color,fontWeight:'700',background:`${ex.color}10`,padding:'3px 8px',borderRadius:'8px',border:`1px solid ${ex.color}20`}}>{ex.sets}</div>
                        <div style={{fontSize:'11px',color:'#3A3A3A',background:'rgba(255,255,255,0.04)',padding:'3px 8px',borderRadius:'8px'}}>Rest {ex.rest}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{fontSize:'11px',color:'#F97316',fontWeight:'600'}}>🔥 ~{ex.calories} kcal</span>
                        <span style={{color:'#2A2A2A'}}>·</span>
                        <span style={{fontSize:'11px',color:'#52525B'}}>MET {ex.mets}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tap hint */}
                  <div style={{borderTop:`1px solid ${ex.color}08`,padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:'10px',color:'#3A3A3A'}}>Tap to see full animation + form tips</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ex.color} strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI PLAN TAB ── */}
        {activeTab==='ai' && (
          <div style={{animation:'fadeInUp 0.4s ease both'}}>
            <div style={{background:'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(238,90,36,0.04))',border:'1px solid rgba(249,115,22,0.15)',borderRadius:'22px',padding:'20px',marginBottom:'14px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
                <div style={{width:'42px',height:'42px',borderRadius:'14px',background:'linear-gradient(135deg,#F97316,#EE5A24)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(249,115,22,0.3)'}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div>
                  <div style={{fontSize:'16px',fontWeight:'800',color:'#fff'}}>AI Workout Generator</div>
                  <div style={{fontSize:'12px',color:'#F97316'}}>Powered by IRA intelligence</div>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',marginBottom:'10px',overflowX:'auto',paddingBottom:'4px'}}>
                {[{id:'home',label:'🏠 Home'},{id:'gym',label:'🏋️ Gym'},{id:'cardio',label:'🏃 Cardio'},{id:'yoga',label:'🧘 Yoga'},{id:'hiit',label:'⚡ HIIT'}].map(t=>(
                  <button key={t.id} onClick={()=>setWType(t.id)}
                    style={{flexShrink:0,padding:'8px 14px',borderRadius:'20px',border:'1px solid',borderColor:wType===t.id?'#F97316':'rgba(255,255,255,0.07)',background:wType===t.id?'rgba(249,115,22,0.14)':'#0D0D0D',color:wType===t.id?'#F97316':'#3A3A3A',fontSize:'12px',fontWeight:'600',cursor:'pointer',transition:'all 0.2s'}}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                <select value={level} onChange={e=>setLevel(e.target.value)} style={{flex:1,...inp}}>
                  <option value="beginner">🌱 Beginner</option>
                  <option value="intermediate">💪 Intermediate</option>
                  <option value="advanced">🔥 Advanced</option>
                </select>
                <select value={duration} onChange={e=>setDuration(e.target.value)} style={{flex:1,...inp}}>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>
              <button onClick={generateAI} disabled={aiLoading}
                style={{width:'100%',background:'linear-gradient(135deg,#F97316,#EE5A24)',color:'#fff',border:'none',borderRadius:'14px',padding:'14px',fontSize:'15px',fontWeight:'800',opacity:aiLoading?0.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',boxShadow:aiLoading?'none':'0 0 24px rgba(249,115,22,0.3)',cursor:'pointer',transition:'all 0.2s'}}>
                {aiLoading?(<><div style={{width:'16px',height:'16px',border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>Building your plan...</>):'✨ Generate AI Workout Plan'}
              </button>
              {aiPlan && (
                <div style={{marginTop:'16px',background:'#0D0D0D',borderRadius:'16px',padding:'18px',color:'#C0C0C0',fontSize:'13px',lineHeight:'1.8',whiteSpace:'pre-wrap',border:'1px solid rgba(255,255,255,0.06)',animation:'fadeInUp 0.4s ease both'}}>
                  {aiPlan}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab==='history' && (
          <div style={{animation:'fadeInUp 0.4s ease both'}}>
            {showAdd && (
              <div style={{background:'#111',border:'1px solid rgba(249,115,22,0.2)',borderRadius:'20px',padding:'18px',marginBottom:'14px',animation:'fadeInUp 0.3s ease both'}}>
                <div style={{fontSize:'15px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>Log Workout</div>
                <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'12px'}}>
                  <input placeholder="Workout name e.g. Morning Run" value={newW.name}
                    onChange={e=>setNewW(p=>({...p,name:e.target.value}))}
                    style={{...inp,width:'100%'}}
                    onFocus={e=>e.target.style.borderColor='rgba(249,115,22,0.4)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
                  <select value={newW.type} onChange={e=>setNewW(p=>({...p,type:e.target.value}))} style={{...inp,width:'100%'}}>
                    {['strength','cardio','yoga','hiit','sports','general'].map(t=>(
                      <option key={t} value={t}>{typeIcon[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>
                    ))}
                  </select>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                    <input type="number" placeholder="Duration (min)" value={newW.duration_minutes} onChange={e=>setNewW(p=>({...p,duration_minutes:e.target.value}))} style={inp}/>
                    <input type="number" placeholder="Calories burned" value={newW.calories_burned} onChange={e=>setNewW(p=>({...p,calories_burned:e.target.value}))} style={inp}/>
                  </div>
                </div>
                <button onClick={addWorkout} disabled={loading}
                  style={{width:'100%',background:'#F97316',color:'#fff',border:'none',borderRadius:'12px',padding:'13px',fontSize:'14px',fontWeight:'800',opacity:loading?0.7:1,cursor:'pointer'}}>
                  {loading?'Saving...':'Save Workout ✓'}
                </button>
              </div>
            )}
            {workouts.length===0 ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'#3A3A3A'}}>
                <div style={{fontSize:'56px',marginBottom:'16px',animation:'float 3s ease-in-out infinite'}}>🏋️</div>
                <div style={{fontSize:'16px',fontWeight:'600',color:'#fff',marginBottom:'8px'}}>No workouts logged yet</div>
                <div style={{fontSize:'13px',marginBottom:'20px'}}>Start training and log your sessions</div>
                <button onClick={()=>{setShowAdd(true);setActiveTab('history')}}
                  style={{background:'linear-gradient(135deg,#F97316,#EE5A24)',color:'#fff',border:'none',borderRadius:'14px',padding:'12px 24px',fontSize:'14px',fontWeight:'800',cursor:'pointer',boxShadow:'0 0 20px rgba(249,115,22,0.3)'}}>
                  + Log First Workout
                </button>
              </div>
            ) : workouts.map((w,i)=>(
              <div key={w.id}
                style={{background:w.completed?'rgba(170,255,0,0.04)':'#111',border:'1px solid',borderColor:w.completed?'rgba(170,255,0,0.12)':'rgba(255,255,255,0.06)',borderRadius:'18px',padding:'16px',display:'flex',alignItems:'center',gap:'14px',marginBottom:'10px',animation:`fadeInUp 0.5s ease ${i*0.06}s both`,transition:'all 0.2s'}}>
                <button onClick={()=>toggleComplete(w.id,w.completed)}
                  style={{width:'26px',height:'26px',borderRadius:'8px',border:'1.5px solid',borderColor:w.completed?'#AAFF00':'rgba(255,255,255,0.15)',background:w.completed?'#AAFF00':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
                  {w.completed&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
                <div style={{width:'42px',height:'42px',borderRadius:'12px',background:w.completed?'rgba(170,255,0,0.08)':'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>
                  {typeIcon[w.type]||'🏋️'}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px',fontWeight:'600',color:w.completed?'#AAFF00':'#fff'}}>{w.name}</div>
                  <div style={{display:'flex',gap:'10px',marginTop:'3px'}}>
                    <span style={{fontSize:'11px',color:'#3A3A3A'}}>⏱️ {w.duration_minutes}min</span>
                    <span style={{fontSize:'11px',color:'#3A3A3A'}}>🔥 {w.calories_burned}kcal</span>
                    <span style={{fontSize:'11px',color:'#3A3A3A'}}>📅 {w.workout_date}</span>
                  </div>
                </div>
                <button onClick={()=>deleteWorkout(w.id)}
                  style={{background:'transparent',border:'none',color:'#3A3A3A',cursor:'pointer',fontSize:'16px',transition:'color 0.2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.color='#EF4444'}}
                  onMouseLeave={e=>{e.currentTarget.style.color='#3A3A3A'}}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <NAV/>
    </div>
  )
}