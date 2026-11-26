@echo off
setlocal
cd /d "%~dp0"

for /f %%P in ('powershell -NoProfile -Command "$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0); $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop(); $port"') do set "PORT=%%P"
if not defined PORT (
  echo No se pudo encontrar un puerto disponible para iniciar la aplicacion.
  pause
  exit /b 1
)

echo Abriendo NeweN en http://127.0.0.1:%PORT%/index.html
echo Deja esta ventana abierta mientras uses la aplicacion.
start "" powershell -NoProfile -WindowStyle Hidden -Command "$url = 'http://127.0.0.1:%PORT%/index.html'; for ($i = 0; $i -lt 80; $i++) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if ($response.StatusCode -eq 200 -and $response.Content.Contains('NeweN')) { Start-Process $url; exit 0 } } catch { }; Start-Sleep -Milliseconds 250 }; Write-Error 'No se pudo abrir la aplicacion desde el servidor local.'"

where py >nul 2>nul
if not errorlevel 1 (
  py -m http.server %PORT% --bind 127.0.0.1
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo No se encontro Python. Instala Python y vuelve a intentarlo.
    pause
    exit /b 1
  )
  python -m http.server %PORT% --bind 127.0.0.1
)
