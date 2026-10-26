cmake_minimum_required(VERSION 3.22.1)
project(arshxpty C)

add_library(ptyjni SHARED ptyjni.c)

find_library(android-log log)

target_link_libraries(ptyjni PRIVATE ${android-log})

target_compile_options(ptyjni PRIVATE
    -Wall
    -Wextra
)

set_target_properties(ptyjni PROPERTIES
    C_STANDARD 11
    C_STANDARD_REQUIRED ON
)
