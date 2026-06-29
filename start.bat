@echo off
echo ========================================
echo   习思想题库 - 本地启动
echo ========================================
echo.
echo 正在启动 HTTP 服务器...

:: Try Python first
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python server.py
    goto :end
)

:: Try npx serve
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo 使用 npx serve 启动...
    npx serve . -p 8080
    goto :end
)

:: Neither available
echo [错误] 未找到 Python 或 Node.js
echo 请安装 Python 或 Node.js 后重试
echo.
echo Python: https://www.python.org/downloads/
echo Node.js: https://nodejs.org/

:end
pause
