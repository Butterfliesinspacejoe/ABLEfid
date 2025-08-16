#include <iostream>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <string>
#include <optional>



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
    
    // ...existing code...
    nlohmann::json j = {
        {"jsonrpc", "2.0"},
        {"method", "eth_call"},
        {"params", nlohmann::json::array({
            {
                {"to", "0xB0f3A4aE1fDC1068f9364c5d7b1E42678B66D941"},
                {"data", "0x43ecfa0a00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000000000000000000000000000000000000000000001f400000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000dbba0"}
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