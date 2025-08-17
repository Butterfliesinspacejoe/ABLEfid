/*
 * File:        main.cpp
 * Author:      Viachelsav Markov (edited for public network flow)
 * Created on:  2025-08-16
 * Description: Ethereum JSON-RPC client using libcurl and nlohmann::json.
 *              Connects to a public RPC (Sepolia), verifies ERC-20 allowance via
 *              eth_call, then BUILDS (but does not sign) the approve + swap txs.
 *              You submit these with a browser wallet (MetaMask/Coinbase Wallet).
 *              This pattern works on any public RPC without server-side private keys.
 *              This code was created with help of Copilot AI
 */

#include <iostream>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <string>
#include <optional>
#include <thread>
#include <chrono>
#include <stdexcept>
#include <cctype>
#include <cstdlib>

// -----------------------------------------------------------------------------
// Forward declarations
// -----------------------------------------------------------------------------
nlohmann::json wait_receipt(const std::string& url, const std::string& txhash);
std::string pad_to_32bytes(const std::string& input);
size_t writeCallback(char* ptr, size_t size, size_t nmemb, void* userdata);
std::optional<std::string> rpc_call(const std::string& url, const nlohmann::json& j);
static std::string strip0x(std::string s);
static uint64_t hex_to_u64(std::string s);

// Simple helpers for env/config
static std::string env_or(const char* key, const std::string& fallback);
static std::string ensure_hex_0x(std::string s);

