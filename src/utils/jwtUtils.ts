import { jwtDecode } from 'jwt-decode';

export interface JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  iss?: string;
  aud?: string;
  [key: string]: any;
}

export interface TokenMetadata {
  token: string;
  decoded: JWTPayload;
  expiresAt: Date;
  issuedAt: Date;
  isExpired: boolean;
  timeToExpiry: number; // in milliseconds
  userId: string;
  role?: string;
}

/**
 * Decodes a JWT token and returns structured metadata
 */
export const decodeToken = (token: string): TokenMetadata => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const now = Date.now();
    const expiresAt = new Date(decoded.exp * 1000);
    const issuedAt = new Date(decoded.iat * 1000);
    const isExpired = now >= decoded.exp * 1000;
    const timeToExpiry = decoded.exp * 1000 - now;

    return {
      token,
      decoded,
      expiresAt,
      issuedAt,
      isExpired,
      timeToExpiry,
      userId: decoded.sub,
      role: decoded.role || decoded.user_role
    };
  } catch (error) {
    console.error('❌ Error decoding JWT token:', error);
    throw new Error('Invalid JWT token');
  }
};

/**
 * Checks if a token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const metadata = decodeToken(token);
    return metadata.isExpired;
  } catch {
    return true;
  }
};

/**
 * Gets the time remaining before token expires (in milliseconds)
 */
export const getTokenTimeToExpiry = (token: string): number => {
  try {
    const metadata = decodeToken(token);
    return metadata.timeToExpiry;
  } catch {
    return 0;
  }
};

/**
 * Checks if token should be refreshed (expires within next 5 minutes)
 */
export const shouldRefreshToken = (token: string, thresholdMinutes: number = 5): boolean => {
  const timeToExpiry = getTokenTimeToExpiry(token);
  const thresholdMs = thresholdMinutes * 60 * 1000;
  return timeToExpiry > 0 && timeToExpiry <= thresholdMs;
};

// Helper: decode Base64URL strings by normalizing URL-safe chars and padding
const decodeBase64Url = (input: string): string => {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return atob(base64);
};

/**
 * Validates token format and basic structure (accepts base64url without padding)
 */
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    console.debug('❌ Token validation failed: token is null/undefined or not a string');
    return false;
  }

  // Basic JWT structure check (base64url.base64url.base64url)
  const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  if (!jwtPattern.test(token)) {
    console.debug('❌ Token validation failed: does not match JWT pattern', token);
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    console.debug('❌ Token validation failed: incorrect number of parts', parts.length);
    return false;
  }

  try {
    // Decode header and payload using base64url normalization and ensure they are valid JSON
    const headerJson = decodeBase64Url(parts[0]);
    const payloadJson = decodeBase64Url(parts[1]);
    const header = JSON.parse(headerJson);
    const payload = JSON.parse(payloadJson);
    
    // Log successful validation details
    console.debug('✅ Token validation passed:', {
      header: { type: header.typ, alg: header.alg },
      payload: { sub: payload.sub, exp: payload.exp }
    });
    return true;
  } catch (error) {
    console.debug('❌ Token validation failed: invalid JSON in header/payload', error);
    return false;
  }
};

/**
 * Extracts user information from JWT token
 */
export const getUserFromToken = (token: string): any => {
  try {
    const metadata = decodeToken(token);
    return {
      id: metadata.userId,
      role: metadata.role,
      // Add other user fields if present in token
      ...metadata.decoded
    };
  } catch {
    return null;
  }
};

/**
 * Gets token expiration date
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const metadata = decodeToken(token);
    return metadata.expiresAt;
  } catch {
    return null;
  }
};

/**
 * Calculates refresh timing based on token expiry
 */
export const getRefreshTiming = (token: string): {
  shouldRefresh: boolean;
  refreshIn: number; // milliseconds until refresh
  expiresIn: number; // milliseconds until expiry
} => {
  const timeToExpiry = getTokenTimeToExpiry(token);
  const shouldRefresh = shouldRefreshToken(token);
  const refreshIn = Math.max(0, timeToExpiry - (5 * 60 * 1000)); // 5 minutes before expiry

  return {
    shouldRefresh,
    refreshIn,
    expiresIn: timeToExpiry
  };
};
