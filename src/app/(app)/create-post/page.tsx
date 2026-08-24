'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type MediaFile = {
  file: File
  preview: string
  type: 'image' | 'video'
}

export default function CreatePostPage() {
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<MediaFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime']
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

  const handleFile = useCallback((file: File) => {
    setError('')
    const isImage = ALLOWED_IMAGE.includes(file.type)
    const isVideo = ALLOWED_VIDEO.includes(file.type)

    if (!isImage && !isVideo) {
      setError('Unsupported file type. Use JPG, PNG, WEBP, MP4, WEBM or MOV.')
      return
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      setError('Image too large. Maximum size is 10MB.')
      return
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      setError('Video too large. Maximum size is 100MB.')
      return
    }

    const preview = URL.createObjectURL(file)
    setMedia({ file, preview, type: isImage ? 'image' : 'video' })
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const removeMedia = () => {
    if (media?.preview) URL.revokeObjectURL(media.preview)
    setMedia(null)
    setUploadProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadMedia = async (userId: string): Promise<string | null> => {
    if (!media) return null

    const ext = media.file.name.split('.').pop()
    const bucket = media.type === 'image' ? 'posts' : 'videos'
    const path = `${userId}/${Date.now()}.${ext}`

    // Simulate progress since Supabase JS doesn't have upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 10, 85))
    }, 200)

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, media.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: media.file.type,
      })

    clearInterval(progressInterval)

    if (error) {
      console.error('Upload error:', error)
      throw new Error(error.message)
    }

    setUploadProgress(100)

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return publicUrl
  }

  const publish = async () => {
    if (!content.trim() && !media) {
      setError('Write something or add a photo/video.')
      return
    }

    setUploading(true)
    setError('')
    setUploadProgress(0)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let mediaUrl: string | null = null
      if (media) {
        mediaUrl = await uploadMedia(user.id)
      }

      const { error: postError } = await supabase.from('user_posts').insert({
        user_id: user.id,
        content: content.trim(),
        image_url: media?.type === 'image' ? mediaUrl : null,
        video_url: media?.type === 'video' ? mediaUrl : null,
        is_public: true,
        like_count: 0,
        comment_count: 0,
      })

      if (postError) throw new Error(postError.message)

      setSuccess(true)
      setTimeout(() => router.push('/social'), 1500)

    } catch (err: any) {
      setError(err.message || 'Failed to publish. Please try again.')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease both' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#AAFF00,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 40px rgba(170,255,0,0.5)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Post Published!</div>
        <div style={{ fontSize: '14px', color: '#3A3A3A' }}>Redirecting to feed...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: 'Inter,sans-serif', paddingBottom: '40px' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '52px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="/social" style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#111', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', textDecoration: 'none', fontSize: '16px' }}>←</a>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Create Post</div>
          </div>
          <button onClick={publish} disabled={uploading || (!content.trim() && !media)}
            style={{ background: uploading || (!content.trim() && !media) ? '#1A1A1A' : '#AAFF00', color: uploading || (!content.trim() && !media) ? '#3A3A3A' : '#000', border: 'none', borderRadius: '20px', padding: '10px 20px', fontSize: '14px', fontWeight: '800', cursor: uploading || (!content.trim() && !media) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: uploading || (!content.trim() && !media) ? 'none' : '0 0 20px rgba(170,255,0,0.3)' }}>
            {uploading ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeInUp 0.3s ease both' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span style={{ fontSize: '13px', color: '#EF4444' }}>{error}</span>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Text input */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '18px', marginBottom: '14px' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind? Share your fitness journey, health wins, or motivate others..."
            maxLength={2000}
            rows={5}
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '15px', lineHeight: '1.7', outline: 'none', resize: 'none', fontFamily: 'Inter,sans-serif' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: content.length > 1800 ? '#EF4444' : '#3A3A3A' }}>{content.length}/2000</span>
          </div>
        </div>

        {/* Media preview */}
        {media && (
          <div style={{ background: '#111', border: '1px solid rgba(170,255,0,0.12)', borderRadius: '20px', overflow: 'hidden', marginBottom: '14px', position: 'relative', animation: 'fadeInUp 0.3s ease both' }}>
            {media.type === 'image' ? (
              <img src={media.preview} alt="Preview" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }}/>
            ) : (
              <video src={media.preview} controls style={{ width: '100%', maxHeight: '400px', display: 'block' }}/>
            )}
            {/* Upload progress overlay */}
            {uploading && uploadProgress < 100 && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#AAFF00', width: `${uploadProgress}%`, transition: 'width 0.2s ease', borderRadius: '2px' }}/>
                </div>
                <div style={{ fontSize: '13px', color: '#AAFF00', fontWeight: '700' }}>Uploading {uploadProgress}%</div>
              </div>
            )}
            {/* Remove button */}
            {!uploading && (
              <button onClick={removeMedia}
                style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                ✕
              </button>
            )}
            {/* File info */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>{media.type === 'image' ? '🖼️' : '🎥'}</span>
              <div>
                <div style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>{media.file.name}</div>
                <div style={{ fontSize: '11px', color: '#3A3A3A' }}>{(media.file.size / 1024 / 1024).toFixed(1)} MB • {media.type}</div>
              </div>
            </div>
          </div>
        )}

        {/* Drag and drop / file picker */}
        {!media && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{ background: dragOver ? 'rgba(170,255,0,0.06)' : '#111', border: `2px dashed ${dragOver ? 'rgba(170,255,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '14px', animation: 'fadeInUp 0.3s ease both' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(170,255,0,0.25)'; e.currentTarget.style.background = 'rgba(170,255,0,0.03)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#111' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>📸</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Add Photo or Video</div>
            <div style={{ fontSize: '13px', color: '#3A3A3A', lineHeight: '1.6', marginBottom: '16px' }}>
              Drag and drop here or tap to browse<br/>
              JPG, PNG, WEBP up to 10MB • MP4, WEBM up to 100MB
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(170,255,0,0.08)', border: '1px solid rgba(170,255,0,0.15)', borderRadius: '20px', padding: '8px 16px', fontSize: '12px', color: '#AAFF00', fontWeight: '600' }}>📷 Photo</div>
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '8px 16px', fontSize: '12px', color: '#3B82F6', fontWeight: '600' }}>🎥 Video</div>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        {/* Quick tags */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Quick Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['💪 Workout', '🥗 Nutrition', '😴 Sleep', '🧘 Mindfulness', '🏃 Running', '⚡ Energy', '🎯 Goals', '❤️ Health'].map(tag => (
              <button key={tag} onClick={() => setContent(p => p + (p ? ' ' : '') + tag)}
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '7px 14px', color: '#A1A1AA', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(170,255,0,0.25)'; e.currentTarget.style.color = '#AAFF00' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#A1A1AA' }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Publish button */}
        <button onClick={publish} disabled={uploading || (!content.trim() && !media)}
          style={{ width: '100%', background: uploading || (!content.trim() && !media) ? '#1A1A1A' : '#AAFF00', color: uploading || (!content.trim() && !media) ? '#3A3A3A' : '#000', border: 'none', borderRadius: '16px', padding: '16px', fontSize: '16px', fontWeight: '900', cursor: uploading || (!content.trim() && !media) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: uploading || (!content.trim() && !media) ? 'none' : '0 0 24px rgba(170,255,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {uploading ? (
            <>
              <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
              {media ? `Uploading ${uploadProgress}%...` : 'Publishing...'}
            </>
          ) : '🚀 Publish Post'}
        </button>

        {/* Tips */}
        <div style={{ marginTop: '20px', background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#3A3A3A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Tips for great posts</div>
          {[
            { icon: '📸', tip: 'Add a photo or video to get 3x more engagement' },
            { icon: '✍️', tip: 'Share your story — what worked, what did not' },
            { icon: '🎯', tip: 'Tag your post so others with same goals find it' },
          ].map(t => (
            <div key={t.tip} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{t.icon}</span>
              <span style={{ fontSize: '12px', color: '#52525B', lineHeight: '1.5' }}>{t.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}