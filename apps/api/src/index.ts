
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { createClient } from '@supabase/supabase-js'

// 1. Setup Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// 2. Initialize Elysia
const app = new Elysia()
  .use(cors())
  .use(swagger({
    documentation: {
      info: {
        title: 'Project Master API',
        version: '1.0.0',
        description: 'Vibe Stack API with Deep Fetch capabilities'
      }
    }
  }))

  // 3. Health Check
  .get('/', () => 'Project Master API: Vibe Stack Active')

  // 4. Projects Route (Deep Fetch)
  // This endpoint fetches the hierarchy: Project -> Subcategories -> Tasks
  // Optimized to prevent N+1 queries using Supabase joins
  .get('/projects', async ({ request, set }) => {
    // Get Auth Token from Header (In a real app, use a Guard)
    const authHeader = request.headers.get('Authorization')
    
    // Perform Deep Fetch
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        subcategories (
          *,
          tasks (
            *
          )
        )
      `)
      
    if (error) {
      set.status = 400
      return { error: error.message }
    }
    
    return data
  })

  .listen(3000)

console.log(`🚀 Vibe Backend running at ${app.server?.hostname}:${app.server?.port}`)
