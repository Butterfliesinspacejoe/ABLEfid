import { ethers } from "ethers";
import fs from "fs";

//Address:     0x53e8E0C149a7D6431F481fA38eEc1BdE42b661c4
//Private key: 0x0cf7a1da1fd2361f23ae6c706f48946c6a1c8577fc231b8aab6eaeb090ecfe31

const RPC_URL = "https://testnet.evm.nodes.onflow.org";
const PRIVATE_KEY = "0x0cf7a1da1fd2361f23ae6c706f48946c6a1c8577fc231b8aab6eaeb090ecfe31"; //.env, Our dev wallet to pay for this transaction
const CONTRACT_ADDRESS = "0x53e8E0C149a7D6431F481fA38eEc1BdE42b661c4"; //.env, our dev wallet to pay for this transaction, we need one central "Dev wallet"???

// load ABI (from forge build output)
const artifact = JSON.parse(
  fs.readFileSync("./out/UuidToWalletDB.sol/UuidToWalletDB.json", "utf8")
);
const abi = artifact.abi;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);


  const tx = await contract.setWallet("user-uuid-123", "0xAbc1230000000000000000000000000000000000", { //Those two arguments should be variables
    gasLimit: 500_000,
  });

  console.log("Tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Mined in block:", receipt.blockNumber);
}

main().catch(console.error);

