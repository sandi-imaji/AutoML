// API Route Proxy untuk tags search
// Endpoint: POST /api/tags/search
// Body: { search: string, authToken: string }
// Proxy ke: https://10.51.216.9/application/api/tags/search.php?search={query}

// Import https untuk handle self-signed certificate
import https from 'https'

export async function POST(request) {
  try {
    const body = await request.json()
    const { search, authToken = "test" } = body

    console.log('📥 Received request:', { search, authToken })

    // Validation: minimal 3 karakter
    if (!search || search.trim().length < 3) {
      console.log('⚠️ Validation failed: less than 3 chars')
      return Response.json(
        { message: "Search query must be at least 3 characters", data: [] }, 
        { status: 400 }
      )
    }

    const cleanQuery = search.trim()
    console.log('🔍 Proxy search:', cleanQuery)

    const url = `https://10.51.216.9/application/api/tags/search.php`
    console.log('🔗 URL:', url)
    
    // Create agent with rejectUnauthorized: false untuk self-signed certificate
    const agent = new https.Agent({
      rejectUnauthorized: false
    })
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    console.log('📤 Sending request to external API...')
    
    // Create form data - KIRIM SEMUA KE BODY (sama seperti Python)
    const formData = new URLSearchParams()
    formData.append('authToken', authToken)  // Perbaiki: authToken (camelCase)
    formData.append('search', cleanQuery)     // TAMBAH: search juga di body
    
    console.log('📦 Form data:', formData.toString())
    
    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: controller.signal,
        agent: agent, // Tambahkan agent untuk bypass SSL verification
      })
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError.message)
      console.error('Fetch error details:', fetchError)
      clearTimeout(timeoutId)
      return Response.json(
        { message: `Network error: ${fetchError.message}`, data: [] }, 
        { status: 500 }
      )
    }

    clearTimeout(timeoutId)

    console.log('📥 External API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ External API error:', response.status, errorText)
      throw new Error(`External API error: ${response.status} ${response.statusText}`)
    }

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message)
      const textResponse = await response.text()
      console.error('📄 Raw response:', textResponse)
      throw new Error('Failed to parse API response')
    }
    
    console.log(`✅ Proxy success: ${data.data?.length || 0} tags found`)
    console.log('📦 Response data:', JSON.stringify(data, null, 2))
    
    return Response.json(data)

  } catch (error) {
    console.error('❌ Proxy error:', error)
    console.error('Stack trace:', error.stack)
    
    if (error.name === 'AbortError') {
      return Response.json(
        { message: "Request timeout", data: [] }, 
        { status: 504 }
      )
    }

    return Response.json(
      { message: error.message || "Failed to fetch tags", data: [] }, 
      { status: 500 }
    )
  }
}
