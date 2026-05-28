param()
$downloadsDir = [IO.Path]::Combine($env:USERPROFILE, 'Downloads', 'Carpi Fortnite Vip')
$packDir = Get-ChildItem -Path $downloadsDir -Directory | Where-Object { $_.Name -like '*PACK*' } | Select-Object -First 1
$pack = $packDir.FullName
$dest = 'C:\Users\chris\Documents\Own Otimizer\resources\apps'

function Copy-App($src, $dstName) {
    if ($src -and (Test-Path $src)) {
        Copy-Item -Path $src -Destination (Join-Path $dest $dstName) -Force
        Write-Host "[OK] $dstName"
    } else {
        Write-Warning "[SKIP] Nao encontrado: $src"
    }
}

Write-Host "Pack: $pack"

$memreduct = Get-ChildItem -Path $pack -Recurse -Filter 'memreduct.exe' | Where-Object { $_.FullName -like '*64*' } | Select-Object -First 1
Copy-App $memreduct.FullName 'memreduct_x64.exe'

$reduce = Get-ChildItem -Path $pack -Recurse -Filter 'ReduceMemory.exe' | Select-Object -First 1
Copy-App $reduce.FullName 'ReduceMemory.exe'

$apps10 = Get-ChildItem -Path $pack -Recurse -Filter '10AppsManager.exe' | Select-Object -First 1
Copy-App $apps10.FullName '10AppsManager.exe'

$cleaners = Get-ChildItem -Path $pack -Recurse -Filter '*.exe' | Where-Object { $_.FullName -like '*INTEL*' -and $_.Name -like '*Clean*' } | Select-Object -First 1
Copy-App $cleaners.FullName 'CleanersWindows.exe'

$wub = Get-ChildItem -Path $pack -Recurse -Filter '*.exe' | Where-Object { $_.Name -like '*x64*' -and $_.Name -like '*Wub*' } | Select-Object -First 1
Copy-App $wub.FullName 'Wub_x64.exe'

Write-Host "Arquivos copiados para $dest :"
Get-ChildItem $dest -File | ForEach-Object { Write-Host "  $($_.Name) - $([math]::Round($_.Length/1KB,0)) KB" }
