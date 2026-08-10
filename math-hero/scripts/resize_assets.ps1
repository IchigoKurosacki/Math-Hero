param (
    [string]$srcPath = "F:\math\public\assets",
    [string]$destPath = "F:\math\math-hero\downscaled_assets",
    [int]$maxBgDimension = 960,
    [int]$maxSpriteDimension = 400
)

Add-Type -AssemblyName System.Drawing

if (!(Test-Path $destPath)) { 
    New-Item -ItemType Directory -Path $destPath -Force | Out-Null
}

$files = Get-ChildItem -Path $srcPath -Filter *.png -Recurse
$total = $files.Count
$count = 0

Write-Host "Starting smart asset optimization for $total images (decor preserved at 100% quality)..."

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($srcPath.Length + 1)
    $destFile = Join-Path $destPath $relativePath
    $destDir = Split-Path $destFile -Parent
    
    if (!(Test-Path $destDir)) { 
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    # Preserve midground decor at 100% original size and full quality
    if ($file.Name -like "*decor*.png") {
        Copy-Item -Path $file.FullName -Destination $destFile -Force
        $count++
        if ($count % 30 -eq 0) { Write-Host "Processed $count / $total ..." }
        continue
    }
    
    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        
        $isBg = ($file.Name -like "bg_*.png") -or ($file.Name -eq "menu_bg.png")
        $maxDim = if ($isBg) { $maxBgDimension } else { $maxSpriteDimension }
        
        $scale = 1.0
        if ($img.Width -gt $maxDim -or $img.Height -gt $maxDim) {
            $scaleW = $maxDim / $img.Width
            $scaleH = $maxDim / $img.Height
            $scale = [math]::Min($scaleW, $scaleH)
        } else {
            if ($img.Width -gt 256) {
                $scale = 0.4
            }
        }
        
        $newW = [int][math]::Max(1, [math]::Round($img.Width * $scale))
        $newH = [int][math]::Max(1, [math]::Round($img.Height * $scale))
        
        $newImg = New-Object System.Drawing.Bitmap($newW, $newH)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
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
        if ($count % 30 -eq 0) {
            Write-Host "Processed $count / $total ..."
        }
    }
    catch {
        Write-Error "Failed to process $($file.Name): $_"
    }
}

Write-Host "Done! Successfully processed $count images with full decor resolution preserved."
