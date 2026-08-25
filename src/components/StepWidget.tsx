'use client'
import { useState, useEffect } from 'react'
import { getAutoTracker } from '@/lib/autoStepTracker'

export default function StepWidget() {
  const [steps,       setSteps]       = useState(0)
  const [perm,        setPerm]        = useState<string>('unknown')
  const [showBanner,  setShowBanner]  = useState(false)
  const [requesting,  setRequesting]  = useState(false)
  const [isMobile,    setIsMobile]    = useState(false)

  useEffect(() => {
    // Check if mobile
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    setIsMobile(mobile)

    const tracker = getAutoTracker()
    const unsub = tracker.subscribe(data => {
      setSteps(data.steps)
      setPerm(data.permissionState)

      // Show banner if permission not yet given
      if (data.permissionState === 'unknown') {
        setTimeout(() => setShowBanner(true), 2000)
      } else {
        setShowBanner(false)
      }
    })

    return unsub
  }, [])

  const handleEnable = async () => {
    setRequesting(true)
    try {
      const tracker = getAutoTracker()
      const result  = await tracker.requestAndStart()
      setPerm(result)
      if (result === 'granted') {
        setShowBanner(false)
        await tracker.requestNotificationPermission()
      }
    } finally {
      setRequesting(false)
    }
  }

  // ── Floating step badge (when tracking) ──────────────────
  if (perm === 'granted' && steps > 0) {
    return (
      <a href="/health-live"
        style={{
          position:      'fixed',
          bottom:        '90px',
          right:         '12px',
          zIndex:        400,
          background:    '#111',
          border:        '1px solid rgba(170,255,0,0.25)',
          borderRadius:  '20px',
          padding:       '10px 14px',
          display:       'flex',
          alignItems:    'center',
          gap:           '8px',
          boxShadow:     '0 8px 24px rgba(0,0,0,0.5)',
          textDecoration: 'none',
          animation:     'fadeInUp 0.4s ease both',
          cursor:        'pointer',
        }}>
        <span style={{ fontSize: '18px' }}>👟</span>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#AAFF00', lineHeight: 1 }}>
            {steps.toLocaleString()}
          </div>
          <div style={{ fontSize: '9px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase' }}>
            steps today
          </div>
        </div>
      </a>
    )
  }

  // ── Permission banner ─────────────────────────────────────
  if (showBanner && perm === 'unknown') {
    return (
      <div style={{
        position:      'fixed',
        bottom:        '90px',
        left:          '12px',
        right:         '12px',
        zIndex:        400,
        maxWidth:      '448px',
        margin:        '0 auto',
        background:    '#111',
        border:        '1px solid rgba(170,255,0,0.2)',
        borderRadius:  '20px',
        padding:       '16px',
        boxShadow:     '0 20px 60px rgba(0,0,0,0.7)',
        animation:     'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <style>{`
          @keyframes slideUp   { from{transform:translateY(80px);opacity:0} to{transform:translateY(0);opacity:1} }
          @keyframes fadeInUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin      { to{transform:rotate(360deg)} }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '32px' }}>👟</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
              Enable Auto Step Counting
            </div>
            <div style={{ fontSize: '12px', color: '#52525B' }}>
              {isMobile
                ? 'Uses your phone sensor — no button needed'
                : 'Step counting works best on mobile devices'}
            </div>
          </div>
          <button onClick={() => setShowBanner(false)}
            style={{ background: 'transparent', border: 'none', color: '#3A3A3A', cursor: 'pointer', fontSize: '18px', flexShrink: 0, padding: '4px' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleEnable} disabled={requesting}
            style={{
              flex:         1,
              background:   '#AAFF00',
              color:        '#000',
              border:       'none',
              borderRadius: '12px',
              padding:      '12px',
              fontSize:     '14px',
              fontWeight:   '800',
              cursor:       requesting ? 'not-allowed' : 'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          '6px',
              opacity:      requesting ? 0.8 : 1,
            }}>
            {requesting
              ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Starting...</>
              : '✅ Enable Now'}
          </button>
          <button onClick={() => setShowBanner(false)}
            style={{ background: 'transparent', color: '#52525B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', cursor: 'pointer' }}>
            Later
          </button>
        </div>
      </div>
    )
  }

  return null
}