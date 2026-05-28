param (
    [string]$Action
)

$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "--- Gerenciador de Performance & Hardware iniciado ---"
Write-Host "Ação de Hardware: $Action"

switch ($Action) {
    "unpark_cores" {
        Write-Host "Realizando o unparking de todos os núcleos da CPU..."
        try {
            # O unparking de núcleos é feito alterando chaves de energia específicas no Registro.
            # O GUID da subchave do processador é "0012ee47-9041-4b5d-9b77-535fba8b1442".
            # O parâmetro de parking de núcleos é "855f635f-1c7d-47ad-b8d6-5d311f62b546".
            
            # Comando Powercfg para setar o mínimo e máximo de CPU parking para 100% (Desativando parking)
            powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100
            powercfg -setdcvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100
            
            powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMAXCORES 100
            powercfg -setdcvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMAXCORES 100
            
            # Aplica o plano ativo novamente para forçar a atualização
            powercfg -setactive SCHEME_CURRENT

            Write-Host "[OK] Valores de CPU Core Parking definidos para 100% de atividade."
            Write-Host "Sucesso: Todos os núcleos do processador foram desparcados e operam livremente."
        }
        catch {
            Write-Error "Falha ao realizar unpark de núcleos de CPU: $_"
        }
    }

    "ultimate_power" {
        Write-Host "Verificando e ativando o esquema de energia Desempenho Máximo (Ultimate Performance)..."
        try {
            # GUID Padrão do Windows para o Esquema Ultimate Performance: "e9a42b02-d5df-448d-aa00-03f14749eb61"
            $UltimateGUID = "e9a42b02-d5df-448d-aa00-03f14749eb61"
            
            # Tenta importar o plano nativo oculto do Windows
            powercfg -duplicatescheme $UltimateGUID | Out-Null
            
            # Ativa o plano de desempenho máximo
            powercfg -setactive $UltimateGUID
            
            Write-Host "Sucesso: Plano de Energia 'Desempenho Máximo' ativado com êxito para otimização de hardware."
        }
        catch {
            Write-Error "Erro ao tentar ativar o plano Ultimate Performance: $_"
        }
    }

    "restore_ultimate_power" {
        Write-Host "Restaurando plano de energia padrão do Windows..."
        try {
            # GUID do plano Equilibrado (Balanced) padrão do Windows: "381b4222-f694-41f0-9685-ff5bb260df2e"
            $BalancedGUID = "381b4222-f694-41f0-9685-ff5bb260df2e"
            
            # Define o plano Equilibrado como ativo
            powercfg -setactive $BalancedGUID | Out-Null
            Write-Host "Sucesso: Plano de Energia Equilibrado (Balanced) reativado como padrão."
        }
        catch {
            Write-Error "Falha ao restaurar plano de energia padrão: $_"
        }
    }

    "ultra_performance" {
        Write-Host "Iniciando a instalação e otimização do Plano Ultra Performance (Revision Gamer)..."
        try {
            # 1. Duplica o Ultimate Performance nativo para criar o esquema base
            $UltimateGUID = "e9a42b02-d5df-448d-aa00-03f14749eb61"
            $UltraGUID = "3ff9831b-6f80-4830-8178-736cd4229e7b"
            
            # Importa/duplica o plano base com o GUID customizado
            Write-Host "Criando plano customizado..."
            powercfg -duplicatescheme $UltimateGUID $UltraGUID | Out-Null
            
            # 2. Renomeia e define a descrição
            powercfg -changename $UltraGUID "Ultra Performance" "Windows's Ultimate Performance with additional latency tweaks." | Out-Null
            
            # 3. Define como ativo
            powercfg -setactive $UltraGUID | Out-Null
            
            # 4. Aplica os tweaks avançados de latência de CPU e frequência dos núcleos
            Write-Host "Aplicando políticas avançadas de frequência da CPU..."
            powercfg -setacvalueindex $UltraGUID SUB_PROCESSOR PERFINCPOL 2
            powercfg -setacvalueindex $UltraGUID SUB_PROCESSOR PERFDECPOL 1
            powercfg -setacvalueindex $UltraGUID SUB_PROCESSOR PERFINCTHRESHOLD 10
            powercfg -setacvalueindex $UltraGUID SUB_PROCESSOR PERFDECTHRESHOLD 8
            
            # Força a atualização do plano ativo
            powercfg -setactive $UltraGUID | Out-Null
            
            Write-Host "Sucesso: Plano Ultra Performance instalado, ativado e otimizado com êxito!"
        }
        catch {
            Write-Error "Falha ao aplicar o Plano Ultra Performance: $_"
        }
    }

    "restore_ultra_performance" {
        Write-Host "Desinstalando o Plano Ultra Performance e reativando o padrão..."
        try {
            $BalancedGUID = "381b4222-f694-41f0-9685-ff5bb260df2e"
            $UltraGUID = "3ff9831b-6f80-4830-8178-736cd4229e7b"
            
            # 1. Define o plano Equilibrado como ativo primeiro
            powercfg -setactive $BalancedGUID | Out-Null
            
            # 2. Remove o esquema customizado do sistema
            powercfg -delete $UltraGUID | Out-Null
            Write-Host "Sucesso: Plano Ultra Performance removido e plano Equilibrado restaurado."
        }
        catch {
            Write-Error "Falha ao remover o Plano Ultra Performance: $_"
        }
    }

    "optimize_ntfs" {
        Write-Host "Iniciando a Otimização do Sistema de Arquivos NTFS (Disco)..."
        try {
            # Desativa a atualização do registro do último acesso para economizar overhead de I/O
            Write-Host "Configurando fsutil behavior set disableLastAccess para 1..."
            fsutil behavior set disableLastAccess 1 | Out-Null
            Write-Host "[OK] Atualização de data de último acesso desativada."

            # Desativa a criação de nomes de arquivos legados de 8.3 MS-DOS
            Write-Host "Configurando fsutil behavior set disable8dot3 para 1..."
            fsutil behavior set disable8dot3 1 | Out-Null
            Write-Host "[OK] Criação de nomes curtos 8.3 desativada."

            Write-Host "Sucesso: Otimizações de disco NTFS aplicadas com êxito para aceleração de barramento."
        }
        catch {
            Write-Error "Falha ao aplicar otimizações NTFS de disco: $_"
        }
    }

    "restore_ntfs" {
        Write-Host "Restaurando configurações de fábrica do NTFS..."
        try {
            # O padrão do Windows 10/11 é 2 (Gerenciado pelo sistema de forma inteligente) ou 0
            Write-Host "Restaurando fsutil behavior set disableLastAccess para o padrão do Windows..."
            fsutil behavior set disableLastAccess 2 | Out-Null
            Write-Host "[OK] Atualização de data de último acesso reativada."

            # O padrão é 0 (Habilitada a criação em todos os volumes)
            Write-Host "Restaurando fsutil behavior set disable8dot3 para o padrão do Windows..."
            fsutil behavior set disable8dot3 0 | Out-Null
            Write-Host "[OK] Criação de nomes curtos 8.3 reabilitada."

            Write-Host "Sucesso: Configurações do NTFS redefinidas para os padrões originais do Windows."
        }
        catch {
            Write-Error "Falha ao redefinir configurações do NTFS: $_"
        }
    }

    default {
        Write-Warning "Ação de hardware desconhecida: $Action"
    }
}
