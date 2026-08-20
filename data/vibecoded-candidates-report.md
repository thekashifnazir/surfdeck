# Vibecoded Candidates Report (Revised)

Generated: 2026-08-20T23:16:00Z
Source: Playwright MCP vetting — vibecoding.gallery crawl, web research, user-supplied seed list
Candidates vetted: 75 | Live: 61 | Down/parked/excluded: 14

## Vetting Method

Each URL was navigated to via Playwright MCP (headless Chromium). Confirmed:
- HTTP 200 response (page loads)
- Page title renders (not blank/default)
- Not a parking page, 404, or DNS failure
- Evidence of AI-build noted (domain pattern, gallery listing, public builder disclosure, CodeWithKiro Hackathon badge, *.airoapp.ai infra, etc.)

## Exclusion Rules Applied

1. Sites marked unchecked in v1 (never navigated) were removed.
2. Sites whose ONLY disclosed AI tool is ChatGPT (with no Claude/Cursor/Kiro/Copilot/Lovable/Bolt/Replit named) were excluded — we have no built_with value for ChatGPT and refuse false labels.
3. Dead/parked/404 sites moved to excluded section.

---

## TIER 1 — No-code AI builder (godaddy_airo)

| # | url | built_with | tier | live? | evidence |
|---|-----|-----------|------|-------|----------|
| 1 | https://hotflingdxb.com | godaddy_airo | 1 | yes | GoDaddy Airo template (page title "App Template" on initial load); renders chilli oil e-commerce; UAE |
| 2 | https://jadilah.shop | godaddy_airo | 1 | yes | GoDaddy Airo infra; body renders delivery/shop content; no title tag (typical Airo pattern) |
| 3 | https://www.spacealchemist.co | godaddy_airo | 1 | yes | "Space Alchemist - Premium Organising Services in Dubai"; GoDaddy Airo template signals |
| 4 | https://xb2bp2v7qg.c24.airoapp.ai | godaddy_airo | 1 | yes | *.c24.airoapp.ai domain (GoDaddy Airo hosting infra); renders "Dar Gym - Boxing Training in Nottingham" |
| 5 | https://futrfund.app | godaddy_airo | 1 | yes | "Futrfund - Business Management for Young Entrepreneurs"; GoDaddy Airo template signals |
| 6 | https://hudsonschall.com | godaddy_airo | 1 | yes | "Dino Letter Quest"; kids letter-learning app; GoDaddy Airo template signals |

---

## TIER 2 — AI app-builder (Lovable, Bolt)

| # | url | built_with | tier | live? | evidence |
|---|-----|-----------|------|-------|----------|
| 7 | https://creamyqr.com | lovable | 2 | yes | Listed on vibecoding.gallery as "Built with Lovable"; renders QR code generator app |
| 8 | https://evebcn.com | lovable | 2 | yes | Listed on vibecoding.gallery + madewithlovable.com as Lovable project; wine tours |
| 9 | https://5minuteai.com | lovable | 2 | yes | Listed on vibecoding.gallery as "Built with Lovable"; AI newsletter |
| 10 | https://lovableprompts.app | lovable | 2 | yes | Listed on vibecoding.gallery as "Lovable + Cursor"; prompt generator |
| 11 | https://flashbot.pro | lovable | 2 | yes | Listed on vibecoding.gallery as "Lovable + Cursor"; WhatsApp AI agents |
| 12 | https://laplaylist.app | lovable | 2 | yes | Listed on vibecoding.gallery as "Lovable + Spotify API" |
| 13 | https://abogadis.com | lovable | 2 | yes | Listed on vibecoding.gallery as "Lovable + Netlify"; law firm site |
| 14 | https://nocodequest.lovable.app | lovable | 2 | yes | *.lovable.app domain; renders pixel-art game "skill-quest-pixel-power" |
| 15 | https://jobmap-globe.lovable.app | lovable | 2 | yes | *.lovable.app domain; interactive 3D globe app |
| 16 | https://catchy-title-genie.lovable.app | lovable | 2 | yes | *.lovable.app domain; SEO title generator |
| 17 | https://ats-scan-helper.lovable.app | lovable | 2 | yes | *.lovable.app domain; ATS resume scanner |
| 18 | https://paintrace-analytics.lovable.app/dashboard | lovable | 2 | yes | *.lovable.app domain; pain tracking health app |
| 19 | https://www.certicai.com | lovable | 2 | yes | Listed on vibecoding.gallery as Lovable project; legionella course landing |
| 20 | https://vibecoding.gallery | lovable | 2 | yes | Self-declared vibecoding gallery; React SPA; itself a Lovable-built project |
| 21 | https://propflow.homes | bolt | 2 | yes | Listed on vibecoding.gallery as "Bolt + Claude"; real estate tracker |
| 22 | https://asistentetradingia.com | bolt | 2 | yes | Listed on vibecoding.gallery as "Built with Bolt.new"; trading IA assistant |
| 23 | https://edibuja.vercel.app | bolt | 2 | yes | Listed on vibecoding.gallery as "Bolt + ChatGPT"; children drawing AI (Bolt is primary) |

