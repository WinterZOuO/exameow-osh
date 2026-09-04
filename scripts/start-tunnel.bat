@echo off
rem PowerShell 5.1 default ExecutionPolicy blocks .ps1 -- go through this wrapper instead.
rem Double-click me, or: scripts\start-tunnel.bat -SkipBuild
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tunnel.ps1" %*
