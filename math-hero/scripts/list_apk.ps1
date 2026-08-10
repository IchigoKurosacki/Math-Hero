Add-Type -AssemblyName System.IO.Compression.FileSystem
$apkPath = "f:\math\math-hero\app\build\outputs\apk\debug\app-debug.apk"
$entries = [System.IO.Compression.ZipFile]::OpenRead($apkPath).Entries
$sorted = $entries | Sort-Object Length -Descending | Select-Object -First 20
foreach ($entry in $sorted) {
    Write-Host "$([math]::Round($entry.Length / 1MB, 2)) MB - $($entry.FullName)"
}
