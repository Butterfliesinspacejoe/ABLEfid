// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "hedera-token-service/HederaTokenService.sol";
import "hedera-token-service/ExpiryHelper.sol";
import "hedera-token-service/KeyHelper.sol";
import "hedera-token-service/FeeHelper.sol";

contract HTSContract is HederaTokenService, ExpiryHelper, KeyHelper, FeeHelper {

    event ResponseCode(int responseCode);
    event TransferToken(address tokenAddress, address receiver, int64 amount);
    event MintedToken(int64 newTotalSupply, int64[] serialNumbers);

    function associateTokenPublic(address account, address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(account, token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function mintTokenToAddressPublic(
        address token,
        address receiver,
        int64 amount,
        bytes[] memory metadata
    )
        public
        returns (
            int responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        )
    {
        (responseCode, newTotalSupply, serialNumbers) = mintTokenPublic(
            token,
            amount,
            metadata
        );

        HederaTokenService.transferToken(
            token,
            address(this),
            receiver,
            amount
        );
        emit TransferToken(token, receiver, amount);
    }

    function mintTokenPublic(
        address token,
        int64 amount,
        bytes[] memory metadata
    )
        public
        returns (
            int responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        )
    {
        (responseCode, newTotalSupply, serialNumbers) = HederaTokenService
            .mintToken(token, amount, metadata);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit MintedToken(newTotalSupply, serialNumbers);
    }
}
