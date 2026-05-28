import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { PowerShellRunner } from './powerShellRunner'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import ws from 'ws'

// Polipreenchimento (polyfill) de WebSocket no ambiente Node < 22 para compatibilidade com o Supabase
// @ts-ignore
global.WebSocket = ws

// 1. Definição do Diretório de Distribuição e Recursos
process.env.DIST_ELECTRON = app.isPackaged
  ? path.join(app.getAppPath(), 'dist-electron')
  : path.join(__dirname, '../')

process.env.DIST = app.isPackaged
  ? path.join(app.getAppPath(), 'dist')
  : path.join(process.env.DIST_ELECTRON, '../dist')

process.env.VITE_PUBLIC = app.isPackaged 
  ? process.env.DIST 
  : path.join(process.env.DIST_ELECTRON, '../public')

// =========================================================================
// 1.1 Configuração Segura e Blindagem de Licença via Supabase
// =========================================================================
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let isKeyVerified = false
let activeLicenseKey = ''
let cachedHWID = ''

// Função inquebrável de leitura de HWID da placa-mãe hasheado em SHA-256
function getHWID(): string {
  if (cachedHWID) return cachedHWID
  try {
    const uuid = execSync('powershell -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { encoding: 'utf8' }).trim()
    if (uuid && uuid.length > 5) {
      cachedHWID = crypto.createHash('sha256').update(uuid).digest('hex')
      return cachedHWID
    }
  } catch (err) {
    console.error("Falha ao obter HWID nativo:", err)
  }
  const fallbackString = process.arch + process.platform + (process.env.COMPUTERNAME || 'generic_machine')
  cachedHWID = crypto.createHash('sha256').update(fallbackString).digest('hex')
  return cachedHWID
}

// Validador de Licença seguro no backend do Node.js chamando a RPC Postgres
async function verifyLicenseKey(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 🛡️ Sanitização e Validação Rígida de Entrada
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-]/g, '').trim().toUpperCase()
    if (!sanitizedKey) {
      return { success: false, error: 'A chave não pode estar vazia.' }
    }
    if (sanitizedKey.length < 5 || sanitizedKey.length > 40) {
      return { success: false, error: 'Comprimento da chave inválido.' }
    }

    const myHWID = getHWID()

    // Invoca a Função RPC segura executada no servidor Postgres
    const { data, error } = await supabase
      .rpc('activate_license_key', { p_key_code: sanitizedKey, p_hwid: myHWID })

    if (error) {
      console.error("Falha ao invocar RPC activate_license_key:", error)
      const errorMsg = error.message || ''
      const isNetworkErr = errorMsg.toLowerCase().includes('fetch') || 
                           errorMsg.toLowerCase().includes('network') || 
                           errorMsg.toLowerCase().includes('connection')
      
      if (isNetworkErr) {
        return { success: false, error: 'Erro de conexão ou de rede ao validar a chave.' }
      }
      return { success: false, error: 'Chave inválida ou erro no validador do servidor.' }
    }

    // A RPC retorna um objeto JSON com success e error
    const result = data as { success: boolean; error?: string; message?: string }
    if (!result || !result.success) {
      return { success: false, error: result?.error || 'Chave inválida ou não encontrada.' }
    }

    isKeyVerified = true
    activeLicenseKey = sanitizedKey
    return { success: true }
  } catch (err: any) {
    console.error("Falha física de conexão na validação da chave:", err)
    return { success: false, error: 'Erro de conexão ou de rede ao validar a chave.' }
  }
}

let mainWindow: BrowserWindow | null = null

