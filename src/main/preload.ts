import { contextBridge, ipcRenderer } from 'electron'

// Exposição segura de APIs e canais IPC para o Processo Renderer (React)
contextBridge.exposeInMainWorld('electronAPI', {
  // Retorna informações básicas do sistema e status de privilégios de Admin
  getInfo: () => ipcRenderer.invoke('system:getInfo'),

  // Retorna especificações nativas de hardware
  getHardwareInfo: () => ipcRenderer.invoke('system:getHardwareInfo'),
  
  // Envia um comando simples para teste do processo principal
  testPowerShell: (commandText: string) => ipcRenderer.invoke('system:testPowerShell', commandText),
  
  // Canal futuro de execução de scripts de automação PowerShell
  runScript: (scriptCategory: string, actionName: string, params?: Record<string, unknown>) => 
    ipcRenderer.invoke('powershell:run', { scriptCategory, actionName, params }),

  // Abre um executável externo da pasta resources/apps de forma segura
  launchApp: (appFileName: string) => ipcRenderer.invoke('apps:launch', appFileName),

  // Canal seguro de verificação de chave Supabase
  verifyKey: (key: string) => ipcRenderer.invoke('license:verify', key),

  // Canal seguro de verificação de status de chave e HWID
  checkActivationStatus: () => ipcRenderer.invoke('license:checkStatus')
})

