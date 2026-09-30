# Deb's Bistro website

Live at **https://www.debsbistro.com**. Built and maintained by MarketinCrew.

## How changes go live

Day to day, the restaurant edits the menu itself at admin.debsbistro.com. That editor
publishes to Supabase and the menu page reads it live, so menu text and prices do not
go through this repository at all. What follows is for code changes.


1. Make your change on a new branch (Claude or ChatGPT does this for you).
2. Open a pull request. Vercel posts a **preview link** on the pull request within a minute or two.
3. Open the preview link and check the page on your phone and laptop.
4. If it looks right, click **Merge pull request**. The live site updates in about a minute.

You cannot push straight to `main`. Every change goes through a pull request so there is always a preview first.

## Where things are

| What | File |
|------|------|
| Home page (English / French) | `index.html` / `fr/index.html` |
| Menu (English / French) | `menu.html` / `fr/menu.html` |
| Our story (English / French) | `story.html` / `fr/histoire.html` |
| Visit us, Saturday thali, catering | `visit.html`, `saturday-thali.html`, `catering-events.html` |
| Colours, fonts, layout | `assets/style.css` |
| Photos and videos | `media/` |

## Please do not touch

- `vercel.json` (domain redirects and caching)
- `api/` (the catering enquiry form that emails you)
- `robots.txt`, `sitemap.xml`

If something breaks, message Manan. Any previous version of the site can be restored in one click.
