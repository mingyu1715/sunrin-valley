# Native Windows smoke test for the fixed, bundled launcher update helper.
# Runs only against temporary fake launcher trees; no installer or game data is used.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$helper = Join-Path $repo 'launcher\build\launcher-update-helper.ps1'
$logs = Join-Path ([IO.Path]::GetTempPath()) 'sunrin-updater-verification-logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$tokens = $null; $parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($helper, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count -ne 0) { throw "PowerShell helper parse errors: $($parseErrors | Out-String)" }

function Assert([bool]$condition, [string]$message) { if (!$condition) { throw $message } }
function Write-Json([string]$path, $value) {
  $value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding UTF8
}
function Start-HiddenPowerShell([string]$arguments) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $psi.Arguments = $arguments
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  return [Diagnostics.Process]::Start($psi)
}
function Wait-File([string]$path, [int]$seconds) {
  $deadline = [DateTime]::UtcNow.AddSeconds($seconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-Path -LiteralPath $path -PathType Leaf) { return $true }
    Start-Sleep -Milliseconds 100
  }
  return $false
}
function Compile-FakeLauncher([string]$output, [string]$transactionPath, [string]$healthVersion, [string]$className) {
  $source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
public static class __CLASS__ {
  private static string Escape(string value) { return value.Replace("\\", "\\\\").Replace("\"", "\\\""); }
  public static void Main(string[] args) {
    if (args.Length != 2 || args[0] != "--launcher-update-token") return;
    string body = "{\"nonce\":\"" + Escape(args[1]) + "\",\"version\":\"__VERSION__\",\"executablePath\":\"" + Escape(Process.GetCurrentProcess().MainModule.FileName) + "\",\"pid\":" + Process.GetCurrentProcess().Id + "}";
    File.WriteAllText(Path.Combine(@"__TRANSACTION_PATH__", "healthy.json"), body);
    Thread.Sleep(1500);
  }
}
'@
  $source = $source.Replace('__CLASS__', $className).Replace('__VERSION__', $healthVersion).Replace('__TRANSACTION_PATH__', $transactionPath)
  Add-Type -TypeDefinition $source -OutputAssembly $output -OutputType ConsoleApplication
}
function Run-Case([string]$label, [string]$healthVersion, [bool]$expectSuccess) {
  $fixture = Join-Path ([IO.Path]::GetTempPath()) ("sunrin-updater-native-" + [Guid]::NewGuid().ToString('N'))
  $app = Join-Path $fixture 'app'
  $root = Join-Path $fixture 'user-data'
  $id = [Guid]::NewGuid().ToString('D')
  $transaction = Join-Path $root ("launcher-updates\transactions\" + $id)
  $candidate = Join-Path $transaction 'candidate'
  $backup = Join-Path $transaction 'backup'
  $executable = Join-Path $app 'Sunrin Valley.exe'
  $helperCopy = Join-Path $transaction 'launcher-update-helper.ps1'
  $transactionFile = Join-Path $transaction 'transaction.json'
  $assetPath = Join-Path $root 'launcher-updates\downloads\fixture-update.zip'
  $parent = $null; $worker = $null
  try {
    $directories = @((Join-Path $app 'resources'), (Join-Path $app 'unknown-game'), (Join-Path $candidate 'resources'), $transaction, (Split-Path -Parent $assetPath))
    New-Item -ItemType Directory -Force -Path $directories | Out-Null
    Set-Content -LiteralPath (Join-Path $app 'obsolete.txt') -Value 'old managed' -NoNewline
    Set-Content -LiteralPath (Join-Path $app 'new.txt') -Value 'old managed' -NoNewline
    Set-Content -LiteralPath (Join-Path $app 'unknown-game\world.dat') -Value 'player world' -NoNewline
    Set-Content -LiteralPath (Join-Path $root 'accounts.json') -Value 'player account' -NoNewline
    Set-Content -LiteralPath (Join-Path $candidate 'new.txt') -Value 'new managed' -NoNewline
    Set-Content -LiteralPath $assetPath -Value 'fake downloaded ZIP, never executed' -NoNewline
    $assetHash = (Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $assetSize = (Get-Item -LiteralPath $assetPath).Length
    $oldFiles = @('Sunrin Valley.exe', 'resources/launcher-files.json', 'obsolete.txt', 'new.txt')
    $newFiles = @('Sunrin Valley.exe', 'resources/launcher-files.json', 'new.txt')
    Write-Json (Join-Path $app 'resources\launcher-files.json') @{ formatVersion=1; files=$oldFiles }
    Write-Json (Join-Path $candidate 'resources\launcher-files.json') @{ formatVersion=1; files=$newFiles }
    Compile-FakeLauncher $executable $transaction '1.1.0' ("FakeOld" + $id.Replace('-', ''))
    Compile-FakeLauncher (Join-Path $candidate 'Sunrin Valley.exe') $transaction $healthVersion ("FakeNew" + $id.Replace('-', ''))
    $oldHash = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash
    $newHash = (Get-FileHash -LiteralPath (Join-Path $candidate 'Sunrin Valley.exe') -Algorithm SHA256).Hash
    Copy-Item -LiteralPath $helper -Destination $helperCopy
    Write-Json $transactionFile @{
      formatVersion=1; platform='win32'; id=$id; nonce=$id; version='1.1.1'; currentVersion='1.1.0'
      root=$root; transactionPath=$transaction; appPath=$app; executablePath=$executable
      candidate=$candidate; backup=$backup; assetPath=$assetPath; assetSha256=$assetHash; assetSize=$assetSize
      oldFiles=$oldFiles; newFiles=$newFiles
    }
    $parent = Start-HiddenPowerShell '-NoLogo -NoProfile -NonInteractive -Command "Start-Sleep -Seconds 120"'
    $worker = Start-HiddenPowerShell ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $helperCopy + '" -TransactionFile "' + $transactionFile + '" -ParentPid ' + $parent.Id)
    $ready = Join-Path $transaction 'helper-ready.json'
    Assert (Wait-File $ready 10) "$label helper did not report readiness"
    $marker = Get-Content -LiteralPath $ready -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert ($marker.id -eq $id -and $marker.parentPid -eq $parent.Id -and $marker.helperPid -eq $worker.Id) "$label helper-ready handshake mismatch"
    $parent.Kill(); Assert ($parent.WaitForExit(10000)) "$label parent did not exit"
    Assert ($worker.WaitForExit(30000)) "$label helper did not finish"
    $resultPath = Join-Path $transaction 'result.json'
    Assert (Test-Path -LiteralPath $resultPath -PathType Leaf) "$label helper omitted result.json"
    $result = Get-Content -LiteralPath $resultPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $currentHash = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash
    if ($expectSuccess) {
      Assert ($worker.ExitCode -eq 0 -and $result.status -eq 'healthy') "$label did not complete healthy"
      Assert ($currentHash -eq $newHash) "$label new executable was not installed"
      Assert (!(Test-Path -LiteralPath (Join-Path $app 'obsolete.txt'))) "$label obsolete managed file remains"
      Assert ((Get-Content -LiteralPath (Join-Path $app 'new.txt') -Raw) -eq 'new managed') "$label new managed file missing"
      $health = Get-Content -LiteralPath (Join-Path $transaction 'healthy.json') -Raw -Encoding UTF8 | ConvertFrom-Json
      Assert ($health.nonce -eq $id -and $health.version -eq '1.1.1' -and $health.executablePath -eq $executable) "$label health acknowledgment mismatch"
      Assert (!(Test-Path -LiteralPath $candidate) -and !(Test-Path -LiteralPath $backup) -and !(Test-Path -LiteralPath $assetPath)) "$label left staged managed files or verified archive"
    } else {
      Assert ($worker.ExitCode -ne 0 -and $result.status -eq 'rolled-back') "$label did not roll back"
      Assert ($currentHash -eq $oldHash) "$label old executable was not restored"
      Assert ((Get-Content -LiteralPath (Join-Path $app 'obsolete.txt') -Raw) -eq 'old managed') "$label obsolete file was not restored"
      Assert ((Get-Content -LiteralPath (Join-Path $app 'new.txt') -Raw) -eq 'old managed') "$label changed managed file was not restored"
      Assert (Test-Path -LiteralPath $assetPath -PathType Leaf) "$label removed archive after rollback"
    }
    Assert ((Get-Content -LiteralPath (Join-Path $app 'unknown-game\world.dat') -Raw) -eq 'player world') "$label changed unknown game data"
    Assert ((Get-Content -LiteralPath (Join-Path $root 'accounts.json') -Raw) -eq 'player account') "$label changed account data"
    Write-Host "$label passed"
  } finally {
    if ($null -ne $parent -and !$parent.HasExited) { $parent.Kill(); $parent.WaitForExit(10000) | Out-Null }
    if ($null -ne $worker -and !$worker.HasExited) { $worker.Kill(); $worker.WaitForExit(10000) | Out-Null }
    $healthPath = Join-Path $transaction 'healthy.json'
    if (Test-Path -LiteralPath $healthPath -PathType Leaf) {
      try {
        $healthPid = (Get-Content -LiteralPath $healthPath -Raw -Encoding UTF8 | ConvertFrom-Json).pid
        $fake = Get-Process -Id $healthPid -ErrorAction SilentlyContinue
        if ($null -ne $fake) { $fake.WaitForExit(5000) | Out-Null }
      } catch { }
    }
    if ($null -ne $worker) {
      Set-Content -LiteralPath (Join-Path $logs "$label.stdout.txt") -Value $worker.StandardOutput.ReadToEnd()
      Set-Content -LiteralPath (Join-Path $logs "$label.stderr.txt") -Value $worker.StandardError.ReadToEnd()
    }
    foreach ($name in @('transaction.json', 'helper-ready.json', 'result.json', 'healthy.json')) {
      $source = Join-Path $transaction $name
      if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination (Join-Path $logs "$label.$name") -Force }
    }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
  }
}

Run-Case 'healthy' '1.1.1' $true
Run-Case 'rollback-wrong-version' '0.0.0' $false
