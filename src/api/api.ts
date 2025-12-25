import type {Position} from "../models/Position.js"
import type {Pie} from "../models/Pie.js"
import type {AccountCash, AccountMetadata} from "../models/Account.js"

const API_BASE = "https://live.trading212.com/api/v0"
const API_KEY = process.env.T212_API_KEY ?? ""

// Get version from package.json for better tracking
const USER_AGENT = "T212-mcp/1.0"

// Rate limiting configuration
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests (max 10 req/sec)

/**
 * Validates that the API key is properly configured
 * @throws {Error} if API key is missing or invalid
 */
function validateApiKey(): void {
  if (!API_KEY || API_KEY.trim().length === 0) {
    throw new Error("No API key found in T212_API_KEY environment variable. Please set it in your configuration.");
  }
  
  // Basic format check - Trading212 API keys are typically alphanumeric
  if (!/^[a-zA-Z0-9_-]+$/.test(API_KEY)) {
    throw new Error("API key contains invalid characters. Please check your T212_API_KEY configuration.");
  }
}

/**
 * Implements simple rate limiting to prevent API throttling
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Validates that API response has expected structure
 */
function validateResponse(data: unknown, resourcePath: string): boolean {
  if (data === null || data === undefined) {
    console.error(`Received null/undefined response from ${resourcePath}`);
    return false;
  }
  
  if (typeof data !== 'object') {
    console.error(`Invalid response type from ${resourcePath}: expected object, got ${typeof data}`);
    return false;
  }
  
  return true;
}

/**
 * Generic function to fetch resources from Trading212 API
 * Implements rate limiting, error handling, and response validation
 */
async function fetchResource<T>(resourcePath: string): Promise<T | null> {
  // Validate API key on first use
  validateApiKey();
  
  // Enforce rate limiting
  await enforceRateLimit();

  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json",
    "Authorization": `Basic ${API_KEY}`
  };

  try {
    const response = await fetch(`${API_BASE}/${resourcePath}`, {
      headers,
      method: 'GET' // Explicitly specify GET for clarity
    });

    if (!response.ok) {
      // Log status but don't expose full response details
      console.error(`Trading212 API error for ${resourcePath}: HTTP ${response.status}`);
      
      // Handle specific status codes
      if (response.status === 401) {
        console.error("Authentication failed. Please check your API key.");
      } else if (response.status === 429) {
        console.error("Rate limit exceeded. Please wait before making more requests.");
      } else if (response.status >= 500) {
        console.error("Trading212 API is experiencing issues. Please try again later.");
      }
      
      return null;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!validateResponse(data, resourcePath)) {
      return null;
    }

    return data as T;
  } catch (error) {
    // Log error without exposing sensitive information
    if (error instanceof Error) {
      console.error(`Error fetching ${resourcePath}: ${error.message}`);
    } else {
      console.error(`Unknown error fetching ${resourcePath}`);
    }
    return null;
  }
}

/**
 * Sanitizes ticker symbol to prevent path traversal attacks
 */
function sanitizeTicker(ticker: string): string | null {
  if (!ticker || typeof ticker !== 'string') {
    console.error('Invalid ticker: must be a non-empty string');
    return null;
  }
  
  // Trim whitespace
  const trimmed = ticker.trim();
  
  // Validate ticker format: alphanumeric, dots, hyphens only
  // Examples: AAPL, BRK.B, VOO, MSFT
  const tickerRegex = /^[A-Z0-9][A-Z0-9.-]{0,19}$/i;
  
  if (!tickerRegex.test(trimmed)) {
    console.error(`Invalid ticker format: "${ticker}". Tickers should contain only letters, numbers, dots, and hyphens.`);
    return null;
  }
  
  // Prevent path traversal attempts
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    console.error(`Suspicious ticker detected: "${ticker}". Path traversal attempts are blocked.`);
    return null;
  }
  
  return trimmed.toUpperCase(); // Normalize to uppercase
}

export const fetchOpenPositions: () => Promise<[Position] | null> = async () => {
  return (await fetchResource("equity/portfolio"));
}

export const fetchPosition: (ticker: string) => Promise<Position | null> = async (ticker) => {
  // Sanitize ticker input
  const sanitizedTicker = sanitizeTicker(ticker);
  
  if (!sanitizedTicker) {
    console.error(`Cannot fetch position: invalid ticker "${ticker}"`);
    return null;
  }
  
  return (await fetchResource(`equity/portfolio/${sanitizedTicker}`));
}

export const fetchAllPies: () => Promise<[Pie] | null> = async () => {
  return (await fetchResource("equity/pies"));
}

export const fetchAccountCash: () => Promise<AccountCash | null> = async () => {
  return (await fetchResource("equity/account/cash"));
}

export const fetchAccountMetadata: () => Promise<AccountMetadata | null> = async () => {
  return (await fetchResource("equity/account/info"));
}