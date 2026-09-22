# Instructions for AI assistants (Claude, ChatGPT, Codex) editing this site

This is the live website of Deb's Bistro, an Indian restaurant at 26 Rue Lortet, 69007 Lyon. It is plain static HTML, CSS and JS. There is no framework and no build step.

## Workflow, always
- Never commit to `main` directly. Create a branch, commit, and open a pull request. Vercel builds a preview for every pull request.
- Keep each pull request small and about one change, with a plain-language title.

## Rules
- Every page exists in English and French. If you change text on an English page, make the matching change on the French page (`fr/`), and the reverse. `story.html` pairs with `fr/histoire.html`.
- Never use em dashes (the long dash). Use commas, full stops or parentheses.
- Keep the existing design: reuse the classes already in `assets/style.css`. Do not add frameworks, CDNs or new fonts.
- Do not edit `vercel.json`, anything in `api/`, `robots.txt` or `sitemap.xml`.
- New images go in `media/img/`, compressed for the web (under 400 KB, JPG or WebP), with descriptive `alt` text.
- Positioning: regional Indian cooking benchmarked in India, reproduced in Lyon. Not fusion, not "modern Indian". Spiced, not necessarily hot.
- Booking and ordering links, phone and WhatsApp numbers must not change unless the owner asks.
- Before opening the pull request, check the page has no broken links or images and still works on a phone width (390px).
