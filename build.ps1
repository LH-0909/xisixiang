$css = Get-Content "D:\习思想\题库\css\style.css" -Raw -Encoding UTF8
$data = Get-Content "D:\习思想\题库\js\data.js" -Raw -Encoding UTF8
$app = Get-Content "D:\习思想\题库\js\app.js" -Raw -Encoding UTF8
$router = Get-Content "D:\习思想\spa_router.js" -Raw -Encoding UTF8

$template = Get-Content "D:\习思想\build_template.html" -Raw -Encoding UTF8
$html = $template -replace '/*CSS_PLACEHOLDER*/', $css
$html = $html -replace '/*DATA_PLACEHOLDER*/', $data
$html = $html -replace '/*APP_PLACEHOLDER*/', $app
$html = $html -replace '/*ROUTER_PLACEHOLDER*/', $router

$html | Out-File -FilePath "D:\习思想\题库.html" -Encoding utf8 -NoNewline
$size = (Get-Item "D:\习思想\题库.html").Length
Write-Host "Created 题库.html - $size bytes ($([Math]::Round($size/1024)) KB)"
