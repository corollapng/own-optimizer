param (
    [string]$Action
)

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "--- Cleaner iniciado ---"
Write-Host "Ação de limpeza: $Action"

switch ($Action) {
    "temp_files" {
        Write-Host "Iniciando a limpeza de arquivos temporários do sistema..."
        
        # 1. Limpeza do TEMP do Usuário
        $UserTemp = [System.IO.Path]::GetTempPath()
        Write-Host "Limpando pasta temporária do usuário: $UserTemp"
        Get-ChildItem -Path $UserTemp -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

        # 2. Limpeza do TEMP do Windows
        $WinTemp = "C:\Windows\Temp"
        Write-Host "Limpando pasta temporária do Windows: $WinTemp"
        Get-ChildItem -Path $WinTemp -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

        # 3. Limpeza do Prefetch (Exige privilégios elevados)
        $Prefetch = "C:\Windows\Prefetch"
        if (Test-Path $Prefetch) {
            Write-Host "Limpando pasta Prefetch: $Prefetch"
            Get-ChildItem -Path $Prefetch -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        }

        # 4. Esvazia a Lixeira do Windows de forma silenciosa
        Write-Host "Esvaziando a Lixeira do Windows..."
        Clear-RecycleBin -Confirm:$false -ErrorAction SilentlyContinue

        Write-Host "Sucesso: Limpeza de temporários concluída."
    }

    "update_cache" {
        Write-Host "Iniciando a limpeza profunda de cache do Windows Update..."
        try {
            # 1. Para serviços relacionados ao Windows Update
            Write-Host "Parando serviço wuauserv..."
            Stop-Service -Name "wuauserv" -Force -ErrorAction SilentlyContinue
            
            Write-Host "Parando serviço bits..."
            Stop-Service -Name "bits" -Force -ErrorAction SilentlyContinue

            # 2. Apaga a pasta SoftwareDistribution
            $DistFolder = "C:\Windows\SoftwareDistribution"
            if (Test-Path $DistFolder) {
                Write-Host "Removendo cache de distribuição em: $DistFolder"
                Remove-Item -Path $DistFolder -Recurse -Force -ErrorAction Stop
            }

            # 3. Reinicia os serviços
            Write-Host "Reiniciando serviço wuauserv..."
            Start-Service -Name "wuauserv" -ErrorAction SilentlyContinue
            
            Write-Host "Reiniciando serviço bits..."
            Start-Service -Name "bits" -ErrorAction SilentlyContinue

            Write-Host "Sucesso: Cache do Windows Update resetado e excluído com êxito."
        }
        catch {
            Write-Error "Erro ao limpar o cache do Windows Update: $_"
            # Garante que os serviços tentem iniciar de qualquer forma
            Start-Service -Name "wuauserv" -ErrorAction SilentlyContinue
            Start-Service -Name "bits" -ErrorAction SilentlyContinue
        }
    }

    "clear_event_logs" {
        Write-Host "Excluindo arquivos de logs redundantes (*.log) do disco C:..."
        try {
            Get-ChildItem -Path "C:\Windows" -Filter "*.log" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Arquivos .log do sistema excluídos."
        }
        catch {
            Write-Host "[Info] Falha ao excluir alguns arquivos .log: $_"
        }

        Write-Host "Limpando todos os canais do Visualizador de Eventos (Event Logs) do Windows..."
        try {
            $EventLogs = wevtutil.exe el
            $TotalLogs = $EventLogs.Count
            Write-Host "Encontrados $TotalLogs canais de logs de auditoria. Limpando..."
            
            $Counter = 0
            foreach ($Log in $EventLogs) {
                $Log = $Log.Trim()
                if ($Log) {
                    wevtutil.exe cl "$Log" 2>&1 | Out-Null
                    $Counter++
                }
            }
            Write-Host "Sucesso: $Counter canais de Event Logs do Windows limpos com êxito!"
        }
        catch {
            Write-Error "Falha ao limpar o Visualizador de Eventos: $_"
        }
    }

    "clear_prefetch" {
        Write-Host "Iniciando a limpeza do Cache de Pré-carregamento (Windows Prefetch)..."
        $Prefetch = "C:\Windows\Prefetch"
        if (Test-Path $Prefetch) {
            try {
                Get-ChildItem -Path $Prefetch -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "Sucesso: Cache Prefetch excluído com êxito para reconstrução de inicializações de apps."
            }
            catch {
                Write-Error "Falha ao limpar pasta Prefetch (alguns arquivos de layout do kernel podem estar em uso ativo): $_"
            }
        } else {
            Write-Warning "Diretório C:\Windows\Prefetch não foi encontrado no sistema."
        }
    }

    default {
        Write-Warning "Ação de limpeza desconhecida: $Action"
    }
}
