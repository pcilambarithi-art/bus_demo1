import crypto from 'crypto';

export const activeTokens = new Map();

export function generateToken(user, role) {
  const token = 'dce_' + role + '_' + crypto.randomUUID().replace(/-/g, '') + '_' + Date.now();
  activeTokens.set(token, {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });
  return token;
}

export function verifyToken(token) {
  if (!token) return null;
  const clean = token.replace('Bearer ', '').trim();
  const session = activeTokens.get(clean);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeTokens.delete(clean);
    return null;
  }
  return session;
}
