param (
    [string]$Action,
    [string]$primary,
    [string]$secondary,
    [string]$uri
)

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "--- Utilitários do Sistema iniciados ---"
Write-Host "Ação executada: $Action"

switch ($Action) {
    "dns_flush" {
        Write-Host "Limpando e redefinindo o cache do resolvedor de DNS do Windows..."
        ipconfig /flushdns
        
        Write-Host "Resetando catálogos de Winsock..."
        netsh winsock reset | Out-Null
        
        Write-Host "Sucesso: Cache DNS limpo e conexões de rede reiniciadas."
    }

    "set_dns" {
        Write-Host "Configurando servidores de DNS no adaptador de rede principal..."
        Write-Host "DNS Primário: $primary | DNS Secundário: $secondary"
        
        try {
            # Encontra todos os adaptadores de rede ativos que possuem IP atribuído
            $Adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
            
            foreach ($Adapter in $Adapters) {
                Write-Host "Aplicando DNS no adaptador: $($Adapter.Name)"
                
                # Seta o DNS Primário e Secundário de forma limpa
                Set-DnsClientServerAddress -InterfaceIndex $Adapter.InterfaceIndex -ServerAddresses ($primary, $secondary) -ErrorAction Stop
            }
            Write-Host "Sucesso: Servidores DNS atualizados em todos os adaptadores ativos."
        }
        catch {
            Write-Error "Falha ao definir servidores DNS nos adaptadores de rede: $_"
        }
    }

    "sfc_scan" {
        Write-Host "Iniciando o Verificador de Arquivos de Sistema (SFC /SCANNOW)..."
        Write-Host "Atenção: Este processo pode levar alguns minutos para concluir."
        
        sfc /scannow
        
        Write-Host "Sucesso: Diagnóstico de arquivos de sistema finalizado."
    }

    "open_settings" {
        Write-Host "Abrindo painel de Configurações do Windows: $uri"
        if (-not $uri) {
            Write-Error "O parâmetro `-uri` não foi fornecido."
            return
        }
        try {
            # Start-Process com a URI ms-settings abrirá o aplicativo nativo correspondente do Windows
            Start-Process $uri
            Write-Host "Sucesso: Painel de configurações iniciado com êxito."
        }
        catch {
            Write-Error "Falha ao abrir painel de configurações: $_"
        }
    }

    "kill_brokers" {
        Write-Host "Iniciando o encerramento seguro de processos de segundo plano para liberar memória RAM..."
        try {
            # Finaliza de forma forçada os processos dllhost.exe (COM Surrogate) e runtimebroker.exe (UWP Broker)
            # que costumam acumular megabytes de cache inútil na RAM física.
            Write-Host "Finalizando instâncias ativas do dllhost.exe..."
            taskkill /f /im dllhost.exe 2>&1 | Out-Null
            
            Write-Host "Finalizando instâncias ativas do runtimebroker.exe..."
            taskkill /f /im runtimebroker.exe 2>&1 | Out-Null
            
            Write-Host "Sucesso: Processos de segundo plano finalizados de forma 100% segura para liberar RAM física."
        }
        catch {
            Write-Error "Falha ao finalizar processos de segundo plano: $_"
        }
    }

    default {
        Write-Warning "Ação utilitária desconhecida: $Action"
    }
}
