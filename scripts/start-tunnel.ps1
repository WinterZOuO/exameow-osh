#Requires -Version 5.1
<#
.SYNOPSIS
    起 exameow（server + build 好嘅前端），再開條 Cloudflare quick tunnel 穿出公網。

.DESCRIPTION
    一個掣搞掂本機試機：查工具 -> build -> 起 server -> 開 tunnel -> 印公網網址。
    Ctrl+C 兩個 process 一齊收。

    密碼／key 生成一次就存喺 %LOCALAPPDATA%\exameow-osh\secrets\local.env，之後每次沿用
    —— MASTER_KEY 一換，DB 入面加密咗嘅 LLM API key 就永遠解唔返。

    特登同 DB（...\exameow-osh\data\）分開兩個資料夾：備份 data 嗰陣唔會順手抄埋條 key，
    DB 單獨洩漏都解唔開啲 key。同 docker-compose.prod.yml 個註解同一個原則。

.PARAMETER Port
    Server 聽邊個 port，預設 3020。特登唔用 3000，等你可以同時行返 docker 嗰個 instance。

.PARAMETER SkipBuild
    唔 build，直接用現有嘅 target\release\exameow-server.exe 同 frontend\dist。

.PARAMETER NoTunnel
    淨係起 server，唔開 tunnel。

.PARAMETER AllowPlainHttp
    設 COOKIE_SECURE=0。淨係你要用 LAN IP（http://192.168.x.x:PORT）喺手機開嗰陣先要 ——
    session cookie 預設帶 Secure，瀏覽器喺 localhost 以外嘅 http origin 會靜靜雞丟咗佢，
    表現係「登入好似成功，一 refresh 就彈返出去」，唔會有錯誤訊息。
    開 tunnel 就唔好用（tunnel 本身係 HTTPS，冇呢個問題）。

.EXAMPLE
    .\scripts\start-tunnel.ps1

.EXAMPLE
    .\scripts\start-tunnel.ps1 -SkipBuild

.EXAMPLE
    .\scripts\start-tunnel.ps1 -NoTunnel -AllowPlainHttp
#>
[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 3020,
    [switch]$SkipBuild,
    [switch]$NoTunnel,
    [switch]$AllowPlainHttp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot   = Split-Path -Parent $PSScriptRoot
$StateRoot  = Join-Path $env:LOCALAPPDATA 'exameow-osh'
$DataDir    = Join-Path $StateRoot 'data'
$SecretDir  = Join-Path $StateRoot 'secrets'
$SecretFile = Join-Path $SecretDir 'local.env'
$ServerExe  = Join-Path $RepoRoot 'target\release\exameow-server.exe'
$StaticDir  = Join-Path $RepoRoot 'frontend\dist'

$ServerOut  = Join-Path $DataDir 'server.out.log'
$ServerErr  = Join-Path $DataDir 'server.err.log'
$TunnelOut  = Join-Path $DataDir 'tunnel.out.log'
$TunnelErr  = Join-Path $DataDir 'tunnel.err.log'

# ---------------------------------------------------------------- 細嘢

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Note($msg) { Write-Host "    $msg" -ForegroundColor DarkGray }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[X] $msg" -ForegroundColor Red; exit 1 }

function Get-Tool([string]$name, [string[]]$fallbackPaths) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in $fallbackPaths) { if (Test-Path -LiteralPath $p) { return $p } }
    return $null
}

function New-RandomBytes([int]$n) {
    $b = New-Object byte[] $n
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($b) } finally { $rng.Dispose() }
    return $b
}

