import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (ca) => ca.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const protectedPaths = [
  '/dashboard','/health','/habits','/meals','/workout',
  '/ai','/jarvis','/goals','/social','/profile',
  '/create-post','/reminders','/health-live','/onboarding',
  '/assessment',
]
  const authPaths = ['/login', '/signup']
  const isProtected = protectedPaths.some(p => path.startsWith(p))
  const isAuth = authPaths.some(p => path === p)
  const isRoot = path === '/'

  if (isProtected && !user)
    return NextResponse.redirect(new URL('/login', request.url))
  if (isAuth && user)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  if (isRoot && user)
    return NextResponse.redirect(new URL('/dashboard', request.url))

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|manifest|.*\\..*).*)'],
}