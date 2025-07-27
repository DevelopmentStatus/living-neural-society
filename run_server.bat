@echo off
echo Starting Living Neural Society Development Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install npm or check your Node.js installation
    pause
    exit /b 1
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
    echo.
)

REM Start the development server
echo Starting development server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
npm run dev

REM If the server exits, pause to show any error messages
if %errorlevel% neq 0 (
    echo.
    echo Server stopped with an error (exit code: %errorlevel%)
    pause
) else (
    echo.
    echo Server stopped normally
    pause
) 