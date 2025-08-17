import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/dist/ethers.min.js";
import { ABLEFID_DB_ABI } from "./db_abi.js";

// --- SET THIS to your deployed Flow EVM testnet address ---
const DB_CONTRACT_ADDRESS = "0x53e8E0C149a7D6431F481fA38eEc1BdE42b661c4";

// Recreate Magic instance on each page load (new tab loses window variables)
function initMagic() {
  // Must match your login init
  return new window.Magic(window.MAGIC_PUBLISHABLE_KEY, {
    network: { rpcUrl: "https://testnet.evm.nodes.onflow.org", chainId: 545 },
  });
}

async function getProvider() {
  // 1. Prefer WalletConnect (if user connected via modal)
  if (window.ABLEFID_ACTIVE_PROVIDER) {
    return window.ABLEFID_ACTIVE_PROVIDER;
  }

  // 2. Fall back to Magic (if session exists)
  if (window.MAGIC_PUBLISHABLE_KEY) {
    const magic = initMagic();
    return new ethers.BrowserProvider(magic.rpcProvider);
  }

  // 3. Last resort: read-only Flow EVM JSON-RPC provider
  return new ethers.JsonRpcProvider("https://testnet.evm.nodes.onflow.org");
}


// READ: get mapped wallet by UUID
export async function getWalletByUuid(uuid) {
  const provider = await getProvider();
  const contract = new ethers.Contract(DB_CONTRACT_ADDRESS, ABLEFID_DB_ABI, provider);
  return await contract.getWallet(uuid);
}

// WRITE (optional, role-gate in UI): set mapping
export async function setWalletForUuid(uuid, walletAddress) {
  const provider = await getProvider();
  const signer = await provider.getSigner(); // uses Magic session
  const contract = new ethers.Contract(DB_CONTRACT_ADDRESS, ABLEFID_DB_ABI, signer);
  const tx = await contract.setWallet(uuid, walletAddress, { gasLimit: 500_000 });
  await tx.wait();
  return tx.hash;
}

// ----- Simple UI wiring (adjust IDs to your HTML) -----
const q = (id) => document.getElementById(id);

q("btnGet")?.addEventListener("click", async () => {
  const uuid = (q("uuidGet")?.value || "").trim();
  q("outGet").textContent = "Reading...";
  try {
    const addr = await getWalletByUuid(uuid);
    q("outGet").textContent = (addr && addr !== ethers.ZeroAddress)
      ? `Mapped wallet: ${addr}`
      : "No wallet mapped for that UUID.";
  } catch (e) {
    console.error(e);
    q("outGet").textContent = "Read failed (see console).";
  }
});

q("btnSet")?.addEventListener("click", async () => {
  const uuid = (q("uuidSet")?.value || "").trim();
  const addr = (q("addrSet")?.value || "").trim();
  q("outSet").textContent = "Submitting...";
  try {
    const hash = await setWalletForUuid(uuid, addr);
    q("outSet").textContent = `Tx sent: ${hash}`;
  } catch (e) {
    console.error(e);
    q("outSet").textContent = "Write failed (see console).";
  }
});
