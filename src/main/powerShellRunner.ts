import { spawn } from 'node:child_process'
import path from 'node:path'
import { app } from 'electron'

export interface PowerShellResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export class PowerShellRunner {
  private static scriptsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'scripts')
    : path.join(app.getAppPath(), 'scripts')

  /**
   * Executa um script PowerShell específico da pasta 'scripts/' de forma assíncrona e segura.
   * 
   * @param scriptName Nome do script (ex: "tweaks.ps1")
   * @param args Argumentos nomeados ou posicionais a passar para o script
   * @param onProgress Callback opcional para receber saídas do stdout em tempo real
   */
  public static runScript(
    scriptName: string,
    args: string[] = [],
    onProgress?: (data: string) => void
  ): Promise<PowerShellResult> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.scriptsDir, scriptName)

      // Constrói os argumentos de forma extremamente robusta, envolvendo valores com aspas simples
      const formattedArgs = args.map(arg => {
        if (arg.startsWith('-')) return arg
        return `'${arg.replace(/'/g, "''")}'`
      }).join(' ')

      // Comando unificado de segurança máxima: 
      // 0. Configura o console de saída para UTF-8 de forma mestre, forçando todos os acentos e caracteres especiais a aparecerem corretos na UI.
      // 1. Unblock-File remove a "Mark of the Web" se o instalador foi baixado da internet (impede bloqueio silencioso do Windows).
      // 2. & dispara a execução passando os argumentos de forma robusta a prova de caminhos com espaços.
      const psCommand = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Unblock-File -LiteralPath '${scriptPath.replace(/'/g, "''")}'; & '${scriptPath.replace(/'/g, "''")}' ${formattedArgs}`

      // Parâmetros para garantir que o script rode de forma limpa, ignorando o perfil do usuário
      // e ignorando restrições locais de política de execução (necessário para scripts customizados)
      const spawnArgs = [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        psCommand
      ]

      console.log(`[PowerShell] Disparando script: ${scriptName} com argumentos:`, args)

      const psProcess = spawn('powershell.exe', spawnArgs, {
        cwd: app.isPackaged ? process.resourcesPath : app.getAppPath(),
        env: { ...process.env }
      })

      let stdout = ''
      let stderr = ''

      // Lida com a saída padrão (stdout) em tempo real
      psProcess.stdout.on('data', (data: Buffer) => {
        // Usamos uma decodificação genérica latin1/utf-8 para lidar com caracteres do Windows (CP850 / CP1252)
        const chunk = data.toString('utf-8')
        stdout += chunk
        
        if (onProgress) {
          onProgress(chunk)
        }
      })

      // Lida com erros do terminal (stderr)
      psProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString('utf-8')
      })

      psProcess.on('error', (err) => {
        console.error(`[PowerShell] Erro crítico ao iniciar o processo: ${err.message}`)
        resolve({
          success: false,
          stdout,
          stderr: stderr + `\nErro ao iniciar processo: ${err.message}`,
          exitCode: -1
        })
      })

      psProcess.on('close', (code) => {
        const success = code === 0
        console.log(`[PowerShell] Script ${scriptName} finalizado com código de saída: ${code}`)
        resolve({
          success,
          stdout,
          stderr,
          exitCode: code
        })
      })
    })
  }
}
