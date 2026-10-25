# Fixed local helper, copied outside the installation before the launcher exits.
param([Parameter(Mandatory=$true)][string]$TransactionFile, [Parameter(Mandatory=$true)][int]$ParentPid)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Full([string]$Value) { return [IO.Path]::GetFullPath($Value).TrimEnd('\') }
function EqualPath([string]$A, [string]$B) { return [string]::Equals((Full $A), (Full $B), [StringComparison]::OrdinalIgnoreCase) }
function Within([string]$Parent, [string]$Child) { return (EqualPath $Parent $Child) -or (Full $Child).StartsWith((Full $Parent) + '\', [StringComparison]::OrdinalIgnoreCase) }
function NoLinks([string]$Value) {
  $cursor = Full $Value
  while ($cursor) {
    $item = Get-Item -LiteralPath $cursor -Force -ErrorAction SilentlyContinue
    if ($null -ne $item) {
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Linked update path: $cursor" }
    }
    $parent = [IO.Path]::GetDirectoryName($cursor)
    if ($parent -eq $cursor) { break }; $cursor = $parent
  }
}
function ValidateFiles($Files) {
  if ($null -eq $Files -or $Files.Count -lt 1 -or $Files.Count -gt 50000) { throw 'Invalid managed inventory' }
  $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($file in $Files) {
    if ($file -isnot [string] -or $file.Length -gt 240 -or $file.Contains('\') -or [IO.Path]::IsPathRooted($file)) { throw 'Unsafe managed path' }
    foreach ($part in $file.Split('/')) {
      if (!$part -or $part -eq '.' -or $part -eq '..' -or $part -match '[\x00-\x1f<>:"|?*]' -or $part -match '[. ]$' -or $part -match '^(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)') { throw 'Unsafe managed path component' }
    }
    if (!$seen.Add($file)) { throw 'Managed inventory case collision' }
  }
  foreach ($file in $Files) {
    $parts = $file.Split('/')
    for ($i = 1; $i -lt $parts.Length; $i++) { if ($seen.Contains(($parts[0..($i-1)] -join '/'))) { throw 'Managed file/directory collision' } }
  }
  return ,$seen
}
function ReadJson([string]$Value) { NoLinks $Value; if ((Get-Item -LiteralPath $Value).Length -gt 8388608) { throw 'Update JSON too large' }; return Get-Content -LiteralPath $Value -Raw -Encoding UTF8 | ConvertFrom-Json }
function WriteResult([string]$Status, [string]$Message, [bool]$CleanupPending = $false) { [IO.File]::WriteAllText((Join-Path $tx.transactionPath 'result.json'), (@{ status=$Status; message=$Message; version=$tx.version; cleanupPending=$CleanupPending } | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false)) }
function CheckTransaction {
  if ($tx.formatVersion -ne 1 -or $tx.platform -ne 'win32' -or $tx.id -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' -or $tx.nonce -cne $tx.id -or $tx.version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid transaction identity' }
  if (!(EqualPath $tx.transactionPath $PSScriptRoot) -or !(EqualPath $TransactionFile (Join-Path $PSScriptRoot 'transaction.json')) -or !(EqualPath $tx.transactionPath (Join-Path $tx.root ('launcher-updates\transactions\' + $tx.id)))) { throw 'Invalid transaction location' }
  if ((Within $tx.appPath $tx.root) -or (Within $tx.root $tx.appPath) -or !(Within $tx.appPath $tx.executablePath) -or (EqualPath $tx.appPath $tx.executablePath)) { throw 'User data must be outside application' }
  if (!(EqualPath $tx.candidate (Join-Path $PSScriptRoot 'candidate')) -or !(EqualPath $tx.backup (Join-Path $PSScriptRoot 'backup'))) { throw 'Invalid candidate/backup path' }
  if (![IO.Path]::IsPathRooted($tx.assetPath) -or !(EqualPath ([IO.Path]::GetDirectoryName($tx.assetPath)) (Join-Path $tx.root 'launcher-updates\downloads')) -or $tx.assetSha256 -notmatch '^[0-9a-f]{64}$' -or $tx.assetSize -lt 1) { throw 'Unsafe update download asset' }
  NoLinks $tx.assetPath; if (!(Test-Path -LiteralPath $tx.assetPath -PathType Leaf)) { throw 'Missing update download asset' }
  foreach ($value in @($tx.transactionPath, $tx.appPath, $tx.executablePath, $tx.candidate, $tx.backup)) { NoLinks $value }
}
function CheckManagedPaths {
  foreach ($file in @($tx.oldFiles) + @($tx.newFiles)) {
    $target = Join-Path $tx.appPath $file; NoLinks $target
    if (Test-Path -LiteralPath $target) {
      if ((Get-Item -LiteralPath $target).PSIsContainer) { throw 'Managed file became a directory' }
      if (!$oldSet.Contains($file)) { throw 'Refusing to overwrite an unmanaged file' }
    }
  }
  foreach ($file in $tx.newFiles) {
    $source = Join-Path $tx.candidate $file; NoLinks $source
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Missing candidate managed file' }
  }
}
function WaitForHealth($Process) {
  $deadline = [DateTime]::UtcNow.AddSeconds(90)
  $healthPath = Join-Path $tx.transactionPath 'healthy.json'
  while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-Path -LiteralPath $healthPath) {
      $health = ReadJson $healthPath
      if ($health.nonce -ceq $tx.nonce -and $health.version -ceq $tx.version -and (EqualPath $health.executablePath $tx.executablePath) -and $health.pid -eq $Process.Id) { return $true }
    }
    if ($Process.HasExited) { return $false }; Start-Sleep -Milliseconds 250; $Process.Refresh()
  }
  return $false
}
if ($env:OS -ne 'Windows_NT') { throw 'Windows helper invoked on another OS' }
$tx = ReadJson $TransactionFile
CheckTransaction
$oldSet = ValidateFiles @($tx.oldFiles); $newSet = ValidateFiles @($tx.newFiles)
if (!$newSet.IsSubsetOf($oldSet)) { throw 'New native runtime paths require the full installer' }
$installed = ReadJson (Join-Path $tx.appPath 'resources\launcher-files.json')
if ($installed.formatVersion -ne 1) { throw 'Invalid installed inventory' }
$installedSet = ValidateFiles @($installed.files)
if (!$installedSet.SetEquals($oldSet)) { throw 'Installed inventory changed since staging' }
$candidateInventory = ReadJson (Join-Path $tx.candidate 'resources\launcher-files.json')
$candidateSet = ValidateFiles @($candidateInventory.files)
if ($candidateInventory.formatVersion -ne 1 -or !$candidateSet.SetEquals($newSet)) { throw 'Candidate inventory mismatch' }
$exeRelative = (Full $tx.executablePath).Substring((Full $tx.appPath).Length + 1).Replace('\', '/')
if (!$oldSet.Contains($exeRelative) -or !$newSet.Contains($exeRelative) -or !$newSet.Contains('resources/launcher-files.json')) { throw 'Executable/inventory must be managed' }
if (Test-Path -LiteralPath $tx.backup) { throw 'Backup already exists' }
CheckManagedPaths
if ($ParentPid -le 1 -or $ParentPid -eq $PID) { throw 'Invalid parent PID' }
$readyPath = Join-Path $tx.transactionPath 'helper-ready.json'; NoLinks $readyPath
$readyPending = Join-Path $tx.transactionPath ('helper-ready-' + $PID + '.tmp')
[IO.File]::WriteAllText($readyPending, (@{ id=$tx.id; parentPid=$ParentPid; helperPid=$PID } | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $readyPending -Destination $readyPath
$parentProcess = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
if ($null -ne $parentProcess -and !$parentProcess.WaitForExit(120000)) { throw 'Launcher did not exit' }
CheckTransaction; CheckManagedPaths
$backedUp = [Collections.Generic.List[string]]::new()
$applied = [Collections.Generic.List[string]]::new()
$newProcess = $null
New-Item -ItemType Directory -Path $tx.backup | Out-Null
try {
  # Back up only known application files; unknown game and user files are untouched.
  foreach ($file in $tx.oldFiles) {
    $source = Join-Path $tx.appPath $file
    if (Test-Path -LiteralPath $source -PathType Leaf) {
      $dest = Join-Path $tx.backup $file; New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($dest)) | Out-Null
      Copy-Item -LiteralPath $source -Destination $dest; $backedUp.Add($file)
    }
  }
  foreach ($file in $tx.newFiles) {
    $target = Join-Path $tx.appPath $file; NoLinks $target
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($target)) | Out-Null
    $applied.Add($file); Copy-Item -LiteralPath (Join-Path $tx.candidate $file) -Destination $target -Force
  }
  foreach ($file in $tx.oldFiles) { if (!$newSet.Contains($file)) { $obsolete = Join-Path $tx.appPath $file; NoLinks $obsolete; if (Test-Path -LiteralPath $obsolete -PathType Leaf) { Remove-Item -LiteralPath $obsolete -Force } } }
  $newProcess = Start-Process -FilePath $tx.executablePath -WorkingDirectory $tx.appPath -ArgumentList @('--launcher-update-token', $tx.id) -PassThru
  if (!(WaitForHealth $newProcess)) { throw 'Launcher update health confirmation failed' }
} catch {
  $failure = $_.Exception.Message
  if ($null -ne $newProcess -and !$newProcess.HasExited) {
    & (Join-Path ([Environment]::GetFolderPath('System')) 'taskkill.exe') /PID $newProcess.Id /T /F | Out-Null
    if (!$newProcess.WaitForExit(10000)) { throw 'Updated launcher could not be stopped; backup retained' }
  }
  foreach ($file in $applied) {
    $target = Join-Path $tx.appPath $file; NoLinks $target
    if (Test-Path -LiteralPath $target -PathType Leaf) { Remove-Item -LiteralPath $target -Force }
  }
  foreach ($file in $backedUp) {
    $target = Join-Path $tx.appPath $file; NoLinks $target
    Copy-Item -LiteralPath (Join-Path $tx.backup $file) -Destination $target -Force
  }
  WriteResult 'rolled-back' $failure
  Start-Process -FilePath $tx.executablePath -WorkingDirectory $tx.appPath | Out-Null
  throw $failure
}
# Cleanup is outside rollback: a healthy launcher stays running even if disk cleanup fails.
function RemoveManagedTree([string]$Tree, $Files) {
  NoLinks $Tree
  $directories = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  [void]$directories.Add($Tree)
  foreach ($file in $Files) {
    $target = Join-Path $Tree $file; NoLinks $target
    if (Test-Path -LiteralPath $target) {
      if ((Get-Item -LiteralPath $target).PSIsContainer) { throw 'Cleanup file became a directory' }
      Remove-Item -LiteralPath $target -Force
    }
    $directory = [IO.Path]::GetDirectoryName($target)
    while ((Within $Tree $directory) -and !(EqualPath $Tree $directory)) { [void]$directories.Add($directory); $directory = [IO.Path]::GetDirectoryName($directory) }
  }
  foreach ($directory in ($directories | Sort-Object { $_.Length } -Descending)) {
    NoLinks $directory
    if ((Test-Path -LiteralPath $directory -PathType Container) -and @(Get-ChildItem -LiteralPath $directory -Force).Count -eq 0) { Remove-Item -LiteralPath $directory -Force }
  }
  return !(Test-Path -LiteralPath $Tree)
}
$cleanupPending = $false
try { if (!(RemoveManagedTree $tx.backup $backedUp)) { $cleanupPending = $true } } catch { $cleanupPending = $true }
try { if (!(RemoveManagedTree $tx.candidate $tx.newFiles)) { $cleanupPending = $true } } catch { $cleanupPending = $true }
try {
  NoLinks $tx.assetPath
  if ((Get-Item -LiteralPath $tx.assetPath).Length -ne $tx.assetSize -or (Get-FileHash -LiteralPath $tx.assetPath -Algorithm SHA256).Hash -ine $tx.assetSha256) { throw 'Download changed before cleanup' }
  Remove-Item -LiteralPath $tx.assetPath -Force
} catch { $cleanupPending = $true }
try { WriteResult 'healthy' '' $cleanupPending } catch { Write-Warning 'Healthy launcher retained; cleanup result could not be written' }
