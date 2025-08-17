// assets/src/payments_coolcoin.js

// ---------- Config ----------
const FLOW_RPC = "https://testnet.evm.nodes.onflow.org";
const FLOW_CHAIN_ID_HEX = "0x221"; // 545
const COOLCOIN_ADDRESS = "0xe34A005185EF623244e58C8E172B8130b7EdF394"; // <-- confirm your deployed address
const COOLCOIN_ABI_URL = "assets/coolCoin.json"; // relative to dashboard.html

let chosenAddr = null;


// ---------- DOM Helpers ----------
const $ = (id) => document.getElementById(id);
const buyLog = $("buyLog");
const redeemLog = $("redeemLog");
function setText(el, txt) { if (el) el.textContent = txt; }



// ---------- Provider Priority ----------
async function getActiveProvider() {
  // 1) WalletConnect (set by your Web3Modal code)
  if (window.ABLEFID_ACTIVE_PROVIDER) return window.ABLEFID_ACTIVE_PROVIDER;

  // 2) Magic (email login)
  if (window.MAGIC_PUBLISHABLE_KEY && window.MAGIC_NET && window.Magic) {
    const m = new window.Magic(window.MAGIC_PUBLISHABLE_KEY, { network: window.MAGIC_NET });
    return new window.ethers.BrowserProvider(m.rpcProvider);
  }

  // 3) Read-only provider
  return new window.ethers.JsonRpcProvider(FLOW_RPC);
}

// Try to extract an EIP-1193 provider for chain switch / account requests
function getEip1193(provider) {
  if (provider && provider.provider && typeof provider.provider.request === "function") {
    return provider.provider; // ethers v6 BrowserProvider wraps EIP-1193 on .provider
  }
  if (typeof window !== "undefined" && window.ethereum && typeof window.ethereum.request === "function") {
    return window.ethereum; // injected (MetaMask, etc.)
  }
  return null;
}

async function getSignerIfPossible(provider) {
  try {
    const signer = await provider.getSigner();
    await signer.getAddress(); // forces connection validity
    return signer;
  } catch {
    return null;
  }
}

// ---------- Chain Management ----------
async function ensureFlowChain(provider) {
  const eip1193 = getEip1193(provider);
  if (!eip1193) {
    // No wallet (read-only or Magic that doesn’t expose request) — skip switch
    return { switched: false, reason: "no-eip1193" };
  }
  try {
    await eip1193.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: FLOW_CHAIN_ID_HEX }]
    });
    return { switched: true };
  } catch (switchError) {
    // If unknown chain → add then switch
    if (switchError && (switchError.code === 4902 || String(switchError.message || "").includes("Unrecognized chain"))) {
      await eip1193.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: FLOW_CHAIN_ID_HEX,
          chainName: "Flow EVM Testnet",
          nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
          rpcUrls: [FLOW_RPC],
          blockExplorerUrls: ["https://evm-testnet.flowscan.io"]
        }]
      });
      return { switched: true, added: true };
    }
    // Some wallets (or Magic) won’t support add/switch; not fatal for reads
    return { switched: false, reason: "wallet-refused", error: switchError };
  }
}

// ---------- Contract Loader ----------
let _coinAbiCache = null;
async function loadCoinAbi() {
  if (_coinAbiCache) return _coinAbiCache;
  const res = await fetch(COOLCOIN_ABI_URL);
  if (!res.ok) throw new Error(`Failed to load ABI from ${COOLCOIN_ABI_URL}`);
  const json = await res.json();
  _coinAbiCache = json.abi || json; // supports raw ABI or { abi: [...] }
  return _coinAbiCache;
}

async function getCoinContract(signerOrProvider) {
  const abi = await loadCoinAbi();
  return new window.ethers.Contract(COOLCOIN_ADDRESS, abi, signerOrProvider);
}

// ---------- UI: Connect ----------

async function requestAccountsSelector() {
  await window.ethereum.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }],
  });
  return window.ethereum.request({ method: "eth_accounts" });
}


