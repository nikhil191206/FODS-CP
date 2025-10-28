@echo off
echo ====================================
echo  PERMANENT MINGW COMPILATION
echo ====================================

echo Checking GCC version...
gcc --version

echo.
echo Compiling Knowledge Graph Search System...
gcc -c main.c -o main.o
gcc -c trie.c -o trie.o
gcc -c hash_table.c -o hash_table.o
gcc -c graph.c -o graph.o
gcc -c queue.c -o queue.o
gcc -c stack.c -o stack.o
gcc -c tokenizer.c -o tokenizer.o

echo Linking...
gcc main.o trie.o hash_table.o graph.o queue.o stack.o tokenizer.o -o search_engine.exe

if exist search_engine.exe (
    echo.
    echo ====================================
    echo  COMPILATION SUCCESSFUL!
    echo ====================================
    echo.
    echo System ready for permanent use!
    echo Run with: search_engine.exe
) else (
    echo.
    echo ====================================
    echo  COMPILATION FAILED
    echo ====================================
    echo Please check TDM-GCC installation.
)

echo.
pause