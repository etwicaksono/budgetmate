Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\etwicaksono\.gemini\antigravity\brain\74fa9b9f-72c5-45e7-bb96-58d53c56b1ba\finance_app_icon_1779012150843.png'
$outDir  = 'd:\Project\FinanceApp\finance-web\public\images'

$src = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image {
    param($size, $filename)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $size, $size)
    $bmp.Save("$outDir\$filename", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Saved $filename ($size x $size)"
}

Resize-Image 512 'icon-512x512.png'
Resize-Image 192 'icon-192x192.png'
Resize-Image 180 'apple-touch-icon.png'

$src.Dispose()
Write-Output 'All icons generated successfully.'
