# Processamento de Dados de Vendas

> Exemplo prático de uma diretiva de SOP de Camada 1 estruturada para a biblioteca own-optimizer.

## Objetivo
O objetivo desta diretiva é processar um arquivo CSV de vendas brutas, calcular o faturamento líquido aplicando impostos e salvar o resultado em uma pasta temporária para consulta posterior.

## Entradas
- `caminho_csv`: O caminho do arquivo contendo os dados brutos de vendas.
- `taxa_imposto`: Alíquota de imposto a ser deduzida (ex: 0.15 para 15%).

## Ferramentas
- `processa_vendas.py`: Script Python determinístico de Camada 3 responsável por ler o CSV, realizar os cálculos matemáticos e salvar o resultado sanitizado.

## Aprendizados Técnicos
Abaixo são registrados os aprendizados técnicos e correções efetuadas pelo loop de Self-Annealing.
