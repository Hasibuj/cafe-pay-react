@echo off
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files (x86)\Git\cmd;C:\Users\msi\AppData\Local\Programs\Git\cmd;C:\Program Files\GitHub CLI"
git --version
gh --version
gh auth status
