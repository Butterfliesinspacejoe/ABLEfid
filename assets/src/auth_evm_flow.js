import { Magic } from "https://cdn.jsdelivr.net/npm/magic-sdk/+esm";

const MAGIC_PUBLISHABLE_KEY = "pk_live_8A7A254AFE5756EC"; // publishable key is safe to expose

// Flow EVM Testnet (chainId 545)
const magic = new Magic(MAGIC_PUBLISHABLE_KEY, {
  network: { rpcUrl: "https://testnet.evm.nodes.onflow.org", chainId: 545 },
});

// 🔴 make it visible to other scripts and the console
window.magic = magic;
window.MAGIC_PUBLISHABLE_KEY = MAGIC_PUBLISHABLE_KEY;

// If already logged in, skip the form and go straight to dashboard
(async () => {
  try {
    const ok = await magic.user.isLoggedIn();
    if (ok) {
      // keep this relative unless you truly host at site root
      window.location.href = "dashboard.html";
      return;
    }
  } catch {}
})();

const form = document.getElementById("loginForm");
const status = document.getElementById("status");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) { status.textContent = "Enter an email."; return; }

  status.textContent = "Sending magic link...";
  try {
    await magic.auth.loginWithEmailOTP({ email, showUI: true });

    // (Optional) sanity check/log
    const meta = await magic.user.getMetadata();
    const isLoggedIn = await magic.user.isLoggedIn();
    console.log("Magic meta", meta, "isLoggedIn", isLoggedIn);

    // Minimal session marker (you can remove this if you rely solely on magic.user.*)
    localStorage.setItem("ablefid_session", "true");
    localStorage.setItem("ablefid_user", JSON.stringify(meta || {}));

    // Relative path so it works whether you're at / or in a subfolder
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    status.textContent = "Login failed. Check Magic Allowed Origins & popups.";
  }
});
