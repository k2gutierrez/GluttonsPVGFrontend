# Gluttons Frontend — FINAL v0.1

This release is based on V2.7 Live Stadium and adds a responsive-layout lock.

## Main changes
- Zero horizontal page scroll target from 320px through ultrawide screens.
- Viewport-safe page/header/panel sizing (`width/max-width/min-width`).
- Responsive margins use `clamp()` and remain inside the viewport.
- Flex/grid children explicitly allow shrinking (`min-width: 0`).
- Mobile navigation menu added so hiding desktop nav does not remove navigation.
- Survival Board / Leaderboard changes from a wide horizontally scrolling table into stacked mobile cards.
- Live 2,000-cell matrix scales from 50 columns desktop to 40/20/16/14 columns across breakpoints without overflowing.
- Inventory/action/corpse/poison layouts collapse vertically on smaller screens.
- Long clocks, addresses, labels and transaction UI are allowed to wrap instead of forcing width.
- Removed frontend `min-w-48` pressure in Token Inspector at small widths.

## Responsive verification widths
Test at: 320, 350, 375, 390, 430, 768, 1024, 1440 and 1920 px.

## Local validation
```bash
npm install
npm run check
npm run build
npm run dev
```

Do not use `npm audit fix --force` as a build fix.
