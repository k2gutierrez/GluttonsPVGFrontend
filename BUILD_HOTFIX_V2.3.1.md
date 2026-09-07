# Gluttons Frontend V2.3.1 — Build Hotfix

## Error fixed

`Can't resolve @x402/svm/exact/client`

## Why

The error is not from Gluttons contract code. It originates in the transitive Coinbase CDP/Base Account branch pulled into the Wagmi/RainbowKit connector graph. The CDP SDK references x402 EVM and SVM modules as optional peers. Production webpack resolves that graph even though Gluttons does not use Solana payments.

## Change

Added exact pinned dependencies:

- @x402/core 2.24.0
- @x402/evm 2.24.0
- @x402/svm 2.24.0
- @x402/extensions 2.24.0

No Gluttons UI, contract ABI, mint counter, game mechanic, or Curtis configuration was changed.

## Clean install

```bash
rm -rf node_modules .next package-lock.json
npm install
npm run check
npm run build
```
