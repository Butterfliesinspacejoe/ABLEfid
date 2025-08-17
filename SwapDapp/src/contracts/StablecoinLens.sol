// Created with AI
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC20
interface IERC20 {
    function transfer(address to, uint256 amt) external returns (bool);
    function transferFrom(address from, address to, uint256 amt) external returns (bool);
    function approve(address spender, uint256 amt) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address a) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/// @notice Uniswap V3 SwapRouter02 (exactInputSingle) interface
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata p)
        external
        payable
        returns (uint256 amountOut);
}

/**
 * @title SwapExecutorV3Lite (Sepolia)
 * @notice Simple pass-through executor to Uniswap V3.
 *         Designed to match a fixed selector 0x43ecfa0a used by an off-chain client.
 *
 *         Your flow (already in your C++):
 *           1) ERC20(tokenIn).approve(this, amountIn)
 *           2) call this contract with selector 0x43ecfa0a and args:
 *              (tokenIn, tokenOut, fee, amountIn, minOut)
 *         This contract:
 *           - transferFrom(msg.sender, address(this), amountIn)
 *           - approve(router, amountIn)
 *           - router.exactInputSingle(... recipient = msg.sender ...)
 *           - emits SwapExecuted
 */
contract SwapExecutorV3Lite {
    // Uniswap V3 SwapRouter02 on **Sepolia**
    // Source: Uniswap docs “Ethereum Contract Deployments” (Sepolia column).
    // https://docs.uniswap.org/contracts/v3/reference/deployments/ethereum-deployments
    address public constant UNISWAP_V3_SWAPROUTER02 = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;

    // Simple lock to avoid reentrancy
    uint256 private _unlocked = 1;
    modifier lock() {
        require(_unlocked == 1, "LOCKED");
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    event SwapExecuted(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOut
    );

    /// @notice Normal function (handy in Remix). Your C++ can use fallback instead.
    function swapExactInSingle(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn,
        uint256 minOut
    ) external lock returns (uint256 amountOut) {
        amountOut = _swap(tokenIn, tokenOut, fee, amountIn, minOut);
    }

    /// @notice Fallback to support your hardcoded selector 0x43ecfa0a
    /// calldata = 0x43ecfa0a
    ///            + tokenIn(32) + tokenOut(32) + fee(32) + amountIn(32) + minOut(32)
    fallback() external payable lock {
        // Only handle your known selector
        if (msg.sig != bytes4(0x43ecfa0a)) revert("bad selector");

        // Decode args after the 4-byte selector
        (address tokenIn, address tokenOut, uint256 feeU, uint256 amountIn, uint256 minOut)
            = abi.decode(msg.data[4:], (address, address, uint256, uint256, uint256));

        _swap(tokenIn, tokenOut, uint24(feeU), amountIn, minOut);
        // No return needed; your client waits on receipt, not return data
    }

    receive() external payable {}

    function _swap(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn,
        uint256 minOut
    ) internal returns (uint256 amountOut) {
        require(tokenIn != address(0) && tokenOut != address(0), "zero token");
        require(amountIn > 0, "zero amount");

        // Pull tokens from user (user must approve this contract beforehand)
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "transferFrom failed");

        // Approve router (reset to 0 first to support non-standard ERC20s)
        require(IERC20(tokenIn).approve(UNISWAP_V3_SWAPROUTER02, 0), "approve reset failed");
        require(IERC20(tokenIn).approve(UNISWAP_V3_SWAPROUTER02, amountIn), "approve failed");

        // Build params
        ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,                  // tokens go back to the caller
            deadline: block.timestamp + 1200,       // ~20 minutes
            amountIn: amountIn,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0                    // no price limit
        });

        // Do the swap
        amountOut = ISwapRouter(UNISWAP_V3_SWAPROUTER02).exactInputSingle(p);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, fee, amountIn, amountOut);
    }
}

// These contracts were created using AI