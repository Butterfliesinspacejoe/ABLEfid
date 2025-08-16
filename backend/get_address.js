import { ethers } from "ethers";

// Flow EVM testnet RPC URL
const rpcUrl = "https://testnet.evm.nodes.onflow.org";
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Contract address
const contractAddress = "0x4761969E2FF16EE14EF91D22685DdE96621bc415"; //This needs to be a variable

// Minimal ABI for getWallet(string) returns (address)
const abi = [
  "function getWallet(string) view returns (address)"
];

async function main() {
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const result = await contract.getWallet("user-uuid-124");
  console.log("Wallet address:", result);
}

main().catch(console.error);


