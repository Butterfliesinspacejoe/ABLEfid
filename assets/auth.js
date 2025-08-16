const MAGIC_PUBLISHABLE_KEY = 'pk_live_or_test_replace_me'; // set from Magic dashboard

let magic;
function initMagic() {
  if (!window.Magic) {
    alert('Magic SDK not loaded'); return;
  }
  magic = new window.Magic(MAGIC_PUBLISHABLE_KEY);
}

async function loginWithEmail(email) {
  // Uses Magic email OTP (popup UI). You can switch to loginWithMagicLink if preferred.
  return await magic.auth.loginWithEmailOTP({ email, showUI: true });
}

async function getUser() {
  const meta = await magic.user.getMetadata();
  const isLoggedIn = await magic.user.isLoggedIn();
  return { isLoggedIn, ...meta };
}

async function logout() { try { await magic.user.logout(); } catch(e){ console.error(e); } }

(function(){
  const yearEl=document.getElementById('year'); if(yearEl) yearEl.textContent=new Date().getFullYear();
  initMagic();

  const form=document.getElementById('loginForm');
  const status=document.getElementById('status');
  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email=(document.getElementById('email')||{}).value;
      if(!email){ status.textContent='Please enter your email.'; return; }
      status.textContent='Sending login link...';
      try {
        await loginWithEmail(email);
        status.textContent='Logged in! Redirecting...';
        const user=await getUser();
        localStorage.setItem('ablefid_session','true');
        localStorage.setItem('ablefid_user', JSON.stringify(user || {}));
        window.location.href='dashboard.html';
      } catch(err){
        console.error(err);
        status.textContent='Login failed. Please try again.';
      }
    });
  }
})();