function New-HexKey([int]$bytes) {
    ((New-RandomBytes $bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
}

# 冇 l/1/I/0/O：條密碼要你親手讀出嚟交俾對方，唔好搞到人分唔清
function New-Passphrase([int]$len) {
    $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $limit = 256 - (256 % $alphabet.Length)   # 大過呢個就重抽，直接 modulo 落去啲字母會偏
    $out = New-Object System.Text.StringBuilder
    while ($out.Length -lt $len) {
        foreach ($v in (New-RandomBytes ($len * 2))) {
            if ($v -ge $limit) { continue }
            [void]$out.Append($alphabet[$v % $alphabet.Length])
            if ($out.Length -ge $len) { break }
        }
    }
    $out.ToString()
}

function Test-PortOpen([int]$p) {
    $c = New-Object System.Net.Sockets.TcpClient
    try {
        $ar = $c.BeginConnect('127.0.0.1', $p, $null, $null)
        if (-not $ar.AsyncWaitHandle.WaitOne(300)) { return $false }
        $c.EndConnect($ar)
        return $true
    } catch {
        return $false
    } finally {
        $c.Close()
    }
}

# 個 log file 俾緊 child process 揸住寫，Get-Content 會撞鎖 —— 自己開個 ReadWrite share
function Read-SharedText([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return '' }
    try {
        $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open,
                                     [System.IO.FileAccess]::Read,
                                     [System.IO.FileShare]::ReadWrite)
        try {
            $sr = New-Object System.IO.StreamReader($fs)
            try { return $sr.ReadToEnd() } finally { $sr.Dispose() }
        } finally { $fs.Dispose() }
    } catch { return '' }
}

# `Start-Process -PassThru` 攞返嚟嗰個 Process object 唔一定拎得到 ExitCode
# （PowerShell 冇留住個 handle），所以攞唔到就照講，唔好印個空白出嚟嚇人。
function Get-ExitText($p) {
    try {
        [void]$p.WaitForExit(1000)
        $c = $p.ExitCode
        if ($null -ne $c) { return "exit code $c" }
    } catch { }
    return 'exit code 攞唔到'
}

function Stop-Child($p) {
    if ($null -eq $p) { return }
    try { if ($p.HasExited) { return } } catch { return }
    try { $p.Kill(); [void]$p.WaitForExit(5000) } catch { }
}

# `$env:X = ...` 係 process 級，會漏返出你個 shell。開完即刻還原 —— child launch 嗰刻
# 已經抄咗份 env，之後點改都唔關佢事。
function Start-WithEnv {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [hashtable]$EnvVars,
        [string]$OutLog,
        [string]$ErrLog,
        [string]$WorkDir
    )
    $saved = @{}
    foreach ($k in $EnvVars.Keys) {
        $saved[$k] = [Environment]::GetEnvironmentVariable($k, 'Process')
        [Environment]::SetEnvironmentVariable($k, $EnvVars[$k], 'Process')
    }
    try {
        $sp = @{
            FilePath               = $FilePath
            PassThru               = $true
            NoNewWindow            = $true
            RedirectStandardOutput = $OutLog
            RedirectStandardError  = $ErrLog
            WorkingDirectory       = $WorkDir
        }
        if ($Arguments -and $Arguments.Count -gt 0) { $sp['ArgumentList'] = $Arguments }
        return Start-Process @sp
    } finally {
        foreach ($k in $EnvVars.Keys) {
            [Environment]::SetEnvironmentVariable($k, $saved[$k], 'Process')
        }
    }
}

function Get-LocalSecrets {
    New-Item -ItemType Directory -Force -Path $SecretDir | Out-Null
    if (-not (Test-Path -LiteralPath $SecretFile)) {
        Write-Step '第一次行：生成 MASTER_KEY / ADMIN_PASSWORD / ADMIN_TOKEN'
        $lines = @(
            '# exameow-osh 本機試機用。唔好 commit，唔好同 data\ 一齊備份。',
            '# MASTER_KEY 一換，DB 入面加密咗嘅 LLM API key 就解唔返（用戶重新填過就得）。',
            '# ADMIN_PASSWORD 淨係第一次開個空 DB 嗰陣生效，之後改呢度冇用。',
            "MASTER_KEY=$(New-HexKey 32)",
            "ADMIN_PASSWORD=$(New-Passphrase 24)",
            "ADMIN_TOKEN=$(New-Passphrase 32)"
        )
        Set-Content -LiteralPath $SecretFile -Value $lines -Encoding UTF8
        # 學返 config/store.rs 個 0600
        try { icacls $SecretFile /inheritance:r /grant:r "${env:USERNAME}:(R,W)" | Out-Null } catch { }
        Write-Note "存咗喺 $SecretFile"
    }

    $secrets = @{}
    foreach ($line in (Get-Content -LiteralPath $SecretFile)) {
        if ($line -match '^\s*#') { continue }
        if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $secrets[$Matches[1]] = $Matches[2].Trim() }
    }
    foreach ($k in @('MASTER_KEY', 'ADMIN_PASSWORD', 'ADMIN_TOKEN')) {
        if (-not $secrets.ContainsKey($k) -or -not $secrets[$k]) {
            Fail "$SecretFile 入面冇 $k。刪咗個 file 再行一次就會重新生成（但舊 DB 啲 API key 會解唔返）。"
        }
    }
    return $secrets
}

