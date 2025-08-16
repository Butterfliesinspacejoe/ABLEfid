pragma solidity ^0.8.20;

contract UuidToWalletDB {
    // Mapping from string (UUID) to address
    mapping(string => address) public uuidToWallet;

    // Set the wallet address for a given UUID
    function setWallet(string calldata uuid, address wallet) external {
        uuidToWallet[uuid] = wallet;
    }

    // Get the wallet address for a given UUID
    function getWallet(string calldata uuid) external view returns (address) {
        return uuidToWallet[uuid];
    }
}
