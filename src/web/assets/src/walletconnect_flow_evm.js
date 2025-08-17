// Uses window.w3m from @web3modal/* UMD and window.ethers from ethers UMD

const WC_PROJECT_ID = "74055d30710b9a6b5f28abdfd1224508"; // paste from cloud.walletconnect.com (Reown)

const FLOW_EVM = {
  chainId: 545,
  name: "Flow EVM Testnet",
  currency: "FLOW",
  rpcUrl: "https://testnet.evm.nodes.onflow.org"
};

const { createWeb3Modal, defaultConfig } = window.w3m;

const web3Modal = createWeb3Modal({
  ethersConfig: defaultConfig({
    metadata: {
      name: "ABLEfid",
      description: "ABLEfid — Flow EVM Testnet",
      url: window.location.origin,
      icons: [window.location.origin + "/favicon.ico"]
    }
  }),
  chains: [{
    chainId: `eip155:${FLOW_EVM.chainId}`,
    name: FLOW_EVM.name,
    currency: FLOW_EVM.currency,
    rpcUrl: FLOW_EVM.rpcUrl
  }],
  projectId: WC_PROJECT_ID,
  enableOnramp: false
});

// UI
const $ = (id) => document.getElementById(id);
const statusEl = $("wcStatus");

$("btnConnectWC")?.addEventListener("click", async () => {
  try { await web3Modal.open(); } catch (e) { console.error(e); }
});

$("btnDisconnectWC")?.addEventListener("click", async () => {
  try { await web3Modal.disconnect(); } catch (e) {}
  statusEl.textContent = "Disconnected";
  window.ABLEFID_ACTIVE_PROVIDER = null;
});

// On connect, expose an ethers Provider to the rest of the app
window.addEventListener("w3m:connected", async () => {
  try {
    const provider = await web3Modal.getWalletProvider(); // ethers Provider
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    statusEl.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;

    // Prefer WC in your contract calls
    window.ABLEFID_ACTIVE_PROVIDER = provider;

    // Ensure chain is 545 (Flow EVM Testnet)
    const eth = await web3Modal.getWalletProvider().then(p => p.provider);
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x221" }] });
    } catch {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x221",
            chainName: "Flow EVM Testnet",
            nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
            rpcUrls: [FLOW_EVM.rpcUrl],
            blockExplorerUrls: []
          }]
        });
      } catch (e2) { console.warn("add/switch chain failed", e2); }
    }
  } catch (e) { console.error(e); }
});

window.addEventListener("w3m:disconnected", () => {
  statusEl.textContent = "Disconnected";
  window.ABLEFID_ACTIVE_PROVIDER = null;
});
