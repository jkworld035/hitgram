'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  video_url: string | null
  like_count: number
  comment_count: number
  created_at: string
  hashtags: string[] | null
  profiles: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export default function SocialPage() {
  const [posts,        setPosts]        = useState<Post[]>([])
  const [likes,        setLikes]        = useState<Set<string>>(new Set())
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [user,         setUser]         = useState<any>(null)
  const [profile,      setProfile]      = useState<any>(null)
  const [activePost,   setActivePost]   = useState<Post | null>(null)
  const [comments,     setComments]     = useState<Comment[]>([])
  const [commentText,  setCommentText]  = useState('')
  const [sending,      setSending]      = useState(false)
  const [tab,          setTab]          = useState<'feed'|'following'|'discover'>('feed')
  const [search,       setSearch]       = useState('')
  const [searchResults,setSearchResults]= useState<Post[]>([])
  const [searching,    setSearching]    = useState(false)
  const commentRef = useRef<HTMLInputElement>(null)
  const supabase   = createClient()
  const router     = useRouter()

  useEffect(() => {
    init()
    // Real-time subscription for new posts
    const channel = supabase.channel('social-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_posts' }, () => {
        fetchPosts()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_posts' }, payload => {
        setPosts(p => p.map(post =>
          post.id === payload.new.id ? { ...post, ...payload.new } : post
        ))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof) setProfile(prof)
    await fetchPosts()
    await fetchLikes(user.id)
    setLoading(false)
  }

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('user_posts')
      .select(`*, profiles(full_name, username, avatar_url)`)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setPosts(data as Post[])
  }

  const fetchLikes = async (uid: string) => {
    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', uid)
    if (data) setLikes(new Set(data.map(l => l.post_id)))
  }

  const refresh = async () => {
    setRefreshing(true)
    await fetchPosts()
    setRefreshing(false)
  }

  const toggleLike = async (post: Post) => {
    if (!user) return
    const liked = likes.has(post.id)
    const newLikes = new Set(likes)

    // Optimistic update
    if (liked) {
      newLikes.delete(post.id)
      setPosts(p => p.map(pp => pp.id === post.id ? { ...pp, like_count: Math.max(0, pp.like_count - 1) } : pp))
      if (activePost?.id === post.id) setActivePost(p => p ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p)
    } else {
      newLikes.add(post.id)
      setPosts(p => p.map(pp => pp.id === post.id ? { ...pp, like_count: pp.like_count + 1 } : pp))
      if (activePost?.id === post.id) setActivePost(p => p ? { ...p, like_count: p.like_count + 1 } : p)
    }
    setLikes(newLikes)

    // DB update
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      await supabase.from('user_posts').update({ like_count: Math.max(0, post.like_count - 1) }).eq('id', post.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
      await supabase.from('user_posts').update({ like_count: post.like_count + 1 }).eq('id', post.id)
    }
  }

  const openComments = async (post: Post) => {
    setActivePost(post)
    const { data } = await supabase
      .from('post_comments')
      .select(`*, profiles(full_name, username, avatar_url)`)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data as Comment[])
    setTimeout(() => commentRef.current?.focus(), 300)
  }

  const sendComment = async () => {
    if (!commentText.trim() || !activePost || !user || sending) return
    setSending(true)
    const text = commentText.trim()
    setCommentText('')

    const { data } = await supabase.from('post_comments')
      .insert({ post_id: activePost.id, user_id: user.id, content: text })
      .select(`*, profiles(full_name, username, avatar_url)`)
      .single()

    if (data) {
      setComments(p => [...p, data as Comment])
      // Update comment count
      await supabase.from('user_posts')
        .update({ comment_count: activePost.comment_count + 1 })
        .eq('id', activePost.id)
      setPosts(p => p.map(pp => pp.id === activePost.id ? { ...pp, comment_count: pp.comment_count + 1 } : pp))
      setActivePost(p => p ? { ...p, comment_count: p.comment_count + 1 } : p)
    }
    setSending(false)
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    await supabase.from('user_posts').delete().eq('id', postId)
    setPosts(p => p.filter(pp => pp.id !== postId))
    if (activePost?.id === postId) setActivePost(null)
  }

  const doSearch = async (q: string) => {
    setSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('user_posts')
      .select(`*, profiles(full_name, username, avatar_url)`)
      .or(`content.ilike.%${q}%`)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setSearchResults(data as Post[])
    setSearching(false)
  }

  const timeAgo = (dt: string) => {
    const s = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
    if (s < 60)   return 'just now'
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86400)return `${Math.floor(s/3600)}h ago`
    return `${Math.floor(s/86400)}d ago`
  }

  const Avatar = ({ p, size=36 }: { p: any; size?: number }) => (
    <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:`${size*0.4}px`, fontWeight:'900', color:'#000', flexShrink:0, overflow:'hidden' }}>
      {p?.avatar_url
        ? <img src={p.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : (p?.full_name || p?.username || '?')[0]?.toUpperCase()}
    </div>
  )

  const PostCard = ({ post }: { post: Post }) => {
    const liked   = likes.has(post.id)
    const isOwner = user?.id === post.user_id
    const [imgError, setImgError] = useState(false)

    return (
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'20px', overflow:'hidden', marginBottom:'12px', animation:'fadeInUp 0.4s ease both' }}>
        {/* Post header */}
        <div style={{ padding:'14px 16px 10px', display:'flex', alignItems:'center', gap:'10px' }}>
          <Avatar p={post.profiles} size={40}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>
              {post.profiles?.full_name || post.profiles?.username || 'Hitgram User'}
            </div>
            <div style={{ fontSize:'11px', color:'#3A3A3A' }}>{timeAgo(post.created_at)}</div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            {/* Fitness badge */}
            <div style={{ fontSize:'9px', color:'#AAFF00', fontWeight:'700', background:'rgba(170,255,0,0.08)', padding:'3px 8px', borderRadius:'20px', border:'1px solid rgba(170,255,0,0.15)' }}>
              Hitgram
            </div>
            {isOwner && (
              <button onClick={() => deletePost(post.id)}
                style={{ background:'transparent', border:'none', color:'#3A3A3A', cursor:'pointer', fontSize:'16px', padding:'4px', transition:'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                onMouseLeave={e => e.currentTarget.style.color='#3A3A3A'}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <div style={{ padding:'0 16px 12px', fontSize:'14px', color:'#E0E0E0', lineHeight:'1.7', whiteSpace:'pre-wrap' }}>
            {post.content}
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div style={{ padding:'0 16px 12px', display:'flex', flexWrap:'wrap', gap:'6px' }}>
            {post.hashtags.map((tag, i) => (
              <span key={i} style={{ fontSize:'12px', color:'#3B82F6', fontWeight:'600' }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Image */}
        {post.image_url && !imgError && (
          <div style={{ position:'relative', overflow:'hidden' }}>
            <img
              src={post.image_url}
              alt="Post"
              style={{ width:'100%', maxHeight:'400px', objectFit:'cover', display:'block' }}
              onError={() => setImgError(true)}
            />
          </div>
        )}

        {/* Video */}
        {post.video_url && (
          <video
            src={post.video_url}
            controls
            playsInline
            style={{ width:'100%', maxHeight:'400px', display:'block', background:'#000' }}
          />
        )}

        {/* Actions */}
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:'20px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
          {/* Like */}
          <button onClick={() => toggleLike(post)}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'transparent', border:'none', cursor:'pointer', padding:'6px 0', transition:'all 0.2s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked?'#EF4444':'none'} stroke={liked?'#EF4444':'#3A3A3A'} strokeWidth="2" style={{ transition:'all 0.2s', transform:liked?'scale(1.2)':'scale(1)' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span style={{ fontSize:'13px', color:liked?'#EF4444':'#3A3A3A', fontWeight:'600' }}>{post.like_count}</span>
          </button>

          {/* Comment */}
          <button onClick={() => openComments(post)}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'transparent', border:'none', cursor:'pointer', padding:'6px 0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize:'13px', color:'#3A3A3A', fontWeight:'600' }}>{post.comment_count}</span>
          </button>

          {/* Share */}
          <button onClick={() => {
            if (navigator.share) {
              navigator.share({ title:'Hitgram Post', text:post.content||'Check this out!', url:window.location.href })
            } else {
              navigator.clipboard?.writeText(window.location.href)
            }
          }}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'transparent', border:'none', cursor:'pointer', padding:'6px 0', marginLeft:'auto' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'48px', height:'48px', border:'3px solid rgba(170,255,0,0.2)', borderTop:'3px solid #AAFF00', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }}/>
        <div style={{ fontSize:'14px', color:'#3A3A3A' }}>Loading social feed...</div>
      </div>
    </div>
  )

  const displayPosts = search ? searchResults : posts

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:'100px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'52px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          <div style={{ fontSize:'20px', fontWeight:'900', color:'#fff', letterSpacing:'-0.02em' }}>Hitgram Feed</div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={refresh} disabled={refreshing}
              style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#111', border:'1px solid rgba(255,255,255,0.07)', color:'#3A3A3A', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', animation:refreshing?'spin 1s linear infinite':'' }}>
              ↺
            </button>
            <a href="/create-post"
              style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#AAFF00', border:'none', color:'#000', fontSize:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontWeight:'900', boxShadow:'0 0 16px rgba(170,255,0,0.3)' }}>+</a>
          </div>
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:'12px' }}>
          <input
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Search posts..."
            style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'11px 16px 11px 38px', color:'#fff', fontSize:'14px', outline:'none' }}
            onFocus={e => e.target.style.borderColor='rgba(170,255,0,0.3)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.07)'}
          />
          <svg style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          {searching && <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', width:'14px', height:'14px', border:'2px solid rgba(170,255,0,0.2)', borderTop:'2px solid #AAFF00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          {(['feed','following','discover'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:'10px', background:'transparent', border:'none', borderBottom:`2px solid ${tab===t?'#AAFF00':'transparent'}`, color:tab===t?'#AAFF00':'#3A3A3A', fontSize:'13px', fontWeight:tab===t?'700':'500', cursor:'pointer', textTransform:'capitalize', transition:'all 0.2s' }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'14px 16px' }}>

        {/* Stories row */}
        <div style={{ overflowX:'auto', marginBottom:'16px' }}>
          <div style={{ display:'flex', gap:'12px', width:'max-content', paddingBottom:'4px' }}>
            {/* Your story */}
            <a href="/create-post" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', textDecoration:'none', flexShrink:0 }}>
              <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'linear-gradient(135deg,#AAFF00,#22C55E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', fontWeight:'900', color:'#000', boxShadow:'0 0 16px rgba(170,255,0,0.3)', position:'relative' }}>
                {(profile?.full_name||user?.email)?.[0]?.toUpperCase()}
                <div style={{ position:'absolute', bottom:0, right:0, width:'20px', height:'20px', borderRadius:'50%', background:'#AAFF00', border:'2px solid #080808', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'900', color:'#000' }}>+</div>
              </div>
              <div style={{ fontSize:'11px', color:'#A1A1AA', fontWeight:'500' }}>Your Story</div>
            </a>
            {/* Other users from posts */}
            {[...new Map(posts.filter(p => p.profiles).map(p => [p.user_id, p])).values()].slice(0, 6).map(p => (
              <div key={p.user_id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', flexShrink:0 }}>
                <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'linear-gradient(135deg,#3B82F6,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'900', color:'#fff', border:'2px solid #AAFF00', overflow:'hidden' }}>
                  {p.profiles?.avatar_url
                    ? <img src={p.profiles.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : (p.profiles?.full_name||p.profiles?.username||'?')[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize:'11px', color:'#A1A1AA', maxWidth:'60px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'center' }}>
                  {p.profiles?.username || p.profiles?.full_name?.split(' ')[0] || 'User'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {displayPosts.length === 0 && !loading && (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'56px', marginBottom:'16px', animation:'fadeInUp 0.5s ease both' }}>
              {search ? '🔍' : '📸'}
            </div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:'#fff', marginBottom:'8px' }}>
              {search ? `No posts found for "${search}"` : 'No posts yet'}
            </div>
            <div style={{ fontSize:'13px', color:'#3A3A3A', marginBottom:'24px' }}>
              {search ? 'Try a different search term' : 'Be the first to share your fitness journey!'}
            </div>
            {!search && (
              <a href="/create-post"
                style={{ background:'#AAFF00', color:'#000', border:'none', borderRadius:'14px', padding:'13px 28px', fontSize:'15px', fontWeight:'800', textDecoration:'none', display:'inline-block', boxShadow:'0 0 24px rgba(170,255,0,0.4)' }}>
                Create First Post
              </a>
            )}
          </div>
        )}

        {/* Posts */}
        {displayPosts.map(post => <PostCard key={post.id} post={post}/>)}
      </div>

      {/* Comments Modal */}
      {activePost && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(12px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => setActivePost(null)}>
          <div style={{ width:'100%', maxWidth:'480px', background:'#0D0D0D', borderRadius:'24px 24px 0 0', maxHeight:'85vh', display:'flex', flexDirection:'column', animation:'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
            onClick={e => e.stopPropagation()}>

            {/* Handle */}
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
              <div style={{ width:'40px', height:'4px', background:'rgba(255,255,255,0.12)', borderRadius:'2px' }}/>
            </div>

            {/* Post preview */}
            <div style={{ padding:'0 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <Avatar p={activePost.profiles} size={36}/>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>{activePost.profiles?.full_name || 'User'}</div>
                  <div style={{ fontSize:'12px', color:'#3A3A3A', marginTop:'2px', maxWidth:'280px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activePost.content}</div>
                </div>
              </div>
            </div>

            {/* Comments header */}
            <div style={{ padding:'12px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>Comments ({activePost.comment_count})</div>
              <button onClick={() => setActivePost(null)}
                style={{ background:'transparent', border:'none', color:'#3A3A3A', cursor:'pointer', fontSize:'20px' }}>✕</button>
            </div>

            {/* Comments list */}
            <div style={{ flex:1, overflowY:'auto', padding:'0 16px' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'#3A3A3A' }}>
                  <div style={{ fontSize:'32px', marginBottom:'10px' }}>💬</div>
                  <div style={{ fontSize:'14px' }}>No comments yet. Be the first!</div>
                </div>
              ) : comments.map((c, i) => (
                <div key={c.id} style={{ display:'flex', gap:'10px', marginBottom:'14px', animation:`fadeInUp 0.3s ease ${i*0.05}s both` }}>
                  <Avatar p={c.profiles} size={34}/>
                  <div style={{ flex:1 }}>
                    <div style={{ background:'#111', borderRadius:'0 14px 14px 14px', padding:'10px 14px' }}>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:'#AAFF00', marginBottom:'4px' }}>
                        {c.profiles?.full_name || c.profiles?.username || 'User'}
                      </div>
                      <div style={{ fontSize:'13px', color:'#E0E0E0', lineHeight:'1.5' }}>{c.content}</div>
                    </div>
                    <div style={{ fontSize:'10px', color:'#3A3A3A', marginTop:'4px', paddingLeft:'4px' }}>{timeAgo(c.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div style={{ padding:'12px 16px 32px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:'10px', background:'#0D0D0D' }}>
              <Avatar p={profile} size={34}/>
              <div style={{ flex:1, display:'flex', gap:'8px', background:'#111', borderRadius:'20px', padding:'8px 14px', border:'1px solid rgba(255,255,255,0.08)', alignItems:'center' }}>
                <input
                  ref={commentRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()}
                  placeholder="Add a comment..."
                  style={{ flex:1, background:'transparent', border:'none', color:'#fff', fontSize:'14px', outline:'none' }}
                />
                <button onClick={sendComment} disabled={!commentText.trim() || sending}
                  style={{ background:'transparent', border:'none', color:commentText.trim()?'#AAFF00':'#3A3A3A', cursor:commentText.trim()?'pointer':'default', fontSize:'20px', padding:'0', transition:'color 0.2s', flexShrink:0 }}>
                  {sending ? '...' : '➤'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', zIndex:100, background:'rgba(8,8,8,0.97)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {[
            {href:'/dashboard',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,label:'Home'},
            {href:'/social',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAFF00" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Social',active:true},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:(n as any).active?'#AAFF00':'#3A3A3A',fontWeight:(n as any).active?'700':'600' }}>{n.label}</div>
            </a>
          ))}
          <a href="/create-post" style={{ width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#AAFF00,#22C55E)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'-18px',flexShrink:0,textDecoration:'none',boxShadow:'0 0 28px rgba(170,255,0,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          </a>
          {[
            {href:'/goals',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,label:'Goals'},
            {href:'/profile',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>,label:'Profile'},
          ].map(n=>(
            <a key={n.href} href={n.href} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',flex:1 }}>
              {n.icon}<div style={{ fontSize:'10px',color:'#3A3A3A',fontWeight:'600' }}>{n.label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}