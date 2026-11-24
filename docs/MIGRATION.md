# Moving from the old site

The old site at `grinprim.github.io/Lords-of-the-Dark` was a set of separate pages. This project replaces it with one static application.

## What happens to old links

- `sheet.html` redirects to the new Character Sheet. The redirect lives in `public/sheet.html` and `public/legacy-redirect.js`.
- The new site uses hash routes such as `#/species/human`, so every page works on GitHub Pages without server settings. Old page paths other than `sheet.html` are not redirected one by one. The home page and global search lead to the same content.

## What happens to old characters

Characters made on the old sheet are not imported automatically. Rebuild them in Character Creation. Once a character exists here, Save as PDF and Backup give you files that import again.

## Which rules apply

The latest approved specification wins over the old site wherever they disagree. Differences that matter are in the decision ledger under the status Legacy. Two examples:

- Six stacks of Fatigue are no longer fatal by rule. The consequence is left to the Narrator.
- The old level 1 attribute ceiling of 6 is kept as a warning in the builder, not a hard block. Ordinary attributes stop at 8.
- Limb loss and grafting from the old site are kept as a Narrator option only.

## Steps to switch over

1. Push this folder to the repository that serves the old site, or to a new one.
2. Set Pages to use GitHub Actions as the source.
3. Wait for the workflow to finish, then open the site and check the Home page, one catalogue, and the Character Sheet.
4. Open `/sheet.html` on the live site and confirm it lands on the new sheet.
5. Read `docs/OWNER_DECISIONS.md` and answer the Owner review items. Each answer is a change in `src/data/ledger.ts` and, where it changes a number, in the matching file under `src/data` or `src/engine`.
