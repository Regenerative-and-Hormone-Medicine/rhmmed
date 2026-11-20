// Formspark + Botpoison submission, matching the live site's custom scripts (same endpoints and payload shape).
import Botpoison from '@botpoison/browser';

export const FORMS = {
  contact: 'https://submit-form.com/aQcnERsKm',
  book: 'https://submit-form.com/enYsqVsm7',
};
const BOTPOISON_KEY = 'pk_141d7a29-c993-464c-80a7-3dfea085e9a3';

export async function submitToFormspark(url: string, payload: Record<string, string>) {
  const { solution } = await new Botpoison({ publicKey: BOTPOISON_KEY }).challenge();
  if (!solution) throw new Error('Botpoison challenge failed.');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...payload, _botpoison: solution }),
  });
  if (!res.ok) throw new Error(`Formspark HTTP ${res.status}: ${await res.text()}`);
}

/** Split "Jane Q Doe" → first "Jane", last "Q Doe" (the live site does this for GoHighLevel). */
export function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') };
}

/** Phone check used on the live site: 10–15 digits. */
export function validPhone(v: string) {
  const d = v.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15;
}
