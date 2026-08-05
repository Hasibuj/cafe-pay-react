@echo off
echo Searching for git.exe...
dir /s /b "C:\Users\msi\*.exe" 2>nul | findstr /i "git.exe"
echo ---
where /r "C:\WinRAR" git.exe 2>nul
echo ---
echo Checking winget...
winget list --name Git 2>nul
echo ---
echo Checking scoop...
scoop list git 2>nul
echo ---
echo Done.
