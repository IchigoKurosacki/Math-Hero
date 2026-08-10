param (
    [string]$srcPath = "F:\math\public\assets",
    [string]$destPath = "F:\math\math-hero\downscaled_assets",
    [int]$scaleFactor = 3
)

Add-Type -AssemblyName System.Drawing

if (!(Test-Path $destPath)) { 
    New-Item -ItemType Directory -Path $destPath -Force | Out-Null
}

$files = Get-ChildItem -Path $srcPath -Filter *.png -Recurse
$total = $files.Count
$count = 0

Write-Host "Starting downscale of $total images..."

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($srcPath.Length + 1)
    $destFile = Join-Path $destPath $relativePath
    $destDir = Split-Path $destFile -Parent
    
    if (!(Test-Path $destDir)) { 
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        
        $newW = [int][math]::Max(1, [math]::Round($img.Width / $scaleFactor))
        $newH = [int][math]::Max(1, [math]::Round($img.Height / $scaleFactor))
        
        $newImg = New-Object System.Drawing.Bitmap($newW, $newH)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        
        # High quality scaling
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Prevent edge ghosting
        $wrapMode = New-Object System.Drawing.Imaging.ImageAttributes
        $wrapMode.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $newW, $newH)
        
        $graphics.DrawImage($img, $rect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $wrapMode)
        
        $newImg.Save($destFile, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $wrapMode.Dispose()
        $graphics.Dispose()
        $newImg.Dispose()
        $img.Dispose()
        
        $count++
        if ($count % 20 -eq 0) {
            Write-Host "Processed $count / $total ..."
        }
    }
    catch {
        Write-Error "Failed to process $($file.Name): $_"
    }
}

Write-Host "Done! Processed $count images successfully."
