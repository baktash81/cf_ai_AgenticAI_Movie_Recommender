// Authentication utilities for Cloudflare Workers
import { User, UserRow, JWTPayload, AuthTokens } from '../types/auth';

// JWT Secret - should be set via wrangler secret
const JWT_SECRET_KEY = 'JWT_SECRET';
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Generate a random UUID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    
    const salt = combined.slice(0, 16);
    const storedHashBytes = combined.slice(16);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    
    const hashArray = new Uint8Array(derivedBits);
    
    // Constant-time comparison
    if (hashArray.length !== storedHashBytes.length) return false;
    let result = 0;
    for (let i = 0; i < hashArray.length; i++) {
      result |= hashArray[i] ^ storedHashBytes[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Create a JWT token
 */
export async function createJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signature = await signJWT(`${encodedHeader}.${encodedPayload}`, secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = await signJWT(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) return null;
    
    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate auth tokens (access + refresh)
 */
export async function generateTokens(user: User, secret: string): Promise<AuthTokens> {
  const accessToken = await createJWT(
    { sub: user.id, email: user.email },
    secret,
    ACCESS_TOKEN_EXPIRY
  );
  
  const refreshToken = await createJWT(
    { sub: user.id, email: user.email },
    secret,
    REFRESH_TOKEN_EXPIRY
  );
  
  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

/**
 * Hash a refresh token for storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray));
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Convert UserRow to User
 */
export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    profileCompleted: row.profile_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// Helper functions
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

async function signJWT(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Auth middleware - extracts and verifies JWT, returns user ID
 */
export async function authenticateRequest(
  request: Request,
  jwtSecret: string
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);
  
  if (!token) return null;
  
  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) return null;
  
  return { userId: payload.sub, email: payload.email };
}
