# TeaPosters

TeaPosters is an offline-first, pass-and-play imposter game. The word deck and
game logic run locally in the app; playing never calls a model or a word API.

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

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
