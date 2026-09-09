// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC721AC} from "@limitbreak/creator-token-standards/erc721c/ERC721AC.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import { IGameEngine } from "./interfaces/IGameEngine.sol";

/**
 * @title GluttonNFT
 * @notice ERC721-C ownership and metadata layer for the Gluttons survival protocol.
 */
contract GluttonNFT is ERC721AC, ERC2981, Ownable {
    using Strings for uint256;

    // ========================================
    //               Custom Errors
    // ========================================
    error GluttonNFT__ZeroAddress();
    error GluttonNFT__NotGameEngine();
    error GluttonNFT__TokenDoesNotExist(uint256 tokenId);
    error GluttonNFT__URIsAlreadyFrozen();

    // ========================================
    //               Constants
    // ========================================

    uint96 private constant ROYALTY_BPS = 400; // 4%
    bytes4 private constant ERC4906_INTERFACE_ID = 0x49064906;

    // ========================================
    //               Immutables
    // ========================================
    address public immutable gameEngine;
    address public immutable royaltyTreasury;

    // ========================================
    //                Storage
    // ========================================
    string private s_unrevealedURI;
    string private s_aliveBaseURI;
    string private s_freshBaseURI;
    string private s_rottenBaseURI;

    bool public urisFrozen;

    // ========================================
    //                 Events
    // ========================================
    event URIsFrozen();
    event MetadataUpdate(uint256 _tokenId);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    // ========================================
    //              Constructor
    // ========================================
    constructor(address initialOwner_, address gameEngine_, address royaltyTreasury_)
        ERC721AC("Gluttons", "GLUT")
        Ownable(initialOwner_)
    {
        if (gameEngine_ == address(0) || royaltyTreasury_ == address(0)) revert GluttonNFT__ZeroAddress();

        gameEngine = gameEngine_;
        royaltyTreasury = royaltyTreasury_;

        // Set 4% ERC-2981 royalty pointing to the RoyaltyTreasury
        _setDefaultRoyalty(royaltyTreasury, ROYALTY_BPS);
    }

    // ========================================
    //          URI Configuration
    // ========================================

    /**
     * 
     * @param unrevealedURI_ unreveal URI as json from ardrive
     * @param aliveBaseURI_ alive URI as json from ardrive
     * @param freshBaseURI_ dead fresh base URI, only pass the url with image, json is onchain.
     * @param rottenBaseURI_ dead rotten base URI, only pass the url with image, json is onchain.
     */
    function setURIs(
        string memory unrevealedURI_,
        string memory aliveBaseURI_,
        string memory freshBaseURI_,
        string memory rottenBaseURI_
    ) external onlyOwner {
        if (urisFrozen) revert GluttonNFT__URIsAlreadyFrozen();

        s_unrevealedURI = unrevealedURI_;
        s_aliveBaseURI = aliveBaseURI_;
        s_freshBaseURI = freshBaseURI_;
        s_rottenBaseURI = rottenBaseURI_;
    }

    function freezeURIs() external onlyOwner {
        urisFrozen = true;
        emit URIsFrozen();
    }

    // ========================================
    //                 Mint
    // ========================================

    /**
     * @notice Mints a new Glutton.
     * @dev ONLY GameEngine may call this during the pre-game mint phase.
     */
    function gameMint(address to, uint256 amount) external {
        if (msg.sender != gameEngine) revert GluttonNFT__NotGameEngine();
        _mint(to, amount);
    }

    // ========================================
    //               Devour Burn
    // ========================================

    /**
     * @notice Destroys a Glutton consumed by another Glutton (Live Devour or Corpse Eat).
     * @dev ONLY GameEngine may call this. Normal death does NOT burn the token.
     */
    function gameBurn(uint256 tokenId) external {
        if (msg.sender != gameEngine) revert GluttonNFT__NotGameEngine();
        _burn(tokenId);
    }

    // ========================================
    //          Metadata & ERC-4906
    // ========================================

    /**
     * @notice Permissionless function to force marketplaces to refresh a token's image.
     */
    function refreshMetadata(uint256 tokenId) external {
        if (!_exists(tokenId)) revert GluttonNFT__TokenDoesNotExist(tokenId);
        emit MetadataUpdate(tokenId);
    }

    /**
     * @notice Derives the exact canonical URI based on GameEngine state.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert GluttonNFT__TokenDoesNotExist(tokenId);

        uint8 visualState = IGameEngine(gameEngine).getVisualState(tokenId);

        if (visualState == 0) return s_unrevealedURI;
        if (visualState == 1) return string(abi.encodePacked(s_aliveBaseURI, tokenId.toString(), ".json"));
        if (visualState == 2) return _onchainURI(tokenId, s_freshBaseURI, "Dead Fresh");
        if (visualState == 3) return _onchainURI(tokenId, s_rottenBaseURI, "Dead Rotten");

        // if (visualState == 2) return string(abi.encodePacked(s_freshBaseURI, tokenId.toString(), ".json"));
        // if (visualState == 3) return string(abi.encodePacked(s_rottenBaseURI, tokenId.toString(), ".json"));

        return "";
    }

    function _onchainURI(uint256 tokenId, string memory uri, string memory deadStatus) private pure returns(string memory) {

        bytes memory json  = abi.encodePacked(
            '{',
                '"name": "Gluttons #', tokenId.toString(), ' (DEAD)",',
                '"description": "This Glutton starved.",',
                '"image": "', uri, '",',
                '"attributes": [',
                    '{',
                        '"trait_type": "Status",',
                        '"value": "', deadStatus,'"',
                    '}',
                ']',
            '}'
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function getTotalMinted() external view returns(uint256) {
        uint256 totalMinted = _totalMinted();
        return totalMinted;
    }

    function getTotalBurned() external view returns(uint256) {
        uint256 totalBurned = _totalBurned();
        return totalBurned;
    }

    // ========================================
    //       ERC165 / ERC2981 / ERC4906
    // ========================================

    function supportsInterface(bytes4 interfaceId) public view override(ERC721AC, ERC2981) returns (bool) {
        return interfaceId == ERC4906_INTERFACE_ID || ERC721AC.supportsInterface(interfaceId)
            || ERC2981.supportsInterface(interfaceId);
    }

    // ========================================
    //        ERC721A Start ID Override
    // ========================================
    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    // ========================================
    //      Limit Break Ownership Override
    // ========================================
    function _requireCallerIsContractOwner() internal view virtual override {
        _checkOwner(); // This tells Limit Break to use OpenZeppelin's Ownable check
    }
}
