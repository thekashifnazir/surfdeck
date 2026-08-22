/** A single footer navigation link. */
interface FooterLink {
  label: string;
  href: string;
  /** External links open in a new tab; same-origin links (e.g. /ouroboros) do not. */
  external: boolean;
}

/**
 * Footer links (order + hrefs approved in review 9). Rendered space-separated
 * with no "·" separators; styled dotted-coral + uppercase via `.site-footer__link`.
 * "HOW THIS WAS MADE" is same-origin (/ouroboros); the rest open in a new tab.
 * "REPO" links to the repository root.
 */
const FOOTER_LINKS: FooterLink[] = [
  { label: "KASHIFNAZIR.COM", href: "https://kashifnazir.com", external: true },
  { label: "GITHUB", href: "https://github.com/thekashifnazir", external: true },
  { label: "LINKEDIN", href: "https://www.linkedin.com/in/kashifnazir/", external: true },
  { label: "HOW THIS WAS MADE", href: "/ouroboros", external: false },
  { label: "REPO", href: "https://github.com/thekashifnazir/surfdeck", external: true },
];

/**
 * Site footer — rendered at the bottom of every page. A coral top rule over an
 * id block (name + role) and the approved link row, with a base row carrying
 * the copyright line and a Doto build tagline. Stacks cleanly at ≤430px.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="site-footer__id">
          <span className="site-footer__name">Kashif Nazir</span>
          <span className="site-footer__role">Senior Technical Architect</span>
        </div>
        <nav className="site-footer__links" aria-label="Author links">
          {FOOTER_LINKS.map(({ label, href, external }) => (
            <a
              key={label}
              className="site-footer__link"
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <div className="site-footer__base">
        <span>© 2026 Kashif Nazir</span>
        <span className="site-footer__doto">SURFDECK — BUILT END-TO-END BY AI IN KIRO</span>
      </div>
    </footer>
  );
}
