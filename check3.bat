@echo off
dir /s /b "C:\Progra~1\GitHub CLI"
echo ---
dir /s /b "C:\Progra~1\GitHub CLI" 2>nul | findstr /i "git"
echo ---
echo Checking for embedded git in gh...
