@echo off
setlocal

if defined CODEX_MCP_NODE_PATH if exist "%CODEX_MCP_NODE_PATH%" goto bundled

where node.exe >nul 2>nul
if errorlevel 1 (
    echo Starte die Vorschau im Codex-Terminal oder installiere Node.js.
    exit /b 1
)

node.exe "%~dp0.preview\server.cjs" %*
exit /b %errorlevel%

:bundled
"%CODEX_MCP_NODE_PATH%" "%~dp0.preview\server.cjs" %*
exit /b %errorlevel%