function Wait-ForShutdown($watched) {
    $interactive = $true
    try { $null = [Console]::KeyAvailable } catch { $interactive = $false }
    if (-not $interactive) { Write-Note '（唔係互動 console，Ctrl+C 收唔到；要用 taskkill 收）' }
    if ($interactive) { [Console]::TreatControlCAsInput = $true }
    try {
        while ($true) {
            foreach ($w in $watched) {
                if ($w.Process.HasExited) {
                    Write-Host ''
                    Write-Warn "$($w.Name) 自己收咗（$(Get-ExitText $w.Process)）。睇下 $($w.Log)"
                    return
                }
            }
            if ($interactive -and [Console]::KeyAvailable) {
                $k = [Console]::ReadKey($true)
                if ($k.Key -eq 'C' -and ($k.Modifiers -band [ConsoleModifiers]::Control)) {
                    Write-Host ''
                    return
                }
            }
            Start-Sleep -Milliseconds 250
        }
    } finally {
        if ($interactive) { [Console]::TreatControlCAsInput = $false }
    }
}

# ---------------------------------------------------------------- 開波

Write-Host ''
Write-Host '  exameow-osh  --  本機 + Cloudflare tunnel' -ForegroundColor White
Write-Host ''

$cloudflared = $null
if (-not $NoTunnel) {
    $cloudflared = Get-Tool 'cloudflared' @(
        'C:\Program Files (x86)\cloudflared\cloudflared.exe',
        'C:\Program Files\cloudflared\cloudflared.exe'
    )
    if (-not $cloudflared) {
        Fail '揾唔到 cloudflared。裝：winget install --id Cloudflare.cloudflared （或者加 -NoTunnel 淨係起 server）'
    }
}

if (-not $SkipBuild) {
    if (-not (Get-Tool 'cargo' @())) { Fail '揾唔到 cargo。裝 Rust: https://rustup.rs' }
    if (-not (Get-Tool 'pnpm'  @())) { Fail '揾唔到 pnpm。裝: npm i -g pnpm' }
}

if (Test-PortOpen $Port) {
    Fail "Port $Port 已經有嘢聽緊。收咗佢，或者行 -Port <第二個 port>。"
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

if (-not $SkipBuild) {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'frontend\node_modules'))) {
        Write-Step 'pnpm install'
        Push-Location $RepoRoot
        try { & pnpm install; if ($LASTEXITCODE -ne 0) { Fail 'pnpm install 失敗' } } finally { Pop-Location }
    }

    Write-Step '前端 build（順手行埋 vue-tsc type-check）'
    Push-Location (Join-Path $RepoRoot 'frontend')
    try { & pnpm build; if ($LASTEXITCODE -ne 0) { Fail '前端 build 失敗' } } finally { Pop-Location }

    Write-Step 'cargo build --release -p exameow-server（第一次會慢）'
    Push-Location $RepoRoot
    try { & cargo build --release -p exameow-server; if ($LASTEXITCODE -ne 0) { Fail 'cargo build 失敗' } } finally { Pop-Location }
}

if (-not (Test-Path -LiteralPath $ServerExe)) {
    Fail "揾唔到 $ServerExe。唔好用 -SkipBuild，或者自己行 cargo build --release -p exameow-server。"
}
if (-not (Test-Path -LiteralPath (Join-Path $StaticDir 'index.html'))) {
    Fail "揾唔到 $StaticDir\index.html。唔好用 -SkipBuild，或者喺 frontend 行 pnpm build。"
}

$secrets = Get-LocalSecrets

$serverEnv = @{
    PORT             = "$Port"
    EXAM_DB_PATH     = (Join-Path $DataDir 'exameow.db')
    ADMIN_TOKEN_FILE = (Join-Path $DataDir 'admin_token.txt')
    STATIC_DIR       = $StaticDir
    MASTER_KEY       = $secrets['MASTER_KEY']
    ADMIN_PASSWORD   = $secrets['ADMIN_PASSWORD']
    ADMIN_TOKEN      = $secrets['ADMIN_TOKEN']
    RUST_LOG         = 'info'
}
if ($AllowPlainHttp) { $serverEnv['COOKIE_SECURE'] = '0' }

