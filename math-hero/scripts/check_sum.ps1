Add-Type -AssemblyName System.IO.Compression.FileSystem
$apkPath = "f:\math\math-hero\app\build\outputs\apk\debug\app-debug.apk"
$entries = [System.IO.Compression.ZipFile]::OpenRead($apkPath).Entries
Write-Host "Count: $($entries.Count)"
$sum = 0
foreach ($entry in $entries) {
    $sum += $entry.Length
}
Write-Host "Sum (MB): $([math]::Round($sum / 1MB, 2))"
