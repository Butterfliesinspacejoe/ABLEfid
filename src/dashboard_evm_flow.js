import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js';

// Use Magic's injected provider so calls are signed by the logged-in user
const ethProvider = new ethers.BrowserProvider(window.magic?.rpcProvider || window.ethereum);

// Example: read mapped wallet for a UUID
async function readWallet(contractAddr, abi, uuid) {
  const provider = await ethProvider;
  const contract = new ethers.Contract(contractAddr, abi, provider);
  return await contract.getWallet(uuid);
}

// Example: set mapped wallet (admin/fiduciary action)
async function setWallet(contractAddr, abi, uuid, walletAddress) {
  const provider = await ethProvider;
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddr, abi, signer);
  const tx = await contract.setWallet(uuid, walletAddress, { gasLimit: 500_000 });
  await tx.wait();
  return tx.hash;
}