// 2. Método Nativo e Seguro para Verificar Privilégios de Administrador no Windows
function isAdmin(): boolean {
  try {
    // fltmc é um utilitário do sistema nativo para gerenciar filtros de disco.
    // Executá-lo sem argumentos exige permissões administrativas e falhará se não estiver elevado.
    execSync('fltmc', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// 3. Método para Exibir Alerta de Administrador Requerido no Windows
function elevatePrivileges(): void {
  // Exibimos uma caixa de diálogo nativa explicativa informando a necessidade de privilégios de Admin.
  // Isso impede que o aplicativo suma ou feche de forma totalmente silenciosa na máquina do usuário.
  dialog.showErrorBox(
    'Privilégios de Administrador Necessários',
    'O Windows impediu a execução com privilégios de Administrador.\n\nO Own Optimizer realiza otimizações profundas no sistema (Registro, barramentos de hardware, prioridades de CPU e serviços), necessitando obrigatoriamente de privilégios elevados para funcionar.\n\nPor favor, feche esta mensagem, clique com o botão direito no ícone do aplicativo e escolha a opção "Executar como Administrador".'
  )
  app.quit()
}

// 4. Fluxo de Inicialização do Electron
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: "Windows Own Optimizer & Debloater",
    frame: true, // Mantemos as bordas padrão por estabilidade, mas estilizaremos a barra no futuro
    webPreferences: {
      // Regras Cruciais de Segurança do Electron
      contextIsolation: true,
      nodeIntegration: false,
      preload: app.isPackaged
        ? path.join(app.getAppPath(), 'dist-electron', 'main', 'preload.js')
        : path.join(__dirname, 'preload.js')
    }
  })

  // Intercepta qualquer tentativa de abrir novas janelas (target="_blank") e as abre no navegador padrão do SO
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Remove o menu superior padrão no modo de produção para uma UI moderna e minimalista
  if (app.isPackaged) {
    mainWindow.setMenu(null)
  }

  // Habilita ou desabilita ferramentas de desenvolvedor (DevTools) de acordo com o ambiente
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// =========================================================================
// 5. Tratamento de Elevação Administrativa Antes de Inicializar
// =========================================================================
if (process.platform === 'win32' && !isAdmin()) {
  // Se estiver no Windows e não estiver elevado, solicita permissão e encerra
  elevatePrivileges()
} else {
  // Caso contrário, inicializa o aplicativo normalmente
  app.whenReady().then(() => {
    createWindow()
    
    // Registra manipuladores IPC iniciais para teste
    setupIPC()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// =========================================================================
// 6. Configuração dos Canais de Comunicação IPC (Ponte Segura com a UI)
// =========================================================================
function setupIPC(): void {
  // Retorna informações básicas do sistema e privilégios para a UI
  ipcMain.handle('system:getInfo', () => {
    return {
      isAdmin: isAdmin(),
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion()
    }
  })

  // Retorna informações avançadas de hardware em JSON via CIM do PowerShell
  ipcMain.handle('system:getHardwareInfo', async () => {
    try {
      const psCommand = `
        $cpu = (Get-CimInstance Win32_Processor).Name;
        $ram = [Math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1);
        $gpus = foreach ($g in (Get-CimInstance Win32_VideoController)) {
            $n = $g.Name;
            $vramBytes = 0;
            try {
                $subkeys = Get-ChildItem -LiteralPath 'HKLM:\\\\SYSTEM\\\\CurrentControlSet\\\\Control\\\\Class\\\\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue;
                foreach ($sub in $subkeys) {
                    $prop = Get-ItemProperty -LiteralPath $sub.PSPath -ErrorAction SilentlyContinue;
                    if ($prop -and ($prop.DriverDesc -eq $n -or $prop.DriverDesc -like ('*' + $n.Split(' ')[0] + '*'))) {
                        $qw = $prop.'HardwareInformation.qwMemorySize';
                        if ($qw -gt 0) { $vramBytes = $qw; break }
                    }
                }
            } catch {};
            if ($vramBytes -eq 0 -or $null -eq $vramBytes) { $vramBytes = $g.AdapterRAM };
            [PSCustomObject]@{
                name = $n;
                vramGB = [Math]::Round($vramBytes / 1GB, 1)
            }
        };
        $hardware = [PSCustomObject]@{
            cpu = $cpu;
            ramGB = $ram;
            gpus = @($gpus)
        };
        $hardware | ConvertTo-Json -Compress
      `
      // Executa a query nativa de forma limpa e síncrona no backend
      const output = execSync(`powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/\n/g, ' ')}"`, { encoding: 'utf8' })
      return JSON.parse(output.trim())
    } catch (err: any) {
      console.error("[main.ts] Erro ao buscar especificações de hardware:", err)
      return {
        cpu: "Processador Genérico",
        ramGB: 8,
        gpus: [{ name: "Adaptador de Vídeo Básico Microsoft", vramGB: 1 }]
      }
    }
  })

  // Canal de teste de comando recebido
  ipcMain.handle('system:testPowerShell', async (_event, commandText: string) => {
    console.log(`[IPC] Recebido comando para teste: ${commandText}`)
    return {
      success: true,
      message: `Comando '${commandText}' recebido e aceito pelo Processo Principal elevado.`
    }
  })

  // Canal principal para disparar scripts PowerShell de debloat/otimização de forma segura
  ipcMain.handle('powershell:run', async (_event, { scriptCategory, actionName, params }) => {
    // 🛡️ BLINDAGEM MÁXIMA DE BACKEND: Recusa execução nativa se a licença não for válida
    if (!isKeyVerified) {
      console.warn(`[IPC powershell:run] TENTATIVA DE BURLA: Comando PowerShell recusado por falta de ativação de chave. Ação: ${actionName}`)
      return {
        success: false,
        stdout: '',
        stderr: 'BLINDAGEM NATIVA: Acesso recusado. Por favor, insira uma chave de ativação válida para liberar as otimizações.',
        exitCode: -99
      }
    }

    console.log(`[IPC] Recebido chamado PowerShell. Categoria: ${scriptCategory}, Ação: ${actionName}`)
    const scriptName = `${scriptCategory}.ps1`
    
    // Constrói os argumentos no formato PowerShell (-Action actionName -ParamName paramValue)
    const args: string[] = []
    if (actionName) {
      args.push('-Action', actionName)
    }
    
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        args.push(`-${key}`, String(value))
      }
    }

    try {
      const result = await PowerShellRunner.runScript(scriptName, args)
      return result
    } catch (err: any) {
      return {
        success: false,
        stdout: '',
        stderr: err.message || String(err),
        exitCode: -2
      }
    }
  })

  // Canal para abrir aplicativos externos da pasta resources/apps de forma segura
  ipcMain.handle('apps:launch', async (_event, appFileName: string) => {
    // 🛡️ BLINDAGEM MÁXIMA DE BACKEND: Recusa abertura de executáveis se a licença não for válida
    if (!isKeyVerified) {
      console.warn(`[IPC apps:launch] TENTATIVA DE BURLA: Abertura de app recusada por falta de ativação de chave. App: ${appFileName}`)
      return { success: false, error: 'BLINDAGEM NATIVA: Acesso recusado. O aplicativo precisa estar ativado por uma chave válida.' }
    }

    // Allowlist de segurança — apenas executáveis conhecidos e aprovados podem ser abertos
    const allowedApps = [
      'memreduct_x64.exe',
      'ReduceMemory.exe',
      '10AppsManager.exe',
      'CleanersWindows.exe',
      'Wub_x64.exe'
    ]

    if (!allowedApps.includes(appFileName)) {
      console.warn(`[IPC apps:launch] Tentativa de abrir app não autorizado: ${appFileName}`)
      return { success: false, error: 'Aplicativo não está na lista de permitidos.' }
    }

    const appsDir = app.isPackaged
      ? path.join(process.resourcesPath, 'apps')
      : path.join(app.getAppPath(), 'resources', 'apps')

    const appPath = path.join(appsDir, appFileName)
    console.log(`[IPC apps:launch] Abrindo: ${appPath}`)

    try {
      // Remove a "Mark of the Web" do executável antes de abri-lo, evitando bloqueios silenciosos do Windows SmartScreen
      try {
        execSync(`powershell -NoProfile -NonInteractive -Command "Unblock-File -LiteralPath '${appPath.replace(/'/g, "''")}'"`)
      } catch (unblockErr) {
        console.warn("[apps:launch] Falha ao tentar desbloquear o executável:", unblockErr)
      }

      const errMsg = await shell.openPath(appPath)
      if (errMsg) {
        return { success: false, error: errMsg }
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) }
    }
  })

  // =========================================================================
  // 6.1 Canais IPC para Licenciamento e Validação Supabase
  // =========================================================================
  ipcMain.handle('license:verify', async (_event, key: string) => {
    const res = await verifyLicenseKey(key)
    return res
  })

  ipcMain.handle('license:checkStatus', async () => {
    const myHWID = getHWID()
    if (!activeLicenseKey) {
      return {
        isActivated: false,
        key: '',
        hwid: myHWID,
        expiresAt: null,
        durationDays: null,
        daysRemaining: null
      }
    }

    try {
      // 🛡️ Executa a RPC segura check_license_status no Supabase
      const { data, error } = await supabase
        .rpc('check_license_status', { p_key_code: activeLicenseKey, p_hwid: myHWID })

      if (error) {
        console.error("Falha ao invocar RPC check_license_status:", error)
        const errorMsg = error.message || ''
        const isNetworkErr = errorMsg.toLowerCase().includes('fetch') || 
                             errorMsg.toLowerCase().includes('network') || 
                             errorMsg.toLowerCase().includes('enotfound') || 
                             errorMsg.toLowerCase().includes('econnrefused') || 
                             errorMsg.toLowerCase().includes('etimedout') ||
                             errorMsg.toLowerCase().includes('connection')
                             
        if (isNetworkErr) {
          // Em caso de oscilação física de rede, preserva a sessão de ativação pré-existente
          return {
            isActivated: isKeyVerified,
            key: activeLicenseKey,
            hwid: myHWID,
            expiresAt: null,
            durationDays: null,
            daysRemaining: null
          }
        }

        isKeyVerified = false
        activeLicenseKey = ''
        return {
          isActivated: false,
          key: '',
          hwid: myHWID,
          expiresAt: null,
          durationDays: null,
          daysRemaining: null
        }
      }

      // A RPC retorna o objeto formatado com { isActivated, key, expiresAt, durationDays, daysRemaining }
      const res = data as {
        isActivated: boolean
        key?: string
        expiresAt?: string | null
        durationDays?: number | null
        daysRemaining?: number | null
      }

      if (!res || !res.isActivated) {
        isKeyVerified = false
        activeLicenseKey = ''
        return {
          isActivated: false,
          key: '',
          hwid: myHWID,
          expiresAt: null,
          durationDays: null,
          daysRemaining: null
        }
      }

      isKeyVerified = true
      return {
        isActivated: true,
        key: res.key || activeLicenseKey,
        hwid: myHWID,
        expiresAt: res.expiresAt || null,
        durationDays: res.durationDays || null,
        daysRemaining: res.daysRemaining !== undefined ? res.daysRemaining : null
      }
    } catch (err) {
      console.error("Erro ao validar licença em background:", err)
      return {
        isActivated: isKeyVerified,
        key: activeLicenseKey,
        hwid: myHWID,
        expiresAt: null,
        durationDays: null,
        daysRemaining: null
      }
    }
  })
}
