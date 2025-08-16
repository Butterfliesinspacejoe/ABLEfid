// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";

contract ERC20Token is ERC20, AccessManaged {
    constructor(address initialAuthority)
        ERC20("USDC on Hedera", "USDC")
        AccessManaged(initialAuthority)
    {}

}