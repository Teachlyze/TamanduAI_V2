// Agora Token Generation Service
// This function generates a secure education token for Agora Classroom API

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.189.0/http/server.ts"
import { create as createJwt } from "https://deno.land/x/djwt@v3.0.2/mod.ts"
import { crypto } from "https://deno.land/std@0.189.0/crypto/mod.ts"
import { encode as base64Encode } from "https://deno.land/std@0.189.0/encoding/base64.ts"
import { encode as hexEncode } from "https://deno.land/std@0.189.0/encoding/hex.ts"

// Get environment variables from Supabase
const APP_ID = Deno.env.get("AGORA_APP_ID") || "C2RSMGZWEfCkNc9kyA0nVw/y2iAQJUULwmNlA"
const APP_CERT = Deno.env.get("AGORA_APP_CERT") || "333538ce7ec64167a5f9429dd7820a20"

// Token expiration time in seconds (24 hours)
const TOKEN_EXPIRATION = 24 * 60 * 60

// Generate a secure random string for the token
async function generateNonce() {
  const array = new Uint8Array(16)
  await crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Generate a JWT token for Agora API authentication
async function generateEducationToken() {
  const now = Math.floor(Date.now() / 1000)
  const nonce = await generateNonce()
  
  const header = {
    "alg": "HS256",
    "typ": "JWT"
  }
  
  const payload = {
    "iss": "agora",
    "exp": now + TOKEN_EXPIRATION,
    "nbf": now,
    "iat": now,
    "jti": nonce
  }
  
  // Create the JWT token
  const token = await createJwt(
    { alg: "HS256", typ: "JWT" },
    payload,
    new TextEncoder().encode(APP_CERT)
  )
  
  return token
}

// Main handler for the Edge Function
Deno.serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    )
  }
  
  try {
    // Generate the education token
    const token = await generateEducationToken()
    
    // Return the token in the response
    return new Response(
      JSON.stringify({ 
        success: true,
        token: `NETLESSSDK_${token}`,
        expiresIn: TOKEN_EXPIRATION
      }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        } 
      }
    )
  } catch (error) {
    console.error('Error generating token:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to generate token',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    )
  }
})

/* 
To invoke locally:

1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
2. Make an HTTP request:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-agora-token' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

In production, this endpoint will be available at:
`https://<project-ref>.supabase.co/functions/v1/generate-agora-token`

Make sure to set the following environment variables in your Supabase project:
- `AGORA_APP_ID`: Your Agora App ID
- `AGORA_APP_CERT`: Your Agora Primary Certificate
*/
