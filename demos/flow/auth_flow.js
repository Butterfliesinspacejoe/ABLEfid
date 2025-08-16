import { Magic } from 'https://cdn.jsdelivr.net/npm/magic-sdk/+esm';
import { FlowExtension } from 'https://cdn.jsdelivr.net/npm/@magic-ext/flow/+esm';
import * as fcl from 'https://cdn.jsdelivr.net/npm/@onflow/fcl@1.6.2/dist/fcl.browser.min.js';

// Set your Magic publishable key (pk_live_... is fine for hackathon)
const MAGIC_PUBLISHABLE_KEY = 'pk_live_replace_me';

// Configure FCL for Flow testnet
fcl.config()
  .put('accessNode.api', 'https://rest-testnet.onflow.org')
  .put('discovery.wallet', 'https://fcl-discovery.onflow.org/testnet/authn')
  .put('app.detail.title', 'ABLEfid Flow Demo')
  .put('app.detail.icon', window.location.origin + '/favicon.ico');

let magic;
function initMagicFlow(){
  magic = new Magic(MAGIC_PUBLISHABLE_KEY, {
    extensions: [new FlowExtension({ network: 'testnet' })],
  });
}

function $(id){ return document.getElementById(id); }

async function loginWithEmail(email){
  // Magic Email OTP with built-in UI
  return await magic.auth.loginWithEmailOTP({ email, showUI: true });
}

async function getSessionMeta(){
  const isLoggedIn = await magic.user.isLoggedIn();
  const meta = await magic.user.getMetadata(); // { issuer, email, publicAddress? }
  return { isLoggedIn, ...meta };
}

(async function main(){
  initMagicFlow();
  const form = $('loginForm');
  const status = $('status');
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = ($('email')||{}).value;
    if(!email){ status.textContent = 'Please enter your email.'; return; }
    status.textContent = 'Sending login link...';
    try {
      await loginWithEmail(email);
      status.textContent = 'Logged in! Preparing dashboard...';
      const session = await getSessionMeta();
      localStorage.setItem('ablefid_session', 'true');
      localStorage.setItem('ablefid_user', JSON.stringify(session));
      window.location.href = './dashboard.html';
    } catch (err) {
      console.error(err);
      status.textContent = 'Login failed. Please try again.';
    }
  });
})();