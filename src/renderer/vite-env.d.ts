/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getInfo: () => Promise<{
      isAdmin: boolean
      platform: string
      arch: string
      version: string
    }>
    getHardwareInfo: () => Promise<{
      cpu: string
      ramGB: number
      gpus: Array<{
        name: string
        vramGB: number
      }>
    }>
    testPowerShell: (commandText: string) => Promise<{
      success: boolean
      message: string
    }>
    runScript: (
      scriptCategory: string,
      actionName: string,
      params?: Record<string, unknown>
    ) => Promise<{
      success: boolean
      stdout: string
      stderr: string
      exitCode: number | null
    }>
    launchApp: (appFileName: string) => Promise<{
      success: boolean
      error?: string
    }>
    verifyKey: (key: string) => Promise<{
      success: boolean
      error?: string
    }>
    checkActivationStatus: () => Promise<{
      isActivated: boolean
      key: string
      hwid: string
      expiresAt: string | null
      durationDays: number | null
      daysRemaining: number | null
    }>
  }
}
