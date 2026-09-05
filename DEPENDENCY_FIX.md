# Dependency fix — Curtis frontend v1.1

## What changed

- Dependency versions are pinned exactly (no `^`) to stop silent package drift between installs.
- Added `@x402/core` and `@x402/evm` because the Coinbase/Base account connector pulled through Wagmi/RainbowKit resolves these as optional peer dependencies at build time.
- Pinned RainbowKit to `2.2.11` and Wagmi to the last v2 line used by RainbowKit (`2.19.5`).
- Pinned Next.js to `15.5.25` so the project does not unexpectedly jump to Next 16.
- Added `npm run check` (`tsc --noEmit`).

## Clean reinstall

From the project folder:

```bash
rm -rf node_modules package-lock.json .next
npm cache verify
npm install
npm run check
npm run dev
```

Do **not** run `npm audit fix --force` as a first step. It can replace major versions and break the Wagmi/RainbowKit peer relationship.

## About npm deprecation warnings

Some warnings can still appear from transitive wallet-connector dependencies. They are not imports written by the Gluttons app itself. The important requirement is that the dependency graph resolves, `npm run check` passes, and `npm run build` succeeds before deployment.
