# Script de Correção Emergencial do Electron para Windows e Node.js v24
# Este script baixa o executável nativo do Electron e o descompacta na pasta de distribuição do node_modules.

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8

$Url = "https://github.com/electron/electron/releases/download/v28.2.0/electron-v28.2.0-win32-x64.zip"
$ZipFile = "C:\Users\chris\Documents\Own Otimizer\electron_temp.zip"
$ExtractPath = "C:\Users\chris\Documents\Own Otimizer\node_modules\electron\dist"

Write-Host "========================================================="
Write-Host "   CORREÇÃO MANUAL DO ELECTRON (BYPASS NODE BUG)"
Write-Host "========================================================="
Write-Host "Baixando o binário do Electron v28.2.0 nativo de: $Url"

try {
    # Realiza o download seguro do binário
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $Url -OutFile $ZipFile -UseBasicParsing
    Write-Host "[OK] Download concluído."

    Write-Host "Criando pasta de extração em: $ExtractPath"
    if (-not (Test-Path $ExtractPath)) {
        New-Item -Path $ExtractPath -ItemType Directory -Force | Out-Null
    }

    Write-Host "Extraindo os binários nativos (este processo pode demorar alguns segundos)..."
    Expand-Archive -Path $ZipFile -DestinationPath $ExtractPath -Force
    Write-Host "[OK] Extração concluída com sucesso!"

    # Cria o arquivo flag 'path.txt' que o wrapper do Electron usa para validar a instalação
    $FlagPath = "C:\Users\chris\Documents\Own Otimizer\node_modules\electron\path.txt"
    "electron.exe" | Out-File -FilePath $FlagPath -Encoding ascii -NoNewline
    Write-Host "[OK] Arquivo de flag de caminho criado."

}
catch {
    Write-Error "Falha ao realizar a instalação manual do Electron: $_"
}
finally {
    # Remove o arquivo temporário se existir
    if (Test-Path $ZipFile) {
        Write-Host "Limpando arquivos temporários..."
        Remove-Item -Path $ZipFile -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "========================================================="
Write-Host "Instalação manual do Electron executada com êxito!"
Write-Host "========================================================="
