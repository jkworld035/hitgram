import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', authError })
    }

    // Try to insert a test habit
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id:     user.id,
        name:        'API Test Habit',
        icon:        '🧪',
        description: 'Created via API test',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        error:   error.message, 
        code:    error.code,
        details: error.details,
        hint:    error.hint,
        userId:  user.id,
      })
    }

    return NextResponse.json({ 
      success: true, 
      habit:   data,
      userId:  user.id,
      message: 'Habit saved successfully!'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}