$("connectEvmBtn")?.addEventListener("click", async () => {
  try {
    const accountArray = await requestAccountsSelector()
    chosenAddr = accountArray[0];

    const provider = await getActiveProvider();
    // Try to switch/add Flow EVM Testnet if wallet supports it
    await ensureFlowChain(provider);

    // Request accounts if possible
    const eip1193 = getEip1193(provider);
    try { await eip1193?.request?.({ method: "eth_requestAccounts" }); } catch {}

    
    
    // Build signer specifically for the chosen address
    const ethersProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await ethersProvider.getSigner(chosenAddr);


    if (!signer) {
      setText(buyLog, "Please connect a wallet (WalletConnect or MetaMask).");
      return;
    }
    const addr = await signer.getAddress();
    setText(buyLog, `Connected as ${addr}`);
  } catch (e) {
    console.error(e);
    setText(buyLog, `Connect failed: ${e.message || String(e)}`);
  }
});

// ---------- UI: Purchase (Mint) ----------

  // ---------- UI: Purchase (Mint) ----------
$("purchase")?.addEventListener("click", async () => {
  try {
    // 1. Make sure MetaMask is available
    if (!window.ethereum) throw new Error("MetaMask not detected.");

    // 2. Build provider + signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 3. Contract instance (replace with your ABI + deployed address)
    const CONTRACT_ADDRESS = "0xe34A005185EF623244e58C8E172B8130b7EdF394";

    const CONTRACT_ABI = [
      "function redeem(uint256 amount)"
    ];

    const coin = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // 4. Get user input
    const usdVal = $("usdValue")?.value;
    const amt = Number(usdVal || 0);
    if (!amt || amt <= 0) throw new Error("Enter amount > 0");

    // 5. Convert to wei
    const amount = ethers.parseEther(amt.toString());
    console.log(`Redeeming ${amount} MyT`);

    // 6. Call redeem
    setText(buyLog, "Submitting mint tx...");
    const tx = await coin.redeem(amount)
    setText(buyLog, `Mint tx: ${tx.hash}`);

    await tx.wait();
    setText(buyLog, `✅ Minted ${amt} COOL`);
  } catch (err) {
    console.error(err);
    setText(buyLog, `Mint failed: ${err.message || String(err)}`);
  }
});


// ---------- UI: Redeem ----------
$("redeemBtn")?.addEventListener("click", async () => {
  try {
    // 1. Make sure MetaMask is available
    if (!window.ethereum) throw new Error("MetaMask not detected.");

    // 2. Build provider + signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 3. Contract instance (replace with your ABI + deployed address)
    const CONTRACT_ADDRESS = "0xe34A005185EF623244e58C8E172B8130b7EdF394";

    const CONTRACT_ABI = [
      "function mint() payable"
    ];

    const coin = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // 4. Get user input
    const usdVal = $("usdValue")?.value;
    const amt = Number(usdVal || 0);
    if (!amt || amt <= 0) throw new Error("Enter amount > 0");

    // 5. Convert to wei
    const value = ethers.parseEther(amt.toString());
    console.log(`This is the value ${value}`)

    // 6. Call mint
    setText(buyLog, "Submitting mint tx...");
    const tx = await coin.mint({ value });
    setText(buyLog, `Mint tx: ${tx.hash}`);

    await tx.wait();
    setText(buyLog, `✅ Minted ${amt} COOL`);
  } catch (err) {
    console.error(err);
    setText(buyLog, `Mint failed: ${err.message || String(err)}`);
  }
});

// ---------- Helper ----------
async function switchToFlowTestnet() {
  const FLOW_CHAIN_ID = "0x221";
  try {
    // Try switching first
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: FLOW_CHAIN_ID }],
    });
  } catch (switchError) {
    // If the chain isn’t added, add it then switch
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: FLOW_CHAIN_ID,
          chainName: "Flow EVM Testnet",
          nativeCurrency: {
            name: "Flow",
            symbol: "FLOW",
            decimals: 18,
          },
          rpcUrls: ["https://testnet.evm.nodes.onflow.org"],
          blockExplorerUrls: ["https://evm-testnet.flowscan.io"],
        }],
      });
    } else {
      throw switchError;
    }
  }
}
