# Own Optimizer Desktop 🚀

O **Own Optimizer** é um aplicativo desktop avançado projetado para realizar otimizações profundas, manutenção e debloat do sistema operacional Windows. 

Diferente de otimizadores genéricos, o Own Optimizer atua diretamente nos barramentos de hardware, registros do sistema, prioridades de CPU e serviços do Windows por meio de scripts PowerShell nativos, garantindo o máximo de performance.

---

## 🏗️ Arquitetura e Tecnologias

O aplicativo foi construído com foco em performance, modernidade e segurança extrema:

- **Frontend:** React, TypeScript, TailwindCSS e Vite (para uma interface moderna, rápida e responsiva).
- **Backend/Desktop:** Electron (gerencia o ciclo de vida da janela, ponte segura IPC e integração com o sistema operacional).
- **Integração de Sistema:** Scripts nativos em PowerShell e utilitários executáveis em C++ (allowlist controlada).
- **Segurança e Licenciamento:** Supabase (PostgreSQL RPC). O aplicativo utiliza um sistema de validação de licença inquebrável atrelado ao Hardware ID (HWID) da placa-mãe via hash SHA-256.

## 🛡️ Segurança e Blindagem (Backend-Driven)

O Own Optimizer adota uma postura de segurança **Zero Trust** entre a interface (UI) e o processo principal (Main Process):

1. **Requisito de Administrador:** O aplicativo verifica nativamente o acesso administrativo (via utilitário `fltmc`). Se não estiver rodando como Administrador, o processo é encerrado de forma segura.
2. **Validação de Licença em Nuvem:** Nenhuma otimização ou script PowerShell é executado se a licença não for validada diretamente no servidor do Supabase através de chamadas RPC blindadas.
3. **Allowlist de Executáveis:** O lançamento de ferramentas de terceiros (como limpadores de memória) é rigorosamente controlado por uma lista de permissões no backend.

---

## 🛠️ Instalação e Desenvolvimento

### Pré-requisitos
- Node.js (v20 ou superior recomendado)
- Sistema Operacional: **Windows**
- Uma chave válida configurada no `.env` para o Supabase (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/corollapng/own-optimizer.git
   cd own-optimizer
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o Servidor de Desenvolvimento:**
   > **⚠️ IMPORTANTE:** Você deve abrir o seu terminal (CMD, PowerShell ou terminal do VS Code) **como Administrador** para que o aplicativo funcione!
   ```bash
   npm run dev
   ```

4. **Compilar (Build) para Produção:**
   Para gerar o instalador final `.exe` para os clientes:
   ```bash
   npm run package
   ```
   O instalador (NSIS) será gerado dentro da pasta `dist-app`.

---

## 📂 Estrutura de Diretórios Principal

- `src/main/` - Código do processo principal do Electron (`main.ts`), ponte IPC e validadores.
- `src/renderer/` - Código da interface do usuário em React.
- `scripts/` - Scripts PowerShell (`.ps1`) utilizados para otimizações de rede, CPU, debloat, etc.
- `resources/apps/` - Executáveis externos autorizados (como `memreduct_x64.exe`).
- `supabase/` - (Se aplicável) Migrations e funções RPC do banco de dados.

---

## 📜 Licença

Proprietário. Todos os direitos reservados.
