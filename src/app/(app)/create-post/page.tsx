'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CreatePostPage() {
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [workoutTag, setWorkoutTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const genCaption = async () => {
    setAiLoading(true)
    const res = await fetch('/api/ai/chat', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ type:'chat', messages:[{ role:'user', content:`Generate an engaging fitness social media post caption for someone who ${workoutTag||'just completed a workout'}. Make it motivating and authentic. Under 150 characters. Include 3 relevant hashtags at the end.` }] })
    })
    const data = await res.json()
    setContent(data.message)
    setAiLoading(false)
  }

  const genHashtags = async () => {
    setAiLoading(true)
    const res = await fetch('/api/ai/chat', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ type:'chat', messages:[{ role:'user', content:`Generate 8 trending fitness hashtags for ${workoutTag||'fitness and health'}. Return only hashtags separated by spaces, no explanation.` }] })
    })
    const data = await res.json()
    setHashtags(data.message.replace(/#/g,'').trim())
    setAiLoading(false)
  }

  const submit = async () => {
    if (!content.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const hashtagArray = hashtags.split(' ').filter(h => h.trim()).map(h => h.replace('#',''))
    await supabase.from('user_posts').insert({
      user_id:user.id, content, workout_tag:workoutTag, hashtags:hashtagArray,
      like_count:0, comment_count:0,
    })
    setLoading(false)
    router.push('/social')
  }

  const workoutTags = ['🏋️ Strength Training','🏃 Cardio Run','🧘 Yoga Session','⚡ HIIT Workout','🚴 Cycling','🥊 Boxing','🏊 Swimming','🥗 Meal Prep']
  const moods = ['💪 Crushing it','🔥 On fire','😤 Determined','🧘 Zen mode','⚡ Energized','😊 Happy']
  const inp = { width:'100%', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'14px', outline:'none' } as React.CSSProperties

  return (
    <div style={{ minHeight:'100vh',background:'#0A0A0A',paddingBottom:'40px',animation:'fadeInUp 0.4s ease both' }}>
      <div style={{ position:'sticky',top:0,zIndex:50,background:'rgba(10,10,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.04)',padding:'52px 20px 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
          <a href="/social" style={{ width:'36px',height:'36px',borderRadius:'10px',background:'#111',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',textDecoration:'none',fontSize:'16px' }}>←</a>
          <div style={{ fontSize:'18px',fontWeight:'800',color:'#fff' }}>Create Post</div>
        </div>
        <button onClick={submit} disabled={loading||!content.trim()}
          style={{ background:content.trim()?'#AAFF00':'#1A1A1A',color:content.trim()?'#000':'#3A3A3A',border:'none',borderRadius:'20px',padding:'9px 20px',fontSize:'13px',fontWeight:'800',cursor:content.trim()?'pointer':'not-allowed',boxShadow:content.trim()?'0 0 16px rgba(170,255,0,0.3)':'none',transition:'all 0.2s' }}>
          {loading?'Posting...':'Post →'}
        </button>
      </div>

      <div style={{ padding:'16px 20px',display:'flex',flexDirection:'column',gap:'14px' }}>
        {/* Content */}
        <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'16px' }}>
          <textarea placeholder="What's on your mind? Share your fitness journey..."
            value={content} onChange={e => setContent(e.target.value)} rows={4}
            style={{ width:'100%',background:'transparent',border:'none',color:'#fff',fontSize:'15px',outline:'none',resize:'none',lineHeight:'1.6',fontFamily:'Inter,sans-serif' }}/>
          <div style={{ height:'120px',background:'#0D0D0D',borderRadius:'12px',border:'1px dashed rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',cursor:'pointer',marginTop:'12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <div style={{ fontSize:'13px',color:'#3A3A3A' }}>Add photo or video</div>
          </div>
        </div>

        {/* Workout tags */}
        <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'16px' }}>
          <div style={{ fontSize:'12px',color:'#3A3A3A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'12px' }}>Workout Tag</div>
          <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
            {workoutTags.map(tag => (
              <button key={tag} onClick={() => setWorkoutTag(workoutTag===tag?'':tag)}
                style={{ padding:'7px 12px',borderRadius:'20px',border:'1px solid',borderColor:workoutTag===tag?'#AAFF00':'rgba(255,255,255,0.07)',background:workoutTag===tag?'rgba(170,255,0,0.1)':'#0D0D0D',color:workoutTag===tag?'#AAFF00':'#A1A1AA',fontSize:'12px',fontWeight:'600',cursor:'pointer',transition:'all 0.2s' }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* AI Tools */}
        <div style={{ background:'linear-gradient(135deg,rgba(170,255,0,0.07),rgba(34,197,94,0.03))',border:'1px solid rgba(170,255,0,0.14)',borderRadius:'20px',padding:'16px' }}>
          <div style={{ fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'12px',display:'flex',alignItems:'center',gap:'8px' }}>
            <div style={{ width:'24px',height:'24px',borderRadius:'8px',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'900',color:'#000' }}>A</div>
            AI Content Generator
          </div>
          <div style={{ display:'flex',gap:'10px',marginBottom:hashtags?'12px':'0' }}>
            <button onClick={genCaption} disabled={aiLoading}
              style={{ flex:1,background:'#AAFF00',color:'#000',border:'none',borderRadius:'12px',padding:'11px',fontSize:'13px',fontWeight:'800',cursor:'pointer',opacity:aiLoading?0.7:1 }}>
              {aiLoading?'⏳...':'✨ AI Caption'}
            </button>
            <button onClick={genHashtags} disabled={aiLoading}
              style={{ flex:1,background:'rgba(170,255,0,0.1)',color:'#AAFF00',border:'1px solid rgba(170,255,0,0.2)',borderRadius:'12px',padding:'11px',fontSize:'13px',fontWeight:'800',cursor:'pointer',opacity:aiLoading?0.7:1 }}>
              {aiLoading?'⏳...':'# AI Hashtags'}
            </button>
          </div>
          {hashtags && (
            <div style={{ background:'#0D0D0D',borderRadius:'12px',padding:'12px',fontSize:'13px',color:'#AAFF00',lineHeight:'1.6',marginTop:'10px' }}>
              {hashtags.split(' ').map((tag,i) => <span key={i} style={{ marginRight:'6px' }}>#{tag}</span>)}
            </div>
          )}
        </div>

        {/* Hashtag input */}
        <div style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',padding:'16px' }}>
          <div style={{ fontSize:'12px',color:'#3A3A3A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'10px' }}># Hashtags</div>
          <input placeholder="fitness workout health motivation..." value={hashtags} onChange={e => setHashtags(e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.3)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
        </div>

        <button onClick={submit} disabled={loading||!content.trim()}
          style={{ width:'100%',background:content.trim()?'#AAFF00':'#1A1A1A',color:content.trim()?'#000':'#3A3A3A',border:'none',borderRadius:'16px',padding:'16px',fontSize:'16px',fontWeight:'900',cursor:content.trim()?'pointer':'not-allowed',boxShadow:content.trim()?'0 0 24px rgba(170,255,0,0.3)':'none',transition:'all 0.3s' }}>
          {loading?'Posting...':'Share Post →'}
        </button>
      </div>
    </div>
  )
}