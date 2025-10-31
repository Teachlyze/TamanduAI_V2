import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = (Deno.env.get("SUPABASE_SECRET_KEY") || (Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")))!
    
    const supabase = createClient(supabaseUrl, SUPABASE_SECRET_KEY)

    const now = new Date()
    const in15min = new Date(now.getTime() + 15 * 60000)
    const timeIn15min = `${in15min.getHours().toString().padStart(2, '0')}:${in15min.getMinutes().toString().padStart(2, '0')}:00`
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const today = days[now.getDay()]
    const todayDate = now.toISOString().split('T')[0]

    console.log(`Checking classes starting at ${timeIn15min} on ${today}`)

    // Get classes starting in 15 minutes
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, meeting_start_time, meeting_link, vacation_start, vacation_end, cancelled_dates')
      .eq('is_online', true)
      .filter('meeting_days', 'cs', `{${today}}`)
      .gte('meeting_start_time', timeIn15min.substring(0, 5)) // HH:MM
      .lte('meeting_start_time', `${in15min.getHours().toString().padStart(2, '0')}:${(in15min.getMinutes() + 5).toString().padStart(2, '0')}`) // 5 min window

    if (classesError) {
      console.error('Error fetching classes:', classesError)
      throw classesError
    }

    console.log(`Found ${classes?.length || 0} classes`)

    let notificationsSent = 0

    for (const cls of classes || []) {
      // Check if class is in vacation
      if (cls.vacation_start && cls.vacation_end) {
        const vacStart = new Date(cls.vacation_start)
        const vacEnd = new Date(cls.vacation_end)
        if (now >= vacStart && now <= vacEnd) {
          console.log(`Class ${cls.name} is in vacation, skipping`)
          continue
        }
      }

      // Check if class is cancelled today
      if (cls.cancelled_dates && cls.cancelled_dates.includes(todayDate)) {
        console.log(`Class ${cls.name} is cancelled today, skipping`)
        continue
      }

      // Get students in this class
      const { data: members, error: membersError } = await supabase
        .from('class_members')
        .select('user_id, profiles!inner(name, email)')
        .eq('class_id', cls.id)

      if (membersError) {
        console.error(`Error fetching members for class ${cls.id}:`, membersError)
        continue
      }

      console.log(`Found ${members?.length || 0} students in class ${cls.name}`)

      // Create notifications for each student
      const notifications = members?.map(m => ({
        user_id: m.user_id,
        type: 'class_reminder',
        title: `🎓 Aula em 15 minutos: ${cls.name}`,
        message: `Sua aula começa às ${cls.meeting_start_time.substring(0, 5)}. Prepare-se para entrar!`,
        action_url: cls.meeting_link,
        is_read: false,
        created_at: new Date().toISOString()
      }))

      if (notifications && notifications.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications)

        if (notifError) {
          console.error(`Error creating notifications for class ${cls.id}:`, notifError)
        } else {
          notificationsSent += notifications.length
          console.log(`Sent ${notifications.length} notifications for class ${cls.name}`)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${notificationsSent} notifications`,
        classes_checked: classes?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
