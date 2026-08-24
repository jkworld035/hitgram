export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ fontSize: '80px', fontWeight: '900', color: '#AAFF00', letterSpacing: '-0.06em', lineHeight: 1, marginBottom: '12px', textShadow: '0 0 60px rgba(170,255,0,0.4)' }}>404</div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Page not found</div>
        <div style={{ fontSize: '13px', color: '#52525B', lineHeight: '1.7', marginBottom: '24px' }}>The page you are looking for does not exist or has been moved.</div>
        <a href="/dashboard"
          style={{ background: '#AAFF00', color: '#000', border: 'none', borderRadius: '12px', padding: '13px 28px', fontSize: '14px', fontWeight: '800', textDecoration: 'none', display: 'inline-block', boxShadow: '0 0 20px rgba(170,255,0,0.3)' }}>
          Go to Dashboard →
        </a>
      </div>
    </div>
  )
}