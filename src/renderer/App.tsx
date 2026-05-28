import { useState, useEffect } from 'react'

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tweaks' | 'cleaner' | 'hardware' | 'tools' | 'settings' | 'extapps' | 'christiandev'>('dashboard')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return 'dark'
  })
  const [sysInfo, setSysInfo] = useState<{ isAdmin: boolean; platform: string; arch: string; version: string } | null>(null)
  const [hardwareInfo, setHardwareInfo] = useState<{ cpu: string; ramGB: number; gpus: Array<{ name: string; vramGB: number }> } | null>(null)
  const [selectedRam, setSelectedRam] = useState<string>("8GB")
  const [loading, setLoading] = useState<boolean>(true)
  const [outputLog, setOutputLog] = useState<string>('Pronto para otimizar o sistema.\nAguardando comandos...')
  const [executing, setExecuting] = useState<boolean>(false)

  // Estados do sistema de ativação Supabase / HWID
  const [isActivated, setIsActivated] = useState<boolean>(false)
  const [activeKey, setActiveKey] = useState<string>('')
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>('')
  const [activationError, setActivationError] = useState<string>('')
  const [activating, setActivating] = useState<boolean>(false)
  const [checkingActivation, setCheckingActivation] = useState<boolean>(true)
  const [userHWID, setUserHWID] = useState<string>('')
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null)
  // const [licenseDurationDays, setLicenseDurationDays] = useState<number | null>(null)
  const [licenseDaysRemaining, setLicenseDaysRemaining] = useState<number | null>(null)
  const [copiedKey, setCopiedKey] = useState<boolean>(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)

  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({
    CscService: true,
    SCardSvr: true,
    WPCSvc: true,
    Fax: true,
    MapsBroker: true,
    WbioSrvc: false, // Seguro por padrão
    TapiSrv: true,
    Spooler: false,  // Seguro por padrão
    DoSvc: true,
    wuauserv: false  // Seguro por padrão
  })

  const toggleService = (service: string) => {
    setSelectedServices(prev => ({
      ...prev,
      [service]: !prev[service]
    }))
  }

  // Aplica e persiste o tema Claro/Escuro no elemento raiz (HTML)
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  // Carrega os dados nativos do SO via IPC
  useEffect(() => {
    async function loadInfo() {
      try {
        if (window.electronAPI) {
          // 🛡️ Validação automática de licença no boot com tolerância offline
          const savedKey = localStorage.getItem('license_key')
          if (savedKey) {
            const status = await window.electronAPI.verifyKey(savedKey)
            if (status.success) {
              setIsActivated(true)
              setActiveKey(savedKey)
            } else {
              const errorMsg = status.error || ''
              const isNetworkError = errorMsg.toLowerCase().includes('conexão') || 
                                     errorMsg.toLowerCase().includes('rede') || 
                                     errorMsg.toLowerCase().includes('network') || 
                                     errorMsg.toLowerCase().includes('fetch')
              
              if (isNetworkError) {
                // Em caso de falha de conexão de rede, mantém ativado para uso offline temporário
                setIsActivated(true)
                setActiveKey(savedKey)
                logMessage('Modo Offline: Não foi possível conectar ao servidor de licença. Acesso local concedido com base na ativação anterior.')
              } else {
                // A chave foi explicitamente rejeitada/invalidada/expirada pelo banco
                localStorage.removeItem('license_key')
                logMessage(`[Aviso] Licença anterior inválida ou expirada: ${errorMsg}`)
              }
            }
          }
          
          const activeStatus = await window.electronAPI.checkActivationStatus()
          setUserHWID(activeStatus.hwid)
          setIsActivated(activeStatus.isActivated)
          setActiveKey(activeStatus.key)
          setLicenseExpiresAt(activeStatus.expiresAt)
          // setLicenseDurationDays(activeStatus.durationDays)
          setLicenseDaysRemaining(activeStatus.daysRemaining)
          setCheckingActivation(false)

          const info = await window.electronAPI.getInfo()
          setSysInfo(info)
          
          const hw = await window.electronAPI.getHardwareInfo()
          setHardwareInfo(hw)
          
          if (hw && hw.ramGB) {
            if (hw.ramGB <= 4) {
              setSelectedRam("4GB")
            } else if (hw.ramGB <= 6) {
              setSelectedRam("6GB")
            } else if (hw.ramGB <= 8) {
              setSelectedRam("8GB")
            } else if (hw.ramGB <= 12) {
              setSelectedRam("12GB")
            } else {
              setSelectedRam("16GB")
            }
          }
        } else {
          // Fallback para desenvolvimento em browser puro
          setCheckingActivation(false)
          const savedKey = localStorage.getItem('license_key') || 'FREE-KEY'
          setIsActivated(!!localStorage.getItem('license_key'))
          setActiveKey(savedKey)
          setLicenseExpiresAt(savedKey === 'FREE-KEY' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
          // setLicenseDurationDays(savedKey === 'FREE-KEY' ? null : 30)
          setLicenseDaysRemaining(savedKey === 'FREE-KEY' ? null : 30)
          
          setSysInfo({
            isAdmin: true,
            platform: 'win32',
            arch: 'x64',
            version: '1.0.0-mock'
          })
          setHardwareInfo({
            cpu: 'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
            ramGB: 32,
            gpus: [
              { name: 'NVIDIA GeForce RTX 3060', vramGB: 12 }
            ]
          })
          setSelectedRam("16GB")
        }
      } catch (err) {
        console.error('Falha ao obter info do sistema:', err)
      } finally {
        setLoading(false)
        setCheckingActivation(false)
      }
    }
    loadInfo()
  }, [])

  // Função utilitária para registrar logs na UI
  const logMessage = (msg: string) => {
    setOutputLog(prev => `${prev}\n[${new Date().toLocaleTimeString()}] ${msg}`)
  }

  // Executa uma ação de script PowerShell via IPC
  const handleRunScript = async (category: string, action: string, params?: Record<string, unknown>) => {
    if (executing) return
    setExecuting(true)
    logMessage(`Iniciando execução: ${category} -> ${action}...`)
    
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.runScript(category, action, params)
        if (res.success) {
          logMessage(`Sucesso! Código de saída: ${res.exitCode}`)
          if (res.stdout) {
            logMessage(`Saída:\n${res.stdout.trim()}`)
          }
        } else {
          logMessage(`Erro na execução. Código: ${res.exitCode}`)
          if (res.stderr) {
            logMessage(`Detalhes da falha:\n${res.stderr.trim()}`)
          }
        }
      } else {
        // Simulação em browser
        await new Promise(r => setTimeout(r, 1500))
        logMessage(`[SIMULAÇÃO] Executado '${action}' na categoria '${category}' com parâmetros: ${JSON.stringify(params)}`)
      }
    } catch (error: any) {
      logMessage(`Exceção detectada: ${error.message || String(error)}`)
    } finally {
      setExecuting(false)
    }
  }

  // Abre um executável externo da pasta resources/apps via IPC
  const handleLaunchApp = async (appFileName: string) => {
    logMessage(`Abrindo aplicativo externo: ${appFileName}...`)
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.launchApp(appFileName)
        if (res.success) {
          logMessage(`[OK] ${appFileName} aberto com sucesso.`)
        } else {
          logMessage(`[Erro] Não foi possível abrir ${appFileName}: ${res.error || 'Erro desconhecido'}`)
        }
      } else {
        await new Promise(r => setTimeout(r, 800))
        logMessage(`[SIMULAÇÃO] Abriria o app: ${appFileName}`)
      }
    } catch (err: any) {
      logMessage(`Exceção ao abrir app: ${err.message || String(err)}`)
    }
  }

  // Função para ativar o aplicativo via chave de licença e associar o HWID
  const handleVerifyKey = async () => {
    if (activating || !licenseKeyInput.trim()) return
    setActivating(true)
    setActivationError('')
    logMessage(`Verificando chave de ativação: ${licenseKeyInput}...`)
    
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.verifyKey(licenseKeyInput)
        if (res.success) {
          logMessage(`[OK] Aplicativo ativado com sucesso!`)
          localStorage.setItem('license_key', licenseKeyInput)
          const activeStatus = await window.electronAPI.checkActivationStatus()
          setIsActivated(true)
          setActiveKey(licenseKeyInput)
          setLicenseExpiresAt(activeStatus.expiresAt)
          // setLicenseDurationDays(activeStatus.durationDays)
          setLicenseDaysRemaining(activeStatus.daysRemaining)
        } else {
          logMessage(`[Erro] Chave inválida: ${res.error}`)
          setActivationError(res.error || 'Chave de licença inválida.')
        }
      } else {
        // Simulação em browser puro (ativa chaves simuladas)
        await new Promise(r => setTimeout(r, 1500))
        if (licenseKeyInput === 'FREE-KEY' || licenseKeyInput === 'VIP-KEY') {
          setIsActivated(true)
          setActiveKey(licenseKeyInput)
          localStorage.setItem('license_key', licenseKeyInput)
          setLicenseExpiresAt(licenseKeyInput === 'FREE-KEY' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
          // setLicenseDurationDays(licenseKeyInput === 'FREE-KEY' ? null : 30)
          setLicenseDaysRemaining(licenseKeyInput === 'FREE-KEY' ? null : 30)
        } else {
          setActivationError('Chave inválida. Tente FREE-KEY ou VIP-KEY para testes.')
        }
      }
    } catch (err: any) {
      setActivationError('Falha ao comunicar com o servidor de ativação do Supabase.')
    } finally {
      setActivating(false)
    }
  }

  if (checkingActivation) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300 font-sans">
        <div className="w-12 h-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-mono tracking-widest uppercase text-muted">Validando Licença Segura...</p>
      </div>
    )
  }

  if (!isActivated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background font-sans p-6 text-slate-300 relative overflow-hidden transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent)] pointer-events-none"></div>
        
        {/* Caixa de ativação premium em Glassmorphism */}
        <div className="glass max-w-md w-full p-8 rounded-3xl border border-border bg-[#0F1626]/85 relative z-10 text-center flex flex-col items-center shadow-glow-primary">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-accent opacity-75"></div>
          
          {/* Logo / Ícone */}
          <div className="w-20 h-20 flex items-center justify-center mb-6">
            <img src="/logo-128.png" alt="Own Optimizer Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_18px_rgba(155,61,255,0.7)]" />
          </div>

          <h2 className="font-outfit font-bold text-2xl text-white tracking-wide mb-1">Own Optimizer</h2>
          <span className="text-xs text-muted tracking-wider uppercase font-mono mb-6">Windows Debloater & Gaming Pack</span>
          
          <div className="w-full text-left space-y-4 mb-6">
            <div className="bg-[#161F33] p-4 rounded-xl border border-border">
              <h4 className="text-xs font-bold text-slate-200 uppercase mb-1">Ativação Obrigatória</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                Esta cópia do software de alta performance necessita de uma chave de licença válida para rodar as otimizações profundas de kernel, barramento e hardware.
              </p>
            </div>
            
            <div>
              <label className="text-[10px] text-muted tracking-wider uppercase font-mono mb-1.5 block">Insira sua Chave (Key)</label>
              <input 
                type="text"
                placeholder="Ex: KEY-XXXX-XXXX-XXXX"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>

            {activationError && (
              <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded-xl text-xs flex items-start space-x-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="leading-snug">{activationError}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleVerifyKey}
            disabled={activating || !licenseKeyInput.trim()}
            className="w-full py-3 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-sm rounded-xl disabled:opacity-50 transition-all shadow-glow-primary flex items-center justify-center space-x-2"
          >
            {activating ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                <span>Validando com Supabase...</span>
              </>
            ) : (
              <span>Ativar Otimizador</span>
            )}
          </button>

          {/* Exibição do HWID do PC */}
          <div className="mt-8 border-t border-border/60 pt-4 w-full text-center">
            <span className="text-[9px] text-muted tracking-wider uppercase font-mono block mb-1">Identificação da Máquina (HWID)</span>
            <code className="text-[10px] text-slate-400 font-mono select-all bg-background/55 border border-border/40 px-2.5 py-1 rounded-md block truncate">
              {userHWID || 'Gerando ID único de hardware...'}
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-background overflow-hidden text-slate-200 relative">
      
      {/* 1. Barra Lateral de Navegação (Glassmorphism) */}
      <aside className="hidden md:flex w-64 border-r border-border bg-[#0E1524] flex-col justify-between p-6 h-full select-none shrink-0">
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin">
          {/* Logo / Título */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo-64.png" alt="Own Optimizer" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(155,61,255,0.8)]" />
            </div>
            <div>
              <h1 className="font-bold text-white font-outfit tracking-wide text-lg">Own Optimizer</h1>
              <span className="text-xs text-muted">Windows Debloater</span>
            </div>
          </div>

          {/* Abas */}
          <nav className="space-y-2">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { id: 'tweaks', name: 'Otimizações (Tweaks)', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
              { id: 'cleaner', name: 'Limpeza', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
              { id: 'hardware', name: 'Desempenho & Jogos', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              { id: 'settings', name: 'Ajustes do Windows', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
              { id: 'tools', name: 'Utilitários & DNS', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'extapps', name: 'Apps Externos', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
              { id: 'christiandev', name: 'Christian Dev', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-start text-left space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary/20 to-secondary/10 border-l-4 border-primary text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
                </svg>
                <span className="leading-tight">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Informações da Licença Ativa (Design Ultra Premium Aberto - Corrige Cutoffs) */}
        <div className="mt-5 mb-5 p-4 bg-slate-100/85 dark:bg-[#0F1626]/90 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl relative overflow-hidden shadow-lg shadow-black/5 dark:shadow-black/35 group transition-all duration-300 shrink-0">
          {/* Brilho radial de fundo sutil */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/15 to-secondary/15 rounded-full blur-2xl pointer-events-none transition-transform duration-500 group-hover:scale-125"></div>
          
          {/* Cabeçalho */}
          <div className="flex items-center space-x-3 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-glow-primary shrink-0 transition-transform duration-300 group-hover:rotate-6">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-800 dark:text-white tracking-widest uppercase font-outfit block">Licença Ativa</span>
              <span className="text-[9px] text-slate-500 dark:text-muted tracking-wider uppercase font-mono">Premium Account</span>
            </div>
          </div>
          
          {/* Detalhes da Licença */}
          <div className="space-y-2.5 text-xs">
            {/* Linha 1: Validade */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-950/30 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/30">
              <span className="text-slate-600 dark:text-slate-400 text-[10px]">Validade</span>
              <span className={`font-bold text-[11px] font-mono px-2 py-0.5 rounded-md ${licenseDaysRemaining !== null ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
                {licenseDaysRemaining !== null ? `${licenseDaysRemaining} ${licenseDaysRemaining === 1 ? 'Dia' : 'Dias'}` : 'Vitalícia'}
              </span>
            </div>
            
            {/* Linha 2: Expiração (só exibe se houver data) */}
            {licenseExpiresAt && (
              <div className="flex justify-between items-center text-[10px] px-1">
                <span className="text-slate-400 dark:text-slate-500">Expira em</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">{new Date(licenseExpiresAt).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            
            {/* Linha 3: Chave com botão copiar premium */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/60">
              <span className="text-[9px] text-slate-500 tracking-wider uppercase font-mono block mb-1.5 px-1">Chave de Ativação</span>
              <div className="flex items-center justify-between bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl pl-3 pr-1.5 py-1.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px] select-all truncate max-w-[130px]" title={activeKey}>
                  {activeKey}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(activeKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className={`p-1.5 rounded-lg transition-all shrink-0 ${copiedKey ? 'bg-accent/20 text-accent' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-800'}`}
                  title={copiedKey ? "Copiado!" : "Copiar Chave"}
                >
                  {copiedKey ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Informações de privilégio administrativas no rodapé */}
        <div className="pt-4 border-t border-border shrink-0">
          {loading ? (
            <span className="text-xs text-muted">Carregando dados...</span>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${sysInfo?.isAdmin ? 'bg-accent shadow-glow-accent' : 'bg-danger'}`}></span>
                <span className="text-xs font-semibold text-slate-300">
                  {sysInfo?.isAdmin ? 'Elevado a Administrador' : 'Usuário Comum'}
                </span>
              </div>
              <p className="text-[10px] text-muted tracking-wider uppercase font-mono">
                OS: {sysInfo?.platform} ({sysInfo?.arch})
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Menu Superior Mobile */}
      <header className="md:hidden h-16 border-b border-border bg-[#0E1524] flex items-center justify-between px-6 shrink-0 z-40 select-none">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo-64.png" alt="Own Optimizer" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(155,61,255,0.9)]" />
          </div>
          <div>
            <h1 className="font-bold text-white font-outfit text-sm tracking-wide">Own Optimizer</h1>
          </div>
        </div>
        
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-slate-800/80 hover:bg-slate-700/80 border border-border text-slate-300 hover:text-white rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Drawer Menu Flutuante Mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop escuro com efeito blur */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          ></div>
          
          {/* Corpo do Drawer */}
          <div className="relative w-72 max-w-xs bg-[#0E1524] border-r border-border h-full flex flex-col justify-between p-6 shadow-2xl select-none z-50 overflow-y-auto">
            <div className="space-y-6">
              {/* Cabeçalho do Drawer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 flex items-center justify-center">
                    <img src="/logo-64.png" alt="Own Optimizer" className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(155,61,255,0.9)]" />
                  </div>
                  <div>
                    <h1 className="font-bold text-white font-outfit tracking-wide text-base">Own Optimizer</h1>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-border/40"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Abas no Drawer */}
              <nav className="space-y-2">
                {[
                  { id: 'dashboard', name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                  { id: 'tweaks', name: 'Otimizações (Tweaks)', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                  { id: 'cleaner', name: 'Limpeza', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
                  { id: 'hardware', name: 'Desempenho & Jogos', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                  { id: 'settings', name: 'Ajustes do Windows', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
                  { id: 'tools', name: 'Utilitários & DNS', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { id: 'extapps', name: 'Apps Externos', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
                  { id: 'christiandev', name: 'Christian Dev', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-start text-left space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-primary/20 to-secondary/10 border-l-4 border-primary text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
                    </svg>
                    <span className="leading-tight">{tab.name}</span>
                  </button>
                ))}
              </nav>

              {/* Licença no Drawer */}
              <div className="p-4 bg-slate-100/85 dark:bg-[#0F1626]/90 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl relative overflow-hidden shadow-lg shadow-black/5 dark:shadow-black/35 group transition-all duration-300 shrink-0">
                {/* Brilho radial de fundo sutil */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-xl pointer-events-none transition-transform duration-500 group-hover:scale-125"></div>

                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-glow-primary shrink-0 transition-transform duration-300 group-hover:rotate-6">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-white tracking-widest uppercase font-outfit block">Licença Ativa</span>
                    <span className="text-[8px] text-slate-500 dark:text-muted tracking-wider uppercase font-mono block">Premium Account</span>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-slate-950/30 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/30 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 text-[10px]">Validade</span>
                  <span className={`font-bold text-[10px] font-mono px-2 py-0.5 rounded-md ${licenseDaysRemaining !== null ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
                    {licenseDaysRemaining !== null ? `${licenseDaysRemaining} ${licenseDaysRemaining === 1 ? 'Dia' : 'Dias'}` : 'Vitalícia'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé do Drawer */}
            <div className="pt-4 border-t border-border shrink-0 mt-8">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${sysInfo?.isAdmin ? 'bg-accent shadow-glow-accent' : 'bg-danger'}`}></span>
                <span className="text-xs font-semibold text-slate-300">
                  {sysInfo?.isAdmin ? 'UAC Elevado' : 'Usuário Comum'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Banner Superior / Cabeçalho */}
        <header className="h-16 border-b border-border bg-[#0E1524]/60 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <h2 className="font-outfit font-bold text-xs sm:text-sm md:text-xl text-white tracking-wide uppercase truncate mr-2">
            {activeTab === 'dashboard' && 'Dashboard Principal'}
            {activeTab === 'tweaks' && 'Otimizações do Sistema (Tweaks)'}
            {activeTab === 'cleaner' && 'Limpeza de Arquivos Temporários'}
            {activeTab === 'hardware' && 'Foco em Desempenho e Xeon/FiveM'}
            {activeTab === 'settings' && 'Ajustes de Configurações do Windows'}
            {activeTab === 'tools' && 'Utilitários Rápidos & DNS'}
            {activeTab === 'extapps' && 'Apps Externos & Ferramentas do Pack'}
            {activeTab === 'christiandev' && 'Desenvolvedor & Créditos'}
          </h2>
          <div className="flex items-center space-x-3">
            {/* Botão de Alternância de Tema Claro/Escuro */}
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="p-2 bg-border hover:bg-slate-700/50 rounded-xl transition-all duration-200 text-slate-300 hover:text-white flex items-center justify-center shadow-sm focus:outline-none"
              title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              {theme === 'dark' ? (
                // Ícone de Sol (Modo Claro)
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                // Ícone de Lua (Modo Escuro)
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <span className="px-3 py-1 bg-border rounded-full text-xs font-mono text-primary font-bold">
              v{sysInfo?.version || '1.0.0'}
            </span>
          </div>
        </header>

        {/* Área de Visualização Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">

          {/* CONTEÚDO: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Painel de Especificações de Hardware (Glassmorphism Neon) */}
              <div className="glass p-6 rounded-2xl border border-border bg-[#0F1626]/80 relative overflow-hidden">
                {/* Linha de brilho estético no topo */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-transparent opacity-60"></div>
                
                <div className="flex items-center space-x-2 mb-6">
                  <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <h3 className="font-outfit font-bold text-white text-sm tracking-wide uppercase">Especificações do Computador</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Card CPU */}
                  <div className="bg-[#161F33] p-4 rounded-xl border border-border flex items-start space-x-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted tracking-wider uppercase font-mono">Processador (CPU)</span>
                      <h4 className="font-semibold text-xs text-white mt-1 leading-snug break-words">
                        {hardwareInfo?.cpu || 'Carregando CPU...'}
                      </h4>
                    </div>
                  </div>

                  {/* Card RAM */}
                  <div className="bg-[#161F33] p-4 rounded-xl border border-border flex items-start space-x-3">
                    <div className="p-2.5 rounded-lg bg-secondary/10 text-secondary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted tracking-wider uppercase font-mono">Memória RAM</span>
                      <h4 className="font-bold text-sm text-white mt-1">
                        {hardwareInfo ? `${hardwareInfo.ramGB} GB RAM` : 'Carregando RAM...'}
                      </h4>
                    </div>
                  </div>

                  {/* Cards GPU(s) */}
                  {hardwareInfo?.gpus.map((gpu, index) => (
                    <div key={index} className="bg-[#161F33] p-4 rounded-xl border border-border flex items-start space-x-3 lg:col-span-2">
                      <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-muted tracking-wider uppercase font-mono">Placa de Vídeo (GPU)</span>
                        <h4 className="font-semibold text-xs text-white mt-1 truncate">
                          {gpu.name}
                        </h4>
                        <p className="text-[10px] text-accent font-bold font-mono mt-0.5">
                          {gpu.vramGB > 0 ? `${gpu.vramGB} GB VRAM` : 'Integrada / Compartilhada'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Fallback se não carregar nenhuma GPU */}
                  {(!hardwareInfo || hardwareInfo.gpus.length === 0) && (
                    <div className="bg-[#161F33] p-4 rounded-xl border border-border flex items-start space-x-3 lg:col-span-2">
                      <div className="p-2.5 rounded-lg bg-muted/10 text-muted">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted tracking-wider uppercase font-mono">Placa de Vídeo (GPU)</span>
                        <h4 className="font-semibold text-xs text-slate-400 mt-1">
                          Carregando GPU...
                        </h4>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Grid inferior com Cards de Status do App */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Card de Status de Segurança */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <span className="text-xs text-muted tracking-wider uppercase font-mono">Privilégios UAC</span>
                  <h3 className="text-xl font-bold text-white mt-1">Status de Elevação</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    {sysInfo?.isAdmin 
                      ? "O aplicativo está rodando com privilégios elevados. Todas as otimizações profundas de sistema estão liberadas." 
                      : "Sem privilégios elevados. Alguns recursos essenciais do Windows Update e Registro podem falhar."}
                  </p>
                </div>
                <div className="mt-6">
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold ${sysInfo?.isAdmin ? 'bg-accent/15 text-accent border border-accent/25' : 'bg-danger/15 text-danger border border-danger/25'}`}>
                    {sysInfo?.isAdmin ? "UAC Elevado" : "Requer Administrador"}
                  </div>
                </div>
              </div>

              {/* Card de Informações Básicas do Sistema */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <span className="text-xs text-muted tracking-wider uppercase font-mono">SO & Arquitetura</span>
                  <h3 className="text-xl font-bold text-white mt-1">Dados da Máquina</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-400 font-mono">
                    <p>Plataforma: <span className="text-slate-200">{sysInfo?.platform}</span></p>
                    <p>Arquitetura: <span className="text-slate-200">{sysInfo?.arch}</span></p>
                    <p>Modo de Execução: <span className="text-slate-200">{sysInfo?.isAdmin ? 'ADMINISTRADOR' : 'DESENVOLVEDOR'}</span></p>
                  </div>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={() => handleRunScript('utils', 'dns_flush')}
                    className="text-xs text-primary hover:text-white font-bold flex items-center space-x-1 transition-all"
                  >
                    <span>Limpar DNS rápido →</span>
                  </button>
                </div>
              </div>

              {/* Card de Manutenção Rápida */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <span className="text-xs text-muted tracking-wider uppercase font-mono">Proteção e Restauração</span>
                  <h3 className="text-xl font-bold text-white mt-1">Ponto de Restauração</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    Crie um ponto de restauração seguro do Windows antes de fazer alterações no registro.
                  </p>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'create_restore_point')}
                    disabled={executing}
                    className="w-full py-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/95 hover:to-secondary/95 text-white font-bold rounded-xl text-xs transition-all shadow-glow-primary disabled:opacity-50"
                  >
                    Criar Ponto de Restauração
                  </button>
                </div>
              </div>

            </div></div>
          )}

          {/* CONTEÚDO: Tweaks */}
          {activeTab === 'tweaks' && (
            <div className="space-y-6">
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-white mb-2">Desativar Telemetria e Coleta de Dados</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Desativa serviços de rastreamento do Windows, serviços de telemetria da Nvidia/AMD e chaves de registro que enviam diagnósticos para a Microsoft.
                </p>
                <button 
                  onClick={() => handleRunScript('tweaks', 'disable_telemetry')}
                  disabled={executing}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all"
                >
                  Aplicar Tweaks de Telemetria
                </button>
              </div>

              <div className="bg-panel p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-white mb-2">Remover Bloatware Nativo (Aplicativos Desnecessários)</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Desinstala em massa aplicativos empacotados com o Windows que consomem RAM e disco (como Cortana, Solitaire, Mixed Reality, etc.).
                </p>
                <button 
                  onClick={() => handleRunScript('tweaks', 'remove_bloatware')}
                  disabled={executing}
                  className="px-4 py-2 bg-danger hover:bg-danger/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all"
                >
                  Remover Bloatwares Nativos
                </button>
              </div>

              <div className="bg-panel p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-white mb-2">Desativar Serviços Inúteis do Windows</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Desativa serviços secundários pesados de indexação (<b>wsearch</b> / Windows Search), relatórios de erro (<b>WerSvc</b>) e caching redundante (<b>SysMain</b> / Superfetch). Excelente para eliminar o problema de 100% de uso de disco e poupar RAM em discos rígidos e SSDs.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'disable_bloat_services')}
                    disabled={executing}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all"
                  >
                    Desativar Serviços Inúteis
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_bloat_services')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card Desativar Windows Game DVR */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-white mb-2">Desativar Windows Game DVR</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Desliga a gravação automática em segundo plano e a telemetria do Xbox Game DVR. Evita gargalos de renderização, liberando CPU e VRAM essenciais para obter taxas de quadros (FPS) estáveis e fluidos em seus jogos.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'disable_game_dvr')}
                    disabled={executing}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all"
                  >
                    Desativar Game DVR
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_game_dvr')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* CONTEÚDO: Cleaner */}
          {activeTab === 'cleaner' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Arquivos Temporários */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Arquivos Temporários e Cache</h3>
                  <p className="text-sm text-slate-400">
                    Limpa a pasta TEMP do usuário, TEMP do sistema, cache de navegação local e arquivos de despejo de erros (*Memory Dumps*).
                  </p>
                </div>
                <button 
                  onClick={() => handleRunScript('cleaner', 'temp_files')}
                  disabled={executing}
                  className="w-full mt-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                >
                  Limpar Arquivos Temporários
                </button>
              </div>

              {/* Card 2: Cache do Windows Update */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Cache do Windows Update</h3>
                  <p className="text-sm text-slate-400">
                    Para e reinicia o serviço do Windows Update (wuauserv), excluindo toda a pasta de distribuição de software (`C:\Windows\SoftwareDistribution`). Excelente para liberar gigabytes de disco.
                  </p>
                </div>
                <button 
                  onClick={() => handleRunScript('cleaner', 'update_cache')}
                  disabled={executing}
                  className="w-full mt-6 py-2.5 bg-secondary hover:bg-secondary/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                >
                  Limpar Cache de Atualizações
                </button>
              </div>

              {/* Card 3: Event Logs e Logs do Windows */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Event Logs e Arquivos de Logs</h3>
                  <p className="text-sm text-slate-400">
                    Exclui recursivamente arquivos com extensão .log inúteis do sistema e limpa todos os canais de auditoria do Visualizador de Eventos (Event Viewer), otimizando serviços.
                  </p>
                </div>
                <button 
                  onClick={() => handleRunScript('cleaner', 'clear_event_logs')}
                  disabled={executing}
                  className="w-full mt-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                >
                  Limpar Logs e Eventos
                </button>
              </div>

              {/* Card 4: Arquivos de Pré-carregamento (Prefetch) */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Cache do Prefetch</h3>
                  <p className="text-sm text-slate-400">
                    Limpa de forma dedicada a pasta C:\Windows\Prefetch contendo caches de inicializações antigas. O Windows reconstruirá esse cache de forma limpa, eliminando travamentos de boots.
                  </p>
                </div>
                <button 
                  onClick={() => handleRunScript('cleaner', 'clear_prefetch')}
                  disabled={executing}
                  className="w-full mt-6 py-2.5 bg-secondary hover:bg-secondary/90 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                >
                  Limpar Cache Prefetch
                </button>
              </div>

            </div>
          )}

          {/* CONTEÚDO: Hardware e FiveM */}
          {activeTab === 'hardware' && (
            <div className="space-y-6">
              {/* Card Otimização SvcHost do Registro baseada em RAM */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-secondary rounded-full shadow-glow-secondary"></span>
                  <h3 className="text-lg font-bold text-white">Otimização de Processos do Windows (SvcHost Split)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Força o agrupamento de processos de serviços nativos do Windows de acordo com a sua memória RAM. Reduz drasticamente a quantidade total de processos ativos no Gerenciador de Tarefas, liberando CPU e RAM residual para maior estabilidade de quadros em jogos (como o FiveM) e em processadores multicore (como o Xeon).
                </p>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
                  <div className="flex flex-col">
                    <label className="text-xs text-muted font-mono uppercase mb-1">Selecionar Perfil de RAM</label>
                    <select
                      value={selectedRam}
                      onChange={(e) => setSelectedRam(e.target.value)}
                      className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all font-mono"
                    >
                      <option value="4GB">Perfil 4 GB RAM</option>
                      <option value="6GB">Perfil 6 GB RAM</option>
                      <option value="8GB">Perfil 8 GB RAM</option>
                      <option value="12GB">Perfil 12 GB RAM</option>
                      <option value="16GB">Perfil 16 GB+ RAM (Sugerido p/ Xeon)</option>
                    </select>
                  </div>
                  
                  {hardwareInfo && (
                    <div className="bg-background/40 border border-dashed border-border rounded-xl px-4 py-2.5 flex flex-col justify-center">
                      <span className="text-[10px] text-muted tracking-wider uppercase font-mono leading-none">RAM Detectada</span>
                      <span className="text-xs font-bold text-primary mt-1">{hardwareInfo.ramGB} GB RAM (Sugerido: {hardwareInfo.ramGB <= 4 ? '4GB' : hardwareInfo.ramGB <= 6 ? '6GB' : hardwareInfo.ramGB <= 8 ? '8GB' : hardwareInfo.ramGB <= 12 ? '12GB' : '16GB'})</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      const thresholdMap: Record<string, string> = {
                        "4GB": "68764420",
                        "6GB": "103355478",
                        "8GB": "137922056",
                        "12GB": "307767570",
                        "16GB": "376926742"
                      }
                      handleRunScript('tweaks', 'set_svchost_threshold', { threshold: thresholdMap[selectedRam] })
                    }}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                  >
                    Aplicar Otimização de Processos
                  </button>
                  
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_svchost_threshold')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card Ajustes de Latência BCD */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-secondary rounded-full shadow-glow-secondary"></span>
                  <h3 className="text-lg font-bold text-white">Ajustes de Latência BCD (Timers do Sistema)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Desativa o <b>Dynamic Tick</b> da CPU e força a utilização do <b>Platform Tick</b> de alta precisão (HPET) através do bcdedit do Windows. Reduz de forma sensível a latência de entrada do teclado/mouse e estabiliza o frametime, eliminando micro-travamentos (*stuttering*) nos jogos e aplicações de alta prioridade.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_bcd_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                  >
                    Aplicar BCD Tweaks
                  </button>
                  
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_bcd_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card Desativar Estimativa de Energia */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-primary rounded-full shadow-glow-primary"></span>
                  <h3 className="text-lg font-bold text-white">Desativar Estimativa de Energia (Energy Estimation)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Desativa o monitoramento constante de estimativa e telemetria de energia da CPU no Windows (<b>EnergyEstimationEnabled = 0</b>). Altamente recomendado especificamente para computadores de mesa (Desktops) e processadores Intel Xeon para poupar threads e ciclos redundantes do processador.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'disable_energy_estimation')}
                    disabled={executing}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                  >
                    Desativar Estimativa de Energia
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_energy_estimation')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card Latência de Rede e Agendador (SystemProfile) */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-accent rounded-full shadow-glow-accent"></span>
                  <h3 className="text-lg font-bold text-white">Latência de Rede e Agendador (SystemProfile)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Desativa a limitação automática de rede (<b>NetworkThrottlingIndex</b>) e otimiza a responsividade do sistema para <b>100% de foco no jogo ativo</b>. Reduz de forma maciça a latência de rede (ping), evita perda de pacotes e prioriza threads e GPU na execução do seu jogo (Fortnite).
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_system_profile_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-accent to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-accent"
                  >
                    Otimizar Latência & Rede
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_system_profile_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card Otimização de Kernel de Memória e Barramento I/O */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-secondary rounded-full shadow-glow-secondary"></span>
                  <h3 className="text-lg font-bold text-white">Otimização de Kernel de Memória e Barramento I/O</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Força o Windows a manter os drivers e kernel do sistema <b>100% na memória RAM física</b> (<b>DisablePagingExecutive = 1</b>), evitando o envio para arquivo de paginação do disco lento, e maximiza o cache do barramento de entrada e saída (E/S). Elimina atrasos críticos de entrada de periféricos.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_advanced_memory_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                  >
                    Otimizar Kernel & E/S
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_advanced_memory_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-secondary rounded-full"></span>
                  <h3 className="text-lg font-bold text-white">Unparking de Núcleos (CPU Core Unparking)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Força todos os núcleos lógicos e físicos de processadores multicore (como Intel Xeon e AMD Ryzen) a operarem a 100% de atividade, eliminando delays de acordar threads paradas durante jogos ou renderizações pesadas.
                </p>
                <button 
                  onClick={() => handleRunScript('hardware', 'unpark_cores')}
                  disabled={executing}
                  className="px-4 py-2 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                >
                  Ativar Unpark de Núcleos
                </button>
              </div>

              {/* Painel do Gerenciador de Planos de Energia Gamer */}
              <div className="glass p-6 rounded-2xl border border-border bg-[#0F1626]/80 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-secondary via-primary to-transparent opacity-60"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="font-outfit font-bold text-white text-sm tracking-wide uppercase">Gerenciador de Planos de Energia Gamer</h3>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Gerencie o consumo energético de sua CPU para extrair o máximo de desempenho e estabilidade de frames em jogos competitivos. Escolha entre o plano nativo Ultimate Performance ou o refinado Ultra Performance Revision.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Opção 1: Desempenho Máximo Nativo */}
                  <div className="bg-[#161F33] p-5 rounded-xl border border-border flex flex-col justify-between h-56">
                    <div>
                      <h4 className="text-sm font-bold text-white">Plano de Desempenho Máximo</h4>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        Cria e ativa o plano nativo oculto do Windows (**Ultimate Performance**). Remove limitações de energia para extrair FPS estáveis e evitar throttling.
                      </p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <button 
                        onClick={() => handleRunScript('hardware', 'ultimate_power')}
                        disabled={executing}
                        className="flex-1 py-1.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                      >
                        Ativar Plano
                      </button>
                      <button 
                        onClick={() => handleRunScript('hardware', 'restore_ultimate_power')}
                        disabled={executing}
                        className="py-1.5 px-3 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-xs rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>

                  {/* Opção 2: Ultra Performance Custom (Revision) */}
                  <div className="bg-[#161F33] p-5 rounded-xl border border-border flex flex-col justify-between h-56">
                    <div>
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-white">Ultra Performance (Revision)</h4>
                        <span className="text-[9px] text-accent font-bold font-mono uppercase bg-accent/15 px-1.5 py-0.5 rounded border border-accent/20">Custom Pack</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        Esquema otimizado que refina os tempos de subida de frequência da CPU (clock) para diminuir delays físicos e latências em jogos (como Fortnite e GTA V/FiveM).
                      </p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <button 
                        onClick={() => handleRunScript('hardware', 'ultra_performance')}
                        disabled={executing}
                        className="flex-1 py-1.5 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                      >
                        Ativar Ultra Performance
                      </button>
                      <button 
                        onClick={() => handleRunScript('hardware', 'restore_ultra_performance')}
                        disabled={executing}
                        className="py-1.5 px-3 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-xs rounded-xl border border-red-500/20 transition-all"
                      >
                        Desinstalar
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Card Otimização de Disco NTFS */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-primary rounded-full shadow-glow-primary"></span>
                  <h3 className="text-lg font-bold text-white">Otimização de Disco e Sistema de Arquivos NTFS</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-normal">
                  Desativa a atualização constante de data/hora a cada arquivo lido (<b>disableLastAccess</b>) e a criação de nomes de arquivos legados compatíveis com DOS (<b>disable8dot3</b>) no NTFS. Poupa gravação redundante e acelera o barramento de leitura de HDs e SSDs.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('hardware', 'optimize_ntfs')}
                    disabled={executing}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                  >
                    Otimizar Disco NTFS
                  </button>
                  <button 
                    onClick={() => handleRunScript('hardware', 'restore_ntfs')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card 1: Prioridade de Threads */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-accent rounded-full shadow-glow-accent"></span>
                  <h3 className="text-lg font-bold text-white">Prioridade de Threads e Periféricos</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-normal">
                  Eleva a prioridade de agendamento de threads de hardware para tempo real (ThreadPriority = 31) nos drivers de periféricos USB (mouse e teclado), adaptadores de rede (NDIS) e vídeo Nvidia (nvlddmkm). Reduz drasticamente o input lag de cliques e frametime.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_thread_priority_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-accent to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-accent"
                  >
                    Ativar Prioridade Máxima
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_thread_priority_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card 2: Telemetria de GPU */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-primary rounded-full shadow-glow-primary"></span>
                  <h3 className="text-lg font-bold text-white">Desativar Telemetria de Energia da GPU</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-normal">
                  Desativa a telemetria e o rastreamento constante de energia da placa de vídeo (driver GpuEnergyDrv). Poupa processamentos residuais e threads da CPU para jogos.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_gpu_energy_tweak')}
                    disabled={executing}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                  >
                    Desativar Telemetria
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_gpu_energy_tweak')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card 3: Desativar Hibernação */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-secondary rounded-full shadow-glow-secondary"></span>
                  <h3 className="text-lg font-bold text-white">Desativar Hibernação do Windows (Liberar SSD)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-normal">
                  Desativa a hibernação do sistema e deleta permanentemente o arquivo oculto massivo hiberfil.sys na raiz do disco. Excelente para poupar de 6 a 12 GB do seu SSD gamer de forma imediata.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'disable_hibernation')}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                  >
                    Desativar Hibernação
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_hibernation')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card: Tweaks Nvidia Completo */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-accent rounded-full shadow-glow-accent"></span>
                  <h3 className="text-lg font-bold text-white">Tweaks Avançados de Driver Nvidia</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-normal">
                  Pacote completo de otimizações para placa de vídeo Nvidia: desativa <b>SilkSmoothness</b> (interpolação de frames que adiciona latência), <b>DisplayPowerSaving</b> (throttling automático da GPU), <b>preempção CUDA</b> (causa stuttering em DX12/Vulkan), <b>WriteCombing</b>, <b>HDCP</b> e telemetria de energia da GPU. Exclusivo para placas Nvidia (GTX/RTX).
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_nvidia_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-accent to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-accent"
                  >
                    Aplicar Pack Nvidia
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_nvidia_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

              {/* Card: Frequência de CPU */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-primary rounded-full shadow-glow-primary"></span>
                  <h3 className="text-lg font-bold text-white">Expor Controle de Frequência de CPU</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-normal">
                  Expõe o slider de <b>frequência mínima do processador</b> nas Configurações Avançadas do Plano de Energia do Windows (oculto por padrão). Permite configurar manualmente que a CPU jamais desça abaixo de uma frequência mínima, eliminando delays de ramp-up de clock em jogos.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_cpu_freq_tweak')}
                    disabled={executing}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                  >
                    Expor Slider de Frequência
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_cpu_freq_tweak')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Ocultar)
                  </button>
                </div>
              </div>

              {/* Card: RAM Aprofundada */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2 h-2 bg-secondary rounded-full shadow-glow-secondary"></span>
                  <h3 className="text-lg font-bold text-white">Otimização Aprofundada de RAM (Pool & Pages)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4 font-normal">
                  Ajustes avançados de gerenciamento de memória: maximiza o <b>Pool de Sessão</b> e <b>Paged Pool</b>, desativa <b>Prefetcher</b> e <b>Superfetch</b> para SSDs, configura <b>SystemPages</b> como ilimitado e desativa limpeza do arquivo de paginação ao desligar. Melhor para máquinas com 8 GB+ de RAM e SSD.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleRunScript('tweaks', 'set_extended_memory_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                  >
                    Aplicar Otimização Aprofundada
                  </button>
                  <button 
                    onClick={() => handleRunScript('tweaks', 'restore_extended_memory_tweaks')}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* CONTEÚDO: Apps Externos */}
          {activeTab === 'extapps' && (
            <div className="space-y-6">
              {/* Cabeçalho informativo */}
              <div className="glass p-5 rounded-2xl border border-border bg-[#0F1626]/80 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-primary to-transparent opacity-60"></div>
                <div className="flex items-center space-x-3 mb-2">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <h3 className="font-outfit font-bold text-white text-sm tracking-wide uppercase">Ferramentas Externas Incluídas</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aplicativos do pack gamer incluídos diretamente no Own Optimizer. Clique em <b>Abrir</b> para executar cada ferramenta sem precisar navegar por pastas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* MemReduct */}
                <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-white">MemReduct</h3>
                      <span className="text-[9px] text-accent font-bold font-mono uppercase bg-accent/15 px-1.5 py-0.5 rounded border border-accent/20">Monitor</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Gerenciador de RAM com interface gráfica. Libera memória física acumulada com 1 clique e monitora o uso em tempo real. Precisa ser instalado (x64).
                    </p>
                  </div>
                  <button
                    onClick={() => handleLaunchApp('memreduct_x64.exe')}
                    className="mt-4 w-full py-2 bg-gradient-to-r from-accent to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-glow-accent"
                  >
                    Abrir MemReduct (x64)
                  </button>
                </div>

                {/* ReduceMemory */}
                <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-white">Reduce Memory</h3>
                      <span className="text-[9px] text-secondary font-bold font-mono uppercase bg-secondary/15 px-1.5 py-0.5 rounded border border-secondary/20">Portátil</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Libera RAM física instantaneamente com 1 clique. Versão portátil, não requer instalação. Mais simples e direto que o MemReduct.
                    </p>
                  </div>
                  <button
                    onClick={() => handleLaunchApp('ReduceMemory.exe')}
                    className="mt-4 w-full py-2 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-glow-secondary"
                  >
                    Abrir Reduce Memory
                  </button>
                </div>

                {/* WUB - Windows Update Blocker */}
                <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-white">WUB — Bloqueador de Windows Update</h3>
                      <span className="text-[9px] text-danger font-bold font-mono uppercase bg-danger/15 px-1.5 py-0.5 rounded border border-danger/20">Avançado</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Desativa ou reativa o Windows Update com interface gráfica simples. Bloqueia downloads automáticos que causam lag durante jogos e consome banda da internet.
                    </p>
                  </div>
                  <button
                    onClick={() => handleLaunchApp('Wub_x64.exe')}
                    className="mt-4 w-full py-2 bg-danger hover:bg-danger/90 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Abrir WUB (x64)
                  </button>
                </div>

                {/* 10AppsManager */}
                <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-white">10AppsManager</h3>
                      <span className="text-[9px] text-primary font-bold font-mono uppercase bg-primary/15 px-1.5 py-0.5 rounded border border-primary/20">Debloat</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Remove aplicativos nativos da Microsoft Store em massa com interface visual. Elimina apps inúteis pré-instalados como Cortana, Xbox, Solitaire, etc.
                    </p>
                  </div>
                  <button
                    onClick={() => handleLaunchApp('10AppsManager.exe')}
                    className="mt-4 w-full py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all shadow-glow-primary"
                  >
                    Abrir 10AppsManager
                  </button>
                </div>

                {/* Cleaners Windows */}
                <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between md:col-span-2">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-white">Cleaners Windows (Intel &amp; AMD)</h3>
                      <span className="text-[9px] text-accent font-bold font-mono uppercase bg-accent/15 px-1.5 py-0.5 rounded border border-accent/20">Universal</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ferramenta de limpeza de sistema completa incluída no pack gamer. Remove arquivos temporários, registros órfãos, cache de sistema e resíduos de software desinstalado. Compatível com Intel e AMD.
                    </p>
                  </div>
                  <button
                    onClick={() => handleLaunchApp('CleanersWindows.exe')}
                    className="mt-4 w-full py-2 bg-gradient-to-r from-accent to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all shadow-glow-accent"
                  >
                    Abrir Cleaners Windows
                  </button>
                </div>

              </div>

              {/* Seção: Melhores Resoluções */}
              <div className="bg-panel p-6 rounded-2xl border border-border">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="font-outfit font-bold text-white tracking-wide">Melhores Resoluções por Monitor</h3>
                </div>
                <p className="text-xs text-slate-400 mb-5">Resoluções gamer recomendadas para cada tipo de monitor. Resoluções menores aumentam o FPS reduzindo a carga de renderização da GPU.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Monitor 768p', badge: 'bg-primary/20 text-primary border-primary/30', resolutions: ['1178×768','1176×768 ⭐','1113×768','1152×768','1024×768'] },
                    { label: 'Monitor 900p', badge: 'bg-secondary/20 text-secondary border-secondary/30', resolutions: ['1380×900 ⭐','1280×900','1280×960','1280×1024','1600×900'] },
                    { label: 'Monitor 1080p', badge: 'bg-accent/20 text-accent border-accent/30', resolutions: ['1750×1080 ⭐','1920×1440','1811×1080','1798×1080','1444×1080','1280×1080'] },
                    { label: 'Ultra Baixa (Max FPS)', badge: 'bg-danger/20 text-danger border-danger/30', resolutions: ['960×540','768×768','800×600','720×480','640×580'] },
                  ].map(group => (
                    <div key={group.label} className="bg-background/60 rounded-xl border border-border p-4">
                      <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${group.badge} mb-3 inline-block`}>{group.label}</span>
                      <ul className="space-y-1">
                        {group.resolutions.map(r => (
                          <li key={r} className="text-xs text-slate-300 font-mono">{r}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* CONTEÚDO: Utilitários & DNS */}
          {activeTab === 'tools' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Liberar RAM de Processos (COM Surrogate / UWP Broker) */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white mb-2">Liberar RAM (COM Surrogate / UWP Broker)</h3>
                    <span className="text-[9px] text-accent font-bold font-mono uppercase bg-accent/15 px-1.5 py-0.5 rounded border border-accent/20">Seguro</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed font-normal">
                    Finaliza instâncias ativas e acumuladas de <code className="text-primary font-mono text-xs font-bold">dllhost.exe</code> e <code className="text-primary font-mono text-xs font-bold">runtimebroker.exe</code> em segundo plano para liberar memória física e ciclos de CPU imediatamente antes de rodar seu jogo.
                  </p>
                  
                  {/* Nota didática e protetora de integridade de IA */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-[10px] text-slate-400 leading-relaxed italic mb-4">
                    🛡️ <b>Proteção de Integridade da IA:</b> Scripts comuns da internet tentam DELETAR fisicamente estes arquivos do System32. A exclusão de arquivos vitais corrompe o Windows permanentemente (quebrando o menu Iniciar e calculadora). Nosso aplicativo executa o encerramento seguro e temporário das instâncias, mantendo seu sistema 100% íntegro e estável.
                  </div>
                </div>
                <button 
                  onClick={() => handleRunScript('utils', 'kill_brokers')}
                  disabled={executing}
                  className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                >
                  Liberar RAM de Processos Secundários
                </button>
              </div>
              
              {/* DNS Manager */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Gerenciador de DNS</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Altere o DNS do seu adaptador de rede principal com um clique para diminuir o ping e aumentar a segurança de navegação.
                  </p>
                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {[
                      { name: 'Cloudflare (1.1.1.1)', ips: { primary: '1.1.1.1', secondary: '1.0.0.1' } },
                      { name: 'Google DNS (8.8.8.8)', ips: { primary: '8.8.8.8', secondary: '8.8.4.4' } },
                    ].map(dns => (
                      <button
                        key={dns.name}
                        onClick={() => handleRunScript('utils', 'set_dns', dns.ips)}
                        disabled={executing}
                        className="w-full text-left py-2 px-3 bg-background hover:bg-slate-800 text-xs rounded-lg transition-colors border border-border flex justify-between items-center"
                      >
                        <span>{dns.name}</span>
                        <span className="text-[10px] text-primary font-mono">{dns.ips.primary}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Utilitários de Diagnóstico */}
              <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Diagnóstico Integrado</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Ferramentas essenciais nativas do Windows para restaurar integridade de arquivos corrompidos.
                  </p>
                  <div className="space-y-2">
                    <button 
                      onClick={() => handleRunScript('utils', 'sfc_scan')}
                      disabled={executing}
                      className="w-full text-left py-2 px-3 bg-background hover:bg-slate-800 text-xs rounded-lg transition-colors border border-border"
                    >
                      Executar SFC /SCANNOW
                    </button>
                    <button 
                      onClick={() => handleRunScript('utils', 'dns_flush')}
                      disabled={executing}
                      className="w-full text-left py-2 px-3 bg-background hover:bg-slate-800 text-xs rounded-lg transition-colors border border-border"
                    >
                      Flush DNS (Limpar DNS)
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* CONTEÚDO: Ajustes do Windows */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Cabeçalho explicativo */}
              <div className="glass p-6 rounded-2xl border border-border bg-[#0F1626]/80 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-secondary via-primary to-transparent opacity-60"></div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <h3 className="font-outfit font-bold text-white text-base tracking-wide uppercase">Ajustes do Windows (Settings Tweaks)</h3>
                </div>
                <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
                  Integração completa com as principais telas de personalização e privacidade do Windows. Você pode abrir o painel nativo do Windows para fazer os ajustes manualmente ou aplicar a otimização de Registro de alta performance diretamente em segundo plano.
                </p>
              </div>

              {/* Painel do Desativador de Serviços do Windows (Avançado) */}
              <div className="glass p-6 rounded-2xl border border-border bg-[#0F1626]/80 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-transparent opacity-60"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  <h3 className="font-outfit font-bold text-white text-sm tracking-wide uppercase">Desativador de Serviços do Windows (Avançado)</h3>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Gerencie em lote a inicialização de serviços de telemetria, impressão, rede e atualizações recomendados para otimização gamer profunda. Marque os serviços que deseja desativar.
                </p>

                {/* Lista de Checkboxes em Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'CscService', name: 'Arquivos Offline', desc: 'Sincroniza arquivos de rede no disco local.' },
                    { id: 'SCardSvr', name: 'Cartão Inteligente', desc: 'Suporte a chaves de segurança NFC físicas.' },
                    { id: 'WPCSvc', name: 'Controle dos Pais', desc: 'Filtros de conteúdo e limites do sistema.' },
                    { id: 'Fax', name: 'Fax', desc: 'Serviço obsoleto de transmissão de documentos.' },
                    { id: 'MapsBroker', name: 'Mapas Offline', desc: 'Gerencia o download e buscas em mapas.' },
                    { id: 'WbioSrvc', name: 'Biometria (Windows Hello)', desc: 'Leitores de digital e reconhecimento facial.', warning: true },
                    { id: 'TapiSrv', name: 'Telefonia', desc: 'Suporte a modems e linhas telefônicas de cobre.' },
                    { id: 'Spooler', name: 'Spooler de Impressão', desc: 'Gerenciador e fila de impressoras ativas.', warning: true },
                    { id: 'DoSvc', name: 'Otimização de Entrega', desc: 'Compartilha atualizações na rede local.' },
                    { id: 'wuauserv', name: 'Windows Update', desc: 'Serviço de atualizações do sistema do Windows.', warning: true }
                  ].map(srv => (
                    <div 
                      key={srv.id} 
                      onClick={() => toggleService(srv.id)}
                      className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none flex items-start space-x-3 ${
                        selectedServices[srv.id] 
                          ? 'bg-primary/5 dark:bg-primary/5 border-primary/30' 
                          : 'bg-slate-100/70 dark:bg-[#121927] border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedServices[srv.id] || false}
                        onChange={() => {}} // Tratado no div onClick
                        className="mt-1 rounded border-slate-600 text-primary focus:ring-primary focus:ring-opacity-25"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-semibold text-xs transition-colors duration-200 ${
                            selectedServices[srv.id] 
                              ? 'text-slate-800 dark:text-white' 
                              : 'text-slate-700 dark:text-slate-200'
                          }`}>{srv.name}</span>
                          {srv.warning && (
                            <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">Atenção</span>
                          )}
                        </div>
                        <p className={`text-[10px] mt-1 leading-snug transition-colors duration-200 ${
                          selectedServices[srv.id] 
                            ? 'text-slate-600 dark:text-slate-300' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>{srv.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      const list = Object.keys(selectedServices).filter(k => selectedServices[k]).join(",")
                      handleRunScript('tweaks', 'disable_custom_services', { services: list })
                    }}
                    disabled={executing || Object.values(selectedServices).filter(Boolean).length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                  >
                    Desativar Serviços Selecionados
                  </button>
                  <button 
                    onClick={() => {
                      const list = Object.keys(selectedServices).filter(k => selectedServices[k]).join(",")
                      handleRunScript('tweaks', 'restore_custom_services', { services: list })
                    }}
                    disabled={executing || Object.values(selectedServices).filter(Boolean).length === 0}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Restaurar Padrão (Desfazer)
                  </button>
                  <button 
                    onClick={() => handleRunScript('utils', 'open_settings', { uri: 'services.msc' })}
                    disabled={executing}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs rounded-xl border border-border/40 border-dashed transition-all"
                  >
                    Abrir Painel de Serviços (Nativo)
                  </button>
                </div>
              </div>

              {/* Grid de Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Ativar Modo de Jogo */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #1</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Recomendado</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Ativar Modo de Jogo</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      O Modo de Jogo otimiza a alocação de hardware para o jogo ativo, garantindo FPS mais altos e frametimes estáveis.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'set_game_mode')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:gaming-gamemode' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_game_mode')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Apps em Segundo Plano */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #2</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Recomendado</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Apps em Segundo Plano</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Impede que aplicativos nativos inúteis (como Cortana e Mapas) fiquem consumindo memória e CPU em segundo plano.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'disable_background_apps')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:privacy-backgroundapps' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_background_apps')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Apps de Inicialização */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #3</span>
                      <span className="text-[10px] text-accent font-bold font-mono uppercase bg-accent/10 px-2 py-0.5 rounded">Manual</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Apps de Inicialização</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Gerencie quais aplicativos iniciam junto com o Windows. Desativar programas desnecessários acelera o boot do computador.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:startupapps' })}
                      disabled={executing}
                      className="w-full py-2 bg-gradient-to-r from-secondary to-primary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-secondary"
                    >
                      Gerenciar Inicialização (Painel)
                    </button>
                    <p className="text-[10px] text-muted text-center italic mt-1">Este ajuste deve ser feito sob a preferência do usuário.</p>
                  </div>
                </div>

                {/* 4. Efeito de Transparência */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #4</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono uppercase bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">Opcional</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Efeitos de Transparência</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Desativar as transparências da barra de tarefas e menus poupa ciclos gráficos do Desktop Windows Manager (DWM).
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'disable_transparency')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:personalization-colors' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_transparency')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Desativar Notificações */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #5</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Recomendado</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Desativar Notificações</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Desativa notificações flutuantes e anúncios do Windows que causam micro-travamentos (*stutters*) durante jogos competitivos.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'disable_notifications')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:notifications' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_notifications')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. Desativar Modo Tablet */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #6</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono uppercase bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">Opcional</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Desativar Modo Tablet</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Força o uso do layout clássico de Desktop e impede transições automáticas voltadas a dispositivos híbridos com tela tátil.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'disable_tablet_mode')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:tabletmode' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_tablet_mode')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* 7. Configurações de Privacidade */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #7</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Recomendado</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Configurações de Privacidade</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Desativa rastreadores de ID de Anúncios e telemetria de escrita nativos, melhorando a privacidade do usuário da interface do Windows.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'disable_ui_privacy')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:privacy' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_ui_privacy')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* 8. Teclas de Aderência */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #8</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Recomendado</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Teclas de Aderência (Teclado)</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Desativa popups e atalhos de acessibilidade de teclado (*Sticky/Filter/Toggle Keys*), eliminando atrasos no registro físico de teclas.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'disable_sticky_keys')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:easeofaccess-keyboard' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_sticky_keys')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

                {/* 9. Bing na Pesquisa do Iniciar */}
                <div className="bg-panel p-5 rounded-2xl border border-border flex flex-col justify-between h-72">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-primary font-bold font-mono tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded">Ajuste #9</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Recomendado</span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-3">Bing no Menu Iniciar</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Desativa a busca na web pelo Bing e Cortana no menu iniciar. Acelera drasticamente a busca local por programas e pastas.
                    </p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handleRunScript('tweaks', 'disable_bing_search')}
                      disabled={executing}
                      className="w-full py-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all shadow-glow-primary"
                    >
                      Otimizar Automaticamente
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRunScript('utils', 'open_settings', { uri: 'ms-settings:search' })}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[10px] rounded-xl border border-border transition-all"
                      >
                        Abrir Windows
                      </button>
                      <button 
                        onClick={() => handleRunScript('tweaks', 'restore_bing_search')}
                        disabled={executing}
                        className="py-1.5 bg-transparent hover:bg-red-500/15 text-red-400 hover:text-red-300 font-semibold text-[10px] rounded-xl border border-red-500/20 transition-all"
                      >
                        Desfazer
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
 
          {/* CONTEÚDO: Christian Dev */}
          {activeTab === 'christiandev' && (
            <div className="space-y-6">
              <div className="glass p-8 rounded-2xl border border-border bg-[#0F1626]/80 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-accent opacity-70"></div>
                
                {/* Avatar / Ícone Estilizado */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-glow-primary mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>

                <h3 className="font-outfit font-bold text-3xl text-white tracking-wide mb-2">Christian Dev</h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
                  Desenvolvedor principal do Own Optimizer & Windows Debloater. Focado em otimização gamer, latência extrema de barramentos de hardware e estabilização de frametimes.
                </p>

                {/* Link do Instagram com estilo premium */}
                <a 
                  href="https://www.instagram.com/ogch7_" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-glow-primary flex items-center space-x-2 mb-12 transform hover:scale-105 duration-200"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  <span>Siga no Instagram @ogch7_</span>
                </a>

                {/* Nome do segundo desenvolvedor bem pequeno */}
                <div className="text-[10px] text-muted font-mono tracking-wider">
                  Co-desenvolvido por <span className="text-slate-400 font-semibold">Klebber</span>
                </div>
              </div>
            </div>
          )}
 
          {/* console de saída / Log */}
          <div className="mt-8">
            <h4 className="text-xs text-muted tracking-wider uppercase font-mono mb-2">Terminal de Saída de Processos</h4>
            <div className="h-44 bg-slate-50 dark:bg-black rounded-xl p-4 border border-slate-200 dark:border-border font-mono text-xs overflow-y-auto leading-relaxed select-text shadow-inner">
              <pre className="text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap font-mono">{outputLog}</pre>
            </div>
          </div>

        </div>
      </main>

    </div>
  )
}
