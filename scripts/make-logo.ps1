Add-Type -AssemblyName System.Drawing

function Write-Png([System.Drawing.Image] $img, [string] $path) {
  $ms = [System.IO.MemoryStream]::new()
  $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  [System.IO.File]::WriteAllBytes($path, $ms.ToArray())
  $ms.Dispose()
}

function S([float] $v, [int] $S) { [float]($S * $v / 200) }
function P([float] $x, [float] $y, [int] $S) { [System.Drawing.PointF]::new([float]($S * $x / 200), [float]($S * $y / 200)) }

function New-RoundedRectPath([System.Drawing.Rectangle] $r, [float] $rad) {
  $d = 2 * $rad
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($r.X, $r.Y, $d, $d, 180, 90)
  $path.AddArc($r.Right - $d, $r.Y, $d, $d, 270, 90)
  $path.AddArc($r.Right - $d, $r.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($r.X, $r.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-CrossPath([int] $S) {
  $rad = [float](S 6 $S)
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $vBar = [System.Drawing.Rectangle]::new([int](S 90 $S), [int](S 30 $S), [int](S 20 $S), [int](S 120 $S))
  $hBar = [System.Drawing.Rectangle]::new([int](S 60 $S), [int](S 60 $S), [int](S 80 $S), [int](S 20 $S))
  $path.AddPath((New-RoundedRectPath $vBar $rad), $false)
  $path.AddPath((New-RoundedRectPath $hBar $rad), $false)
  $path.CloseFigure()
  return $path
}

function New-HandPath([bool] $right, [int] $S) {
  $pts = if ($right) {
    @(
      (P 115 160 $S), (P 160 150 $S), (P 185 100 $S), (P 175 55 $S),
      (P 165 95 $S), (P 140 120 $S), (P 115 130 $S)
    )
  } else {
    @(
      (P 85 160 $S), (P 40 150 $S), (P 15 100 $S), (P 25 55 $S),
      (P 35 95 $S), (P 60 120 $S), (P 85 130 $S)
    )
  }
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddClosedCurve([System.Drawing.PointF[]]$pts, 0.45)
  return $path
}

function New-WavesPath([bool] $right, [int] $S) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  if ($right) {
    $path.AddBezier((P 155 45 $S), (P 165 60 $S), (P 165 60 $S), (P 155 75 $S))
    $path.AddBezier((P 165 35 $S), (P 180 60 $S), (P 180 60 $S), (P 165 85 $S))
  } else {
    $path.AddBezier((P 45 45 $S), (P 35 60 $S), (P 35 60 $S), (P 45 75 $S))
    $path.AddBezier((P 35 35 $S), (P 20 60 $S), (P 20 60 $S), (P 35 85 $S))
  }
  return $path
}

function Draw-EmblemCore([System.Drawing.Graphics] $g, [int] $S) {
  $offset = [int](S 2.5 $S)

  $darkPurple = [System.Drawing.Color]::FromArgb(255, 59, 7, 100)     # #3B0764
  $extBrush = [System.Drawing.SolidBrush]::new($darkPurple)
  $litTop = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
  $litBot = [System.Drawing.Color]::FromArgb(255, 190, 170, 240)      # lavender
  $gradRect = [System.Drawing.Rectangle]::new(0, [int](S 30 $S), $S, [int](S 140 $S))
  $litBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($gradRect, $litTop, $litBot, 90.0)

  $cross = New-CrossPath $S
  $leftHand = New-HandPath $false $S
  $rightHand = New-HandPath $true $S
  $leftWaves = New-WavesPath $false $S
  $rightWaves = New-WavesPath $true $S

  $tx = [System.Drawing.Drawing2D.Matrix]::new()
  $tx.Translate($offset, $offset)
  foreach ($shape in @($cross, $leftHand, $rightHand)) {
    $copy = $shape.Clone()
    $copy.Transform($tx)
    $g.FillPath($extBrush, $copy)
    $copy.Dispose()
  }

  foreach ($shape in @($cross, $leftHand, $rightHand)) {
    $g.FillPath($litBrush, $shape)
  }

  # Bevel highlight stroke on top edges of shapes
  $bevelPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150, 255, 255, 255), [float](S 2 $S))
  $bevelPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $bevelPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawPath($bevelPen, $cross)

  # Waves: dark extrusion then glossy white+teal tube
  $extWave = [System.Drawing.Pen]::new($darkPurple, [float](S 13 $S))
  $extWave.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $extWave.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $whitePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255), [float](S 9 $S))
  $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $corePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 103, 232, 249), [float](S 3.5 $S)) # #67E8F9
  $corePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $corePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  foreach ($w in @($leftWaves, $rightWaves)) {
    $wx = $w.Clone()
    $wx.Transform($tx)
    $g.DrawPath($extWave, $wx)
    $wx.Dispose()
    $g.DrawPath($whitePen, $w)
    $g.DrawPath($corePen, $w)
  }

  $bevelPen.Dispose()
  $extWave.Dispose()
  $whitePen.Dispose()
  $corePen.Dispose()
  $extBrush.Dispose()
  $litBrush.Dispose()
  foreach ($s in @($cross, $leftHand, $rightHand, $leftWaves, $rightWaves)) { $s.Dispose() }
  $tx.Dispose()
}

