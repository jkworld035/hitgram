'use client'
import { useState, useEffect } from 'react'

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e: any) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShow(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
      setInstalled(true)
    }
    setPrompt(null)
  }

  if (!show || installed) return null

  return (
    <div style={{
      position: 'fixed', bottom: '100px', left: '16px', right: '16px',
      zIndex: 999, maxWidth: '448px', margin: '0 auto',
      background: '#111', border: '1px solid rgba(170,255,0,0.25)',
      borderRadius: '20px', padding: '18px 20px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(170,255,0,0.1)',
      animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* App Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
          background: 'linear-gradient(135deg,#AAFF00,#22C55E)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px', fontWeight: '900', color: '#000',
          boxShadow: '0 0 20px rgba(170,255,0,0.3)',
        }}>H</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
            Install Hitgram
          </div>
          <div style={{ fontSize: '12px', color: '#52525B', lineHeight: '1.4' }}>
            Add to home screen for the full app experience
          </div>
        </div>

        <button onClick={() => setShow(false)}
          style={{ background: 'transparent', border: 'none', color: '#3A3A3A', fontSize: '20px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <button onClick={install}
          style={{
            flex: 1, background: '#AAFF00', color: '#000', border: 'none',
            borderRadius: '12px', padding: '12px', fontSize: '14px',
            fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(170,255,0,0.3)',
          }}>
          📱 Install App
        </button>
        <button onClick={() => setShow(false)}
          style={{
            flex: 1, background: 'transparent', color: '#52525B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '12px', fontSize: '14px',
            fontWeight: '600', cursor: 'pointer',
          }}>
          Not now
        </button>
      </div>

      {/* Features */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { icon: '⚡', label: 'Works offline' },
          { icon: '🔔', label: 'Notifications' },
          { icon: '📱', label: 'Native feel' },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <span style={{ fontSize: '14px' }}>{f.icon}</span>
            <span style={{ fontSize: '11px', color: '#3A3A3A', fontWeight: '500' }}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}