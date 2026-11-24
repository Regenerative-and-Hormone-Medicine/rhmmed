// GET /api/draft-mode/disable — preview build only. Clears the draft-mode cookie.
import type { APIRoute } from 'astro';
import { DRAFT_COOKIE } from '../lib/content';

export const prerender = false;

export const GET: APIRoute = async () => {
  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', `${DRAFT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`);
  return new Response(null, { status: 307, headers });
};