function New-Emblem([bool] $withBadge, [int] $S) {
  $bmp = [System.Drawing.Bitmap]::new($S, $S, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  if ($withBadge) {
    # Deep royal sphere with teal rim for the app icon
    $top = [System.Drawing.ColorTranslator]::FromHtml('#6B21A8')
    $bot = [System.Drawing.ColorTranslator]::FromHtml('#2E1065')
    $rect = [System.Drawing.Rectangle]::new(0, 0, $S, $S)
    $grad = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $top, $bot, 90.0)
    $pad = [float]($S * 0.02)
    $circleRect = [System.Drawing.RectangleF]::new($pad, $pad, [float]($S - 2 * $pad), [float]($S - 2 * $pad))
    $g.FillEllipse($grad, $circleRect)

    # Sphere shading (top gloss + bottom shadow), clipped to the circle
    $sphereClip = New-RoundedRectPath ([System.Drawing.Rectangle]::new(0, 0, $S, $S)) ([float]($S / 2))
    $g.SetClip($sphereClip)
    $glossRect = [System.Drawing.RectangleF]::new(0, 0, $S, [float]($S * 0.5))
    $gloss = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Rectangle]::new(0, 0, $S, [int]($S * 0.5)), [System.Drawing.Color]::FromArgb(90, 255, 255, 255), [System.Drawing.Color]::FromArgb(0, 255, 255, 255), 90.0)
    $g.FillEllipse($gloss, $glossRect)
    $shadeRect = [System.Drawing.RectangleF]::new(0, [float]($S * 0.62), $S, [float]($S * 0.38))
    $shade = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Rectangle]::new(0, [int]($S * 0.62), $S, [int]($S * 0.38)), [System.Drawing.Color]::FromArgb(0, 0, 0, 0), [System.Drawing.Color]::FromArgb(70, 0, 0, 0), 90.0)
    $g.FillEllipse($shade, $shadeRect)
    $g.ResetClip()

    # Teal under-rim glow
    $rimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(140, 0, 196, 204), [float]($S * 0.02))
    $rimRect = [System.Drawing.RectangleF]::new([float]($S * 0.012), [float]($S * 0.012), [float]($S * 0.976), [float]($S * 0.976))
    $g.DrawEllipse($rimPen, $rimRect)
    $rimPen.Dispose()
    $gloss.Dispose()
    $shade.Dispose()
    $sphereClip.Dispose()
    $grad.Dispose()
  }

  Draw-EmblemCore $g $S

  $g.Dispose()
  return $bmp
}

$assets = (Join-Path (Split-Path $PSScriptRoot -Parent) 'assets\images')

$badged = New-Emblem $true 1024
Write-Png $badged (Join-Path $assets 'logo-icon-1024.png')

$foreground = New-Emblem $false 1024
Write-Png $foreground (Join-Path $assets 'logo-foreground-1024.png')

foreach ($size in @(512, 64)) {
  $out = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($badged, 0, 0, $size, $size)
  $g.Dispose()
  $name = if ($size -eq 512) { 'logo-icon.png' } else { 'favicon.png' }
  Write-Png $out (Join-Path $assets $name)
  $out.Dispose()
}

# Legacy plain icon.png (1024) — used by some install/launch paths
Write-Png $badged (Join-Path $assets 'icon.png')
# Splash + adaptive-foreground source
Write-Png $foreground (Join-Path $assets 'logo-foreground.png')

$badged.Dispose()
$foreground.Dispose()

Write-Output "done"