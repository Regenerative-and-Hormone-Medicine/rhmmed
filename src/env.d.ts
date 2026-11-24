/// <reference types="astro/client" />
/** true only in the editorial preview build (SANITY_PREVIEW=1); see src/lib/content.ts. */
declare const __RHM_PREVIEW__: boolean;
declare module 'rhm:visual-editing' {
  const C: (props: Record<string, never>) => any;
  export default C;
}
