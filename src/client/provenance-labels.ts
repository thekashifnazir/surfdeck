export const PROVENANCE_LABELS: Record<string, string> = {
  // Stack
  nextjs: "Next.js",
  nuxt: "Nuxt",
  astro: "Astro",
  sveltekit: "SvelteKit",
  gatsby: "Gatsby",
  remix: "Remix",
  hugo: "Hugo",
  jekyll: "Jekyll",
  eleventy: "Eleventy",
  zola: "Zola",
  docusaurus: "Docusaurus",
  wordpress: "WordPress",
  ghost: "Ghost",
  react_spa: "React SPA",
  vue_spa: "Vue SPA",
  svelte_spa: "Svelte SPA",
  static_html: "Static HTML",
  // Host
  github_pages: "GitHub Pages",
  vercel: "Vercel",
  netlify: "Netlify",
  cloudflare_pages: "Cloudflare Pages",
  neocities: "Neocities",
  surge: "Surge",
  firebase: "Firebase",
  render: "Render",
  fly: "Fly.io",
  aws_s3: "AWS S3",
  aws_amplify: "AWS Amplify",
  heroku: "Heroku",
  self: "Self-hosted",
  // Static/Dynamic
  static: "Static",
  dynamic: "Dynamic",
};

/**
 * Returns the display label for a provenance value.
 * Falls through to the raw value if no label is defined.
 */
export function getProvenanceLabel(value: string): string {
  return PROVENANCE_LABELS[value] ?? value;
}
