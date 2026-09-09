// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IGluttonNFT} from "./interfaces/IGluttonNFT.sol";
import {IPrizeVault} from "./interfaces/IPrizeVault.sol";
import {IERC721A} from "../lib/ERC721A/contracts/IERC721A.sol";

/**
 * @title GameEngine
 * @author Carlos Gutiérrez
 * @notice The deterministic time and state machine for Gluttons.
 */
contract GameEngine is ReentrancyGuard, Ownable {
    // ========================================
    //               Custom Errors
    // ========================================
    error GameEngine__ZeroAddress();
    error GameEngine__MintClosed();
    error GameEngine__MaxSupplyExceeded();
    error GameEngine__InvalidMintValue();
    error GameEngine__TransferFailed();
    error GameEngine__AlreadyStarted();
    error GameEngine__NotOwner();
    error GameEngine__NotHungry();
    error GameEngine__Dead();
    error GameEngine__InvalidValue();
    error GameEngine__InvalidState();
    error GameEngine__ClockTooLow();
    error GameEngine__SelfPoison();
    error GameEngine__Protected();
    error GameEngine__AlreadySettled();
    error GameEngine__NotLastSupper();
    error GameEngine__NotUnanimous();
    error GameEngine__AlreadyConfigured();
    error GameEngine__NoConfigurationToStart();
    error GameEngine__AlreadyAllowed();
    error GameEngine__NormalMintNotAllowed();
    error GameEngine__InvalidMaxPerWalletAmount();
    error GameEngine__PreMintPhaseEnded();
    error GameEngine__MaxSupplyForInviteExceeded();
    error GameEngine__CommunityMintNotAllowed();
    error GameEngine__NotCommunityHolder();

    // ========================================
    //                Structs
    // ========================================
    struct TokenState {
        uint64 expiry; // 0 = use global initialExpiry
        uint64 poisonProtectedUntil;
        uint64 finalBiteDeadline;
        uint64 deadAt; // Materialized by logical death/reap
        uint64 spoilCheckpoint;
        uint64 poweredUntil;
        uint32 spoilQ4; // Spoilage tracking
        bool fasting;
        bool deathSettled;
    }

    struct TruceVote {
        uint256 epoch;
        address ownerAtVote;
    }

    struct Community {
        string name;
        address collectionAddress;
        uint256 maxTotalAmountAllowed;
        uint256 maxPerWallet;
        bool allowed;
        uint256 amountMinted;
    }

    // ========================================
    //               Constants
    // ========================================
    // Curtis accelerated test configuration: 1 game hour = 1 real minute.
    // For mainnet, use 1 hours for GAME_HOUR and keep the formulas unchanged.
    uint64 public constant GAME_HOUR = 60;
    uint64 public constant GAME_DAY = 24 * GAME_HOUR;
    uint64 public constant LAST_SUPPER_DAY_OFFSET = 120 * GAME_DAY;
    uint64 public constant LAST_SUPPER_WARNING_DURATION = GAME_HOUR;

    uint256 public constant MAX_SUPPLY = 100; // Curtis test deployment; mainnet target is 2,000.
    uint256 public constant MINT_PRICE = 0.004 ether;
    uint256 public constant FEED_PRICE = 0.0006 ether;
    uint256 public constant MAX_CLOCK_HOURS = 36 * GAME_HOUR;
    uint256 public constant POISON_PRICE = 0.0004 ether;
    uint256 public constant POWER_PRICE = 0.0003 ether;
    uint32 public constant ROTTEN_THRESHOLD = uint32(24 * GAME_HOUR * 4);
    uint256 public constant MAX_AMOUNT_PER_WALLET = 4;

    // ========================================
    //               Immutables
    // ========================================
    uint64 public immutable i_startBackstop;

    // ========================================
    //               Variables
    // ========================================
    uint256 public s_communityMintprice = 0.004 ether;
    uint256 public s_invitedNftIds;
    bool public s_preMintEnd = false;
    mapping(uint256 addressId => Community invitedNft) private s_invitedNftInfo;
    mapping(address user => mapping(address collection => uint256 amount)) public s_amountMintPerCollection;

    mapping(address minter => uint256 mintedAmount) public s_normalMintAmount;

    address public s_gluttonNFT;
    address public s_prizeVault;
    address public s_pvgTreasury;

    bool public s_isConfigured;
    uint256 public s_totalMinted;

    uint256 public S; 
    uint64 public s_gameStart; 
    uint64 public s_initialExpiry; 

    uint256 public s_aliveCount;
    uint256 public s_totalNormalFeeds;
    uint256 public s_completedBars;
    uint256 public s_currentMealSeconds = 24 * GAME_HOUR;
    uint256 public s_truceEpoch;
    uint64 public s_populationLastSupperWarningAt;

    bool public s_isSettled;
    uint64 public s_lastDeathTimestamp;
    uint256 public s_tiebreakCandidate;

    mapping(uint256 => TokenState) public s_tokenStates;
    mapping(uint256 => TruceVote) public s_truceVotes;
    mapping(address => uint256) private s_winningShares;

    // ========================================
    //                Events
    // ========================================
    event Minted(address indexed to, uint256 startTokenId, uint256 quantity);
    event GameStarted(uint64 startTime, uint256 startingPopulation);
    event EndPreMintPhase(uint256 time);
    event LastSupperWarningStarted(uint64 warningAt, uint64 bellAt);
    event DeathMaterialized(uint256 indexed tokenId, uint64 deadAt);
    event Poisoned(uint256 indexed attackerId, uint256 indexed targetId, uint64 attackerExpiryAfter, uint64 targetExpiryAfter, uint64 protectionUntil);
    event FinalBiteTriggered(uint256 indexed attackerId, uint256 indexed targetId, uint64 deadline);
    event CorpsePowered(uint256 indexed tokenId, uint64 poweredUntil);
    event CorpseConsumed(uint256 indexed eaterId, uint256 indexed corpseId, bool rotten);
    event LiveDevoured(uint256 indexed eaterId, uint256 indexed preyId);

    constructor(uint64 startBackstop_, address owner_) Ownable(owner_) {
        i_startBackstop = startBackstop_;
    }

    // ========================================
    //          Mint & Initialization
    // ========================================
    function setDependencies(address gluttonNFT_, address prizeVault_, address pvgTreasury_) external onlyOwner {
        if (s_isConfigured) revert GameEngine__AlreadyConfigured();
        if (gluttonNFT_ == address(0) || prizeVault_ == address(0) || pvgTreasury_ == address(0)) {
            revert GameEngine__ZeroAddress();
        }

        s_gluttonNFT = gluttonNFT_;
        s_prizeVault = prizeVault_;
        s_pvgTreasury = pvgTreasury_;
        s_isConfigured = true;
    }

    function mint(uint256 amount) external payable nonReentrant {
        if (!s_preMintEnd) revert GameEngine__NormalMintNotAllowed();
        if (s_normalMintAmount[msg.sender] + amount > MAX_AMOUNT_PER_WALLET) {
            revert GameEngine__InvalidMaxPerWalletAmount();
        }
        if (!s_isConfigured) revert GameEngine__NoConfigurationToStart();
        if (s_gameStart != 0 || block.timestamp >= i_startBackstop) revert GameEngine__MintClosed();
        if (s_totalMinted + amount > MAX_SUPPLY) revert GameEngine__MaxSupplyExceeded();
        if (msg.value != amount * MINT_PRICE) revert GameEngine__InvalidMintValue();

        uint256 startTokenId = s_totalMinted + 1;
        uint256 pvgShare = (msg.value * 5) / 100;
        uint256 potShare = msg.value - pvgShare;

        (bool pvgSuccess,) = s_pvgTreasury.call{value: pvgShare}("");
        if (!pvgSuccess) revert GameEngine__TransferFailed();

        (bool potSuccess,) = s_prizeVault.call{value: potShare}("");
        if (!potSuccess) revert GameEngine__TransferFailed();

        s_totalMinted += amount;
        s_aliveCount += amount;
        s_normalMintAmount[msg.sender] += amount;

        IGluttonNFT(s_gluttonNFT).gameMint(msg.sender, amount);
        emit Minted(msg.sender, startTokenId, amount);

        if (s_totalMinted == MAX_SUPPLY) {
            _startGame(uint64(block.timestamp));
        }
    }

    function preMint(uint256 amount, uint256 collectionId) external payable nonReentrant {
        if (s_preMintEnd) revert GameEngine__PreMintPhaseEnded();
        if (!s_isConfigured) revert GameEngine__NoConfigurationToStart();
        if (s_gameStart != 0 || block.timestamp >= i_startBackstop) revert GameEngine__MintClosed();

        Community memory collection = s_invitedNftInfo[collectionId];
        if (!collection.allowed) revert GameEngine__CommunityMintNotAllowed();
        if (IERC721A(collection.collectionAddress).balanceOf(msg.sender) == 0) revert GameEngine__NotCommunityHolder();

        if (collection.amountMinted + amount > collection.maxTotalAmountAllowed) {
            revert GameEngine__MaxSupplyForInviteExceeded();
        }
        if (s_amountMintPerCollection[msg.sender][collection.collectionAddress] + amount > collection.maxPerWallet) {
            revert GameEngine__InvalidMaxPerWalletAmount();
        }
        if (s_totalMinted + amount > MAX_SUPPLY) revert GameEngine__MaxSupplyExceeded();
        if (msg.value != amount * s_communityMintprice) revert GameEngine__InvalidMintValue();

        uint256 startTokenId = s_totalMinted + 1;
        uint256 pvgShare = (msg.value * 5) / 100;
        uint256 potShare = msg.value - pvgShare;

        (bool pvgSuccess,) = s_pvgTreasury.call{value: pvgShare}("");
        if (!pvgSuccess) revert GameEngine__TransferFailed();

        (bool potSuccess,) = s_prizeVault.call{value: potShare}("");
        if (!potSuccess) revert GameEngine__TransferFailed();

        s_totalMinted += amount;
        s_aliveCount += amount;
        s_amountMintPerCollection[msg.sender][collection.collectionAddress] += amount;
        s_invitedNftInfo[collectionId].amountMinted += amount;

        IGluttonNFT(s_gluttonNFT).gameMint(msg.sender, amount);
        emit Minted(msg.sender, startTokenId, amount);

        if (s_totalMinted == MAX_SUPPLY) {
            _startGame(uint64(block.timestamp));
        }
    }

    function ensureStarted() public {
        if (s_gameStart != 0) revert GameEngine__AlreadyStarted();
        if (block.timestamp >= i_startBackstop) {
            _startGame(i_startBackstop);
        }
    }

    function _startGame(uint64 _startTime) private {
        s_gameStart = _startTime;
        s_initialExpiry = _startTime + 24 * GAME_HOUR;
        S = s_totalMinted;
        emit GameStarted(_startTime, S);

        // If a very small partial-start population already satisfies the LS threshold,
        // arm the warning from Game Start deterministically.
        _maybeArmPopulationLastSupperWarning(_startTime);
    }

    // ========================================
    //          Time & State Helpers
    // ========================================
    function effectiveExpiry(uint256 tokenId) public view returns (uint64) {
        uint64 stored = s_tokenStates[tokenId].expiry;
        return stored == 0 ? s_initialExpiry : stored;
    }

    function _plagueUnlocked() internal view returns (bool) {
        if (S == 0) return false;
        uint256 plaguePopulation = (S + 1) / 2; // ceil(0.50 * S)
        return s_aliveCount <= plaguePopulation || s_currentMealSeconds <= 2 * GAME_HOUR;
    }

    function lastSupperPopulationThreshold() public view returns (uint256) {
        if (S == 0) return 0;
        return (S + 39) / 40; // ceil(0.025 * S)
    }

    function trucePopulationThreshold() public view returns (uint256) {
        if (S == 0) return 0;
        uint256 threshold = (S + 99) / 100; // ceil(0.01 * S)
        return threshold < 2 ? 2 : threshold;
    }

    function lastSupperWarningAt() public view returns (uint64) {
        if (s_gameStart == 0) return 0;

        uint64 dayWarning = s_gameStart + LAST_SUPPER_DAY_OFFSET;
        uint64 populationWarning = s_populationLastSupperWarningAt;

        if (populationWarning == 0) return dayWarning;
        return populationWarning < dayWarning ? populationWarning : dayWarning;
    }

    function lastSupperAt() public view returns (uint64) {
        uint64 warningAt = lastSupperWarningAt();
        if (warningAt == 0) return 0;
        return warningAt + LAST_SUPPER_WARNING_DURATION;
    }

    function currentPhaseCode() public view returns (uint8) {
        // 0 PRE_GAME, 1 FEAST, 2 PLAGUE, 3 LS_WARNING, 4 LAST_SUPPER, 5 SETTLED
        if (s_isSettled) return 5;
        if (s_gameStart == 0) return 0;

        uint64 warningAt = lastSupperWarningAt();
        uint64 bellAt = lastSupperAt();
        if (bellAt != 0 && block.timestamp >= bellAt) return 4;
        if (warningAt != 0 && block.timestamp >= warningAt) return 3;
        if (_plagueUnlocked()) return 2;
        return 1;
    }

    function _isLastSupper() internal view returns (bool) {
        return currentPhaseCode() == 4;
    }

    function _requireGameActive() internal view {
        if (s_isSettled) revert GameEngine__AlreadySettled();
        if (s_gameStart == 0) revert GameEngine__InvalidState();
    }

    function _requirePreLastSupperAction() internal view {
        _requireGameActive();
        if (_isLastSupper()) revert GameEngine__InvalidState();
    }

    function _maybeArmPopulationLastSupperWarning(uint64 triggerTime) internal {
        if (S == 0 || s_populationLastSupperWarningAt != 0) return;
        uint256 threshold = lastSupperPopulationThreshold();
        if (threshold > 0 && s_aliveCount <= threshold) {
            s_populationLastSupperWarningAt = triggerTime;
            emit LastSupperWarningStarted(triggerTime, triggerTime + LAST_SUPPER_WARNING_DURATION);
        }
    }

    function _checkTokenDeath(TokenState memory ts, uint64 exp) internal view returns (bool isDead, uint64 actualDeadAt) {
        if (ts.deadAt > 0) return (true, ts.deadAt);

        uint64 candidate = 0;

        if (ts.finalBiteDeadline > 0 && block.timestamp >= ts.finalBiteDeadline) {
            candidate = ts.finalBiteDeadline;
        }

        // FASTING may remain alive at 0H before the Last Supper bell.
        // At the bell, a Faster already at 0H dies at the exact bell timestamp.
        if (ts.fasting && exp <= block.timestamp) {
            uint64 bellAt = lastSupperAt();
            if (bellAt != 0 && block.timestamp >= bellAt) {
                if (candidate == 0 || bellAt < candidate) candidate = bellAt;
            }
        } else if (!ts.fasting && block.timestamp >= exp) {
            if (candidate == 0 || exp < candidate) candidate = exp;
        }

        if (candidate > 0) return (true, candidate);
        return (false, 0);
    }

    function getVisualState(uint256 tokenId) external view returns (uint8) {
        if (s_gameStart == 0) return 0; // UNREVEALED
        TokenState memory ts = s_tokenStates[tokenId];
        uint64 exp = effectiveExpiry(tokenId);

        (bool isLogicallyDead, uint64 actualDeadAt) = _checkTokenDeath(ts, exp);
        if (!isLogicallyDead) return 1; // ALIVE / FASTING / FINAL BITE

        uint256 virtualSpoil = _virtualSpoilQ4(ts, actualDeadAt);
        if (virtualSpoil < ROTTEN_THRESHOLD) return 2;
        return 3;
    }

    function _effectivePoweredUntil(uint64 poweredUntil) internal view returns (uint64) {
        if (poweredUntil == 0) return 0;
        uint64 bellAt = lastSupperAt();
        if (bellAt != 0 && poweredUntil > bellAt) return bellAt;
        return poweredUntil;
    }

    function _virtualSpoilQ4(TokenState memory ts, uint64 actualDeadAt) internal view returns (uint256) {
        uint256 spoil = ts.spoilQ4;
        if (spoil >= ROTTEN_THRESHOLD) return spoil;

        uint64 lastCheck = ts.spoilCheckpoint > 0 ? ts.spoilCheckpoint : actualDeadAt;
        if (block.timestamp <= lastCheck) return spoil;

        uint256 elapsed = block.timestamp - lastCheck;
        uint64 effectivePowerEnd = _effectivePoweredUntil(ts.poweredUntil);

        if (effectivePowerEnd > lastCheck) {
            if (block.timestamp <= effectivePowerEnd) {
                spoil += elapsed; // 4 powered real seconds = 1 normal spoil second
            } else {
                uint256 poweredElapsed = effectivePowerEnd - lastCheck;
                uint256 unpoweredElapsed = block.timestamp - effectivePowerEnd;
                spoil += poweredElapsed + (unpoweredElapsed * 4);
            }
        } else {
            spoil += elapsed * 4;
        }
        return spoil;
    }

    function _clearRescueState(uint256 tokenId) internal {
        s_tokenStates[tokenId].fasting = false;
        s_tokenStates[tokenId].finalBiteDeadline = 0;
    }

    function _recordDeath(uint256 tokenId, uint64 actualDeadAt) internal {
        TokenState storage ts = s_tokenStates[tokenId];
        if (ts.deathSettled) return;

        if (ts.deadAt == 0) ts.deadAt = actualDeadAt;
        ts.deathSettled = true;

        if (s_aliveCount > 0) s_aliveCount--;
        s_truceEpoch++;

        if (actualDeadAt > s_lastDeathTimestamp) {
            s_lastDeathTimestamp = actualDeadAt;
            s_tiebreakCandidate = tokenId;
        } else if (actualDeadAt == s_lastDeathTimestamp) {
            if (s_tiebreakCandidate == 0 || tokenId < s_tiebreakCandidate) {
                s_tiebreakCandidate = tokenId;
            }
        }

        emit DeathMaterialized(tokenId, actualDeadAt);
        _maybeArmPopulationLastSupperWarning(uint64(block.timestamp));
    }

    function _materializeLogicalDeath(uint256 tokenId) internal returns (bool) {
        TokenState storage ts = s_tokenStates[tokenId];
        if (ts.deathSettled) return ts.deadAt > 0;

        uint64 exp = effectiveExpiry(tokenId);
        (bool isDead, uint64 actualDeadAt) = _checkTokenDeath(ts, exp);
        if (!isDead) return false;

        _recordDeath(tokenId, actualDeadAt);
        return true;
    }

    // ========================================
    //          Feed & Metabolism
    // ========================================
    function feed(uint256 tokenId) external payable nonReentrant {
        _requirePreLastSupperAction();
        if (msg.sender != IGluttonNFT(s_gluttonNFT).ownerOf(tokenId)) revert GameEngine__NotOwner();

        TokenState storage ts = s_tokenStates[tokenId];
        uint64 exp = effectiveExpiry(tokenId);

        (bool isDead, ) = _checkTokenDeath(ts, exp);
        if (isDead) revert GameEngine__Dead();

        bool isHungry = (exp > block.timestamp && exp - block.timestamp <= 12 * GAME_HOUR);
        bool needsRescue = ts.fasting || ts.finalBiteDeadline > 0;
        if (!isHungry && !needsRescue) revert GameEngine__NotHungry();

        if (msg.value != FEED_PRICE) revert GameEngine__InvalidValue();
        uint256 pvgShare = (msg.value * 8) / 100;
        uint256 potShare = msg.value - pvgShare;

        (bool pvgSuccess,) = s_pvgTreasury.call{value: pvgShare}("");
        if (!pvgSuccess) revert GameEngine__TransferFailed();
        (bool potSuccess,) = s_prizeVault.call{value: potShare}("");
        if (!potSuccess) revert GameEngine__TransferFailed();

        uint64 newBase = uint64(block.timestamp > exp ? block.timestamp : exp);
        uint64 maxAllowed = uint64(block.timestamp + MAX_CLOCK_HOURS);
        uint64 projectedExpiry = newBase + uint64(s_currentMealSeconds);
        
        ts.expiry = projectedExpiry > maxAllowed ? maxAllowed : projectedExpiry;
        _clearRescueState(tokenId);

        s_totalNormalFeeds++;
        if (s_totalNormalFeeds % S == 0) {
            s_completedBars++;
            uint256 nextMeal = (s_currentMealSeconds * 9800) / 10000;
            if ((s_currentMealSeconds * 9800) % 10000 != 0) nextMeal++;
            if (nextMeal < 2 * GAME_HOUR) nextMeal = 2 * GAME_HOUR;
            s_currentMealSeconds = nextMeal;
        }
    }

    // ========================================
    //          Fasting & Poisoning
    // ========================================
    function enterFast(uint256 tokenId) external nonReentrant {
        _requirePreLastSupperAction();
        if (msg.sender != IGluttonNFT(s_gluttonNFT).ownerOf(tokenId)) revert GameEngine__NotOwner();
        TokenState storage ts = s_tokenStates[tokenId];
        uint64 exp = effectiveExpiry(tokenId);

        (bool isDead, ) = _checkTokenDeath(ts, exp);
        if (isDead) revert GameEngine__Dead();

        if (exp > block.timestamp && exp - block.timestamp > 12 * GAME_HOUR) revert GameEngine__NotHungry();

        ts.fasting = true;
        ts.poisonProtectedUntil = 0; 
    }

    function poison(uint256 attackerId, uint256 targetId) external payable nonReentrant {
        _requirePreLastSupperAction();
        if (msg.value != POISON_PRICE) revert GameEngine__InvalidValue();
        if (attackerId == targetId) revert GameEngine__SelfPoison();

        // 1. Validate Attacker
        if (msg.sender != IGluttonNFT(s_gluttonNFT).ownerOf(attackerId)) revert GameEngine__NotOwner();
        TokenState storage attackerTs = s_tokenStates[attackerId];
        uint64 attackerExp = effectiveExpiry(attackerId);

        (bool attackerDead, ) = _checkTokenDeath(attackerTs, attackerExp);
        if (attackerDead) revert GameEngine__Dead();
        
        if (attackerTs.fasting || attackerTs.finalBiteDeadline > 0) revert GameEngine__InvalidState();
        if (attackerExp - block.timestamp <= GAME_HOUR) revert GameEngine__ClockTooLow();

        // 2. Validate Target
        TokenState storage targetTs = s_tokenStates[targetId];
        uint64 targetExp = effectiveExpiry(targetId);

        (bool targetDead, ) = _checkTokenDeath(targetTs, targetExp);
        if (targetDead) revert GameEngine__Dead();
        if (targetTs.finalBiteDeadline > 0) revert GameEngine__InvalidState(); 

        // 3. Apply Target Logic
        if (targetTs.fasting) {
            targetTs.finalBiteDeadline = uint64(block.timestamp + GAME_HOUR);
            emit FinalBiteTriggered(attackerId, targetId, targetTs.finalBiteDeadline);
        } else {
            if (targetExp - block.timestamp <= GAME_HOUR) revert GameEngine__ClockTooLow();
            if (block.timestamp < targetTs.poisonProtectedUntil) revert GameEngine__Protected();

            uint64 remaining = targetExp - uint64(block.timestamp);
            uint64 halfRemaining = (remaining + 1) / 2;
            uint64 newRemaining = halfRemaining > GAME_HOUR ? halfRemaining : GAME_HOUR;

            targetTs.expiry = uint64(block.timestamp) + newRemaining;
            targetTs.poisonProtectedUntil = uint64(block.timestamp + 10 * GAME_HOUR); // 10 Min testnet protection
        }

        // 4. Apply Attacker Penalty
        attackerTs.expiry = attackerExp - GAME_HOUR;

        emit Poisoned(
            attackerId,
            targetId,
            attackerTs.expiry,
            targetTs.fasting ? targetExp : targetTs.expiry,
            targetTs.poisonProtectedUntil
        );

        // 5. Route Funds
        uint256 pvgShare = (msg.value * 8) / 100;
        uint256 potShare = msg.value - pvgShare;
        (bool pvgSuccess,) = s_pvgTreasury.call{value: pvgShare}("");
        if (!pvgSuccess) revert GameEngine__TransferFailed();
        (bool potSuccess,) = s_prizeVault.call{value: potShare}("");
        if (!potSuccess) revert GameEngine__TransferFailed();
    }

    // ========================================
    //          Spoilage & Power
    // ========================================
    function _syncSpoilage(uint256 tokenId) internal {
        TokenState storage ts = s_tokenStates[tokenId];
        if (ts.deadAt == 0 || ts.spoilQ4 >= ROTTEN_THRESHOLD) return;

        uint64 lastCheck = ts.spoilCheckpoint > 0 ? ts.spoilCheckpoint : ts.deadAt;
        if (block.timestamp <= lastCheck) return;

        uint256 elapsed = block.timestamp - lastCheck;
        uint64 effectivePowerEnd = _effectivePoweredUntil(ts.poweredUntil);

        if (effectivePowerEnd > lastCheck) {
            if (block.timestamp <= effectivePowerEnd) {
                ts.spoilQ4 += uint32(elapsed);
            } else {
                uint256 poweredElapsed = effectivePowerEnd - lastCheck;
                uint256 unpoweredElapsed = block.timestamp - effectivePowerEnd;
                ts.spoilQ4 += uint32(poweredElapsed + (unpoweredElapsed * 4));
            }
        } else {
            ts.spoilQ4 += uint32(elapsed * 4);
        }

        ts.spoilCheckpoint = uint64(block.timestamp);
    }

    function powerFridge(uint256 tokenId) external payable nonReentrant {
        _requirePreLastSupperAction();
        if (msg.value != POWER_PRICE) revert GameEngine__InvalidValue();
        if (msg.sender != IGluttonNFT(s_gluttonNFT).ownerOf(tokenId)) revert GameEngine__NotOwner();

        // Corpse actions auto-materialize logical death. Reap is infrastructure only.
        if (!_materializeLogicalDeath(tokenId)) revert GameEngine__InvalidState();
        _syncSpoilage(tokenId);

        TokenState storage ts = s_tokenStates[tokenId];
        if (ts.spoilQ4 >= ROTTEN_THRESHOLD) revert GameEngine__InvalidState();
        if (ts.poweredUntil >= block.timestamp) revert GameEngine__InvalidState();

        ts.poweredUntil = uint64(block.timestamp + 24 * GAME_HOUR);

        uint256 pvgShare = (msg.value * 8) / 100;
        uint256 potShare = msg.value - pvgShare;
        (bool pvgSuccess,) = s_pvgTreasury.call{value: pvgShare}("");
        if (!pvgSuccess) revert GameEngine__TransferFailed();
        (bool potSuccess,) = s_prizeVault.call{value: potShare}("");
        if (!potSuccess) revert GameEngine__TransferFailed();

        emit CorpsePowered(tokenId, ts.poweredUntil);
    }

    // ========================================
    //             Consumption
    // ========================================
    function liveDevour(uint256 eaterId, uint256 preyId) external nonReentrant {
        _requireGameActive();
        if (eaterId == preyId) revert GameEngine__InvalidState();

        // During LS_WARNING the previous phase rules continue. After the bell,
        // Live Devour is always enabled regardless of how Last Supper was triggered.
        if (!_isLastSupper() && !_plagueUnlocked()) revert GameEngine__InvalidState();

        IGluttonNFT nft = IGluttonNFT(s_gluttonNFT);
        if (msg.sender != nft.ownerOf(eaterId) || msg.sender != nft.ownerOf(preyId)) revert GameEngine__NotOwner();

        TokenState storage eaterTs = s_tokenStates[eaterId];
        TokenState storage preyTs = s_tokenStates[preyId];

        uint64 eaterExp = effectiveExpiry(eaterId);
        uint64 preyExp = effectiveExpiry(preyId);

        (bool eaterDead,) = _checkTokenDeath(eaterTs, eaterExp);
        (bool preyDead,) = _checkTokenDeath(preyTs, preyExp);
        if (eaterDead || preyDead) revert GameEngine__Dead();

        bool eaterHungry = eaterExp <= block.timestamp || eaterExp - block.timestamp <= 12 * GAME_HOUR;
        if (!eaterHungry) revert GameEngine__NotHungry();

        eaterTs.expiry = uint64(block.timestamp + MAX_CLOCK_HOURS);
        _clearRescueState(eaterId);

        // Devour prey is consumed immediately; mark accounting so Reap cannot double-decrement.
        preyTs.deadAt = uint64(block.timestamp);
        preyTs.deathSettled = true;
        if (s_aliveCount > 0) s_aliveCount--;
        s_truceEpoch++;
        _maybeArmPopulationLastSupperWarning(uint64(block.timestamp));

        nft.gameBurn(preyId);
        emit LiveDevoured(eaterId, preyId);
    }

    function consumeCorpse(uint256 eaterId, uint256 corpseId) external nonReentrant {
        _requireGameActive();
        if (eaterId == corpseId) revert GameEngine__InvalidState();

        IGluttonNFT nft = IGluttonNFT(s_gluttonNFT);
        if (msg.sender != nft.ownerOf(eaterId) || msg.sender != nft.ownerOf(corpseId)) revert GameEngine__NotOwner();

        TokenState storage eaterTs = s_tokenStates[eaterId];
        uint64 eaterExp = effectiveExpiry(eaterId);
        (bool eaterDead,) = _checkTokenDeath(eaterTs, eaterExp);
        if (eaterDead) revert GameEngine__Dead();

        // Automatically materialize logical death so the player never needs a Reap CTA.
        if (!_materializeLogicalDeath(corpseId)) revert GameEngine__InvalidState();
        _syncSpoilage(corpseId);

        TokenState storage corpseTs = s_tokenStates[corpseId];
        bool isRotten = corpseTs.spoilQ4 >= ROTTEN_THRESHOLD;

        if (!isRotten) {
            bool eaterHungry = eaterExp <= block.timestamp || eaterExp - block.timestamp <= 12 * GAME_HOUR;
            if (!eaterHungry) revert GameEngine__NotHungry();

            uint64 newBase = uint64(block.timestamp > eaterExp ? block.timestamp : eaterExp);
            uint64 maxAllowed = uint64(block.timestamp + MAX_CLOCK_HOURS);
            uint64 projectedExpiry = newBase + 12 * GAME_HOUR;
            eaterTs.expiry = projectedExpiry > maxAllowed ? maxAllowed : projectedExpiry;
        } else {
            if (eaterExp > block.timestamp && eaterExp - block.timestamp >= GAME_HOUR) {
                revert GameEngine__NotHungry();
            }
            eaterTs.expiry = uint64(block.timestamp + 2 * GAME_HOUR);
        }

        _clearRescueState(eaterId);
        nft.gameBurn(corpseId);
        emit CorpseConsumed(eaterId, corpseId, isRotten);
    }

    // ========================================
    //         Reap & Tiebreak Logic
    // ========================================
    function reap(uint256[] calldata tokenIds) external nonReentrant {
        if (s_isSettled) return;
        _requireGameActive();

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _materializeLogicalDeath(tokenIds[i]);
        }

        if (s_aliveCount == 0 && s_tiebreakCandidate != 0) {
            s_isSettled = true;
            address winner = IGluttonNFT(s_gluttonNFT).ownerOf(s_tiebreakCandidate);
            s_winningShares[winner] = 1;
            IPrizeVault(s_prizeVault).finalize(1);
        }
    }

    // ========================================
    //               Endgame Truce
    // ========================================
    function voteTruce(uint256 tokenId) external {
        if (s_isSettled) revert GameEngine__AlreadySettled();
        if (!_isLastSupper()) revert GameEngine__NotLastSupper();
        if (s_aliveCount > trucePopulationThreshold()) revert GameEngine__NotLastSupper();
        if (msg.sender != IGluttonNFT(s_gluttonNFT).ownerOf(tokenId)) revert GameEngine__NotOwner();

        TokenState memory ts = s_tokenStates[tokenId];
        (bool isDead,) = _checkTokenDeath(ts, effectiveExpiry(tokenId));
        if (isDead) revert GameEngine__Dead();

        s_truceVotes[tokenId] = TruceVote({epoch: s_truceEpoch, ownerAtVote: msg.sender});
    }

    function settleGame(uint256[] calldata liveTokenIds) external nonReentrant {
        if (s_isSettled) revert GameEngine__AlreadySettled();
        if (s_gameStart == 0) revert GameEngine__InvalidState();
        if (liveTokenIds.length != s_aliveCount) revert GameEngine__InvalidState();

        IGluttonNFT nft = IGluttonNFT(s_gluttonNFT);

        if (s_aliveCount == 1) {
            // Never trust a caller-supplied token ID merely because the array length is 1.
            // The declared survivor must still exist and be logically alive.
            uint256 survivorId = liveTokenIds[0];
            TokenState memory survivorState = s_tokenStates[survivorId];
            (bool survivorDead,) = _checkTokenDeath(survivorState, effectiveExpiry(survivorId));
            if (survivorDead) revert GameEngine__Dead();

            address winner = nft.ownerOf(survivorId); // also proves token was not burned
            s_isSettled = true;
            s_winningShares[winner] = 1;
            IPrizeVault(s_prizeVault).finalize(1);
            return;
        }

        if (!_isLastSupper()) revert GameEngine__NotLastSupper();
        if (s_aliveCount > trucePopulationThreshold()) revert GameEngine__NotLastSupper();

        for (uint256 i = 0; i < liveTokenIds.length; i++) {
            uint256 tid = liveTokenIds[i];

            // Final-table inputs are caller supplied. Require every entry to be a
            // distinct, existing, logically alive survivor before its vote counts.
            for (uint256 j = 0; j < i; j++) {
                if (liveTokenIds[j] == tid) revert GameEngine__InvalidState();
            }
            TokenState memory liveState = s_tokenStates[tid];
            (bool isDead,) = _checkTokenDeath(liveState, effectiveExpiry(tid));
            if (isDead) revert GameEngine__Dead();

            address currentOwner = nft.ownerOf(tid); // also proves token was not burned
            TruceVote memory vote = s_truceVotes[tid];
            if (vote.epoch != s_truceEpoch || vote.ownerAtVote != currentOwner) {
                revert GameEngine__NotUnanimous();
            }
        }

        s_isSettled = true;
        for (uint256 i = 0; i < liveTokenIds.length; i++) {
            address owner = nft.ownerOf(liveTokenIds[i]);
            s_winningShares[owner]++;
        }

        IPrizeVault(s_prizeVault).finalize(s_aliveCount);
    }

    // ========================================
    //      PrizeVault Integration (View)
    // ========================================
    function getWinningShares(address account) external view returns (uint256) {
        return s_winningShares[account];
    }
    function isSettled() external view returns (bool) {
        return s_isSettled;
    }

    // ========================================
    //      Community functions
    // ========================================
    function addInviteCollection(string memory name_, address collection_, uint256 maxAllowed_, uint256 maxPerWallet_)
        external
        onlyOwner
    {
        if (bytes(name_).length == 0) revert GameEngine__InvalidValue();
        if (collection_ == address(0)) revert GameEngine__ZeroAddress();
        if (maxAllowed_ == 0) revert GameEngine__InvalidValue();
        if (maxPerWallet_ == 0) revert GameEngine__InvalidValue();
        uint256 invitedNftIds = s_invitedNftIds;
        s_invitedNftInfo[invitedNftIds] = Community({
            name: name_,
            collectionAddress: collection_,
            maxTotalAmountAllowed: maxAllowed_,
            maxPerWallet: maxPerWallet_,
            allowed: false,
            amountMinted: 0
        });
        s_invitedNftIds++;
    }

    function allowCommunityMint(uint256 collectionId) external onlyOwner {
        if (collectionId >= s_invitedNftIds) revert GameEngine__InvalidValue();
        Community storage collection = s_invitedNftInfo[collectionId];
        if (collection.allowed == true) revert GameEngine__AlreadyAllowed();
        collection.allowed = true;
    }

    function modifyCollectionMaxAllowed(uint256 collectionId, uint256 newAmount) external onlyOwner {
        if (collectionId >= s_invitedNftIds) revert GameEngine__InvalidValue();
        Community storage collection = s_invitedNftInfo[collectionId];
        if (newAmount <= collection.maxTotalAmountAllowed) revert GameEngine__InvalidValue();
        collection.maxTotalAmountAllowed = newAmount;
    }

    function modifyCollectionMaxPerWallet(uint256 collectionId, uint256 newAmount) external onlyOwner {
        if (collectionId >= s_invitedNftIds) revert GameEngine__InvalidValue();
        Community storage collection = s_invitedNftInfo[collectionId];
        if (newAmount <= collection.maxPerWallet) revert GameEngine__InvalidValue();
        collection.maxPerWallet = newAmount;
    }

    function endPreMintedPhase() external onlyOwner {
        s_preMintEnd = true;
        emit EndPreMintPhase(block.timestamp);
    }

    function changeCommunityMintPrice(uint256 newPrice) external onlyOwner {
        s_communityMintprice = newPrice;
    }

    function getInvitedNftCommunities() public view returns (Community[] memory) {
        uint256 ids = s_invitedNftIds;
        Community[] memory nftCommunities = new Community[](ids);
        for (uint256 i = 0; i < ids; i++) {
            nftCommunities[i] = s_invitedNftInfo[i];
        }
        return nftCommunities;
    }
}