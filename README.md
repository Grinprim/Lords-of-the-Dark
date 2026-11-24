# Lords of the Dark

A rules reference, character builder and play companion for the Lords of the Dark tabletop RPG. It runs as a static website. There is no server and no login. Characters live in the browser that made them, and they can be saved as a PDF or a backup file.

## Run it

You need Node 22 or newer.

```
npm ci            install from the lockfile
npm run dev       local site with reload
npm test          run every test (117 at the time of writing)
npm run build     type check, then build into dist/
npm run preview   serve dist/ locally
npm run contrast  check WCAG contrast for both themes
npm run ledger    rewrite docs/OWNER_DECISIONS.md from the data
```

## Put it online (GitHub Pages)

1. Create a GitHub repository and push this folder to the `main` branch.
2. In the repository, open Settings, then Pages, and set Source to GitHub Actions.
3. The workflow in `.github/workflows/deploy.yml` runs the tests, builds, and publishes `dist/`. Every push to `main` redeploys.

The build uses a relative base path and hash routes, so it works from `https://name.github.io/repo/` without any setting. An old link to `sheet.html` redirects to the new Character Sheet. See `docs/MIGRATION.md`.

## What is in the site

Pages follow this order: Home, Getting Started, Rules, Species, Classes, Careers, Paths, Traits and Proficiencies, Equipment, Magic, Spiritual Arts, Companions and Summons, Crafting, Artifacts and Makers, World and Bestiary, Narrator Tools, Character Library, Character Creation and Character Sheet.

The catalogues hold 798 entries in total. Each one has search, filters, a detail view with a link you can share, and related entries. Global search is on Ctrl+K or `/`.

The Character Creation page is a nine step builder. A choice that is not allowed stays visible and says why. The Character Sheet tracks Health, Mana, Grace, Fatigue, conditions, uses, rolls and rest. Narrator Tools give exact odds, a one attack resolver, the condition rules and the decision ledger.

## How the code is laid out

```
src/data        Typed rules data with stable ids. No logic.
src/engine      Pure functions: derive totals, validate, dice, recovery, conditions, level-up.
src/store       IndexedDB storage, autosave, snapshots, import and export schema.
src/pdf         PDF export with the character embedded, and the matching import.
src/pages       One file per page. Creation steps live in src/pages/create, the sheet in src/pages/sheet.
src/components  Shared interface parts.
src/styles      Tokens, base, layout, components, print.
tests           Engine, data, persistence, creator and contrast tests.
scripts         Contrast checker, ledger export, sample PDF maker.
```

Rules for working in the code:

- Totals are never stored. `derive()` computes them from the choices each time, so a character cannot drift out of date.
- Every catalogue entry has a stable id and a status: approved, provisional, legacy, owner review or proposal. The badge spells the status out in text.
- Where the rules text does not cover a case, the site says what it assumed and lists the assumption in the decision ledger. Nothing is presented as world canon.
- Add rules data in `src/data`, add a test in `tests`, and run `npm test`. The copy test fails on em dashes and on a short list of banned words.

## Saving and moving characters

- The browser saves each change after a short pause. The top bar shows the save state in words.
- A snapshot is kept before a replace, a restore, a delete and a level-up, and on every 25th save. Up to 12 are kept for each character.
- **Save as PDF** makes a sheet that can be printed. The character is embedded inside the PDF as `character.json`. Import reads it back. A test confirms that notes and custom gear survive the round trip exactly.
- A printed copy, a scan, or a PDF that has been printed to a new PDF loses the embedded data. Use the PDF from the site or a backup file for anything you want to import again.
- **Backup** writes a `.lotd` file for one character, or for the whole library.
- Import shows a preview first. It rejects damaged files, files that are too large, and files from a newer version of the site. It rebuilds every character from the fields it knows, so unknown keys and embedded scripts are never run or kept.
- If the browser blocks storage, the site keeps working in memory and says so.

## Accessibility

- Keyboard: a skip link is the first Tab stop. Search, tabs, choices, steppers and the phone menu all work without a pointer. Focus is visible.
- Contrast: 72 token pairs are checked in both themes against WCAG AA, and the test suite fails if one drops below it.
- Status is always written out as text. Icons come with a name and a tooltip. Nothing relies on color alone.
- Motion is minimal and turns off when the system asks for reduced motion.
- Light and dark themes follow the system and can be switched by hand.

## Fonts

Source Serif 4 and IBM Plex Sans are served from this repository. Nothing loads from a third party host. Both are under the SIL Open Font License 1.1. The license texts are in `src/assets/fonts`.

## Open items

`docs/OWNER_DECISIONS.md` lists every place where the site made a reading of the rules or filled a gap. Start with the sections Owner review and Proposal.
