#include <iostream>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <string>
#include <optional>

// Helper to pad hex strings to 64 chars(32 bytes)
std::string pad_to_32bytes(const std::string& input) {
    std::string hex = input;
    if(hex.rfind("0x", 0) == 0 || hex.rfind("0X", 0) == 0) {
        hex = hex.substr(2); // Remove "0x" prefix
    }
    while(hex.length() < 64) {
        hex = "0" + hex; // Pad with leading zeros
        return hex;
    }
}

size_t writeCallback(char* ptr, size_t size, size_t nmemb, void* uploadedData){
    std::string* out = static_cast<std::string*>(uploadedData);
    if(!out){
        std::cerr << "ERROR::Uploaded data pointer is null\n";
        return 0;
    }
    out->append(ptr, size * nmemb);

    return size * nmemb; 
}

std::optional<std::string> rpc_call(const std::string& url, nlohmann::json& j){
    if(url.empty()){
        std::cerr << "Error::URL is empty\n";
        return std::nullopt;
    }

    CURL* curl = curl_easy_init();
    if(!curl){
        std::cerr << "Error::Failed to initialize CURL\n";
        return std::nullopt;
    }

    std::string body = j.dump();
    if(body.empty()){
        std::cerr << "Error::Request body is empty\n";
        curl_easy_cleanup(curl);
        return std::nullopt;
    }

    curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");



    std::string response;
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, body.size());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);



    CURLcode res = curl_easy_perform(curl);
    if(res != CURLE_OK){
        std::cerr << "Error::" << curl_easy_strerror(res) << "\n";
        curl_easy_cleanup(curl);
        return std::nullopt;
    }


    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);

    if(response.empty()){
        std::cerr << "Error::Response is empty\n";
        return std::nullopt;
    }

    return response;
}


int main() {

    curl_global_init(CURL_GLOBAL_DEFAULT);
    std::string url = "http://localhost:8545";
    if(url.empty()){
        std::cerr << "Error::URL is empty\n";
        curl_global_cleanup();
        return 1;
    }

    std::string tokenIn = "0xd5660525C2378294bfe3b8197f714CcBFD6654bb";
    std::string tokenOut = "0x6D490044dC1CA783A22cE1eEb1E4443fa16A961c";
    std::string amountIn = "0x1f4"; // 500 in hex

    // Function selector for getAmountsOut(uint256, address, address)
    std::string selector = "43ecfa0a";

    std::string amountInPadded = pad_to_32bytes(amountIn);
    std::string tokenInPadded = pad_to_32bytes(tokenIn);
    std::string tokenOutPadded = pad_to_32bytes(tokenOut);

    if(amountInPadded.empty() || tokenInPadded.empty() || tokenOutPadded.empty()){
        std::cerr << "Error::Failed to pad input values\n";
        curl_global_cleanup();
        return 1;
    }

    std::string data = "0x" + selector + amountInPadded + tokenInPadded + tokenOutPadded;
    
    nlohmann::json j = {
        {"jsonrpc", "2.0"},
        {"method", "eth_call"},
        {"params", nlohmann::json::array({
            {
                {"to", "0xB0f3A4aE1fDC1068f9364c5d7b1E42678B66D941"},
                {"data", data}
            },
            "latest"
        })},
        {"id", 1}
    };


    std::optional<std::string> response = rpc_call(url, j);
    if(!response){
        std::cerr << "Error::Failed to get a valid response\n";
        curl_global_cleanup();
        return 1;
    }
    
    std::cout << "Response: " << *response << "\n";






    curl_global_cleanup();
    return 0;

    
    
}
