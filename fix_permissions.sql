-- 1. Força a flag BYPASSRLS nas roles administrativas e de serviço
-- Isso garante de forma absoluta e nativa no PostgreSQL que a service_role
-- e o usuário postgres ignorem qualquer política RLS (Row Level Security),
-- permitindo gravação, leitura e deleção direta sem violar regras RLS!
ALTER ROLE service_role BYPASSRLS;
ALTER ROLE postgres BYPASSRLS;

-- 2. Cria a política RLS de acesso irrestrito de fallback para a role service_role
DROP POLICY IF EXISTS "Permitir tudo para service_role" ON public.keys;
CREATE POLICY "Permitir tudo para service_role" ON public.keys 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 3. Garante privilégios físicos totais de banco de dados
GRANT ALL PRIVILEGES ON TABLE public.keys TO service_role, postgres;
GRANT ALL PRIVILEGES ON TABLE public.keys TO anon, authenticated;

-- 4. Garante acesso de execução às RPCs
GRANT EXECUTE ON FUNCTION public.activate_license_key(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_license_status(text, text) TO anon, authenticated;
