/**
 * Provenance URL map — official "learn more" links for the open-web card's
 * linked tech line (stack + host labels).
 *
 * Keyed by the corpus's lowercase_snake_case stack/host values. `getProvenanceUrl`
 * returns the official URL for a known value, or `null` for anything unmapped
 * (so callers render plain text rather than a broken link).
 *
 * URLs APPROVED verbatim (Final Cut, design §2.3). DOM-free — safe to import
 * anywhere on the client.
 */
export const PROVENANCE_URLS: Record<string, string> = {
  // stacks (official sites, from the brief)
  astro: "https://astro.build",
  gatsby: "https://www.gatsbyjs.com",
  ghost: "https://ghost.org",
  hugo: "https://gohugo.io",
  jekyll: "https://jekyllrb.com",
  nextjs: "https://nextjs.org",
  nuxt: "https://nuxt.com",
  react_spa: "https://react.dev",
  svelte_spa: "https://svelte.dev",
  sveltekit: "https://svelte.dev",
  wordpress: "https://wordpress.org",
  static_html: "https://developer.mozilla.org/en-US/docs/Learn/HTML",
  // hosts (official sites, from the brief)
  aws_s3: "https://aws.amazon.com/s3",
  fly: "https://fly.io",
  github_pages: "https://pages.github.com",
  netlify: "https://www.netlify.com",
  render: "https://render.com",
  vercel: "https://vercel.com",
};

export function getProvenanceUrl(value: string): string | null {
  return PROVENANCE_URLS[value] ?? null;
}
