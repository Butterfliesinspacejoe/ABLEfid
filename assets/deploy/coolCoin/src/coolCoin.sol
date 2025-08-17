// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract coolCoin is ERC20 {
    constructor() ERC20("coolCoin", "MyT") {}

    // Users pay Flow (native) directly
    function mint() external payable {
        require(msg.value > 0, "Send Flow to mint");
        _mint(msg.sender, msg.value); // 1 Flow = 1 MyT
    }

    function redeem(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Not enough tokens");
        _burn(msg.sender, amount);
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Redeem failed");
    }

    receive() external payable {}
}
