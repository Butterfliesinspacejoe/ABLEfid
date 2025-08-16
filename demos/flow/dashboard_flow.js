import * as fcl from 'https://cdn.jsdelivr.net/npm/@onflow/fcl@1.6.2/dist/fcl.browser.min.js';

fcl.config()
  .put('accessNode.api', 'https://rest-testnet.onflow.org')
  .put('discovery.wallet', 'https://fcl-discovery.onflow.org/testnet/authn')
  .put('app.detail.title', 'ABLEfid Flow Demo')
  .put('app.detail.icon', window.location.origin + '/favicon.ico');

const cadenceBalanceScript = `
  import FungibleToken from 0x9a0766d93b6608b7
  import FlowToken from 0x7e60df042a9c0868

  pub fun main(address: Address): UFix64 {
    let acct = getAccount(address)
    let cap = acct.getCapability<&FlowToken.Vault{FungibleToken.Balance}>(/public/flowTokenBalance)
    if !cap.check() { return 0.0 }
    let ref = cap.borrow()!
    return ref.balance
  }
`;

function $(id){ return document.getElementById(id); }

(async function main(){
  const user = JSON.parse(localStorage.getItem('ablefid_user') || '{}');
  $('userJson').textContent = JSON.stringify(user, null, 2);

  const addrInput = $('flowAddr');
  if(user.publicAddress && !addrInput.value){
    addrInput.value = user.publicAddress;
  }

  $('checkBal').addEventListener('click', async ()=>{
    const addr = addrInput.value.trim();
    if(!addr){ $('balStatus').textContent = 'Enter a Flow testnet address.'; return; }
    $('balStatus').textContent = 'Checking balance...';
    try {
      const res = await fcl.query({
        cadence: cadenceBalanceScript,
        args: (arg, t) => [arg(addr, t.Address)]
      });
      $('balStatus').textContent = `FLOW balance: ${res}`;
    } catch (e) {
      console.error(e);
      $('balStatus').textContent = 'Failed to fetch balance.';
    }
  });
})();