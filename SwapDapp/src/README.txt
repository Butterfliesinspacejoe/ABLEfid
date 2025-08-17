Download SwapDapp directory
OpenWallet -> Network -> Add Network:
Name: Sepolia
RPC URL: https://ethereum-sepolia-rpc.publicnode.com
Chain ID: 11155111
Currency symbol
SepoliaETH
Explorer url: https://sepolia.etherscan.io

InfuraRPC -> https://developer.metamask.io/key/all-endpoints:
Save your key here

Remix -> upload StablecoinLens.sol in contracts tab
Compile StablecoinLens.sol with compilet 0.8.24 or higher
Go to Deploy & Run -> under ENVIRONMENT select Injected Provider-MetaMask, Confirm in wallet extention, you will see Sepolia (11155111) network 
Under CONTRACT, select "SwapExecutor-contracts/Swap.. .sol
Deploy and save the EXECUTER address in Deployed Contracts tab

I assume you downloaded the whole Application file:
Go to go to src/build and run:
export ETH_RPC_URL="https://sepolia.infura.io/v3/<YOUR_KEYfromINFURA>"
export FROM="your wallet address"
export EXECUTOR="your EXPORT address from Remix which you saved when deployed smart contracts"
export TOKEN_IN="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"   # USDC (Sepolia)
export TOKEN_OUT="0xfff9976782d46cc05630d1f6ebab18b2324d6b14"  # WETH (Sepolia)
export AMOUNT_IN_HEX="0x0f4240" 
export MIN_OUT_HEX="0x0"          # accept any (for early testing)
export FEE_HEX="0x1f4"            # 500 → 0.05% pool
cmake ..
cmake --build .
./web3_client
cd .. && cd ui
python3 -m http.server 8080

Then: go to: http://localhost:8080





