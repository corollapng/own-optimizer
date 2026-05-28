param (
    [string]$Action,
    [string]$vendas,
    [string]$taxa,
    [string]$threshold,
    [string]$services
)

# Garante saída em UTF-8 para exibição correta de caracteres na UI
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "--- Tweak Manager iniciado ---"
Write-Host "Ação solicitada: $Action"

switch ($Action) {
    "disable_telemetry" {
        Write-Host "Desativando Telemetria e Coleta de Dados do Windows..."
        try {
            # 1. Desativa serviços de rastreamento de diagnóstico nativos
            Stop-Service -Name "DiagTrack" -ErrorAction SilentlyContinue
            Set-Service -Name "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue
            Write-Host "[OK] Serviço DiagTrack desativado."

            Stop-Service -Name "dmwappushservice" -ErrorAction SilentlyContinue
            Set-Service -Name "dmwappushservice" -StartupType Disabled -ErrorAction SilentlyContinue
            Write-Host "[OK] Serviço dmwappushservice desativado."

            # 2. Modifica chaves de registro de telemetria (HKLM)
            $RegistryPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection"
            if (-not (Test-Path $RegistryPath)) {
                New-Item -Path $RegistryPath -Force | Out-Null
            }
            Set-ItemProperty -Path $RegistryPath -Name "AllowTelemetry" -Value 0 -Type DWord -Force
            Write-Host "[OK] Chaves de registro de telemetria definidas para zero (Desativado)."

            Write-Host "Sucesso: Otimizações de privacidade de telemetria aplicadas."
        }
        catch {
            Write-Error "Falha ao aplicar alterações de telemetria: $_"
        }
    }

    "remove_bloatware" {
        Write-Host "Removendo Bloatware Nativo do Windows (Aplicativos Inúteis)..."
        
        # Lista de aplicativos comuns desnecessários para remoção
        $BloatList = @(
            "*Cortana*",
            "*MicrosoftSolitaireCollection*",
            "*MixedReality.Portal*",
            "*OfficeHub*",
            "*SkypeApp*",
            "*GetHelp*",
            "*Getstarted*"
        )

        foreach ($App in $BloatList) {
            Write-Host "Processando remoção de: $App"
            Get-AppxPackage -Name $App -AllUsers | Remove-AppxPackage -ErrorAction SilentlyContinue
        }
        Write-Host "Sucesso: Bloatwares identificados removidos com sucesso."
    }

    "create_restore_point" {
        Write-Host "Criando Ponto de Restauração de Segurança do Windows..."
        try {
            # Ativa a proteção do sistema na unidade C: caso esteja desabilitada
            Enable-ComputerRestore -Drive "C:\" -ErrorAction SilentlyContinue
            
            # Cria o ponto de restauração
            Checkpoint-Computer -Description "OwnOptimizer_PreTweak" -RestorePointType MODIFY_SETTINGS -ErrorAction Stop
            Write-Host "Sucesso: Ponto de restauração 'OwnOptimizer_PreTweak' criado com êxito."
        }
        catch {
            Write-Error "Não foi possível criar o ponto de restauração. Certifique-se de que a Proteção do Sistema está ativada. Erro: $_"
        }
    }

    "set_svchost_threshold" {
        Write-Host "Iniciando a otimização de processos do Windows (svchost.exe)..."
        if (-not $threshold) {
            Write-Error "O parâmetro `-threshold` não foi fornecido."
            return
        }

        try {
            $RegistryPath = "HKLM:\SYSTEM\ControlSet001\Control"
            Write-Host "Definindo SvcHostSplitThresholdInKB para: $threshold"
            
            # Aplica o tweak gravando o valor como DWORD no Registro do Windows
            Set-ItemProperty -Path $RegistryPath -Name "SvcHostSplitThresholdInKB" -Value [uint32]$threshold -Type DWord -Force
            Write-Host "Sucesso: Otimização de svchost aplicada com sucesso. Reinicie a máquina para surtir efeito."
        }
        catch {
            Write-Error "Falha ao gravar chave de registro do svchost: $_"
        }
    }

    "restore_svchost_threshold" {
        Write-Host "Restaurando o comportamento padrão de processos do Windows (svchost.exe)..."
        try {
            $RegistryPath = "HKLM:\SYSTEM\ControlSet001\Control"
            
            # Remove a propriedade do registro para reverter ao padrão de fábrica do Windows
            Remove-ItemProperty -Path $RegistryPath -Name "SvcHostSplitThresholdInKB" -ErrorAction Stop
            Write-Host "Sucesso: Chave SvcHostSplitThresholdInKB removida. O Windows voltará a usar o limite de fábrica de 3.5GB."
        }
        catch {
            # Se der erro porque a chave já não existia, é sucesso de qualquer forma!
            if ($_.Exception.Message -like "*does not exist*") {
                Write-Host "O Windows já está operando no comportamento padrão de fábrica (chave inexistente)."
            } else {
                Write-Error "Falha ao restaurar chave padrão do svchost: $_"
            }
        }
    }

    "set_bcd_tweaks" {
        Write-Host "Iniciando a otimização de latência BCD (Timers do Sistema)..."
        try {
            # 1. Desativa o Dynamic Tick para evitar variações de clock da CPU
            Write-Host "Desativando Dynamic Tick no bcdedit..."
            bcdedit /set disabledynamictick yes | Out-Null
            Write-Host "[OK] Dynamic Tick desativado."

            # 2. Força o uso do platform tick do HPET
            Write-Host "Forçando o uso do Platform Tick no bcdedit..."
            bcdedit /set useplatformtick yes | Out-Null
            Write-Host "[OK] Platform Tick ativado."

            Write-Host "Sucesso: Ajustes de latência BCD aplicados com êxito. Reinicie a máquina para surtir efeito."
        }
        catch {
            Write-Error "Falha ao aplicar adjustments de bcdedit: $_"
        }
    }

    "restore_bcd_tweaks" {
        Write-Host "Restaurando o comportamento padrão de timers do Windows..."
        try {
            # Remove o valor customizado de dynamic tick
            Write-Host "Removendo valor customizado de disabledynamictick..."
            bcdedit /deletevalue disabledynamictick -ErrorAction SilentlyContinue | Out-Null
            Write-Host "[OK] disabledynamictick redefinido."

            # Remove o valor customizado de useplatformtick
            Write-Host "Removendo valor customizado de useplatformtick..."
            bcdedit /deletevalue useplatformtick -ErrorAction SilentlyContinue | Out-Null
            Write-Host "[OK] useplatformtick redefinido."

            Write-Host "Sucesso: Timers do sistema redefinidos para os padrões originais do Windows."
        }
        catch {
            Write-Error "Falha ao redefinir valores de bcdedit: $_"
        }
    }

    "disable_bloat_services" {
        Write-Host "Iniciando a desativação de serviços desnecessários..."
        # Lista dos serviços pesados a serem debloatados
        $Services = @("wsearch", "SysMain", "WerSvc", "DiagTrack")
        
        foreach ($Service in $Services) {
            Write-Host "Processando serviço: $Service"
            try {
                # Para o serviço ativo imediatamente
                Stop-Service -Name $Service -Force -ErrorAction SilentlyContinue
                
                # Desativa a inicialização dele no boot
                Set-Service -Name $Service -StartupType Disabled -ErrorAction Stop
                Write-Host "[OK] Serviço $Service desativado com sucesso."
            }
            catch {
                Write-Host "[Info] Não foi possível desativar $Service (talvez já esteja inativo ou removido): $_"
            }
        }
        Write-Host "Sucesso: Serviços desnecessários desativados."
    }

    "restore_bloat_services" {
        Write-Host "Restaurando os serviços padrões do Windows..."
        
        # Mapeamento do tipo de inicialização original de fábrica
        $OriginalTypes = @{
            "wsearch" = "Automatic"
            "SysMain" = "Automatic"
            "WerSvc"  = "Manual"
            "DiagTrack" = "Automatic"
        }

        foreach ($Service in $OriginalTypes.Keys) {
            $StartupType = $OriginalTypes[$Service]
            Write-Host "Restaurando inicialização de $Service para: $StartupType"
            try {
                # Restabelece a inicialização padrão
                Set-Service -Name $Service -StartupType $StartupType -ErrorAction Stop
                
                # Tenta iniciar o serviço se for Automático
                if ($StartupType -eq "Automatic") {
                    Start-Service -Name $Service -ErrorAction SilentlyContinue
                }
                Write-Host "[OK] Serviço $Service restaurado."
            }
            catch {
                Write-Warning "Não foi possível restaurar o serviço ${Service}: $_"
            }
        }
        Write-Host "Sucesso: Serviços do Windows redefinidos para os padrões de fábrica."
    }

    "disable_energy_estimation" {
        Write-Host "Desativando o monitoramento de estimativa de energia (Energy Estimation)..."
        try {
            $RegistryPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
            if (-not (Test-Path $RegistryPath)) {
                New-Item -Path $RegistryPath -Force | Out-Null
            }
            
            # Grava a chave dword correspondente à desativação (00000000)
            Set-ItemProperty -Path $RegistryPath -Name "EnergyEstimationEnabled" -Value 0 -Type DWord -Force
            Write-Host "Sucesso: Estimativa de energia desativada no registro (EnergyEstimationEnabled = 0)."
        }
        catch {
            Write-Error "Falha ao desativar estimativa de energia no registro: $_"
        }
    }

    "restore_energy_estimation" {
        Write-Host "Restaurando o monitoramento de estimativa de energia..."
        try {
            $RegistryPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
            
            # Remove a propriedade do registro para voltar ao padrão nativo do Windows
            Remove-ItemProperty -Path $RegistryPath -Name "EnergyEstimationEnabled" -ErrorAction Stop
            Write-Host "Sucesso: Propriedade EnergyEstimationEnabled removida. Estimativa de energia reabilitada."
        }
        catch {
            if ($_.Exception.Message -like "*does not exist*") {
                Write-Host "O Windows já está operando no comportamento padrão (chave inexistente)."
            } else {
                Write-Error "Falha ao remover chave de estimativa de energia: $_"
            }
        }
    }

    "set_system_profile_tweaks" {
        Write-Host "Iniciando a otimização Multimedia SystemProfile (Latência de Rede e Agendamento)..."
        try {
            $Path = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
            if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
            
            # 1. Ajustes Gerais de SystemProfile
            Set-ItemProperty -Path $Path -Name "SystemResponsiveness" -Value 0 -Type DWord -Force
            Set-ItemProperty -Path $Path -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -Force # Equivalent to ffffffff
            Write-Host "[OK] Responsividade de Sistema e Network Throttling desativados."

            # 2. Ajustes de Agendamento específicos para Games
            $GamesPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
            if (-not (Test-Path $GamesPath)) { New-Item -Path $GamesPath -Force | Out-Null }
            
            Set-ItemProperty -Path $GamesPath -Name "Affinity" -Value 0 -Type DWord -Force
            Set-ItemProperty -Path $GamesPath -Name "Background Only" -Value "False" -Type String -Force
            Set-ItemProperty -Path $GamesPath -Name "Clock Rate" -Value 10000 -Type DWord -Force # Equivalent to 2710 hex
            Set-ItemProperty -Path $GamesPath -Name "GPU Priority" -Value 8 -Type DWord -Force
            Set-ItemProperty -Path $GamesPath -Name "Priority" -Value 6 -Type DWord -Force
            Set-ItemProperty -Path $GamesPath -Name "Scheduling Category" -Value "High" -Type String -Force
            Set-ItemProperty -Path $GamesPath -Name "SFIO Priority" -Value "High" -Type String -Force
            Write-Host "[OK] Prioridade de CPU/GPU e agendamento E/S para Games definidos para Alta Performance."

            Write-Host "Sucesso: Otimizações Multimedia SystemProfile aplicadas. Reinicie para surtir efeito."
        }
        catch {
            Write-Error "Falha ao gravar SystemProfile tweaks: $_"
        }
    }

    "restore_system_profile_tweaks" {
        Write-Host "Restaurando os padrões de fábrica do Multimedia SystemProfile..."
        try {
            $Path = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
            # Valores originais padrão do Windows
            Set-ItemProperty -Path $Path -Name "SystemResponsiveness" -Value 14 -Type DWord -Force
            Set-ItemProperty -Path $Path -Name "NetworkThrottlingIndex" -Value 10 -Type DWord -Force
            Write-Host "[OK] SystemResponsiveness e NetworkThrottlingIndex restaurados para os padrões (14 e 10)."

            $GamesPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
            if (Test-Path $GamesPath) {
                # Valores originais padrão para Games
                Set-ItemProperty -Path $GamesPath -Name "Affinity" -Value 0 -Type DWord -Force
                Set-ItemProperty -Path $GamesPath -Name "Background Only" -Value "False" -Type String -Force
                Set-ItemProperty -Path $GamesPath -Name "Clock Rate" -Value 10000 -Type DWord -Force
                Set-ItemProperty -Path $GamesPath -Name "GPU Priority" -Value 8 -Type DWord -Force
                Set-ItemProperty -Path $GamesPath -Name "Priority" -Value 2 -Type DWord -Force # Padrão é 2 (Normal)
                Set-ItemProperty -Path $GamesPath -Name "Scheduling Category" -Value "Medium" -Type String -Force # Padrão é Medium
                Set-ItemProperty -Path $GamesPath -Name "SFIO Priority" -Value "Normal" -Type String -Force # Padrão é Normal
            }
            Write-Host "[OK] Agendador de tarefas de Games restaurado para os padrões originais."
            Write-Host "Sucesso: Multimedia SystemProfile redefinido para o padrão de fábrica."
        }
        catch {
            Write-Error "Falha ao redefinir SystemProfile: $_"
        }
    }

    "set_advanced_memory_tweaks" {
        Write-Host "Iniciando a Otimização de Kernel de Memória e Barramento I/O..."
        try {
            $Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
            
            # 1. Tweak de Paginação (Mantém drivers e kernel na RAM física)
            Set-ItemProperty -Path $Path -Name "DisablePagingExecutive" -Value 1 -Type DWord -Force
            Write-Host "[OK] DisablePagingExecutive definido para 1 (Drivers mantidos na RAM física)."
            
            # 2. Ajustes de caching e buffers de rede/disco
            Set-ItemProperty -Path $Path -Name "IoPageLockLimit" -Value 16710656 -Type DWord -Force # 00fefc00 hex = 16710656 dec
            Set-ItemProperty -Path $Path -Name "PoolUsageMaximum" -Value 96 -Type DWord -Force # 00000060 hex = 96 dec
            Write-Host "[OK] IoPageLockLimit e PoolUsageMaximum otimizados para barramento E/S."

            Write-Host "Sucesso: Otimizações de Kernel e Caching aplicadas. Reinicie para surtir efeito."
        }
        catch {
            Write-Error "Falha ao gravar tweaks de gerenciamento de memória: $_"
        }
    }

    "restore_advanced_memory_tweaks" {
        Write-Host "Restaurando padrões de fábrica de Memory Management..."
        try {
            $Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
            
            # Restaura DisablePagingExecutive para o padrão (0)
            Set-ItemProperty -Path $Path -Name "DisablePagingExecutive" -Value 0 -Type DWord -Force
            Write-Host "[OK] DisablePagingExecutive restaurado para 0."
            
            # Remove valores customizados de IoPageLockLimit e PoolUsageMaximum (ou define para padrões seguros)
            Remove-ItemProperty -Path $Path -Name "IoPageLockLimit" -ErrorAction SilentlyContinue | Out-Null
            Remove-ItemProperty -Path $Path -Name "PoolUsageMaximum" -ErrorAction SilentlyContinue | Out-Null
            Write-Host "[OK] Cache buffers e barramento de E/S redefinidos."

            Write-Host "Sucesso: Gerenciamento de memória do Kernel redefinido para o padrão."
        }
        catch {
            Write-Error "Falha ao redefinir gerenciamento de memória: $_"
        }
    }

    "disable_game_dvr" {
        Write-Host "Desativando o monitoramento e gravação em segundo plano do Windows Game DVR..."
        try {
            # 1. Desativa no Registro da barra de jogos do usuário atual (HKCU)
            $HKCUPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"
            if (-not (Test-Path $HKCUPath)) { New-Item -Path $HKCUPath -Force | Out-Null }
            Set-ItemProperty -Path $HKCUPath -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force
            Write-Host "[OK] Gravação em segundo plano desativada para o usuário atual."

            # 2. Desativa no Registro da máquina inteira (HKLM)
            $HKLMPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR"
            if (-not (Test-Path $HKLMPath)) { New-Item -Path $HKLMPath -Force | Out-Null }
            Set-ItemProperty -Path $HKLMPath -Name "AllowGameDVR" -Value 0 -Type DWord -Force
            Write-Host "[OK] Game DVR desativado nas políticas locais da máquina."

            Write-Host "Sucesso: Otimizações de Game DVR aplicadas com êxito."
        }
        catch {
            Write-Error "Falha ao gravar chaves de desativação do Game DVR: $_"
        }
    }

    "restore_game_dvr" {
        Write-Host "Reabilitando o suporte ao Windows Game DVR..."
        try {
            $HKCUPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"
            if (Test-Path $HKCUPath) {
                Set-ItemProperty -Path $HKCUPath -Name "AppCaptureEnabled" -Value 1 -Type DWord -Force
            }
            
            $HKLMPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR"
            if (Test-Path $HKLMPath) {
                Remove-ItemProperty -Path $HKLMPath -Name "AllowGameDVR" -ErrorAction SilentlyContinue | Out-Null
            }
            Write-Host "Sucesso: Game DVR e captura em segundo plano restaurados para os padrões nativos do Windows."
        }
        catch {
            Write-Error "Falha ao reabilitar o Game DVR: $_"
        }
    }

    "set_game_mode" {
        Write-Host "Ativando o Modo de Jogo do Windows (Game Mode)..."
        try {
            $Path1 = "HKCU:\Software\Microsoft\GameBar"
            if (-not (Test-Path $Path1)) { New-Item -Path $Path1 -Force | Out-Null }
            Set-ItemProperty -Path $Path1 -Name "AllowAutoGameMode" -Value 1 -Type DWord -Force
            
            $Path2 = "HKCU:\System\GameConfigStore"
            if (-not (Test-Path $Path2)) { New-Item -Path $Path2 -Force | Out-Null }
            Set-ItemProperty -Path $Path2 -Name "GameDVR_Enabled" -Value 1 -Type DWord -Force
            
            Write-Host "Sucesso: Modo de Jogo ativado no Registro do Windows."
        }
        catch {
            Write-Error "Falha ao ativar o Modo de Jogo: $_"
        }
    }

    "restore_game_mode" {
        Write-Host "Restaurando o comportamento padrão do Modo de Jogo..."
        try {
            $Path1 = "HKCU:\Software\Microsoft\GameBar"
            if (Test-Path $Path1) {
                Set-ItemProperty -Path $Path1 -Name "AllowAutoGameMode" -Value 0 -Type DWord -Force
            }
            $Path2 = "HKCU:\System\GameConfigStore"
            if (Test-Path $Path2) {
                Set-ItemProperty -Path $Path2 -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force
            }
            Write-Host "Sucesso: Modo de Jogo redefinido para o padrão."
        }
        catch {
            Write-Error "Falha ao restaurar Modo de Jogo: $_"
        }
    }

    "disable_background_apps" {
        Write-Host "Desativando a execução de aplicativos em segundo plano..."
        try {
            $Path1 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
            if (-not (Test-Path $Path1)) { New-Item -Path $Path1 -Force | Out-Null }
            Set-ItemProperty -Path $Path1 -Name "GlobalUserDisabled" -Value 1 -Type DWord -Force

            $Path2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy"
            if (-not (Test-Path $Path2)) { New-Item -Path $Path2 -Force | Out-Null }
            Set-ItemProperty -Path $Path2 -Name "LetAppsRunInBackground" -Value 2 -Type DWord -Force

            Write-Host "Sucesso: Aplicativos em segundo plano desativados globalmente."
        }
        catch {
            Write-Error "Falha ao desativar aplicativos em segundo plano: $_"
        }
    }

    "restore_background_apps" {
        Write-Host "Reabilitando aplicativos em segundo plano..."
        try {
            $Path1 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
            if (Test-Path $Path1) {
                Set-ItemProperty -Path $Path1 -Name "GlobalUserDisabled" -Value 0 -Type DWord -Force
            }
            
            $Path2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy"
            if (Test-Path $Path2) {
                Remove-ItemProperty -Path $Path2 -Name "LetAppsRunInBackground" -ErrorAction SilentlyContinue | Out-Null
            }
            Write-Host "Sucesso: Aplicativos em segundo plano reabilitados para o padrão."
        }
        catch {
            Write-Error "Falha ao reabilitar aplicativos em segundo plano: $_"
        }
    }

    "disable_transparency" {
        Write-Host "Desativando os efeitos de transparência do Windows..."
        try {
            $Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
            if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
            Set-ItemProperty -Path $Path -Name "EnableTransparency" -Value 0 -Type DWord -Force
            Write-Host "Sucesso: Efeitos de transparência desativados."
        }
        catch {
            Write-Error "Falha ao desativar efeitos de transparência: $_"
        }
    }

    "restore_transparency" {
        Write-Host "Reativando os efeitos de transparência do Windows..."
        try {
            $Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
            if (Test-Path $Path) {
                Set-ItemProperty -Path $Path -Name "EnableTransparency" -Value 1 -Type DWord -Force
            }
            Write-Host "Sucesso: Efeitos de transparência reabilitados."
        }
        catch {
            Write-Error "Falha ao reabilitar efeitos de transparência: $_"
        }
    }

    "disable_notifications" {
        Write-Host "Desativando as notificações de banner (Toast Notifications) do Windows..."
        try {
            $Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications"
            if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
            Set-ItemProperty -Path $Path -Name "ToastEnabled" -Value 0 -Type DWord -Force
            Write-Host "Sucesso: Notificações desativadas para evitar stuttering."
        }
        catch {
            Write-Error "Falha ao desativar notificações: $_"
        }
    }

    "restore_notifications" {
        Write-Host "Reativando notificações do Windows..."
        try {
            $Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications"
            if (Test-Path $Path) {
                Set-ItemProperty -Path $Path -Name "ToastEnabled" -Value 1 -Type DWord -Force
            }
            Write-Host "Sucesso: Notificações reabilitadas."
        }
        catch {
            Write-Error "Falha ao reabilitar notificações: $_"
        }
    }

    "disable_tablet_mode" {
        Write-Host "Configurando modo desktop padrão (Desativando Modo Tablet)..."
        try {
            $Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ImmersiveShell"
            if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
            Set-ItemProperty -Path $Path -Name "TabletMode" -Value 0 -Type DWord -Force
            Set-ItemProperty -Path $Path -Name "SignInMode" -Value 1 -Type DWord -Force
            Write-Host "Sucesso: Modo Tablet desativado e login configurado para Desktop."
        }
        catch {
            Write-Error "Falha ao desativar Modo Tablet: $_"
        }
    }

    "restore_tablet_mode" {
        Write-Host "Restaura configurações originais de Modo Tablet..."
        try {
            $Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ImmersiveShell"
            if (Test-Path $Path) {
                Set-ItemProperty -Path $Path -Name "TabletMode" -Value 0 -Type DWord -Force
                Set-ItemProperty -Path $Path -Name "SignInMode" -Value 0 -Type DWord -Force
            }
            Write-Host "Sucesso: Configurações de Modo Tablet redefinidas para o padrão do usuário."
        }
        catch {
            Write-Error "Falha ao redefinir Modo Tablet: $_"
        }
    }

    "disable_ui_privacy" {
        Write-Host "Desativando rastreamento de publicidade e telemetria da interface do usuário..."
        try {
            $Path1 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy"
            if (-not (Test-Path $Path1)) { New-Item -Path $Path1 -Force | Out-Null }
            Set-ItemProperty -Path $Path1 -Name "TailoredExperiencesWithDiagnosticDataEnabled" -Value 0 -Type DWord -Force

            $Path2 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
            if (-not (Test-Path $Path2)) { New-Item -Path $Path2 -Force | Out-Null }
            Set-ItemProperty -Path $Path2 -Name "Enabled" -Value 0 -Type DWord -Force
            Write-Host "Sucesso: Telemetria de experiências e ID de Anúncios desativados com êxito."
        }
        catch {
            Write-Error "Falha ao desativar privacidade de UI: $_"
        }
    }

    "restore_ui_privacy" {
        Write-Host "Restaurando configurações de privacidade da interface do usuário..."
        try {
            $Path1 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy"
            if (Test-Path $Path1) {
                Set-ItemProperty -Path $Path1 -Name "TailoredExperiencesWithDiagnosticDataEnabled" -Value 1 -Type DWord -Force
            }
            $Path2 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
            if (Test-Path $Path2) {
                Set-ItemProperty -Path $Path2 -Name "Enabled" -Value 1 -Type DWord -Force
            }
            Write-Host "Sucesso: Privacidade de interface restaurada para o padrão de fábrica."
        }
        catch {
            Write-Error "Falha ao restaurar privacidade de UI: $_"
        }
    }

    "disable_sticky_keys" {
        Write-Host "Desativando facilidades de teclado (Teclas de Aderência, Filtro e Alternância)..."
        try {
            $Path1 = "HKCU:\Control Panel\Accessibility\StickyKeys"
            if (-not (Test-Path $Path1)) { New-Item -Path $Path1 -Force | Out-Null }
            Set-ItemProperty -Path $Path1 -Name "Flags" -Value "506" -Type String -Force

            $Path2 = "HKCU:\Control Panel\Accessibility\Keyboard Response"
            if (-not (Test-Path $Path2)) { New-Item -Path $Path2 -Force | Out-Null }
            Set-ItemProperty -Path $Path2 -Name "Flags" -Value 122 -Type DWord -Force

            $Path3 = "HKCU:\Control Panel\Accessibility\ToggleKeys"
            if (-not (Test-Path $Path3)) { New-Item -Path $Path3 -Force | Out-Null }
            Set-ItemProperty -Path $Path3 -Name "Flags" -Value "58" -Type String -Force

            Write-Host "Sucesso: Atrasos de digitação e atalhos irritantes (Sticky Keys) desativados."
        }
        catch {
            Write-Error "Falha ao desativar teclas de facilidade de acesso: $_"
        }
    }

    "restore_sticky_keys" {
        Write-Host "Restaurando atalhos e configurações de teclado originais..."
        try {
            $Path1 = "HKCU:\Control Panel\Accessibility\StickyKeys"
            if (Test-Path $Path1) {
                Set-ItemProperty -Path $Path1 -Name "Flags" -Value "510" -Type String -Force
            }
            $Path2 = "HKCU:\Control Panel\Accessibility\Keyboard Response"
            if (Test-Path $Path2) {
                Set-ItemProperty -Path $Path2 -Name "Flags" -Value 126 -Type DWord -Force
            }
            $Path3 = "HKCU:\Control Panel\Accessibility\ToggleKeys"
            if (Test-Path $Path3) {
                Set-ItemProperty -Path $Path3 -Name "Flags" -Value "62" -Type String -Force
            }
            Write-Host "Sucesso: Teclas de Aderência e atalhos reabilitados para os padrões."
        }
        catch {
            Write-Error "Falha ao restaurar atalhos de teclado: $_"
        }
    }

    "disable_bing_search" {
        Write-Host "Desativando pesquisas do Bing e sugestões no Menu Iniciar..."
        try {
            $Path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search"
            if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
            Set-ItemProperty -Path $Path -Name "BingSearchEnabled" -Value 0 -Type DWord -Force
            Set-ItemProperty -Path $Path -Name "CortanaConsent" -Value 0 -Type DWord -Force
            Write-Host "Sucesso: Bing desativado no Menu Iniciar para buscas locais mais rápidas."
        }
        catch {
            Write-Error "Falha ao desativar Bing na Pesquisa: $_"
        }
    }

    "restore_bing_search" {
        Write-Host "Restaurando pesquisas do Bing no Menu Iniciar..."
        try {
            $Path = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search"
            if (Test-Path $Path) {
                Set-ItemProperty -Path $Path -Name "BingSearchEnabled" -Value 1 -Type DWord -Force
                Set-ItemProperty -Path $Path -Name "CortanaConsent" -Value 1 -Type DWord -Force
            }
            Write-Host "Sucesso: Buscas do Bing no Menu Iniciar reativadas para o padrão."
        }
        catch {
            Write-Error "Falha ao restaurar Bing na Pesquisa: $_"
        }
    }

    "disable_custom_services" {
        if (-not $services) {
            Write-Error "Nenhum serviço foi especificado."
            return
        }
        $ServiceList = $services.Split(",")
        Write-Host "Desativando serviços de debloat selecionados: $services"
        foreach ($Service in $ServiceList) {
            $Service = $Service.Trim()
            if ($Service) {
                Write-Host "Processando desativação de: $Service"
                try {
                    Stop-Service -Name $Service -Force -ErrorAction SilentlyContinue
                    Set-Service -Name $Service -StartupType Disabled -ErrorAction Stop
                    Write-Host "[OK] Serviço $Service desativado e boot configurado para desabilitado."
                }
                catch {
                    Write-Host "[Info] Não foi possível desativar ${Service}: $_"
                }
            }
        }
        Write-Host "Sucesso: Otimizações de Serviços concluídas com êxito."
    }

    "restore_custom_services" {
        if (-not $services) {
            Write-Error "Nenhum serviço foi especificado."
            return
        }
        
        # Mapeamento do tipo de inicialização original de fábrica seguro e estável
        $OriginalTypes = @{
            "CscService" = "Manual"
            "SCardSvr"   = "Manual"
            "WPCSvc"     = "Manual"
            "Fax"        = "Manual"
            "MapsBroker" = "Automatic"
            "WbioSrvc"   = "Manual"
            "TapiSrv"    = "Manual"
            "Spooler"    = "Automatic"
            "DoSvc"      = "Automatic"
            "wuauserv"   = "Manual"
        }

        $ServiceList = $services.Split(",")
        Write-Host "Restaurando serviços de debloat selecionados para o padrão de fábrica..."
        foreach ($Service in $ServiceList) {
            $Service = $Service.Trim()
            if ($Service) {
                $Startup = $OriginalTypes[$Service]
                if (-not $Startup) { $Startup = "Manual" }
                
                Write-Host "Restaurando $Service para tipo: $Startup"
                try {
                    Set-Service -Name $Service -StartupType $Startup -ErrorAction Stop
                    Write-Host "[OK] Serviço $Service redefinido para o padrão."
                }
                catch {
                    Write-Warning "Não foi possível restaurar ${Service}: $_"
                }
            }
        }
        Write-Host "Sucesso: Serviços redefinidos para os padrões de fábrica do Windows."
    }

    "set_gpu_energy_tweak" {
        Write-Host "Desativando telemetria de energia da GPU (GpuEnergyDriver)..."
        try {
            $Path = "HKLM:\SYSTEM\CurrentControlSet\Services\GpuEnergyDrv"
            if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
            Set-ItemProperty -Path $Path -Name "Start" -Value 4 -Type DWord -Force
            Write-Host "Sucesso: Driver de telemetria GpuEnergyDrv desativado para poupar processamento."
        }
        catch {
            Write-Error "Falha ao desativar telemetria de energia da GPU: $_"
        }
    }

    "restore_gpu_energy_tweak" {
        Write-Host "Restaurando inicialização padrão do GpuEnergyDriver..."
        try {
            $Path = "HKLM:\SYSTEM\CurrentControlSet\Services\GpuEnergyDrv"
            if (Test-Path $Path) {
                Set-ItemProperty -Path $Path -Name "Start" -Value 3 -Type DWord -Force # 3 = Manual (Padrão)
            }
            Write-Host "Sucesso: GpuEnergyDriver restaurado para a inicialização padrão."
        }
        catch {
            Write-Error "Falha ao restaurar GpuEnergyDriver: $_"
        }
    }

    "disable_hibernation" {
        Write-Host "Desativando Hibernação do Windows para liberar espaço em disco..."
        try {
            # 1. Desativa a hibernação via powercfg
            powercfg -h off | Out-Null
            
            # 2. Garante a desativação gravando no Registro
            $Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
            if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
            Set-ItemProperty -Path $Path -Name "HibernateEnabled" -Value 0 -Type DWord -Force
            
            Write-Host "Sucesso: Hibernação desativada e hiberfil.sys excluído do SSD."
        }
        catch {
            Write-Error "Falha ao desativar hibernação: $_"
        }
    }

    "restore_hibernation" {
        Write-Host "Reativando Hibernação do Windows..."
        try {
            powercfg -h on | Out-Null
            $Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
            if (Test-Path $Path) {
                Set-ItemProperty -Path $Path -Name "HibernateEnabled" -Value 1 -Type DWord -Force
            }
            Write-Host "Sucesso: Hibernação reabilitada para o padrão do Windows."
        }
        catch {
            Write-Error "Falha ao reativar hibernação: $_"
        }
    }

    "set_thread_priority_tweaks" {
        Write-Host "Otimizando a Prioridade de Threads de Periféricos, Rede e Vídeo (Latência Máxima)..."
        try {
            $Paths = @(
                "HKLM:\SYSTEM\CurrentControlSet\Services\usbxhci\Parameters",
                "HKLM:\SYSTEM\CurrentControlSet\Services\USBHUB3\Parameters",
                "HKLM:\SYSTEM\CurrentControlSet\Services\NDIS\Parameters",
                "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\Parameters"
            )

            foreach ($Path in $Paths) {
                Write-Host "Configurando ThreadPriority em: $Path"
                if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
                Set-ItemProperty -Path $Path -Name "ThreadPriority" -Value 31 -Type DWord -Force # 31 = Realtime (0x1f hex)
            }
            Write-Host "Sucesso: Prioridade máxima (Realtime) aplicada às threads de mouses, teclados, rede e placas Nvidia."
        }
        catch {
            Write-Error "Falha ao configurar prioridade de threads: $_"
        }
    }

    "restore_thread_priority_tweaks" {
        Write-Host "Restaurando prioridades de threads originais do Windows..."
        try {
            $Paths = @(
                "HKLM:\SYSTEM\CurrentControlSet\Services\usbxhci\Parameters",
                "HKLM:\SYSTEM\CurrentControlSet\Services\USBHUB3\Parameters",
                "HKLM:\SYSTEM\CurrentControlSet\Services\NDIS\Parameters",
                "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\Parameters"
            )

            foreach ($Path in $Paths) {
                if (Test-Path $Path) {
                    Write-Host "Removendo ThreadPriority customizada de: $Path"
                    Remove-ItemProperty -Path $Path -Name "ThreadPriority" -ErrorAction SilentlyContinue | Out-Null
                }
            }
            Write-Host "Sucesso: Threads de periféricos redefinidas para o agendamento dinâmico padrão."
        }
        catch {
            Write-Error "Falha ao restaurar prioridades de threads: $_"
        }
    }

    "set_nvidia_tweaks" {
        Write-Host "Aplicando tweaks avançados de Registro para drivers Nvidia..."
        try {
            # 1. Desativar telemetria de energia da GPU (GpuEnergyDrv)
            $p1 = "HKLM:\SYSTEM\CurrentControlSet\Services\GpuEnergyDrv"
            if (-not (Test-Path $p1)) { New-Item -Path $p1 -Force | Out-Null }
            Set-ItemProperty -Path $p1 -Name "Start" -Value 4 -Type DWord -Force
            Write-Host "[OK] GpuEnergyDrv desativado."

            # 2. Ativar FTS / SilkSmoothness Unhide (EnableRID61684)
            $p2 = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\FTS"
            if (-not (Test-Path $p2)) { New-Item -Path $p2 -Force | Out-Null }
            Set-ItemProperty -Path $p2 -Name "EnableRID61684" -Value 1 -Type DWord -Force
            Write-Host "[OK] SilkSmoothness desativado (EnableRID61684 = 1)."

            # 3. Desativar Power Saving da GPU (DisplayPowerSaving)
            $p3 = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\NVTweak"
            if (-not (Test-Path $p3)) { New-Item -Path $p3 -Force | Out-Null }
            Set-ItemProperty -Path $p3 -Name "DisplayPowerSaving" -Value 0 -Type DWord -Force
            Write-Host "[OK] DisplayPowerSaving desativado (= 0)."

            # 4. Desativar Preempção CUDA e gráfica (menos stuttering em DX/Vulkan)
            $p4 = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm"
            if (-not (Test-Path $p4)) { New-Item -Path $p4 -Force | Out-Null }
            Set-ItemProperty -Path $p4 -Name "DisablePreemption" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $p4 -Name "DisableCudaContextPreemption" -Value 1 -Type DWord -Force
            Write-Host "[OK] DisablePreemption e DisableCudaContextPreemption = 1."

            # 5. Desativar preempcao no Scheduler de GPU do Windows
            $p5 = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler"
            if (-not (Test-Path $p5)) { New-Item -Path $p5 -Force | Out-Null }
            Set-ItemProperty -Path $p5 -Name "EnablePreemption" -Value 0 -Type DWord -Force
            Write-Host "[OK] GraphicsDrivers Scheduler EnablePreemption = 0."

            # 6. Desativar Write Combining (evita micro-stuttering em leituras sequenciais)
            Set-ItemProperty -Path $p4 -Name "DisableWriteCombining" -Value 1 -Type DWord -Force
            Write-Host "[OK] DisableWriteCombining = 1."

            # 7. Desativar verificacao HDCP (libera pipeline grafico em monitores comuns)
            $hdcpKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E968-E325-11CE-BFC1-08002BE10318}\0000"
            if (-not (Test-Path $hdcpKey)) { New-Item -Path $hdcpKey -Force | Out-Null }
            Set-ItemProperty -Path $hdcpKey -Name "RMHdcpKeyglobZero" -Value 1 -Type DWord -Force
            Write-Host "[OK] HDCP desativado (RMHdcpKeyglobZero = 1)."

            Write-Host "Sucesso: Todos os tweaks Nvidia aplicados. Reinicie o sistema para garantir efeito total."
        }
        catch {
            Write-Error "Falha ao aplicar tweaks Nvidia: $_"
        }
    }

    "restore_nvidia_tweaks" {
        Write-Host "Restaurando configurações padrão dos drivers Nvidia..."
        try {
            $p1 = "HKLM:\SYSTEM\CurrentControlSet\Services\GpuEnergyDrv"
            if (Test-Path $p1) { Set-ItemProperty -Path $p1 -Name "Start" -Value 3 -Type DWord -Force }
            Write-Host "[OK] GpuEnergyDrv restaurado para Manual (3)."

            $p2 = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\FTS"
            if (Test-Path $p2) { Remove-ItemProperty -Path $p2 -Name "EnableRID61684" -ErrorAction SilentlyContinue }
            Write-Host "[OK] EnableRID61684 removido."

            $p3 = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\NVTweak"
            if (Test-Path $p3) { Remove-ItemProperty -Path $p3 -Name "DisplayPowerSaving" -ErrorAction SilentlyContinue }
            Write-Host "[OK] DisplayPowerSaving restaurado."

            $p4 = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm"
            if (Test-Path $p4) {
                Remove-ItemProperty -Path $p4 -Name "DisablePreemption" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $p4 -Name "DisableCudaContextPreemption" -ErrorAction SilentlyContinue
                Remove-ItemProperty -Path $p4 -Name "DisableWriteCombining" -ErrorAction SilentlyContinue
            }
            Write-Host "[OK] Preempcao e WriteCombining restaurados ao padrao."

            $p5 = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler"
            if (Test-Path $p5) { Remove-ItemProperty -Path $p5 -Name "EnablePreemption" -ErrorAction SilentlyContinue }
            Write-Host "[OK] Scheduler de GPU restaurado."

            $hdcpKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4D36E968-E325-11CE-BFC1-08002BE10318}\0000"
            if (Test-Path $hdcpKey) { Remove-ItemProperty -Path $hdcpKey -Name "RMHdcpKeyglobZero" -ErrorAction SilentlyContinue }
            Write-Host "[OK] HDCP restaurado."

            Write-Host "Sucesso: Drivers Nvidia redefinidos para o padrao de fabrica."
        }
        catch {
            Write-Error "Falha ao restaurar tweaks Nvidia: $_"
        }
    }

    "set_cpu_freq_tweak" {
        Write-Host "Expondo controle de frequência mínima da CPU no Painel de Energia..."
        try {
            # Expõe o slider de frequência mínima da CPU no Painel de Controle de Energia
            # Attributes = 2 (visível), valor padrão = 1 (oculto)
            $p = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\75b0ae3f-bce0-45a7-8c89-c9611c25e100"
            if (-not (Test-Path $p)) { New-Item -Path $p -Force | Out-Null }
            Set-ItemProperty -Path $p -Name "Attributes" -Value 2 -Type DWord -Force
            Write-Host "Sucesso: Slider de frequência mínima de CPU agora visível no Painel de Energia (Opções de Energia > Configurações avançadas > Processador)."
        }
        catch {
            Write-Error "Falha ao expor frequência de CPU: $_"
        }
    }

    "restore_cpu_freq_tweak" {
        Write-Host "Ocultando slider de frequência mínima da CPU..."
        try {
            $p = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\75b0ae3f-bce0-45a7-8c89-c9611c25e100"
            if (Test-Path $p) { Set-ItemProperty -Path $p -Name "Attributes" -Value 1 -Type DWord -Force }
            Write-Host "Sucesso: Slider de frequência mínima de CPU ocultado (padrão)."
        }
        catch {
            Write-Error "Falha ao restaurar frequência de CPU: $_"
        }
    }

    "set_extended_memory_tweaks" {
        Write-Host "Aplicando otimizações aprofundadas de gerenciamento de memória RAM..."
        try {
            $p = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
            if (-not (Test-Path $p)) { New-Item -Path $p -Force | Out-Null }

            # Não limpar o arquivo de paginação ao desligar (acelera o desligamento)
            Set-ItemProperty -Path $p -Name "ClearPageFileAtShutdown" -Value 0 -Type DWord -Force
            # Desativar cache de sistema grande (melhor para jogos, não para servidores)
            Set-ItemProperty -Path $p -Name "LargeSystemCache" -Value 0 -Type DWord -Force
            # Configuração do pool de memória não paginada
            Set-ItemProperty -Path $p -Name "NonPagedPoolSize" -Value 0 -Type DWord -Force
            Set-ItemProperty -Path $p -Name "NonPagedPoolQuota" -Value 0 -Type DWord -Force
            # Pool de memória paginada maximizado (0xC0 = 192 MB)
            Set-ItemProperty -Path $p -Name "PagedPoolSize" -Value 0xC0 -Type DWord -Force
            Set-ItemProperty -Path $p -Name "PagedPoolQuota" -Value 0 -Type DWord -Force
            # Cache de dados L2 (1024 KB = 0x400)
            Set-ItemProperty -Path $p -Name "SecondLevelDataCache" -Value 0x400 -Type DWord -Force
            # Pool de sessão (0xC0 = 192 MB)
            Set-ItemProperty -Path $p -Name "SessionPoolSize" -Value 0xC0 -Type DWord -Force
            Set-ItemProperty -Path $p -Name "SessionViewSize" -Value 0xC0 -Type DWord -Force
            # Páginas de sistema ilimitadas
            Set-ItemProperty -Path $p -Name "SystemPages" -Value 0xFFFFFFFF -Type DWord -Force
            # Physical Address Extension (PAE)
            Set-ItemProperty -Path $p -Name "PhysicalAddressExtension" -Value 1 -Type DWord -Force
            # Mitigações de CPU Spectre/Meltdown — desativadas para performance máxima
            Set-ItemProperty -Path $p -Name "FeatureSettings" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $p -Name "FeatureSettingsOverride" -Value 3 -Type DWord -Force
            Set-ItemProperty -Path $p -Name "FeatureSettingsOverrideMask" -Value 3 -Type DWord -Force
            Write-Host "[OK] Ajustes de pool e pages de memoria aplicados."

            # Desativar Prefetcher e Superfetch (reduz leituras desnecessarias no SSD)
            $pf = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters"
            if (-not (Test-Path $pf)) { New-Item -Path $pf -Force | Out-Null }
            Set-ItemProperty -Path $pf -Name "EnablePrefetcher" -Value 0 -Type DWord -Force
            Set-ItemProperty -Path $pf -Name "EnableSuperfetch" -Value 0 -Type DWord -Force
            Write-Host "[OK] Prefetcher e Superfetch desativados."

            Write-Host "Sucesso: Otimizações aprofundadas de RAM aplicadas. Reinicie para efeito total."
        }
        catch {
            Write-Error "Falha ao aplicar tweaks de memoria aprofundados: $_"
        }
    }

    "restore_extended_memory_tweaks" {
        Write-Host "Restaurando configurações padrão de memória RAM..."
        try {
            $p = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
            $keysToRemove = @("LargeSystemCache","NonPagedPoolSize","NonPagedPoolQuota","PagedPoolSize",
                              "PagedPoolQuota","SecondLevelDataCache","SessionPoolSize","SessionViewSize",
                              "SystemPages","PhysicalAddressExtension","FeatureSettings",
                              "FeatureSettingsOverride","FeatureSettingsOverrideMask","ClearPageFileAtShutdown")
            foreach ($key in $keysToRemove) {
                Remove-ItemProperty -Path $p -Name $key -ErrorAction SilentlyContinue
            }
            Write-Host "[OK] Chaves de pool e pages removidas."

            $pf = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters"
            if (Test-Path $pf) {
                Set-ItemProperty -Path $pf -Name "EnablePrefetcher" -Value 3 -Type DWord -Force # 3 = padrão Windows
                Set-ItemProperty -Path $pf -Name "EnableSuperfetch" -Value 3 -Type DWord -Force
            }
            Write-Host "[OK] Prefetcher e Superfetch restaurados (valor 3 = padrao Windows)."
            Write-Host "Sucesso: Gerenciamento de memoria redefinido para o padrao de fabrica."
        }
        catch {
            Write-Error "Falha ao restaurar tweaks de memoria: $_"
        }
    }

    default {
        Write-Warning "Ação desconhecida: $Action"
    }
}
