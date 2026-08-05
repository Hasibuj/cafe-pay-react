@echo off
set "PATH=%PATH%;C:\Program Files\GitHub CLI"
where git 2>nul
if %errorlevel% equ 0 (
    git --version
    goto :found
)
where /r "C:\Program Files" git.exe 2>nul
if %errorlevel% equ 0 (
    goto :found
)
where /r "C:\Users\msi\AppData\Local\Programs" git.exe 2>nul
if %errorlevel% equ 0 (
    goto :found
)
where /r "C:\Users\msi" git.exe 2>nul
if %errorlevel% equ 0 (
    goto :found
)
echo GIT_NOT_FOUND
goto :eof
:found
echo GIT_FOUND
git --version
