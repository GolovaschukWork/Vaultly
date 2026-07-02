import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { TrpcContext } from '@vaultly/trpc';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return null;

  if (!jwks) {
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    jwks = createRemoteJWKSet(new URL(`${baseUrl}/auth/v1/.well-known/jwks.json`));
  }

  return jwks;
}

type VerifiedToken = {
  userId: string | null;
  userEmail: string | null;
};

async function verifyAccessToken(token: string): Promise<VerifiedToken> {
  const empty = { userId: null, userEmail: null };

  const remoteJwks = getJwks();
  if (remoteJwks) {
    try {
      const { payload } = await jwtVerify(token, remoteJwks);
      return {
        userId: typeof payload.sub === 'string' ? payload.sub : null,
        userEmail: typeof payload.email === 'string' ? payload.email : null,
      };
    } catch {
      // Fall back to legacy HS256 secret below.
    }
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return empty;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return {
      userId: typeof payload.sub === 'string' ? payload.sub : null,
      userEmail: typeof payload.email === 'string' ? payload.email : null,
    };
  } catch {
    return empty;
  }
}

export async function createContext({ req }: CreateExpressContextOptions): Promise<TrpcContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, userEmail: null };
  }

  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}
