# Cash Count

A cash register counting helper for Canadian cash (nickel, dime, quarter, 50¢, loonie, toonie, $5–$100).
Installable on Android as an app, works offline, saves automatically on your device.

## Features
- Rolls × count entry for coins (nickel 40, dime 50, quarter 40, loonie 25, toonie 25)
- Multiple drawers with a combined total
- Optional till float/target with Over / Short display
- Number keypad with previous/next cell arrows

## Deploy on GitHub Pages
1. Create a new GitHub repository and push these files to the `main` branch.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow publishes the site on every push. Your URL will be
   `https://<your-username>.github.io/<repo-name>/`.

## Install on Android
Open the URL in Chrome → menu (⋮) → **Install app** / **Add to Home screen**.

## Later
It is plain HTML/CSS/JS, so the same files work as a website on any host or custom domain.
To change roll sizes or denominations, edit the `DENOMS` list at the top of `app.js`.
If you change files after release, bump `CACHE` in `sw.js` so phones pick up the update.
