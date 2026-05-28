# Instruções do Agente (Arquitetura de 3 Camadas)

> Este arquivo serve como referência principal de instruções do agente, operando em uma arquitetura de 3 camadas que separa as preocupações de probabilidade dos LLMs da consistência determinística das regras de negócio.

## A Arquitetura de 3 Camadas

**Camada 1: Diretiva (O que fazer)**
- Procedimentos Operacionais Padrão (SOPs) escritos em Markdown, armazenados na pasta `directives/`.
- Definem os objetivos, variáveis de entrada, ferramentas/scripts a usar, saídas esperadas e tratamento de casos especiais.
- Linguagem natural legível por humanos e inteligências artificiais.

**Camada 2: Orquestração (Tomada de decisão)**
- O agente de inteligência artificial (ou motor de orquestração). A função principal é o roteamento inteligente.
- Lê as diretivas, invoca as ferramentas de execução na ordem correta, trata erros, solicita esclarecimentos ao usuário se necessário e atualiza diretivas com novos aprendizados.
- Funciona como a "cola" inteligente entre a intenção e a ação física.

**Camada 3: Execução (Fazer o trabalho)**
- Scripts determinísticos em Python contidos na pasta `execution/`.
- Configurações, tokens e chaves de API são armazenados de forma segura em `.env`.
- Executam chamadas de API, processamento de dados, operações de arquivos e consultas a bancos de dados.
- Confiável, testável e rápido.

---

## Princípios de Operação do Agente

1. **Verificar ferramentas existentes primeiro**
   Antes de criar um novo script de execução, verifique a pasta `execution/` para reutilizar ferramentas existentes que atendam à diretiva. Só crie novos scripts se for estritamente necessário.

2. **Loop de Auto-Ajuste (Self-Annealing)**
   Quando um script de execução quebrar ou retornar um erro:
   - Leia a mensagem de erro e o rastreamento da pilha (*stack trace*).
   - Corrija o script na pasta `execution/` e teste-o novamente.
   - Atualize a diretiva com o aprendizado obtido (limitações de API, timeouts, novos parâmetros).
   - O sistema torna-se mais forte a cada falha resolvida.

3. **Manter as Diretivas Vivas**
   Diretivas não são estáticas. Sempre que forem encontradas restrições técnicas, fluxos alternativos mais eficientes ou expectativas de tempo atualizadas, modifique a diretiva correspondente para documentar esse conhecimento de forma duradoura.

---

## Organização de Arquivos

- `directives/` - Diretivas (SOPs) em Markdown.
- `execution/` - Scripts Python determinísticos.
- `.tmp/` - Arquivos temporários e intermediários gerados durante o processamento. Nunca devem ser commitados e podem ser apagados a qualquer momento.
- `.env` - Variáveis de ambiente e chaves confidenciais.

---

## Resumo
Esta arquitetura garante que a variabilidade da IA seja controlada por scripts determinísticos e fluxos estruturados. O orquestrador liga as intenções humanas a execuções confiáveis.
