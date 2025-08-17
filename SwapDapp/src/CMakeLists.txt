cmake_minimum_required(VERSION 3.16)
project(web3_client)
set(CMAKE_CXX_STANDARD 17)

find_package(CURL REQUIRED)
find_package(nlohmann_json 3.2.0 REQUIRED)

add_executable(web3_client main.cpp)
target_link_libraries(web3_client PRIVATE CURL::libcurl nlohmann_json::nlohmann_json)
