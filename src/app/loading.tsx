export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: '#000', margin: '0 auto 20px', boxShadow: '0 0 40px rgba(170,255,0,0.4)', animation: 'pulse 1s ease-in-out infinite' }}>H</div>
        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(170,255,0,0.2)', borderTop: '3px solid #AAFF00', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  )
}