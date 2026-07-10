---
name: skill-router
description: "Routes to archived marketing, SEO, CRO, design, React/Next.js, prototyping, and utility skills on demand. Triggers on: marketing copy, copywriting, copy editing, proofread, SEO audit, technical SEO, why am I not ranking, landing pages, homepage copy, pricing strategy, pricing tiers, freemium, free trial, churn prevention, cancel flow, dunning, retention, save offer, competitor comparison, alternative page, vs page, content strategy, what should I write about, content ideas, blog topics, editorial calendar, launch strategy, Product Hunt, go-to-market, feature release, product marketing context, ICP, positioning, customer research, customer interviews, VOC, JTBD, Reddit mining, review mining, marketing ideas, growth ideas, how to market, marketing psychology, cognitive bias, persuasion, mental models, React best practices, Next.js performance, composition patterns, render props, view transitions, startViewTransition, shadcn/ui, component registry, branded design systems, design tokens, high-fidelity prototyping, interactive demos, HTML mockups, animation, web design guidelines, accessibility audit, review my UI, browser automation, fill out a form, take a screenshot, document improvement loop, autoresearch, quality loop, client folder compilation, compile client, client brain, proposal generation, site architecture, sitemap, information architecture, navigation design."
user-invocable: true
argument-hint: "<request> --- e.g. help me with SEO, or review my pricing"
---

# Skill Router

You route requests to archived skills that are no longer in the active discovery path but remain fully functional.

## How to Use

1. Read the archive index using the Read tool: `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills-archive\INDEX.md`
2. Scan the **Project-Level Archive** section of the index. Match the user's request to the most relevant archived skill by comparing their request against each skill's description.
3. Read the matched skill's SKILL.md from the path listed in its index entry (the path is relative to the project root, e.g. `.claude\skills-archive\copywriting\SKILL.md` resolves to `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\skills-archive\copywriting\SKILL.md`).
4. Follow the loaded skill's instructions exactly, treating the original user request as the skill's input/arguments.

If no good match is found, list the available archived skill categories and ask the user to be more specific.

## Categories Available

- **Copywriting & Editing:** copywriting, copy-editing, product-marketing-context
- **SEO & Site Structure:** seo-audit, site-architecture, web-design-guidelines
- **CRO & Growth:** churn-prevention, pricing-strategy, launch-strategy
- **Marketing Strategy:** content-strategy, marketing-ideas, marketing-psychology, customer-research, competitor-alternatives
- **React/Next.js:** vercel-react-best-practices, vercel-composition-patterns, vercel-react-view-transitions
- **UI/Design:** shadcn, huashu-design
- **Utilities:** agent-browser, autoresearch, compile-client, proposal
