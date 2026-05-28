import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description="Processa vendas brutas aplicando impostos.")
    parser.add_argument("--vendas", type=float, help="Valor bruto de vendas")
    parser.add_argument("--taxa", type=float, help="Taxa do imposto (ex: 0.15)")
    parser.add_argument("--debug", action="store_true", help="Ativa modo debug")
    parser.add_argument("--force", action="store_true", help="Força a execução")

    args = parser.parse_args()

    # 1. Simulação de erro de parâmetro obrigatório ausente
    if args.vendas is None:
        print("Erro: Parâmetro obrigatório '--vendas' está ausente (missing required parameter)!", file=sys.stderr)
        sys.exit(1)

    # 2. Simulação de erro de parâmetro inválido
    if args.taxa is not None and args.taxa < 0:
        print("Erro: Taxa de imposto inválida (invalid value)!", file=sys.stderr)
        sys.exit(2)

    # Execução normal de sucesso
    vendas_bruto = args.vendas
    taxa = args.taxa if args.taxa is not None else 0.10
    faturamento_liquido = vendas_bruto * (1 - taxa)
    
    print(f"SUCESSO: Vendas Brutas: {vendas_bruto} | Taxa: {taxa:.2f} | Faturamento Líquido: {faturamento_liquido:.2f}")
    if args.debug:
        print("MODO DEBUG ATIVADO: logs extras impressos.")
    if args.force:
        print("MODO FORCED ATIVADO: ignorou validações extras.")
        
    sys.exit(0)

if __name__ == "__main__":
    main()
