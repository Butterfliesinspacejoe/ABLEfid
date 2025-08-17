forge create --broadcast src/coolCoin.sol:coolCoin \
    --rpc-url https://testnet.evm.nodes.onflow.org \
    --private-key "0xcaac23ba960094ee4958423a549ea904331167423f8091fa244a603a58a24704" \
    --constructor-args 42000000 \
    --legacy
