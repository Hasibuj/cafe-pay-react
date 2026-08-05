@echo off
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI"
git --version
if %errorlevel% neq 0 (
    echo GIT_STILL_NOT_FOUND
) else (
    echo GIT_OK
)
gh --version
gh auth status
