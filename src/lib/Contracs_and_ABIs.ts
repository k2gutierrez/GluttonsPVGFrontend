export const contracts = {
    owner: "0xca067E20db2cDEF80D1c7130e5B71C42c0305529",
    user1: "0x7738797825902889925Ec60dE38d20Cd01250F64",
    user2: "0xA3E187116bcAD707a6b12C7DeC32037a8Be45b1d",
    weth: "0x78b43697436C98932494dc44DD925E0fEB3223fc",
    futureRewardsVault: "0x4eeCD17080df53F935E6eFA48a3362beABb9a529",
    pvgTreasury: "0x302FCb43e95ca1C3125961BFe3247f8eE1fA22d2",
    gameEngine: "0x2D81c541817769bCb9F087144a453d34eE456719",
    prizeVault: "0xACB4CdA4A5744f7e48029F2f4212b54f3908420d",
    royaltyTreasury: "0x54aFB3DC06ea3391c20b98feB4a1f0EB8EDa400c",
    nft: "0x2bD08310a1E6cdF1B52140eD478B84c9987d987d",
    inspector: "0x1F9BAF9A55d783713B72e8a9559E8dcAef671C59"
}

const URIS = [
    "https://arweave.net/r92txKdo5_Z8wHwjLV511pvYs8TaxcJzM7TWf81Nzb0", // pre-reveal
    "https://arweave.net/F7CTP2tlZZgTBQaPQTHiV64y2TIALFgPA27QpTWV694/", // alive
    "https://arweave.net/fcrFqPYYwtLx-QUJmTKJFZDMdCN9y9RCc-7h18CSekM", // dead fresh
    "https://arweave.net/TcDUnMOJWon6HGf7nKJ7UIXQ9OtLvUIcK97VKZzRc6I" // dead rotten
]