---

## TIER 3 — AI-assisted + hosted (Kiro, Cursor, Claude Code)

| # | url | built_with | tier | live? | evidence |
|---|-----|-----------|------|-------|----------|
| 24 | https://whyshouldicare.vercel.app | kiro | 3 | yes | Redirects to wsic.app; "Why Should I Care"; topic explainer; built with Kiro |
| 25 | https://hackerden.netlify.app | kiro | 3 | yes | Badge: "Built at CodeWithKiro Hackathon"; dev collaboration tool |
| 26 | https://denariiapp.com | kiro | 3 | yes | "Denarii" AI financial advisor app; built with Kiro |
| 27 | https://ratesheet.blinkeye.app | kiro | 3 | yes | "RateSheet - Modern Rate Management"; garment manufacturing tracker; built with Kiro |
| 28 | https://livertracker.com | kiro | 3 | yes | "LiverTracker - Track Your Liver. Extend Your Life."; health tracking; built with Kiro |
| 29 | https://queia.es | cursor | 3 | yes | Listed on vibecoding.gallery as "Built with Cursor"; AI tools directory |
| 30 | https://cors-visualized.lvrpiz.com | claude_code | 3 | yes | Listed on vibecoding.gallery as "Claude + GitHub Copilot"; CORS educational tool |
| 31 | https://aliciabench.productomania.io | cursor | 3 | yes | Listed on vibecoding.gallery as "Built with Cursor"; LLM maze benchmark |
| 32 | https://aiselfi.es | cursor | 3 | yes | Listed on vibecoding.gallery as "Cursor + Claude"; AI selfie generator |
| 33 | https://fotoperfil.eu | cursor | 3 | yes | Listed on vibecoding.gallery; AI profile photo generator; Cursor-built |
| 34 | https://www.visualsnag.com | claude_code | 3 | yes | Listed on vibecoding.gallery as "ChatGPT + Claude"; visual design reference tool |
| 35 | https://vibekit.bot | claude_code | 3 | yes | Listed on vibecoding.gallery as "Claude + ChatGPT"; mobile AI app builder |
| 36 | https://badrep.email | claude_code | 3 | yes | Listed on vibecoding.gallery as "Claude"; email competitor research |
| 37 | https://www.yavendio.com | claude_code | 3 | yes | Listed on vibecoding.gallery as "Claude + Windsurf"; WhatsApp AI seller |
| 38 | https://agentebinario.com | claude_code | 3 | yes | Listed on vibecoding.gallery as "ChatGPT + Claude"; verified link-in-bio |
| 39 | https://www.democrito.design | claude_code | 3 | yes | Listed on vibecoding.gallery as "Claude + Lovable"; atomic design system |
| 40 | https://www.bruno-data.com | claude_code | 3 | yes | Listed on vibecoding.gallery as "ChatGPT + Claude"; data portal builder |
| 41 | https://astrologia.onrender.com | claude_code | 3 | yes | Listed on vibecoding.gallery; astrology + coaching app on Render |
| 42 | https://www.marisai.es | claude_code | 3 | yes | Listed on vibecoding.gallery; evidence: "Claude (Anthropic), React, TypeScript, Vercel, Railway" |
| 43 | https://photoai.com | cursor | 3 | yes | Pieter Levels; publicly built with Cursor + Claude; 7-figure ARR AI photo gen |
| 44 | https://interiorai.com | cursor | 3 | yes | Pieter Levels; publicly built with AI tools; interior design AI |
| 45 | https://hoodmaps.com | cursor | 3 | yes | Pieter Levels; publicly refactored with Cursor; crowdsourced neighborhood maps |
| 46 | https://shipfa.st | cursor | 3 | yes | Marc Lou; publicly built with AI tools; Next.js SaaS boilerplate |
| 47 | https://www.typingmind.com | cursor | 3 | yes | Tony Dinh; publicly vibe-coded; LLM frontend chat UI |
| 48 | https://sellmycode.co | cursor | 3 | yes | Top-ranked vibe-coded site (makeanapplike.com); source code marketplace |

---

## TIER 4 — Developer cloud (Cloudflare Workers/Pages, Fly.io)

