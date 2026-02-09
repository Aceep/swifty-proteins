import axios from 'axios';
import { API_UID, API_SECRET } from '@env';

let accessToken = null;
let tokenExpiry = null;

export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  UNKNOWN: 'UNKNOWN',
};

// Get OAuth access token
async function getAccessToken() {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    console.log('[intra42] Requesting new access token...');
    const response = await axios.post('https://api.intra.42.fr/oauth/token', {
      grant_type: 'client_credentials',
      client_id: API_UID,
      client_secret: API_SECRET,
    });

    accessToken = response.data.access_token;
    // Set expiry to 1 hour (3600 seconds) minus 5 minutes buffer
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
    
    console.log('[intra42] Access token obtained');
    return accessToken;
  } catch (error) {
    console.error('[intra42] Failed to get access token:', error.response?.data || error.message);
    const apiError = new Error('Failed to authenticate with 42 API');
    apiError.type = ErrorTypes.AUTH_ERROR;
    throw apiError;
  }
}

// Get user data from 42 API
export async function getUser(login) {
  try {
    console.log(`[intra42] Fetching user: ${login}`);
    const token = await getAccessToken();
    
    const response = await axios.get(`https://api.intra.42.fr/v2/users/${login}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[intra42] User data retrieved:', response.data.login);
    return response.data;
  } catch (error) {
    console.error('[intra42] Error fetching user:', error.response?.status, error.response?.data);
    
    // Handle different error types
    if (!error.response) {
      // Network error
      const networkError = new Error('Network error. Please check your internet connection.');
      networkError.type = ErrorTypes.NETWORK_ERROR;
      throw networkError;
    }

    const status = error.response.status;
    
    if (status === 404) {
      const notFoundError = new Error(`User "${login}" not found`);
      notFoundError.type = ErrorTypes.USER_NOT_FOUND;
      throw notFoundError;
    } else if (status === 429) {
      const rateLimitError = new Error('Too many requests. Please wait a moment and try again.');
      rateLimitError.type = ErrorTypes.RATE_LIMITED;
      throw rateLimitError;
    } else if (status >= 500) {
      const serverError = new Error('42 API server error. Please try again later.');
      serverError.type = ErrorTypes.SERVER_ERROR;
      throw serverError;
    } else if (status === 401) {
      // Token expired, clear it and retry once
      accessToken = null;
      tokenExpiry = null;
      const authError = new Error('Authentication expired. Please try again.');
      authError.type = ErrorTypes.AUTH_ERROR;
      throw authError;
    }
    
    // Unknown error
    const unknownError = new Error(error.response?.data?.message || 'An unexpected error occurred');
    unknownError.type = ErrorTypes.UNKNOWN;
    throw unknownError;
  }
}
