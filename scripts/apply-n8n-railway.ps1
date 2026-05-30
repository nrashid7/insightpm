# BusinessVoice AI - Apply n8n Railway config and test webhooks
$ErrorActionPreference = "Continue"
$Base = "https://n8n-production-08c9.up.railway.app"

Write-Host ""
Write-Host "=== BusinessVoice n8n Railway Setup ===" -ForegroundColor Cyan
Write-Host "Instance: $Base"
Write-Host ""

Write-Host "1. Checking n8n instance..." -ForegroundColor Yellow
try {
  $health = Invoke-WebRequest -Uri "$Base/healthz" -UseBasicParsing -TimeoutSec 15
  Write-Host "   healthz: $($health.StatusCode)" -ForegroundColor Green
} catch {
  try {
    $root = Invoke-WebRequest -Uri "$Base/" -UseBasicParsing -TimeoutSec 15
    Write-Host "   root: $($root.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Host "   Could not reach instance: $($_.Exception.Message)" -ForegroundColor Red
  }
}

$webhooks = @(
  @{ Name = "Call Completed Router"; Path = "call-completed" },
  @{ Name = "SMS Follow-Up"; Path = "sms-follow-up" },
  @{ Name = "HubSpot Sync"; Path = "hubspot-sync" },
  @{ Name = "GoHighLevel Sync"; Path = "ghl-sync" },
  @{ Name = "Google Sheets Log"; Path = "sheets-log" }
)

Write-Host ""
Write-Host "2. Testing webhook endpoints..." -ForegroundColor Yellow
$payload = @{
  event = "test.ping"
  business_id = "00000000-0000-0000-0000-000000000001"
  metadata = @{ source = "apply-n8n-railway.ps1" }
} | ConvertTo-Json -Depth 5

foreach ($wh in $webhooks) {
  $url = "$Base/webhook/$($wh.Path)"
  try {
    $r = Invoke-WebRequest -Uri $url -Method POST -Body $payload -ContentType "application/json" -UseBasicParsing -TimeoutSec 20
    Write-Host "   [OK $($r.StatusCode)] $($wh.Name)" -ForegroundColor Green
  } catch {
    $code = 0
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
    }
    if ($code -eq 404) {
      Write-Host "   [404] $($wh.Name) - workflow not active or path mismatch" -ForegroundColor Red
    } elseif ($code -eq 500) {
      Write-Host "   [500] $($wh.Name) - workflow exists but errored (check n8n executions)" -ForegroundColor Yellow
    } else {
      Write-Host "   [$code] $($wh.Name) - $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

Write-Host ""
Write-Host "3. Supabase: run scripts/sync-n8n-workflows.sql in SQL Editor" -ForegroundColor Yellow
Write-Host "4. Set secrets in Supabase Edge Functions (see .env.example)" -ForegroundColor Yellow
Write-Host "5. Local env: apps/web/.env.local - add Supabase keys and N8N_WEBHOOK_SECRET" -ForegroundColor Yellow
Write-Host ""
