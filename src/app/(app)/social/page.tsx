'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = ({ active='' }) => (
  <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'480px',zIndex:100,background:'rgba(8,8,8,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 24px 28px' }}>
    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
      <a href="/dashboard" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Home</div>
      </a>
      <a href="/social" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
        <div style={{ fontSize:'10px',color:'#AAFF00',fontWeight:'700' }}>Social</div>
      </a>
      <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
      </a>
      <a href="/goals" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Goals</div>
      </a>
      <a href="/profile" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
        <div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>Profile</div>
      </a>
    </div>
  </div>
)

export default function SocialPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [liked, setLiked] = useState<string[]>([])
  const [tab, setTab] = useState('feed')
  const supabase = createClient()

  const demoPosts = [
    { id:'d1', user:'James Wilson', handle:'@jameswilson', time:'2h ago', content:'Morning workout done! Consistency is the key. Never skip Monday! 💪', tag:'🏋️ Full Body Workout', likes:1240, comments:86, bg:'linear-gradient(135deg,#1a1a2e,#16213e)', emoji:'🏋️' },
    { id:'d2', user:'Sophia Loren', handle:'@sophialoren', time:'4h ago', content:'Just finished my yoga session. Mind and body connected 🙏 Feeling amazing!', tag:'🧘 Yoga Session', likes:2410, comments:143, bg:'linear-gradient(135deg,#0f3460,#533483)', emoji:'🧘' },
    { id:'d3', user:'Robert King', handle:'@robertking', time:'6h ago', content:'Just ran 10km in 48 minutes! New personal best 🏃 #running #fitness #gains', tag:'🏃 Cardio Run', likes:890, comments:67, bg:'linear-gradient(135deg,#1a2f1a,#2d4a1e)', emoji:'🏃' },
    { id:'d4', user:'Emily Chen', handle:'@emilychen', time:'8h ago', content:'Meal prepped for the whole week! Eating clean and feeling great 🥗✨ #mealprep', tag:'🥗 Meal Prep', likes:3100, comments:210, bg:'linear-gradient(135deg,#2a1a0f,#4a2f1e)', emoji:'🥗' },
  ]

  const stories = [
    { name:'Your Story', color:'#AAFF00', letter:'+', isYou:true },
    { name:'James', color:'#FF6B6B', letter:'J' },
    { name:'Sophia', color:'#AAFF00', letter:'S' },
    { name:'Robert', color:'#3B82F6', letter:'R' },
    { name:'Emily', color:'#F97316', letter:'E' },
    { name:'Mike', color:'#8B5CF6', letter:'M' },
  ]

  useEffect(() => { fetchMyPosts() }, [])

  const fetchMyPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('user_posts').select('*').eq('user_id', user.id).order('created_at',{ ascending:false })
    if (data) setPosts(data)
  }

  const toggleLike = (id: string) => setLiked(p => p.includes(id)?p.filter(x=>x!==id):[...p,id])

  return (
    <div style={{ minHeight:'100vh',background:'#0A0A0A',paddingBottom:'100px',animation:'fadeInUp 0.4s ease both' }}>
      <div style={{ position:'sticky',top:0,zIndex:50,background:'rgba(10,10,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.04)',padding:'52px 20px 16px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
          <div style={{ fontSize:'20px',fontWeight:'800',color:'#fff' }}>Social Feed</div>
          <div style={{ display:'flex',gap:'8px' }}>
            <a href="/create-post" style={{ width:'36px',height:'36px',borderRadius:'50%',background:'#AAFF00',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',boxShadow:'0 0 16px rgba(170,255,0,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
            </a>
          </div>
        </div>
        <div style={{ display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'4px',gap:'4px' }}>
          {['feed','trending','my posts'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1,padding:'8px 4px',borderRadius:'8px',border:'none',background:tab===t?'#AAFF00':'transparent',color:tab===t?'#000':'#3A3A3A',fontSize:'11px',fontWeight:'700',cursor:'pointer',textTransform:'capitalize',transition:'all 0.2s' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Stories */}
        <div style={{ display:'flex',gap:'12px',overflowX:'auto',paddingBottom:'8px',marginBottom:'16px' }}>
          {stories.map((s,i) => (
            <div key={i} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',flexShrink:0,cursor:'pointer' }}>
              <div style={{ width:'56px',height:'56px',borderRadius:'50%',background:s.isYou?'#111':'#111',border:`2px solid ${s.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'900',color:s.color }}>
                {s.letter}
              </div>
              <div style={{ fontSize:'10px',color:'#A1A1AA',fontWeight:'600',maxWidth:'56px',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.name}</div>
            </div>
          ))}
        </div>

        {/* My posts tab */}
        {tab==='my posts' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'14px' }}>
            {posts.length===0 ? (
              <div style={{ textAlign:'center',padding:'60px 20px',color:'#3A3A3A' }}>
                <div style={{ fontSize:'48px',marginBottom:'16px',animation:'float 3s ease-in-out infinite' }}>📱</div>
                <div style={{ fontSize:'16px',fontWeight:'600',color:'#fff',marginBottom:'8px' }}>No posts yet</div>
                <a href="/create-post" style={{ color:'#AAFF00',fontSize:'13px',fontWeight:'700' }}>Create your first post →</a>
              </div>
            ) : posts.map((post,i) => (
              <div key={post.id} style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',overflow:'hidden',animation:`fadeInUp 0.5s ease ${i*0.06}s both` }}>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:'14px',color:'#fff',lineHeight:'1.6',marginBottom:'10px' }}>{post.content}</div>
                  {post.image_url && (
                    <img src={post.image_url} alt="Post" style={{ width:'100%',maxHeight:'400px',objectFit:'cover',borderRadius:'12px',marginBottom:'12px',display:'block' }}
                      onError={e => { e.currentTarget.style.display = 'none' }}/>
                  )}
                  {post.video_url && (
                    <video src={post.video_url} controls playsInline style={{ width:'100%',maxHeight:'400px',borderRadius:'12px',marginBottom:'12px',display:'block' }}/>
                  )}
                  {post.workout_tag && <div style={{ display:'inline-block',background:'rgba(170,255,0,0.1)',border:'1px solid rgba(170,255,0,0.2)',borderRadius:'20px',padding:'4px 12px',fontSize:'12px',color:'#AAFF00',fontWeight:'600',marginBottom:'8px' }}>{post.workout_tag}</div>}
                  {post.hashtags?.length>0 && (
                    <div style={{ display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px' }}>
                      {post.hashtags.map((tag:string,j:number) => <span key={j} style={{ fontSize:'12px',color:'#3B82F6',fontWeight:'600' }}>#{tag}</span>)}
                    </div>
                  )}
                  <div style={{ fontSize:'11px',color:'#3A3A3A' }}>{new Date(post.created_at).toLocaleDateString('en',{ month:'short',day:'numeric',year:'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feed + Trending tabs */}
        {(tab==='feed'||tab==='trending') && (
          <div style={{ display:'flex',flexDirection:'column',gap:'14px' }}>
            {demoPosts.map((post,i) => (
              <div key={post.id} style={{ background:'#111',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'20px',overflow:'hidden',animation:`fadeInUp 0.5s ease ${i*0.08}s both` }}>
                <div style={{ padding:'14px 16px',display:'flex',alignItems:'center',gap:'10px' }}>
                  <div style={{ width:'40px',height:'40px',borderRadius:'50%',background:'#1A1A1A',border:'2px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'900',color:'#fff',flexShrink:0 }}>
                    {post.user[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px',fontWeight:'700',color:'#fff' }}>{post.user}</div>
                    <div style={{ fontSize:'11px',color:'#3A3A3A' }}>{post.handle} · {post.time}</div>
                  </div>
                </div>
                <div style={{ height:'160px',background:post.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'56px',position:'relative' }}>
                  {post.emoji}
                  <div style={{ position:'absolute',bottom:'10px',left:'12px',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',borderRadius:'20px',padding:'4px 10px',fontSize:'11px',color:'#fff',fontWeight:'600' }}>{post.tag}</div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:'13px',color:'#C0C0C0',lineHeight:'1.6',marginBottom:'12px' }}>{post.content}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:'16px' }}>
                    <button onClick={() => toggleLike(post.id)}
                      style={{ display:'flex',alignItems:'center',gap:'6px',background:'transparent',border:'none',color:liked.includes(post.id)?'#FF6B6B':'#3A3A3A',fontSize:'13px',fontWeight:'600',cursor:'pointer',transition:'color 0.2s' }}>
                      <span style={{ fontSize:'18px' }}>{liked.includes(post.id)?'❤️':'🤍'}</span>
                      {(post.likes+(liked.includes(post.id)?1:0)).toLocaleString()}
                    </button>
                    <button style={{ display:'flex',alignItems:'center',gap:'6px',background:'transparent',border:'none',color:'#3A3A3A',fontSize:'13px',fontWeight:'600',cursor:'pointer' }}>
                      <span style={{ fontSize:'18px' }}>💬</span>{post.comments}
                    </button>
                    <button style={{ display:'flex',alignItems:'center',gap:'6px',background:'transparent',border:'none',color:'#3A3A3A',fontSize:'13px',fontWeight:'600',cursor:'pointer' }}>
                      <span style={{ fontSize:'18px' }}>↗️</span>Share
                    </button>
                    <button style={{ display:'flex',alignItems:'center',gap:'6px',background:'transparent',border:'none',color:'#3A3A3A',fontSize:'13px',fontWeight:'600',cursor:'pointer',marginLeft:'auto' }}>
                      <span style={{ fontSize:'18px' }}>🔖</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <NAV />
    </div>
  )
}