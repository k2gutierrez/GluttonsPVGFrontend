// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IGameEngine {
    // 0 = UNREVEALED, 1 = ALIVE/FASTING/FINAL_BITE/SETTLED,
    // 2 = FRESH CORPSE, 3 = ROTTEN
    function getVisualState(uint256 tokenId) external view returns (uint8);
    function isSettled() external view returns (bool);
    function getWinningShares(address account) external view returns (uint256);
    function s_aliveCount() external view returns (uint256);
    function effectiveExpiry(uint256 tokenId) external view returns (uint64);
    function s_currentMealSeconds() external view returns (uint256);
    function S() external view returns (uint256);
    function s_gameStart() external view returns (uint64);

    // Canonical phase + timing helpers used by Inspector/frontend.
    function currentPhaseCode() external view returns (uint8);
    function lastSupperWarningAt() external view returns (uint64);
    function lastSupperAt() external view returns (uint64);
    function lastSupperPopulationThreshold() external view returns (uint256);
    function trucePopulationThreshold() external view returns (uint256);
    function GAME_HOUR() external view returns (uint64);
}
