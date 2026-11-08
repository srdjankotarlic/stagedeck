@echo off
setlocal
cd /d "%~dp0"
set "STAGEDECK_VERIFY_EXE=%~dp0..\..\StageDeck.exe"
if not exist "%STAGEDECK_VERIFY_EXE%" (
  echo Pokrenite ovu proveru iz instaliranog StageDeck resources\validation foldera.
  pause
  exit /b 1
)
echo Provera pokrece test prezentaciju u zasebnoj biblioteci.
echo Privremeno ce koristiti prikljucene monitore. Zatvorite aktivne projekcije.
pause
set "ELECTRON_RUN_AS_NODE=1"
"%STAGEDECK_VERIFY_EXE%" "%~dp0verify-desktop.cjs" "%STAGEDECK_VERIFY_EXE%" "%~dp0fixtures\01 Otvaranje.pptx"
set "STAGEDECK_VERIFY_RESULT=%errorlevel%"
echo.
echo Izvestaj je sacuvan na Desktopu kao StageDeck-provera-*.json.
pause
exit /b %STAGEDECK_VERIFY_RESULT%
