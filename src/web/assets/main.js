import { test_connection } from "./test.js";

document.getElementById("connectBtn").addEventListener("click", test_connection);



// Simple progressive enhancements
(function () {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Placeholder handlers for demo navigation
    const router = (hash) => {
        switch (hash) {
            case '#login':
                alert('Navigate to Login: integrate Coinbase Wallet, Web3Auth, or Magic.link here.');
                break;
            case '#demo':
                alert('Play demo video or open modal.');
                break;
            case '#get-started':
                document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth' });
                break;
            default:
            // no-op
        }
    };

    window.addEventListener('hashchange', () => router(location.hash));
    // Prime in case user lands with a hash
    router(location.hash);
})();
