# TeaPosters

TeaPosters is an offline-first, pass-and-play imposter game. The word deck and
game logic run locally in the app; playing never calls a model or a word API.

## Player groups

Use **Player group** on the setup screen to switch between saved groups. Choose
**New group**, give it a name, and add its players. Each group remembers the
player list, who is selected, and the pass order. Groups can be renamed or
deleted; at least one group is always kept. Your previous player list is migrated
to **My group** automatically.

Groups are saved locally on this device and work offline. They do not sync
between devices or browsers. Switching groups is available before a round.

## Editing the game words

Edit `lib/words.json`. This is the only word source used by the game, including
when the app is offline.

Each category has a `category` label and a `words` array. Add a word object
to an existing array, or add a category object:

```json
{
  "category": "Nepali food",
  "words": [
    {
      "word": "Momo",
      "citizenHint": "A very popular steamed or fried snack",
      "imposterHint": "Something commonly associated with Nepali food"
    }
  ]
}
```

Imposters see only `imposterHint`. Citizens see the word with `citizenHint`
underneath. Keep words familiar and easy to explain. Citizen hints should point
to the word without repeating it; imposter hints should stay broad enough that
they do not give the word away. Include everyday Nepal references alongside
common topics, and avoid duplicate words across categories. IDs are generated
automatically from the word.

Increment the top-level `version` after changing the deck. Rebuild/redeploy the
app to distribute updates. Run `node scripts/seed-words.mjs` to validate edits;
it checks the local JSON and never downloads or overwrites it.

## Releasing PWA updates

Deploy with `npm run build` to the same production domain. The `postbuild` step
creates `public/sw.js` from `scripts/pwa/sw.js` with a fresh cache version and precaches the release’s JavaScript, CSS, fonts, and icons; no
manual cache bump is needed. Do not bypass it with a direct `next build` command.
The generated worker is ignored by Git.

The installed app checks for updates on launch, when brought to the foreground,
and when connectivity returns. Updates wait for the user to tap **Refresh**.
The **Update available** notification appears on the setup screen and stays
hidden while dealing cards or discussing a round. Other open tabs do not reload
automatically when one tab accepts an update.

Existing installations need one online reload to pick up this update interface.
Service workers are registered only in production. To verify a release locally,
use `npm run build` and `npm start`, install/load the app, deploy another build,
and return to it. Check that the update appears in setup, stays hidden during a
round, and refreshes successfully after returning to setup. Repeat offline and
with two tabs open. Worker lifecycle checks: `node --test scripts/pwa/sw.test.mjs`.

## Development and release checks

Use Node.js 22 or later and install the locked dependencies with `npm ci`.
Run `npm run dev` for local development. Service workers stay disabled in development.

Before a release:

```bash
npm run check
npm audit --omit=dev
npm run build
npm start
```

`check` runs lint, TypeScript, regression tests, and word-deck validation. The
production build validates the deck first, then generates the offline worker
from the completed build. If generating the worker fails, the release is not ready.
Deploy the complete build and `public` directory together using HTTPS. There
are no required API keys or external word services. Player groups and word history
remain local to each browser; clearing browser data removes them. In-progress
rounds are intentionally not persisted across reloads.

If the build environment restricts Turbopack’s worker processes, use
`npm run build -- --webpack`; this runs the same validation and postbuild steps.

Before promoting a deployment, verify on a real iPhone and Android device:

- Install from the production domain, then launch offline after the first install.
- Complete a round, including rapid taps, long names, and the last player’s card.
- Add, select, reorder, and remove players; reload to verify saved groups.
- Check a short screen, an open keyboard, light/dark mode, and reduced motion.
- With two tabs open, publish a new release: its update must wait during a round,
  appear in setup, and refresh only the tab that accepts it.

The browser must load the app online once before offline use. Deployment and
physical-device acceptance checks are separate from the automated test suite.