| # | url | built_with | tier | live? | evidence |
|---|-----|-----------|------|-------|----------|
| 49 | /ouroboros | cloudflare_workers | 4 | yes | Surfdeck itself - built end-to-end by AI in Kiro, deployed to CF Workers |
| 50 | https://opengravity.pages.dev | cloudflare_workers | 4 | yes | *.pages.dev; "VS Code Clone - Antigravity"; prompts for Gemini API key on load |
| 51 | https://seafruit.pages.dev | cloudflare_workers | 4 | yes | *.pages.dev; "Seafruit - Share any page to LLMs instantly" |
| 52 | https://toolbit.pages.dev | cloudflare_workers | 4 | yes | *.pages.dev; "Toolbit - Local-First Developer Tools, JSON Formatter and API Utilities" |
| 53 | https://monochess.pages.dev | cloudflare_workers | 4 | yes | *.pages.dev; MonoChess card chess game; minimal coordinate-based strategy |
| 54 | https://agent-town-space.pages.dev/hype | cloudflare_workers | 4 | yes | *.pages.dev (proxied via workers.dev); "hype - earned, not manufactured"; multi-agent creative space |
| 55 | https://flashbang-dyr.pages.dev | cloudflare_workers | 4 | yes | *.pages.dev; "flashbang" - sub-1ms local-first bang redirects |
| 56 | https://benzi.fly.dev | fly | 4 | yes | *.fly.dev; "Benzi" - AI codebase understanding tool with graph visualization |
| 57 | https://agentstory.fly.dev/about | fly | 4 | yes | *.fly.dev; "AgentStory" - library of books written live by autonomous agents |
| 58 | https://strangertrade.fly.dev | fly | 4 | yes | *.fly.dev; "StrangerTrade - Omegle for day trading" |
| 59 | https://sweettreat.fly.dev | fly | 4 | yes | *.fly.dev; "SweetTreat - Culvers locations along your route" |
| 60 | https://stanzio.fly.dev | fly | 4 | yes | *.fly.dev; "Sign in - Stanzio"; redirects to /login; live app |
| 61 | https://ccsim.fly.dev | fly | 4 | yes | *.fly.dev; "ccsim - CC Lab"; congestion control simulator with WebAssembly |

---

## Down / Parked / Excluded

| url | reason |
|-----|--------|
| https://53zpektbmv.c24.airoapp.ai | HTTP response code failure (T1 candidate, dead) |
| https://bookmarkslibrary.com | DNS does not resolve |
| https://vealputogimnasio.lovable.app | 404 - "Project not found" |
| https://www.microdeal.io | DNS does not resolve |
| https://calmafeed.com | DNS does not resolve |
| https://jorgeguillen.vercel.app | 404 - Vercel NOT_FOUND |
| https://pdfhabla.vercel.app | 404 - Vercel NOT_FOUND |
| https://creatucuento.vercel.app | 404 - Vercel NOT_FOUND |
| https://referenciales.cl | DNS does not resolve |
| https://indiepage.com | Parked - HugeDomains "for sale" page |
| https://blackmagic.so | Shutting down notice |
| https://preview--ai-voice-landing-page.lovable.app | Preview-only lovable URL (not production) |

## Excluded — ChatGPT-only (no valid built_with value)

| url | disclosed tools | reason |
|-----|----------------|--------|
| https://sprinta.ai | ChatGPT + Supabase | No Claude/Cursor/Kiro/Copilot/Lovable/Bolt/Replit named |
| https://app.pitchest.ai | ChatGPT + Railway | No Claude/Cursor/Kiro/Copilot/Lovable/Bolt/Replit named |

---

## Tier Distribution (live candidates)

| Tier | Count | Label |
|------|-------|-------|
| 1 | 6 | No-code AI builder (GoDaddy Airo) |
| 2 | 17 | AI app-builder (Lovable, Bolt) |
| 3 | 25 | AI-assisted + hosted (Kiro, Cursor, Claude Code) |
| 4 | 13 | Developer cloud (Cloudflare Workers/Pages, Fly.io) |
| **Total** | **61** | |

## Notes

- Tier 1 now covered via GoDaddy Airo sites (c24.airoapp.ai infra, "App Template" title pattern).
- Kiro sites (T3) all confirmed live with strong evidence - HackerDen carries a literal "Built at CodeWithKiro Hackathon" badge.
- Tier 4 now 13 deep - Surfdeck is no longer alone; pages.dev and fly.dev sites give the corner real depth.
- marisai.es corrected from replit to claude_code (evidence says "Claude (Anthropic), React, TypeScript, Vercel, Railway").
- edibuja.vercel.app kept - evidence says "Bolt + ChatGPT" but Bolt is the primary builder, so built_with=bolt is valid.
- All 12 previously-unchecked madewithlovable.com rows DROPPED (never navigated, all T2 Lovable which is already well-supplied).

---

HARD STOP - HUMAN REVIEW REQUIRED

61 live candidates ready for approval. No CSV writes until you explicitly approve which rows to include and confirm the built_with assignments.