$server = $null
$tunnel = $null
try {
    Write-Step "起 server（port $Port）"
    $server = Start-WithEnv -FilePath $ServerExe -EnvVars $serverEnv `
                            -OutLog $ServerOut -ErrLog $ServerErr -WorkDir $RepoRoot

    $deadline = (Get-Date).AddSeconds(30)
    while (-not (Test-PortOpen $Port)) {
        if ($server.HasExited) {
            Write-Host (Read-SharedText $ServerErr)
            Fail "server 一開就死咗（$(Get-ExitText $server)）"
        }
        if ((Get-Date) -gt $deadline) { Fail "等咗 30 秒 server 都未聽 $Port。睇下 $ServerErr" }
        Start-Sleep -Milliseconds 300
    }
    Write-Note "PID $($server.Id)"

    $publicUrl = $null
    if (-not $NoTunnel) {
        Write-Step '開 Cloudflare quick tunnel'
        $tunnel = Start-WithEnv -FilePath $cloudflared `
                                -Arguments @('tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$Port") `
                                -EnvVars @{} -OutLog $TunnelOut -ErrLog $TunnelErr -WorkDir $DataDir

        $deadline = (Get-Date).AddSeconds(45)
        while ($true) {
            $text = (Read-SharedText $TunnelErr) + (Read-SharedText $TunnelOut)
            $m = [regex]::Match($text, 'https://[a-z0-9-]+\.trycloudflare\.com')
            if ($m.Success) { $publicUrl = $m.Value; break }
            if ($tunnel.HasExited) {
                Write-Warn "cloudflared 死咗（$(Get-ExitText $tunnel)）。睇下 $TunnelErr"
                break
            }
            if ((Get-Date) -gt $deadline) {
                Write-Warn "等咗 45 秒都攞唔到條網址。tunnel 仲行緊，自己開 $TunnelErr 睇。"
                break
            }
            Start-Sleep -Milliseconds 500
        }
        if ($publicUrl) {
            Write-Note "PID $($tunnel.Id)"
            try { Set-Clipboard -Value $publicUrl } catch { }
        }
    }

    Write-Host ''
    Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkGray
    if ($publicUrl) {
        Write-Host '  公網    ' -NoNewline -ForegroundColor DarkGray
        Write-Host $publicUrl -ForegroundColor Green -NoNewline
        Write-Host '  (已 copy)' -ForegroundColor DarkGray
    }
    Write-Host '  本機    ' -NoNewline -ForegroundColor DarkGray
    Write-Host "http://127.0.0.1:$Port" -ForegroundColor Green
    Write-Host '  帳號    ' -NoNewline -ForegroundColor DarkGray
    Write-Host "admin / $($secrets['ADMIN_PASSWORD'])" -ForegroundColor Green
    Write-Host '  DB      ' -NoNewline -ForegroundColor DarkGray
    Write-Host $serverEnv['EXAM_DB_PATH']
    Write-Host '  Log     ' -NoNewline -ForegroundColor DarkGray
    Write-Host $DataDir
    Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host ''
    Write-Note '個密碼淨係第一次開個空 DB 嗰陣種落去；DB 已經有 admin 嘅話要用返你自己嗰個。'
    if ($publicUrl) {
        Write-Warn '條 URL 冇任何額外保護 —— 知道嘅人都撳到個登入頁（有節流，但都係試完即收好啲）。'
        Write-Note 'Quick tunnel 每次開都係新網址，唔會保留。'
    }
    if ($AllowPlainHttp) {
        Write-Warn 'COOKIE_SECURE=0：session cookie 冇咗 Secure，會喺明文 http 上裸行。'
    }
    Write-Host ''
    Write-Host '  Ctrl+C 收檔' -ForegroundColor White
    Write-Host ''

    $watched = @(@{ Name = 'server'; Process = $server; Log = $ServerErr })
    if ($tunnel) { $watched += @{ Name = 'cloudflared'; Process = $tunnel; Log = $TunnelErr } }
    Wait-ForShutdown $watched
} finally {
    Write-Step '收檔'
    Stop-Child $tunnel
    Stop-Child $server
    Write-Note '兩個都收咗。'
}
