# V2.5 — Poison Target Lock

This is the complete V2.4 frontend plus the Poison target telemetry/preflight update.

## Player-facing changes
- Manual Target Token ID remains required; no victim directory is created.
- The target is read from `Inspector.getTokenView(tokenId)` plus `GameEngine.s_tokenStates(tokenId)`.
- Shows **LIFE CLOCK** and **POISON SHIELD** timers simultaneously.
- States: VULNERABLE, POISON PROTECTED, FASTING — VULNERABLE, FINAL BITE, TARGET DEAD, CLOCK TOO LOW, SELF TARGET, INVALID TARGET.
- Protected target disables the Poison button and shows the remaining shield timer.
- Under 10 minutes of protection, the shield warning pulses faster.
- Target state refreshes every 5 seconds while a Target ID is locked.

## Transaction safety
The Poison TxButton uses `preflight` to run `publicClient.simulateContract(...)` immediately before `writeContract`. This closes most of the race window where another player poisons/kills/changes the target after the UI read but before the user clicks. If simulation reverts, the wallet transaction is not opened and the decoded human error is shown.

## Contract logic mirrored
- FASTING targets bypass normal poison protection and can be Poisoned into a 1H Final Bite.
- Normal target with `poisonProtectedUntil > now` is blocked.
- Target with Final Bite already set is blocked.
- Normal target with <=1H is blocked.
- Dead/burned/nonexistent target is blocked.

No smart-contract changes are required for this frontend update.