export const futureRewardsVaultABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "owner_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "user1_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "user2_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "weth_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "fallback",
        "stateMutability": "payable"
    },
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "approveTransaction",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getEthBalance",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getId",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getImmutables",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getPendingTransactionStatus",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTransaction",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct PVGTreasury.Transaction",
                "components": [
                    {
                        "name": "receiver",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "amount",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "currency",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "user1Approved",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "user2Approved",
                        "type": "uint8",
                        "internalType": "uint8"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getWethBalance",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setTransactionApproval",
        "inputs": [
            {
                "name": "receiver_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "amount_",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "currency_",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "EthWithdrawn",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "NewTransactionSet",
        "inputs": [
            {
                "name": "receiver",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "WethWithdrawn",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "PVGTreasury__AlreadyApproved",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__EmptyBalance",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidApprover",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidBeneficiary",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidTransactionType",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidTransferAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__NativeTransferFailed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__NoPendingTransaction",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__PendingTransaction",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__SameBeneficiary",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__ZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__ZeroAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SafeERC20FailedOperation",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "internalType": "address"
            }
        ]
    }
] as const;


export const PVGTreasuryABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "owner_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "user1_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "user2_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "weth_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "fallback",
        "stateMutability": "payable"
    },
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "approveTransaction",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getEthBalance",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getId",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getImmutables",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getPendingTransactionStatus",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTransaction",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct PVGTreasury.Transaction",
                "components": [
                    {
                        "name": "receiver",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "amount",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "currency",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "user1Approved",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "user2Approved",
                        "type": "uint8",
                        "internalType": "uint8"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getWethBalance",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setTransactionApproval",
        "inputs": [
            {
                "name": "receiver_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "amount_",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "currency_",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "EthWithdrawn",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "NewTransactionSet",
        "inputs": [
            {
                "name": "receiver",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "WethWithdrawn",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "PVGTreasury__AlreadyApproved",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__EmptyBalance",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidApprover",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidBeneficiary",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidTransactionType",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__InvalidTransferAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__NativeTransferFailed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__NoPendingTransaction",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__PendingTransaction",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__SameBeneficiary",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__ZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PVGTreasury__ZeroAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SafeERC20FailedOperation",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "internalType": "address"
            }
        ]
    }
] as const;


export const GameEngineABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "startBackstop_",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "owner_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "FEED_PRICE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "MAX_AMOUNT_PER_WALLET",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "MAX_CLOCK_HOURS",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "MAX_SUPPLY",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "MINT_PRICE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "POISON_PRICE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "POWER_PRICE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "ROTTEN_THRESHOLD",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint32",
                "internalType": "uint32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "S",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "addInviteCollection",
        "inputs": [
            {
                "name": "name_",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "collection_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "maxAllowed_",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "maxPerWallet_",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "allowCommunityMint",
        "inputs": [
            {
                "name": "collectionId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "changeCommunityMintPrice",
        "inputs": [
            {
                "name": "newPrice",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "consumeCorpse",
        "inputs": [
            {
                "name": "eaterId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "corpseId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "effectiveExpiry",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "endPreMintedPhase",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "ensureStarted",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "enterFast",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "feed",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "getInvitedNftCommunities",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "tuple[]",
                "internalType": "struct GameEngine.Community[]",
                "components": [
                    {
                        "name": "name",
                        "type": "string",
                        "internalType": "string"
                    },
                    {
                        "name": "collectionAddress",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "maxTotalAmountAllowed",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "maxPerWallet",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "allowed",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "amountMinted",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getVisualState",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getWinningShares",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "i_startBackstop",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isSettled",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "liveDevour",
        "inputs": [
            {
                "name": "eaterId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "preyId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "mint",
        "inputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "modifyCollectionMaxAllowed",
        "inputs": [
            {
                "name": "collectionId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "newAmount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "modifyCollectionMaxPerWallet",
        "inputs": [
            {
                "name": "collectionId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "newAmount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "poison",
        "inputs": [
            {
                "name": "attackerId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "targetId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "powerFridge",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "preMint",
        "inputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "collectionId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "reap",
        "inputs": [
            {
                "name": "tokenIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "s_aliveCount",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_amountMintPerCollection",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "collection",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_communityMintprice",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_completedBars",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_currentMealSeconds",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_gameStart",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_gluttonNFT",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_initialExpiry",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_invitedNftIds",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_isConfigured",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_isSettled",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_lastDeathTimestamp",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_normalMintAmount",
        "inputs": [
            {
                "name": "minter",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "mintedAmount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_preMintEnd",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_prizeVault",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_pvgTreasury",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_tiebreakCandidate",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_tokenStates",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "expiry",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "poisonProtectedUntil",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "finalBiteDeadline",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "deadAt",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "spoilCheckpoint",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "poweredUntil",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "spoilQ4",
                "type": "uint32",
                "internalType": "uint32"
            },
            {
                "name": "fasting",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "deathSettled",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_totalMinted",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_totalNormalFeeds",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_truceEpoch",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_truceVotes",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "ownerAtVote",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "setDependencies",
        "inputs": [
            {
                "name": "gluttonNFT_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "prizeVault_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "pvgTreasury_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "settleGame",
        "inputs": [
            {
                "name": "liveTokenIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "voteTruce",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "EndPreMintPhase",
        "inputs": [
            {
                "name": "time",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "GameStarted",
        "inputs": [
            {
                "name": "startTime",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            },
            {
                "name": "startingPopulation",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Minted",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "startTokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "quantity",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "GameEngine__AlreadyAllowed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__AlreadyConfigured",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__AlreadySettled",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__AlreadyStarted",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__ClockTooLow",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__CommunityMintNotAllowed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__Dead",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__InvalidMaxPerWalletAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__InvalidMintValue",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__InvalidState",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__InvalidValue",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__MaxSupplyExceeded",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__MaxSupplyForInviteExceeded",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__MintClosed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__NoConfigurationToStart",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__NormalMintNotAllowed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__NotCommunityHolder",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__NotHungry",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__NotLastSupper",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__NotOwner",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__NotUnanimous",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__PreMintPhaseEnded",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__Protected",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__SelfPoison",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__TransferFailed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GameEngine__ZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    }
] as const;


export const PrizeVaultABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "wethAddress_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "gameEngine_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "claimPrize",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "finalize",
        "inputs": [
            {
                "name": "totalShares_",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getEthSnapshot",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getGameEngineAddress",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTotalClaimedShares",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTotalShares",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getWethAddress",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getWethSnapshot",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_isFinalized",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "Finalized",
        "inputs": [
            {
                "name": "ethSnapshot",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "wethSnapshot",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "totalShares",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PrizeReleased",
        "inputs": [
            {
                "name": "winner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "ethAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "wethAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "sharesClaimed",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "PrizeVault__GameFinalized",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PrizeVault__GameNotFinalized",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PrizeVault__InvalidProtocolContract",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PrizeVault__InvalidWinner",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PrizeVault__UnexpectedTransferAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PrizeVault__ZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PrizeVault__ZeroAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SafeERC20FailedOperation",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "internalType": "address"
            }
        ]
    }
] as const;


export const RoyaltyTreasuryABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "weth_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "pvgTreasury_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "prizeVault_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "futureRewardsVault_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "gameEngine_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "fallback",
        "stateMutability": "payable"
    },
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "flushWETH",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferEth",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "RoyaltyTreasury__TransferFailed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "RoyaltyTreasury__ZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "RoyaltyTreasury__ZeroAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SafeERC20FailedOperation",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "internalType": "address"
            }
        ]
    }
] as const;


export const NftABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "initialOwner_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "gameEngine_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "royaltyTreasury_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "DEFAULT_TRANSFER_VALIDATOR",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "autoApproveTransfersFromValidator",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "freezeURIs",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "gameBurn",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "gameEngine",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "gameMint",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getApproved",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTotalBurned",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTotalMinted",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTransferValidationFunction",
        "inputs": [],
        "outputs": [
            {
                "name": "functionSignature",
                "type": "bytes4",
                "internalType": "bytes4"
            },
            {
                "name": "isViewFunction",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "pure"
    },
    {
        "type": "function",
        "name": "getTransferValidator",
        "inputs": [],
        "outputs": [
            {
                "name": "validator",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isApprovedForAll",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "operator",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "isApproved",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "ownerOf",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "refreshMetadata",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "royaltyInfo",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "salePrice",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "receiver",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "royaltyTreasury",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "safeTransferFrom",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "safeTransferFrom",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_data",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "setApprovalForAll",
        "inputs": [
            {
                "name": "operator",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "approved",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setAutomaticApprovalOfTransfersFromValidator",
        "inputs": [
            {
                "name": "autoApprove",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setTransferValidator",
        "inputs": [
            {
                "name": "transferValidator_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setURIs",
        "inputs": [
            {
                "name": "unrevealedURI_",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "aliveBaseURI_",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "freshBaseURI_",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "rottenBaseURI_",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "supportsInterface",
        "inputs": [
            {
                "name": "interfaceId",
                "type": "bytes4",
                "internalType": "bytes4"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "tokenURI",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "totalSupply",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "transferFrom",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "urisFrozen",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "Approval",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "approved",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ApprovalForAll",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "operator",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "approved",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AutomaticApprovalOfTransferValidatorSet",
        "inputs": [
            {
                "name": "autoApproved",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "BatchMetadataUpdate",
        "inputs": [
            {
                "name": "_fromTokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "_toTokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ConsecutiveTransfer",
        "inputs": [
            {
                "name": "fromTokenId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "toTokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "from",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "MetadataUpdate",
        "inputs": [
            {
                "name": "_tokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Transfer",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "TransferValidatorUpdated",
        "inputs": [
            {
                "name": "oldValidator",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "newValidator",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "URIsFrozen",
        "inputs": [],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "ApprovalCallerNotOwnerNorApproved",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ApprovalQueryForNonexistentToken",
        "inputs": []
    },
    {
        "type": "error",
        "name": "BalanceQueryForZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CreatorTokenBase__InvalidTransferValidatorContract",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ERC2981InvalidDefaultRoyalty",
        "inputs": [
            {
                "name": "numerator",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "denominator",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC2981InvalidDefaultRoyaltyReceiver",
        "inputs": [
            {
                "name": "receiver",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC2981InvalidTokenRoyalty",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "numerator",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "denominator",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC2981InvalidTokenRoyaltyReceiver",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "receiver",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "GluttonNFT__NotGameEngine",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GluttonNFT__TokenDoesNotExist",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "GluttonNFT__URIsAlreadyFrozen",
        "inputs": []
    },
    {
        "type": "error",
        "name": "GluttonNFT__ZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "MintERC2309QuantityExceedsLimit",
        "inputs": []
    },
    {
        "type": "error",
        "name": "MintToZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "MintZeroQuantity",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnerQueryForNonexistentToken",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnershipNotInitializedForExtraData",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ShouldNotMintToBurnAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferCallerNotOwnerNorApproved",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferFromIncorrectOwner",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferToNonERC721ReceiverImplementer",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferToZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "URIQueryForNonexistentToken",
        "inputs": []
    }
] as const;


export const InspectorABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "gameEngine_",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "gluttonNFT_",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getGlobalView",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct Inspector.GlobalState",
                "components": [
                    {
                        "name": "aliveCount",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "currentMealSeconds",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "isSettled",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "currentPhase",
                        "type": "string",
                        "internalType": "string"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTokenView",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct Inspector.TokenStateView",
                "components": [
                    {
                        "name": "owner",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "visualState",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "expiry",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "isHungry",
                        "type": "bool",
                        "internalType": "bool"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    }
] as const;

export const ABIS = {
    futureRewardsVault: futureRewardsVaultABI,
    PVGTreasury: PVGTreasuryABI,
    GameEngine: GameEngineABI,
    PrizeVault: PrizeVaultABI,
    RoyaltyTreasury: RoyaltyTreasuryABI,
    Nft: NftABI,
    Inspector: InspectorABI
}