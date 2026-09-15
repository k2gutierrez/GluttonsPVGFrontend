# Gluttons Carlos Corrected Contracts v1.0.2

This is the contract snapshot used by Frontend FINAL v2.2 PRODUCTION.

Includes all v1.0.1 canonical fixes plus final settlement-input hardening:
- no Poison attacker cooldown;
- normal target protection = 10 game-hours;
- FAST 0H / Final Bite behavior;
- Last Supper Warning and bell;
- Truce threshold;
- corpse actions auto-materialize logical death;
- Feed/Fast/Poison/Power closed after bell;
- one-survivor settlement verifies the supplied token is alive and unburned;
- Truce settlement rejects duplicate token IDs;
- every Truce token must be alive/unburned;
- every Truce vote must match current epoch and current owner.

ABI is unchanged by the final settlement hardening.

Before deploy Carlos must run:
```bash
forge fmt
forge build
forge test -vvv
```
