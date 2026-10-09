@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   正在启动 CET通 本地站点...
echo   浏览器访问:  http://localhost:3000
echo   停止服务:    在本窗口按 Ctrl+C
echo.
if not exist "out\index.html" (
  echo   [提示] 还没有构建产物，正在执行 npm run build ...
  call npm run build || goto :error
)
node serve-static.cjs 3000
goto :eof

:error
echo.
echo   构建失败，请检查上面的错误信息。
pause
