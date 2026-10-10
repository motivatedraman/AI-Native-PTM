# Known issue: Devanagari does not render

Open. Written down because it was diagnosed, worked around, and never
actually confirmed fixed. Do not trust the workaround as a fix.

## What happens

Nepali text — Bikram Sambat dates and holiday names in Devanagari — does
not appear on screen. The characters are present in the data and in the
bundle; nothing paints.

## Why it happens

Not a CSS problem, and not a code problem. **The three fonts this app loads
contain no Devanagari glyphs.**

Verified by reading the `unicode-range` that Google Fonts returns for each
family:

| Family | Covers `U+0900-097F` (Devanagari)? |
|---|---|
| Geist | no |
| Inter Tight | no |
| JetBrains Mono | no |
| Noto Sans Devanagari | **yes** |

`U+0900-097F` is the Devanagari block. The three families in use ship no
subset covering it, so the browser never downloads a glyph to draw, and the
fallback chain lands on whatever the OS has. A machine with no Indic font
installed draws nothing.

## Why it was missed twice

1. The first diagnosis blamed contrast — the digits were 11px at
   `--st-600`, which measures 4.2:1 against the panel, under the 4.5 AA
   threshold for small text. That is a real problem and was fixed, but it
   was not the cause. Nothing renders at any contrast level when no glyph
   exists.

2. Verification checked the *bundle*, not the screen: searching the built
   JS for Devanagari characters confirmed the data was shipped. That
   proves the bytes are present. It says nothing about whether a glyph was
   ever rasterised. A second check asserted the digits were missing from
   the bundle, which was a bad test — it searched for a contiguous string,
   while the bundler emits them as separate array literals — and that false
   negative is what sent the diagnosis off track.

No browser was available in the environment where this was investigated.
Every claim about rendering came from reading bytes, not from looking.

## Current state

**Worked around, not fixed.** All user-facing Bikram Sambat dates are
Latin: `Kartik 1`, `Bha 9`, `2083 Kartik`. The month names come from
`frontend/src/utils/nepaliDate.ts`; the short form is used in grid cells.

`name_np` on every holiday in `frontend/src/config/nepalHolidays.json` is
still Devanagari and is **not rendered anywhere**. It is retained as data,
so restoring Nepali names is a rendering change, not a data migration.

No Devanagari font is loaded. `frontend/index.html` requests exactly three
families.

## To actually fix it

Add the font back, then confirm it by looking at it:

1. Add `Noto+Sans+Devanagari:wght@400;500` to the `css2?family=` link in
   `frontend/index.html`.

2. Define a token in `frontend/src/index.css` next to `--font-mono`:

   ```css
   --font-np: 'Noto Sans Devanagari', 'Noto Sans Devanagari UI', 'Nirmala UI',
              'Mangal', 'Kohinoor Devanagari', 'Lohit Devanagari', sans-serif;
   ```

   List it ahead of the Latin stack. Geist/Inter/JetBrains carry no
   Devanagari glyphs, so an implicit fallback is what failed here.

3. Apply it to the BS date in `CalendarView`'s cell and dialog, and to
   `h.name_np` in the day dialog.

4. **Confirm by rendering.** Any of these proves it, and none of them is a
   substitute for it:
   - open the calendar and see the digits
   - DevTools → inspect a BS date element → Computed → `font-family`
     resolves to the Devanagari family, not a fallback
   - DevTools → Network → a `Noto+Sans+Devanagari` woff2 request is made
     and returns 200. If it does not, the font is blocked and the CSS is
     irrelevant.

## Why this is worth the extra work

Nepali is written in Devanagari. Rendering a Nepali calendar's dates in
Latin transliteration is a compromise that works, and `Kartik 1` is also
how a Nepali patro prints it — but a reader who cannot read the script
loses the Nepali holiday names entirely. If the goal is a calendar a Nepali
speaker reads natively, the font is required.

## Related

The Latin switch also removed the `Noto Sans Devanagari` webfont request
and the `--font-np` token, both added in an earlier commit specifically to
try to fix this. They were reverted because a date label should not depend
on a webfont that may be blocked. That reasoning still holds for a
peripheral date, and no longer holds for primary content — which is what
turns this from a workaround into a decision worth revisiting.