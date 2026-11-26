# =============================================================================
#  Open Windows Firewall so other devices on the SAME local network can reach
#  the Asset Management System at  http://<this-PC-IP>:3000
#
#  MUST run as Administrator:
#      Right-click PowerShell > "Run as administrator", then:
#      powershell -ExecutionPolicy Bypass -File D:\AssetManagementSystem\scripts\open-firewall.ps1
#
#  What it opens (and what it does NOT):
#    - Opens ONLY TCP port 3000 (the web app). The web app forwards /api
#      requests internally to the backend, so port 3001 (API) and 5432
#      (PostgreSQL) stay closed to the network.
#    - Only devices in the local subnet (e.g. 192.168.0.x) are allowed.
#      Devices outside your local network are still blocked.
#
#  To undo:
#      Remove-NetFirewallRule -DisplayName 'AssetManagementSystem Web (3000)'
# =============================================================================

# Stop immediately on any error instead of printing a success message.
$ErrorActionPreference = 'Stop'

$ruleName = 'AssetManagementSystem Web (3000)'

# Remove an older copy of the rule first, so running the script twice does
# not create duplicate rules.
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule

New-NetFirewallRule `
    -DisplayName $ruleName `
    -Description 'Allow LAN devices to open the Asset Management System web app' `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 3000 `
    -RemoteAddress LocalSubnet `
    -Profile Any | Out-Null
    # -Direction Inbound      : connections coming INTO this PC
    # -LocalPort 3000         : only the web app port
    # -RemoteAddress LocalSubnet : only devices on the same local network
    # -Profile Any            : applies whether Windows calls this network
    #                           Public or Private (yours is currently Public)

Write-Host "Firewall rule '$ruleName' created." -ForegroundColor Green

# Show this PC's local IPv4 addresses, so you know what to type on the
# other device. Loopback (127.x) and auto-config (169.254.x) are skipped.
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
    ForEach-Object { Write-Host ("Open from another device: http://{0}:3000" -f $_.IPAddress) }

# Keep the window open when launched by double-click / elevation prompt.
Read-Host 'Press Enter to close'
