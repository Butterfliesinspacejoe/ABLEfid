// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC20 interface (only what we need)
interface IERC20 {
    function balanceOf(address a) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amt) external returns (bool);
    function transfer(address to, uint256 amt) external returns (bool);
    function transferFrom(address from, address to, uint256 amt) external returns (bool);
    function decimals() external view returns (uint8);
}

/// @notice Minimal Uniswap V3 SwapRouter interface (exact *single* pool)
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;                  // e.g. 500, 3000, 10000
        address recipient;            // who receives tokenOut
        uint256 deadline;             // unix time
        uint256 amountIn;             // exact amount of tokenIn to swap
        uint256 amountOutMinimum;     // slippage guard
        uint160 sqrtPriceLimitX96;    // 0 for no limit
    }
    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;            // exact amount of tokenOut desired
        uint256 amountInMaximum;      // maximum tokenIn to spend
        uint160 sqrtPriceLimitX96;    // 0 for no limit
    }
    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256 amountOut);
    function exactOutputSingle(ExactOutputSingleParams calldata p) external payable returns (uint256 amountIn);
}

/// @notice Simple non-reentrant helper (tiny, no OZ import)
abstract contract ReentrancyBlock {
    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "REENTRANCY");
        _locked = 2;
        _;
        _locked = 1;
    }
}

/// @title SwapExecutorV3
/// @dev Pulls tokens from caller, approves router, swaps, and pays out to caller.
///      Holds no funds after success (except a temporary allowance + possible tiny dust).
contract SwapExecutorV3 is ReentrancyBlock {
    address public immutable router;

    event SwapExactIn(address indexed user, address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint256 amountOut);
    event SwapExactOut(address indexed user, address tokenIn, address tokenOut, uint24 fee, uint256 amountInUsed, uint256 amountOut);

    constructor(address _swapRouter02) {
        require(_swapRouter02 != address(0), "router=0");
        router = _swapRouter02;
    }

    /// @notice Swap an exact amount of tokenIn for >= amountOutMin of tokenOut (one pool).
    /// @param tokenIn        ERC20 you spend
    /// @param tokenOut       ERC20 you receive
    /// @param fee            Uniswap V3 pool fee (e.g., 500, 3000, 10000)
    /// @param amountIn       Exact amount of tokenIn to swap
    /// @param amountOutMin   Minimum acceptable tokenOut (slippage protection)
    /// @return amountOut     Actual tokenOut received
    function swapExactInSingle(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "amountIn=0");

        // 1) Pull tokenIn from user -> this contract (user must approve this contract first)
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "transferFrom fail");

        // 2) Approve router to spend tokenIn
        _safeApprove(tokenIn, router, 0);           // clear old allowance (some ERC20s need 0->N)
        _safeApprove(tokenIn, router, amountIn);

        // 3) Call Uniswap
        ISwapRouter.ExactInputSingleParams memory p = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,                  // send result straight to the user
            deadline: block.timestamp + 300,        // 5 min
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouter(router).exactInputSingle(p);

        // 4) Set allowance back to 0 (tidy)
        _safeApprove(tokenIn, router, 0);

        emit SwapExactIn(msg.sender, tokenIn, tokenOut, fee, amountIn, amountOut);
    }

    /// @notice Buy an exact amount of tokenOut, spending <= amountInMax of tokenIn (one pool).
    /// @dev Any unspent tokenIn is refunded to the user.
    function swapExactOutSingle(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountOut,
        uint256 amountInMax
    ) external nonReentrant returns (uint256 amountInUsed) {
        require(amountOut > 0, "amountOut=0");
        require(amountInMax > 0, "amountInMax=0");

        // 1) Pull maximum budget to this contract
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountInMax), "transferFrom fail");

        // 2) Approve router up to amountInMax
        _safeApprove(tokenIn, router, 0);
        _safeApprove(tokenIn, router, amountInMax);

        // 3) Swap for the exact output
        ISwapRouter.ExactOutputSingleParams memory p = ISwapRouter.ExactOutputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountOut: amountOut,
            amountInMaximum: amountInMax,
            sqrtPriceLimitX96: 0
        });

        amountInUsed = ISwapRouter(router).exactOutputSingle(p);

        // 4) Reset allowance
        _safeApprove(tokenIn, router, 0);

        // 5) Refund unspent tokenIn (if any)
        if (amountInUsed < amountInMax) {
            require(IERC20(tokenIn).transfer(msg.sender, amountInMax - amountInUsed), "refund fail");
        }

        emit SwapExactOut(msg.sender, tokenIn, tokenOut, fee, amountInUsed, amountOut);
    }

    /// @dev tiny helper to surface approve failures consistently
    function _safeApprove(address token, address spender, uint256 amt) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, amt));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "approve fail");
    }
}

/// @title TestUSD (for local testing)
/// @dev 6-decimals mintable token to mimic USDC-like behavior on anvil.
contract TestUSD is IERC20 {
    string public constant name = "TestUSD";
    string public constant symbol = "TUSD";
    uint8  public constant override decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
        totalSupply    += amt;
    }

    function transfer(address to, uint256 amt) external override returns (bool) {
        _xfer(msg.sender, to, amt);
        return true;
    }

    function approve(address sp, uint256 amt) external override returns (bool) {
        allowance[msg.sender][sp] = amt;
        return true;
    }

    function transferFrom(address f, address t, uint256 amt) external override returns (bool) {
        uint256 a = allowance[f][msg.sender];
        require(a >= amt, "allowance");
        if (a != type(uint256).max) allowance[f][msg.sender] = a - amt;
        _xfer(f, t, amt);
        return true;
    }

    function _xfer(address f, address t, uint256 amt) internal {
        require(balanceOf[f] >= amt, "balance");
        unchecked { balanceOf[f] -= amt; balanceOf[t] += amt; }
    }
}
