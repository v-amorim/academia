set windows-shell := ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

port := "8765"

# Serve the app over HTTP with caching off, so an edit shows on the next reload. Ctrl+C stops it.
serve:
    npx --yes http-server -p {{port}} -c-1

# Serve in the background and open the app in the default browser.
open:
    Start-Process -WindowStyle Hidden npx.cmd -ArgumentList "--yes","http-server","-p","{{port}}","-c-1","-s"
    Start-Sleep -Seconds 2
    Start-Process "http://127.0.0.1:{{port}}/"

# Stop whatever is listening on the port.
stop:
    Get-NetTCPConnection -LocalPort {{port}} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; "stopped"

# Run the whole suite, or one case: just verify carga
verify case="":
    node verify.mjs {{case}}
