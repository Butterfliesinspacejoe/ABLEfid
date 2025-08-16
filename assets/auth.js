import { Magic } from 'https://cdn.jsdelivr.net/npm/magic-sdk@latest/dist/magic.js';
import * as fcl from "https://cdn.jsdelivr.net/npm/@onflow/fcl/dist/fcl.min.js";

const MAGIC_PUBLISHABLE_KEY = "pk_live_replace_me"; // replace with your Magic publishable key

// Initialize Magic with Flow extension
const magic = new Magic(MAGIC_PUBLISHABLE_KEY, { extensions: { flow: new Magic.FlowExtension({ rpcUrl: "https://rest-testnet.onflow.org" }) } });

document.getElementById("loginBtn")?.addEventListener("click", async () => {
  try {
    const accounts = await magic.auth.loginWithEmailOTP({ email: prompt("Enter email:") });
    const meta = await magic.user.getMetadata();
    document.getElementById("userMeta").textContent = JSON.stringify(meta, null, 2);
    localStorage.setItem("magicUser", JSON.stringify(meta));
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
  }
});