// Convenience RPCs
static std::optional<std::string> rpc_chainId(const std::string& url);
static std::optional<std::string> rpc_estimateGas(const std::string& url, const nlohmann::json& callObj);

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
int main() {
    curl_global_init(CURL_GLOBAL_DEFAULT);

    // 1) Configuration via env (safe defaults for Sepolia demo)
    std::string url = env_or("ETH_RPC_URL", ""); // <-- set your RPC!
    std::string from = env_or("FROM", "");                           // <-- your wallet
    std::string executor  = env_or("EXECUTOR", "");            // <-- your contract

    // ERC-20s (Sepolia examples: USDC -> WETH). You can override via env.
    std::string tokenIn    = env_or("TOKEN_IN",  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"); // USDC (Sepolia)
    std::string tokenOut   = env_or("TOKEN_OUT", "0xfff9976782d46cc05630d1f6ebab18b2324d6b14"); // WETH (Sepolia)

    // Swap params (all hex strings). amountInHex = 1,000,000 => 1.0 USDC (6 decimals)
    std::string feeHex = env_or("FEE_HEX", "0xbb8");     // 3000
    std::string amountInHex  = env_or("AMOUNT_IN_HEX",  "0x0f4240");  // 1,000,000
    std::string minOutHex    = env_or("MIN_OUT_HEX",    "0x0");       // accept any for testing (careful on mainnet)

    // Basic sanity
    if (url.empty() || from.size() < 6 || executor.size() < 6) {
        std::cerr << "ERROR: Please set ETH_RPC_URL, FROM, EXECUTOR.\n";
        curl_global_cleanup();
        return 1;
    }

    std::cout << "RPC:    " << url      << "\n";
    std::cout << "FROM:   " << from     << "\n";
    std::cout << "EXEC:   " << executor << "\n";
    std::cout << "IN:     " << tokenIn  << "\n";
    std::cout << "OUT:    " << tokenOut << "\n";

    // 2) Show chain id (11155111 expected for Sepolia)
    if (auto cid = rpc_chainId(url)) {
        std::cout << "chainId: " << *cid << " (hex)\n";
    } else {
        std::cout << "Warning: could not fetch chainId.\n";
    }

    // 3) Build ERC-20 approve calldata: approve(spender, amount)
    std::string approveSelector = "095ea7b3"; // keccak("approve(address,uint256)") first 4 bytes
    std::string approveData = "0x" + approveSelector + pad_to_32bytes(executor) + pad_to_32bytes(amountInHex);
    if (approveData.rfind("0x095ea7b3", 0) != 0 || approveData.size() != 138) {
        std::cerr << "approveData failed: size = " << approveData.size() << " data = " << approveData << "\n";
    }

    // 4) Try allowance via eth_call: allowance(owner, spender)
    std::string allowanceSelector = "dd62ed3e"; // keccak("allowance(address,address)") first 4 bytes
    std::string allowanceData = "0x" + allowanceSelector + pad_to_32bytes(from) + pad_to_32bytes(executor);

    nlohmann::json allowCall = {
        {"jsonrpc", "2.0"},
        {"id", 2001},
        {"method", "eth_call"},
        {"params", nlohmann::json::array({
            {
                {"to", tokenIn},
                {"data", allowanceData}
            },
            "latest"
        })}
    };

    std::optional<std::string> allowResp = rpc_call(url, allowCall);
    if (!allowResp) {
        std::cerr << "allowance: no response\n";
        curl_global_cleanup();
        return 1;
    }
    std::cout << "\n--- allowance raw ---\n" << *allowResp << "\n";

    nlohmann::json allowJson = nlohmann::json::parse(*allowResp);
    std::string allowHex = allowJson.value("result", "0x0");
    uint64_t allowU64 = hex_to_u64(allowHex);
    uint64_t amountInU64 = hex_to_u64(amountInHex);
    std::cout << "allowance(u64) = " << allowU64 << " ; amountIn(u64) = " << amountInU64 << "\n";

    if (allowU64 >= amountInU64) {
        std::cout << "allowance is sufficient.\n";
    } else {
        std::cout << "allowance is insufficient. You must send APPROVE first.\n";
    }

    // 5) Build your swap calldata: swapExactInSingle(tokenIn, tokenOut, fee, amountIn, minOut)
    //    Function selector must match your deployed SwapExecutorV3.
    std::string swapSelector = "43ecfa0a";
    std::string swapData = "0x" + swapSelector
                         + pad_to_32bytes(tokenIn)
                         + pad_to_32bytes(tokenOut)
                         + pad_to_32bytes(feeHex)
                         + pad_to_32bytes(amountInHex)
                         + pad_to_32bytes(minOutHex);

    if (swapData.rfind("0x43ecfa0a", 0) != 0 || swapData.size() != 330) {
        std::cerr << "swap data failed: size = " << swapData.size() << " data = " << swapData << "\n";
    }

    // 6) Prepare TX objects (NO signing here; for public RPC you must sign in the wallet)
    nlohmann::json approveTxObj = {
        {"from",  ensure_hex_0x(from)},
        {"to",    ensure_hex_0x(tokenIn)},
        {"data",  approveData},
        {"value", "0x0"}
    };

    nlohmann::json swapTxObj = {
        {"from",  ensure_hex_0x(from)},
        {"to",    ensure_hex_0x(executor)},
        {"data",  swapData},
        {"value", "0x0"}
    };

    // 7) Optional: ask node for a gas estimate (just informative; wallets will also estimate)
    if (auto g1 = rpc_estimateGas(url, approveTxObj)) {
        std::cout << "approve eth_estimateGas: " << *g1 << "\n";
    } else {
        std::cout << "approve eth_estimateGas: (no response)\n";
    }
    if (auto g2 = rpc_estimateGas(url, swapTxObj)) {
        std::cout << "swap    eth_estimateGas: " << *g2 << "\n";
    } else {
        std::cout << "swap    eth_estimateGas: (no response)\n";
    }

    // 8) Print ready-to-send payloads + browser snippet for MetaMask/Coinbase Wallet
    std::cout << "\n================== COPY BELOW INTO YOUR BROWSER CONSOLE ==================\n";
    std::cout << "/* 1) Approve (only if allowance is insufficient) */\n";
    std::cout << "await ethereum.request({ method: 'eth_requestAccounts' });\n";
    std::cout << "await ethereum.request({ method: 'eth_sendTransaction', params: [\n";
    std::cout << nlohmann::json(approveTxObj).dump(2) << "\n";
    std::cout << "]});\n\n";

    std::cout << "/* 2) Swap (after approve is mined) */\n";
    std::cout << "await ethereum.request({ method: 'eth_sendTransaction', params: [\n";
    std::cout << nlohmann::json(swapTxObj).dump(2) << "\n";
    std::cout << "]});\n";
    std::cout << "==========================================================================\n";

    curl_global_cleanup();
    return 0;
}

// -----------------------------------------------------------------------------
// JSON-RPC helpers
// -----------------------------------------------------------------------------
std::optional<std::string> rpc_call(const std::string& url, const nlohmann::json& j) {
    if (url.empty()) {
        std::cerr << "Error::URL is empty\n";
        return std::nullopt;
    }

    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cerr << "Error::Failed to initialize CURL\n";
        return std::nullopt;
    }

    std::string body = j.dump();
    std::cout << "\n--- SENDING ---\n" << body << "\n--------------\n";
    if (body.empty()) {
        std::cerr << "Error::Request body is empty\n";
        curl_easy_cleanup(curl);
        return std::nullopt;
    }

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    std::string response;
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, body.size());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    // Verbose for debugging
    curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L);
    curl_easy_setopt(curl, CURLOPT_STDERR, stderr);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "Error::" << curl_easy_strerror(res) << "\n";
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        return std::nullopt;
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (response.empty()) {
        std::cerr << "Error::Response is empty\n";
        return std::nullopt;
    }
    return response;
}

