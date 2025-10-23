import { v4 as uuidv4 } from 'uuid';

// Base URLs for Agora services
const API_BASE_URL = 'https://api.agora.io'; // Or 'https://api.sd-rtn.com' for China region
const REGION = 'na'; // 'na', 'ap', 'eu', 'cn'
const APP_ID = '0445e9f0ca784deeb2cdfa15817a74cc'; // From memory

// URL for our Supabase Edge Function to get education token
const TOKEN_SERVICE_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-agora-token`
  : 'http://127.0.0.1:54321/functions/v1/generate-agora-token';

// Cache for the education token
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Fetches a fresh education token from our secure backend
 * @returns {Promise<string>} - The education token
 */
async function fetchEducationToken() {
  // console.log('[Agora] Fetching new education token...');
  
  // Check if environment variables are set
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.error('[Agora] Missing required environment variables. Please check your .env file.');
    throw new Error('Configuration error: Missing required environment variables');
  }

  try {
    // console.log(`[Agora] Making request to token service: ${TOKEN_SERVICE_URL}`);
    
    const response = await fetch(TOKEN_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({}),
    });

    // console.log(`[Agora] Token service response status: ${response.status}`);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('[Agora] Token service error response:', errorData);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        const responseText = await response.text();
        console.error('[Agora] Failed to parse error response:', responseText);
      }
      throw new Error(`Failed to fetch education token: ${errorMessage}`);
    }

    const data = await response.json();
    // console.log('[Agora] Token service response data:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Invalid response from token service: success flag is false');
    }

    if (!data.token) {
      throw new Error('No token received from the token service');
    }

    // Cache the token with a 1-hour expiry (even though the token itself lasts 24 hours)
    cachedToken = data.token;
    tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now
    
    // console.log('[Agora] Successfully obtained and cached education token');
    return cachedToken;
  } catch (error) {
    console.error('[Agora] Error in fetchEducationToken:', {
      message: error.message,
      stack: error.stack,
      url: TOKEN_SERVICE_URL,
      envVars: {
        hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });
    
    // Provide more specific error messages for common issues
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Could not connect to the authentication service. Please check your internet connection.');
    }
    
    throw new Error(`Could not authenticate with the classroom service: ${error.message}`);
  }
}

/**
 * Gets a valid education token, either from cache or by fetching a new one
 * @returns {Promise<string>} - A valid education token
 */
async function getEducationToken() {
  // Return cached token if it's still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  // Otherwise, fetch a new token
  return await fetchEducationToken();
}

/**
 * Makes an authenticated request to the Agora Classroom API
 * @param {string} endpoint - The API endpoint
 * @param {string} method - The HTTP method
 * @param {object} body - The request body
 * @returns {Promise<object>} - The API response
 */
const agoraApi = async (endpoint, method = 'GET', body = null) => {
  // Get a valid education token
  const educationToken = await getEducationToken();
  
  const url = `${API_BASE_URL}/${REGION}/edu/apps/${APP_ID}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8',
    'Authorization': `agora token=${educationToken}`,
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      throw new Error(data.msg || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Agora API call failed: ${error.message}`);
    
    // If the error is due to an invalid token, clear the cache and retry once
    if (error.message.includes('token') || error.message.includes('401')) {
      // console.log('Token may be expired, attempting to refresh...');
      cachedToken = null; // Clear the cached token
      return agoraApi(endpoint, method, body); // Retry the request
    }
    
    throw error;
  }
};

/**
 * Creates a new classroom with the specified configuration.
 * @param {object} params - The parameters for creating a classroom.
 * @param {string} params.roomName - The name of the classroom.
 * @param {number} [params.roomType=4] - The type of classroom (4 for Small Classroom).
 * @returns {Promise<object>} The created classroom data.
 */
export const createClassroom = async ({ roomName, roomType = 4 }) => {
  const roomUuid = uuidv4().replace(/-/g, ''); // Generate UUID without dashes
  
  const payload = {
    roomName,
    roomType,
    roomUuid,
    config: {
      roleConfig: {
        host: {
          role: 'teacher',
          userUuid: `teacher_${Date.now()}`,
          userName: 'Professor',
          userRole: 'admin',
        },
        host_roles: ['admin', 'mainHost', 'speaker', 'host'],
        audience: {
          role: 'student',
          userUuid: `student_${Date.now()}`,
          userName: 'Estudante',
          userRole: 'audience',
        },
        audience_roles: ['audience'],
      },
      room: {
        overTime: 1440, // 24 hours in minutes
      },
      widgets: {
        netlessBoard: {
          show: true,
          width: 1280,
          height: 720,
        },
        streamMedia: {
          show: true,
        },
      },
    },
  };

  return await agoraApi('/v2/rooms', 'POST', payload);
};

/**
 * Sets the state of a classroom.
 * @param {string} roomUuid - The UUID of the classroom.
 * @param {number} state - The new state (1 for Started, 2 for Ended).
 * @returns {Promise<object>} The API response.
 */
export const setClassroomState = async (roomUuid, state) => {
  const endpoint = `/v2/rooms/${roomUuid}/states/${state}`;
  return agoraApi(endpoint, 'PUT');
};
