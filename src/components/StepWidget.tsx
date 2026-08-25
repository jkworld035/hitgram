'use client'
import { useState, useEffect } from 'react'
import { getAutoTracker } from '@/lib/autoStepTracker'

export default function StepWidget() {
  const [steps, setSteps] = useState(0)
  const [perm, setPerm] = useState<string>('unknown')
  const [show, setShow] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    const tracker = getAutoTracker()
    const unsub = tracker.subscribe(data => {
      setSteps(data.steps)
      setPerm(data.permissionState)
      // Show permission request if unknown and on mobile
      if (data.permissionState === 'unknown' && /Mobi|Android/i.test(navigator.userAgent)) {
        setTimeout(() => setShow(true), 3000)
      }
    })
    return unsub
  }, [])

  const handleAllow = async () => {
    setRequesting(true)
    const tracker = getAutoTracker()
    await tracker.requestAndStart()
    await tracker.requestNotificationPermission()
    setRequesting(false)
    setShow(false)
  }

  // Show floating step counter when tracking
  if (perm === 'granted' && steps > 0) {
    return (
      <div style={{
        position: 'fixed', bottom: '100px', right: '16px',
        zIndex: 500, background: '#111',
        border: '1px solid rgba(170,255,0,0.2)',
        borderRadius: '16px', padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        animation: 'fadeInUp 0.4s ease both',
        cursor: 'pointer',
        maxWidth: '160px',
      }} onClick={() => window.location.href = '/health-live'}>
        <span style={{ fontSize: '18px' }}>👟</span>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#AAFF00', lineHeight: 1 }}>
            {steps.toLocaleString()}
          </div>
          <div style={{ fontSize: '9px', color: '#3A3A3A', fontWeight: '600', textTransform: 'uppercase' }}>
            steps today
          </div>
        </div>
      </div>
    )
  }

  // Show permission request prompt
  if (show && perm === 'unknown') {
    return (
      <div style={{
        position: 'fixed', bottom: '100px', left: '16px', right: '16px',
        zIndex: 500, maxWidth: '448px', margin: '0 auto',
        background: '#111', border: '1px solid rgba(170,255,0,0.2)',
        borderRadius: '20px', padding: '18px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <style>{`
          @keyframes slideUp{from{transform:translateY(100px);opacity:0}to{transform:translateY(0);opacity:1}}
          @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ fontSize: '36px' }}>👟</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
              Auto Step Counting
            </div>
            <div style={{ fontSize: '12px', color: '#52525B' }}>
              Count steps automatically — no button needed
            </div>
          </div>
          <button onClick={() => setShow(false)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#3A3A3A', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}>
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {['Auto counts steps 24/7', 'Works when app is open', 'Syncs to your health records'].map(f => (
            <div key={f} style={{ flex: 1, background: 'rgba(170,255,0,0.06)', borderRadius: '10px', padding: '8px', textAlign: 'center', fontSize: '10px', color: '#AAFF00', fontWeight: '600', lineHeight: '1.4' }}>✓ {f}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAllow} disabled={requesting}
            style={{ flex: 1, background: '#AAFF00', color: '#000', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {requesting ? (
              <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>Starting...</>
            ) : '✅ Enable Auto Counting'}
          </button>
          <button onClick={() => setShow(false)}
            style={{ background: 'transparent', color: '#52525B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', cursor: 'pointer' }}>
            Later
          </button>
        </div>
      </div>
    )
  }

  return null
}