@echo off
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI"
cd /d C:\cafepay\cafe-pay-react

echo ============================================
echo STEP 1: Create .gitignore if needed
echo ============================================
if not exist .gitignore (
    echo node_modules/ > .gitignore
    echo dist/ >> .gitignore
    echo .env >> .gitignore
    echo *.local >> .gitignore
    echo check_tools.bat >> .gitignore
    echo find_git.bat >> .gitignore
    echo find_git2.bat >> .gitignore
    echo check2.bat >> .gitignore
    echo check3.bat >> .gitignore
    echo check4.bat >> .gitignore
    echo push_to_github.bat >> .gitignore
    echo .gitignore created.
) else (
    echo .gitignore already exists.
)

echo.
echo ============================================
echo STEP 2: Stage all files
echo ============================================
git add -A
git status

echo.
echo ============================================
echo STEP 3: Create initial commit
echo ============================================
git commit -m "feat: CafePay React - Decentralized Restaurant Directory

- React + Vite + Tailwind CSS v4 frontend
- Wagmi + Viem for Web3 wallet integration (EIP-6963)
- Lucide React icons replacing all emojis
- Light/dark theme with CSS custom properties
- Functional components with React hooks
- Owner dashboard, menu management, USDC payments
- Accessible UI with ARIA labels and keyboard navigation"

if %errorlevel% neq 0 (
    echo ERROR: Commit failed.
    exit /b 1
)
echo Commit created successfully.

echo.
echo ============================================
echo STEP 4: Create GitHub repo and push
echo ============================================
gh repo create cafe-pay-react --public --source=. --remote=origin --push 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Failed to create repo or push.
    exit /b 1
)

echo.
echo ============================================
echo STEP 5: Final verification
echo ============================================
echo Remote URL:
git remote -v
echo.
echo Branch:
git branch --show-current
echo.
echo Latest commit:
git log --oneline -1
echo.
echo Repo URL:
gh repo view --web=false --json url -q .url
echo.
echo ============================================
echo SUCCESS - Repository pushed to GitHub!
echo ============================================
