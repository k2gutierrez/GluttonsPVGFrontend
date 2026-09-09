// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IGluttonNFT} from "./interfaces/IGluttonNFT.sol";
import {IGameEngine} from "./interfaces/IGameEngine.sol";

/**
 * @title Inspector
 * @author Carlos Gutiérrez
 * @notice Read-only canonical aggregate for the Gluttons frontend.
 * @dev No writes. GameEngine remains the authority for phase and token state.
 */
contract Inspector {
    IGameEngine private immutable i_gameEngine;
    IGluttonNFT private immutable i_gluttonNFT;

    struct TokenStateView {
        address owner;
        uint8 visualState; // 0=UNREVEALED, 1=ALIVE, 2=FRESH, 3=ROTTEN
        uint64 expiry;
        bool isHungry;
    }

    struct GlobalState {
        uint256 aliveCount;
        uint256 currentMealSeconds;
        bool isSettled;
        string currentPhase; // PRE_GAME / FEAST / PLAGUE / LS_WARNING / LAST_SUPPER / SETTLED
    }

    constructor(address gameEngine_, address gluttonNFT_) {
        i_gameEngine = IGameEngine(gameEngine_);
        i_gluttonNFT = IGluttonNFT(gluttonNFT_);
    }

    function getTokenView(uint256 tokenId) external view returns (TokenStateView memory) {
        uint64 exp = i_gameEngine.effectiveExpiry(tokenId);
        uint8 visualState = i_gameEngine.getVisualState(tokenId);

        bool hungry = false;
        if (visualState == 1) {
            uint256 hungryWindow = 12 * uint256(i_gameEngine.GAME_HOUR());
            hungry = exp <= block.timestamp || exp - block.timestamp <= hungryWindow;
        }

        return TokenStateView({
            owner: i_gluttonNFT.ownerOf(tokenId),
            visualState: visualState,
            expiry: exp,
            isHungry: hungry
        });
    }

    function getGlobalView() external view returns (GlobalState memory) {
        uint8 phaseCode = i_gameEngine.currentPhaseCode();
        string memory phase;

        if (phaseCode == 0) phase = "PRE_GAME";
        else if (phaseCode == 1) phase = "FEAST";
        else if (phaseCode == 2) phase = "PLAGUE";
        else if (phaseCode == 3) phase = "LS_WARNING";
        else if (phaseCode == 4) phase = "LAST_SUPPER";
        else phase = "SETTLED";

        return GlobalState({
            aliveCount: i_gameEngine.s_aliveCount(),
            currentMealSeconds: i_gameEngine.s_currentMealSeconds(),
            isSettled: i_gameEngine.isSettled(),
            currentPhase: phase
        });
    }
}
