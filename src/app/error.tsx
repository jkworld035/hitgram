'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ fontSize: '56px', marginBottom: '20px', animation: 'float 3s ease-in-out infinite' }}>⚠️</div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Something went wrong</div>
        <div style={{ fontSize: '13px', color: '#52525B', lineHeight: '1.7', marginBottom: '24px' }}>{error.message || 'An unexpected error occurred'}</div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={reset}
            style={{ background: '#AAFF00', color: '#000', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 20px rgba(170,255,0,0.3)' }}>
            Try Again
          </button>
          <a href="/dashboard"
            style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}