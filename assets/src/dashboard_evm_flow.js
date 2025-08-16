// assets/src/dashboard_evm_flow.js
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js";

// --- SET THESE ---
const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_DB_CONTRACT"; // Flow EVM testnet address
const ABI = [
  "function getWallet(string) view returns (address)"
  // If you also want to allow admin writes from browser, add:
  // ,"function setWallet(string uuid, address wallet) external"
];

// Magic injects an EIP-1193 provider at window.magic.rpcProvider after login
async function getProvider() {
  if (!window.magic || !window.magic.rpcProvider) {
    throw new Error("Magic provider not found. Are you logged in?");
  }
  return new ethers.BrowserProvider(window.magic.rpcProvider);
}

async function readWallet(uuid) {
  const provider = await getProvider(); // read-only is fine
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  return await contract.getWallet(uuid);
}

// Optional: admin write (ONLY if you want to let signed-in users update)
async function setWallet(uuid, walletAddress) {
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const tx = await contract.setWallet(uuid, walletAddress, { gasLimit: 500_000 });
  await tx.wait();
  return tx.hash;
}

// ---- minimal UI wiring (adjust IDs to your page) ----
const uuidInput = document.getElementById("uuidInput");
const getBtn = document.getElementById("getWalletBtn");
const resultEl = document.getElementById("walletResult");

getBtn?.addEventListener("click", async () => {
  resultEl.textContent = "Reading...";
  try {
    const uuid = (uuidInput?.value || "").trim();
    if (!uuid) throw new Error("Enter a UUID");
    const addr = await readWallet(uuid);
    resultEl.textContent = addr && addr !== ethers.ZeroAddress
      ? `Mapped wallet: ${addr}`
      : "No wallet mapped for that UUID.";
  } catch (e) {
    console.error(e);
    resultEl.textContent = "Read failed. See console for details.";
  }
});

// If you want admin write, add inputs and a button and call setWallet(...)
