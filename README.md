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

## 🛠️ Instalação e Uso

### Pré-requisitos
- Sistema Operacional: **Windows 10 ou 11**
- Uma **Chave de Licença Válida** (fornecida pelo administrador) para ativar o software.

### Como Baixar e Instalar

1. Acesse a aba de [Releases do repositório](https://github.com/corollapng/own-optimizer/releases).
2. Baixe o instalador executável da versão mais recente (ex: `Own Optimizer Setup 1.0.0.exe`).
3. Execute o arquivo baixado para instalar o aplicativo no seu computador.
4. **⚠️ IMPORTANTE:** Como o Own Optimizer atua profundamente no sistema, clique com o botão direito no ícone do aplicativo após a instalação e selecione **"Executar como Administrador"**.
5. Na tela inicial do aplicativo, insira a sua **Chave de Licença** para ativar e liberar todas as ferramentas de otimização.

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
