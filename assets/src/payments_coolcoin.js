// assets/src/payments_coolcoin.js

// ---------- Config ----------
const FLOW_RPC = "https://testnet.evm.nodes.onflow.org";
const FLOW_CHAIN_ID_HEX = "0x221"; // 545
const COOLCOIN_ADDRESS = "0xe34A005185EF623244e58C8E172B8130b7EdF394"; // <-- confirm your deployed address
const COOLCOIN_ABI_URL = "assets/coolCoin.json"; // relative to dashboard.html

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
$("connectEvmBtn")?.addEventListener("click", async () => {
  try {
    const provider = await getActiveProvider();

    // Try to switch/add Flow EVM Testnet if wallet supports it
    await ensureFlowChain(provider);

    // Request accounts if possible
    const eip1193 = getEip1193(provider);
    try { await eip1193?.request?.({ method: "eth_requestAccounts" }); } catch {}

    const signer = await getSignerIfPossible(provider);
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
$("purchase")?.addEventListener("click", async () => {
  try {
    const provider = await getActiveProvider();
    const signer = await getSignerIfPossible(provider);
    if (!signer) throw new Error("No signer. Connect a wallet first.");

    // Ensure network if wallet supports switching
    await ensureFlowChain(provider);

    const amtStr = $("usdValue")?.value;
    const amt = Number(amtStr || 0);
    if (!amt || amt <= 0) throw new Error("Enter amount > 0");

    const coin = await getCoinContract(signer);
    const value = window.ethers.parseEther(amt.toString());

    setText(buyLog, "Submitting mint tx...");
    const tx = await coin.mint({ value });
    setText(buyLog, `Mint tx: ${tx.hash}`);
    await tx.wait();
    setText(buyLog, `✅ Minted ${amt} COOL`);
  } catch (e) {
    console.error(e);
    setText(buyLog, `Mint failed: ${e.message || String(e)}`);
  }
});

// ---------- UI: Redeem ----------
$("redeemBtn")?.addEventListener("click", async () => {
  try {
    const provider = await getActiveProvider();
    const signer = await getSignerIfPossible(provider);
    if (!signer) throw new Error("No signer. Connect a wallet first.");

    // Ensure network if wallet supports switching
    await ensureFlowChain(provider);

    const wantStr = $("redeemValue")?.value;
    const want = Number(wantStr || 0);
    if (!want || want <= 0) throw new Error("Enter amount > 0");

    const coin = await getCoinContract(signer);
    const decimals = await coin.decimals();
    const amt = window.ethers.parseUnits(want.toString(), decimals);

    const userAddr = await signer.getAddress();
    const bal = await coin.balanceOf(userAddr);
    if (bal < amt) throw new Error("Not enough COOL to redeem that amount.");

    setText(redeemLog, "Submitting redeem tx...");
    const tx = await coin.redeem(amt);
    setText(redeemLog, `Redeem tx: ${tx.hash}`);
    await tx.wait();
    setText(redeemLog, `✅ Redeemed ${want} COOL for FLOW`);
  } catch (e) {
    console.error(e);
    setText(redeemLog, `Redeem failed: ${e.message || String(e)}`);
  }
});
