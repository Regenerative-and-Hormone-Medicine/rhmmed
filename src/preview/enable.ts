// GET /api/draft-mode/enable — preview build only (injected in astro.config.mjs).
// The Studio's Presentation tool calls this with a one-time secret it stored in the dataset. If it checks out, we set the
// draft-mode cookie (SameSite=None + Partitioned so it works inside the Studio's iframe) and redirect to the page.
import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { SANITY } from '../lib/sanity-loader';
import { DRAFT_COOKIE } from '../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const token = process.env.SANITY_VIEWER_TOKEN;
  const secret = process.env.PREVIEW_COOKIE_SECRET;
  if (!token || !secret) return new Response('Preview is not configured', { status: 500 });
  const client = createClient({ ...SANITY, useCdn: false, token });
  const { isValid, redirectTo = '/' } = await validatePreviewUrl(client, request.url);
  if (!isValid) return new Response('Invalid secret', { status: 401 });
  const headers = new Headers({ Location: redirectTo });
  headers.append('Set-Cookie', `${DRAFT_COOKIE}=${secret}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=86400`);
  return new Response(null, { status: 307, headers });
};
