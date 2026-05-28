import unittest
import shutil
import tempfile
from pathlib import Path
from own_optimizer.config import Config
from own_optimizer.directive import Directive
from own_optimizer.execution import ExecutionRunner
from own_optimizer.orchestrator import Orchestrator

class TestOwnOptimizer(unittest.TestCase):
    def setUp(self):
        # Cria uma pasta temporária isolada para os testes de integração e unitários
        self.test_dir = Path(tempfile.mkdtemp())
        self.config = Config(workspace_path=self.test_dir)
        
    def tearDown(self):
        # Limpa o diretório temporário após a execução do teste
        shutil.rmtree(self.test_dir)
        
    def test_config_paths(self):
        """Valida se os caminhos padrão foram gerados e garantidos corretamente no workspace."""
        self.assertEqual(self.config.workspace_dir, self.test_dir)
        self.assertTrue((self.test_dir / "directives").exists())
        self.assertTrue((self.test_dir / "execution").exists())
        self.assertTrue((self.test_dir / ".tmp").exists())
        
    def test_directive_parsing_and_updating(self):
        """Valida o carregamento, leitura de seções e salvamento dinâmico em Markdown."""
        # Cria uma diretiva física de teste
        directive_path = self.config.directives_dir / "test_sop.md"
        with open(directive_path, "w", encoding="utf-8") as f:
            f.write("# Teste de Diretiva\n\n## Objetivo\nTestar o parseador.\n\n## Ferramentas\nnenhuma\n")
            
        directive = Directive("test_sop", config=self.config)
        self.assertEqual(directive.title, "Teste de Diretiva")
        self.assertEqual(directive.get_section("Objetivo"), "Testar o parseador.")
        self.assertEqual(directive.get_section("Ferramentas"), "nenhuma")
        
        # Testando atualização de seções
        directive.update_section("Objetivo", "Novo objetivo modificado.")
        directive.update_section("Aprendizados Técnicos", "Erro 1 resolvido.")
        directive.save()
        
        # Recarrega a diretiva para garantir que foi fisicamente salva de forma correta
        reloaded = Directive("test_sop", config=self.config)
        self.assertEqual(reloaded.get_section("Objetivo"), "Novo objetivo modificado.")
        self.assertEqual(reloaded.get_section("Aprendizados Técnicos"), "Erro 1 resolvido.")
        
    def test_execution_runner(self):
        """Valida se o runner executa scripts de forma isolada e formata erros perfeitamente."""
        # 1. Script dummy de sucesso
        script_path = self.config.execution_dir / "dummy.py"
        with open(script_path, "w", encoding="utf-8") as f:
            f.write("import sys; print('Output Dummy'); sys.exit(0)")
            
        runner = ExecutionRunner(config=self.config)
        result = runner.run_script("dummy")
        self.assertTrue(result["success"])
        self.assertIn("Output Dummy", result["stdout"])
        self.assertEqual(result["exit_code"], 0)
        
        # 2. Script dummy de falha controlada
        fail_script = self.config.execution_dir / "dummy_fail.py"
        with open(fail_script, "w", encoding="utf-8") as f:
            f.write("import sys; print('Erro grave!', file=sys.stderr); sys.exit(42)")
            
        result_fail = runner.run_script("dummy_fail")
        self.assertFalse(result_fail["success"])
        self.assertIn("Erro grave!", result_fail["stderr"])
        self.assertEqual(result_fail["exit_code"], 42)
        self.assertEqual(result_fail["error_summary"], "Erro grave!")

    def test_orchestrator_self_annealing(self):
        """Valida o orquestrador executando uma ferramenta e aplicando o loop de Self-Annealing com sucesso."""
        # Configura diretiva inicial com seção de aprendizados
        directive_path = self.config.directives_dir / "orchestra_sop.md"
        with open(directive_path, "w", encoding="utf-8") as f:
            f.write("# SOP Orquestração\n\n## Aprendizados Técnicos\n")
            
        orchestrator = Orchestrator(config=self.config)
        orchestrator.start_session("orchestra_sop")
        
        # Cria um script de execução que falha de início por falta de argumento (missing),
        # mas que tem sucesso se o argumento "--debug" for adicionado pelo auto-ajuste.
        script_path = self.config.execution_dir / "test_anneal.py"
        with open(script_path, "w", encoding="utf-8") as f:
            f.write('''
import sys
if '--debug' not in sys.argv:
    print("Erro: missing required argument '--debug'!", file=sys.stderr)
    sys.exit(1)
print("Sucesso com debug!")
sys.exit(0)
''')
        
        # Executa o script. Primeira tentativa falha, ativa a heurística de "missing" -> adiciona "--debug" -> sucesso na segunda tentativa.
        res = orchestrator.execute_tool("test_anneal", args=[], max_retries=2)
        self.assertTrue(res["success"])
        self.assertIn("Sucesso com debug!", res["stdout"])
        
        # Verifica se o log de aprendizado foi gravado em memória
        self.assertEqual(len(orchestrator.learnings), 1)
        self.assertIn("Identificada falta de argumento necessário", orchestrator.learnings[0]["fix"])
        
        # Verifica se a diretiva física foi persistida com os novos aprendizados técnicos
        reloaded_directive = Directive("orchestra_sop", config=self.config)
        tech_learnings = reloaded_directive.get_section("Aprendizados Técnicos")
        self.assertIn("Auto-Ajuste", tech_learnings)
        self.assertIn("test_anneal", tech_learnings)

if __name__ == "__main__":
    unittest.main()
