@echo off
echo Instalando ScrumFlow con node-windows...

:: Install node-windows if not installed
npm install

:: Build the application
npm run build

:: Install service using node-windows
node install-service.js

echo.
echo ✅ Instalación completada!
echo 📍 Accede a: http://localhost:3008
echo.
timeout /t 3
start http://localhost:3008
