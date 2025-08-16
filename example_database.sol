// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract WalletDirectory {
    struct WalletRecord { string name; address wallet; }
    WalletRecord[] private records;
    mapping(string => uint256) private nameToIndex; // name → index+1
    mapping(address => uint256) private addrToIndex; // addr → index+1

    event Added(string name, address wallet);

    function addWallet(string calldata name, address wallet) external {
        require(wallet != address(0), "zero addr");
        require(nameToIndex[name] == 0, "name taken");
        require(addrToIndex[wallet] == 0, "addr taken");
        records.push(WalletRecord(name, wallet));
        uint256 idx = records.length;
        nameToIndex[name] = idx;
        addrToIndex[wallet] = idx;
        emit Added(name, wallet);
    }

    function getWallet(string calldata name) external view returns (address) {
        uint256 idx = nameToIndex[name];
        require(idx != 0, "not found");
        return records[idx - 1].wallet;
    }

    function getName(address wallet) external view returns (string memory) {
        uint256 idx = addrToIndex[wallet];
        require(idx != 0, "not found");
        return records[idx - 1].name;
    }

    function getRecord(uint256 index) external vie