static std::optional<std::string> rpc_chainId(const std::string& url) {
    nlohmann::json req = {
        {"jsonrpc","2.0"},
        {"id",1},
        {"method","eth_chainId"},
        {"params", nlohmann::json::array()}
    };
    if (auto raw = rpc_call(url, req)) {
        try {
            nlohmann::json j = nlohmann::json::parse(*raw);
            if (j.contains("result")) return j["result"].get<std::string>();
        } catch (...) {}
    }
    return std::nullopt;
}

static std::optional<std::string> rpc_estimateGas(const std::string& url, const nlohmann::json& callObj) {
    nlohmann::json req = {
        {"jsonrpc","2.0"},
        {"id",42},
        {"method","eth_estimateGas"},
        {"params", nlohmann::json::array({callObj})}
    };
    if (auto raw = rpc_call(url, req)) {
        try {
            nlohmann::json j = nlohmann::json::parse(*raw);
            if (j.contains("result")) return j["result"].get<std::string>();
        } catch (...) {}
    }
    return std::nullopt;
}

// -----------------------------------------------------------------------------
// Receipt polling (kept in case you later switch to programmatic signing)
// -----------------------------------------------------------------------------
nlohmann::json wait_receipt(const std::string& url, const std::string& txhash) {
    for (int i = 0; i < 40; ++i) {
        nlohmann::json req = {
            {"jsonrpc","2.0"},
            {"id", 1000 + i},
            {"method","eth_getTransactionReceipt"},
            {"params", nlohmann::json::array({txhash})}
        };
        std::optional<std::string> raw = rpc_call(url, req);
        if (raw) {
            nlohmann::json resp = nlohmann::json::parse(*raw);
            if (!resp.contains("error") && !resp["result"].is_null()) {
                return resp["result"];
            }
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(300));
    }
    throw std::runtime_error("timeout waiting for receipt");
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
size_t writeCallback(char* ptr, size_t size, size_t nmemb, void* userdata) {
    std::string* out = static_cast<std::string*>(userdata);
    if (!out) {
        std::cerr << "ERROR::Uploaded data pointer is null\n";
        return 0;
    }
    out->append(ptr, size * nmemb);
    return size * nmemb;
}

// Left-pad a hex string (address/uint) to 32 bytes (64 hex chars). Accepts "0x" prefix.
std::string pad_to_32bytes(const std::string& input) {
    std::string hex = input;
    if (hex.rfind("0x", 0) == 0 || hex.rfind("0X", 0) == 0) {
        hex = hex.substr(2);
    }
    // lowercase normalize (optional)
    for (char &c : hex) c = std::tolower(static_cast<unsigned char>(c));
    while (hex.length() < 64) {
        hex = "0" + hex;
    }
    return hex;
}

// Strip 0x if present
static std::string strip0x(std::string s) {
    if (s.rfind("0x", 0) == 0 || s.rfind("0X", 0) == 0) {
        return s.substr(2);
    }
    return s;
}

// Ensure 0x prefix for JSON tx fields
static std::string ensure_hex_0x(std::string s) {
    if (s.rfind("0x", 0) == 0 || s.rfind("0X", 0) == 0) return s;
    return "0x" + s;
}

// Very small hex->u64 (truncates beyond 64 bits; fine for demo amounts)
static uint64_t hex_to_u64(std::string s) {
    s = strip0x(s);
    if (s.size() > 16) {
        s = s.substr(s.size() - 16);
    }
    uint64_t value = 0;
    for (char c : s) {
        value <<= 4;
        if (c >= '0' && c <= '9') value |= (uint64_t)(c - '0');
        else if (c >= 'a' && c <= 'f') value |= (uint64_t)(10 + c - 'a');
        else if (c >= 'A' && c <= 'F') value |= (uint64_t)(10 + c - 'A');
    }
    return value;
}

// Read env or fallback
static std::string env_or(const char* key, const std::string& fallback) {
    const char* v = std::getenv(key);
    if (v && *v) return std::string(v);
    return fallback;
}
