// SPDX-License-Identifier: MIT


pragma solidity ^0.8.24;





interface IERC20 {


    function balanceOf(address account) external view returns (uint256);


}





contract WalletDirectory {


    struct WalletRecord {


        string name;   // e.g. "sallie man"


        address wallet; // Ethereum wallet


    }





    WalletRecord[] private records;


    mapping(string => uint256) private nameToIndex; // lookup: name → index+1


    mapping(address => uint256) private addrToIndex; // lookup: address → index+1





    event Added(string name, address wallet);





    /// @notice Register a new wallet with a name


    function addWallet(string calldata name, address wallet) external {


        require(wallet != address(0), "zero addr");


        require(nameToIndex[name] == 0, "name taken");


        require(addrToIndex[wallet] == 0, "addr taken");





        records.push(WalletRecord(name, wallet));


        uint256 idx = records.length; // index+1


        nameToIndex[name] = idx;


        addrToIndex[wallet] = idx;





        emit Added(name, wallet);


    }





    /// @notice Get wallet address by name


    function getWallet(string calldata name) external view returns (address) {


        uint256 idx = nameToIndex[name];


        require(idx != 0, "not found");


        return records[idx - 1].wallet;


    }





    /// @notice Get name by wallet


    function getName(address wallet) external view returns (string memory) {


        uint256 idx = addrToIndex[wallet];


        require(idx != 0, "not found");


        return records[idx - 1].name;


    }





    /// @notice Enumerate (for pagination)


    function getRecord(uint256 index) external view returns (string memory, address) {


        require(index < records.length, "OOB");


        WalletRecord storage rec = records[index];


        return (rec.name, rec.wallet);


    }





    function count() external view returns (uint256) {


        return records.length;


    }





    /// @notice Query token balance of a stored wallet


    function tokenBalance(string calldata name, address token) external view returns (uint256) {


        address wallet = getWallet(name);


        return IERC20(token).balanceOf(wallet);


    }


}
