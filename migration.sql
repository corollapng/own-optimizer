-- =========================================================================
-- OWN OPTIMIZER - SCRIPT DE MIGRAÇÃO DE BANCO DE DADOS E SEGURANÇA (CORRIGIDO)
-- =========================================================================
-- Instruções: Copie todo este conteúdo, abra o painel do Supabase, 
-- vá em "SQL Editor", clique em "New query", cole este script e clique em "Run".
-- =========================================================================

-- 1. Criação de restrições de integridade adicionais e Índices de Performance
ALTER TABLE public.keys ADD CONSTRAINT check_keys_status CHECK (status IN ('active', 'expired', 'revoked'));
ALTER TABLE public.keys ADD CONSTRAINT check_keys_duration CHECK (duration_days IS NULL OR duration_days >= 0);
CREATE UNIQUE INDEX IF NOT EXISTS idx_keys_code ON public.keys (key_code);
CREATE INDEX IF NOT EXISTS idx_keys_hwid ON public.keys (hwid);

-- 2. Habilita o Row Level Security (RLS) na tabela keys
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;

-- 3. Força a flag BYPASSRLS nas roles administrativas e de serviço
-- Isso garante de forma absoluta e nativa no PostgreSQL que a service_role
-- e o usuário postgres ignorem qualquer política RLS (Row Level Security),
-- permitindo gravação, leitura e deleção direta no painel administrativo.
ALTER ROLE service_role BYPASSRLS;
ALTER ROLE postgres BYPASSRLS;

-- 4. Cria a política RLS de acesso total e irrestrito especificamente para a role service_role
DROP POLICY IF EXISTS "Permitir tudo para service_role" ON public.keys;
CREATE POLICY "Permitir tudo para service_role" ON public.keys 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 5. Concede privilégios físicos para evitar erros de PostgREST do Supabase
-- O RLS continuará ATIVO e bloqueando 100% de qualquer acesso público (anon/authenticated) direto.
GRANT ALL PRIVILEGES ON TABLE public.keys TO service_role, postgres;
GRANT ALL PRIVILEGES ON TABLE public.keys TO anon, authenticated;

-- 6. Função Segura RPC para Ativação e Vinculação de HWID (Inviolável)
CREATE OR REPLACE FUNCTION public.activate_license_key(p_key_code text, p_hwid text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios elevados do criador bypassando RLS no servidor
AS $$
DECLARE
    v_key RECORD;
    v_expiration timestamp with time zone;
BEGIN
    -- Busca a chave de forma parametrizada e segura
    SELECT * INTO v_key FROM public.keys WHERE key_code = trim(p_key_code);
    
    -- Se a chave não existir
    IF v_key IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Chave inválida ou não encontrada.');
    END IF;
    
    -- Se a chave estiver revogada ou inativa
    IF v_key.status <> 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Esta chave de licença está inativa ou expirou.');
    END IF;
    
    -- Se a chave tiver data de expiração e já passou
    IF v_key.expires_at IS NOT NULL AND now() > v_key.expires_at THEN
        UPDATE public.keys SET status = 'expired' WHERE id = v_key.id;
        RETURN json_build_object('success', false, 'error', 'Esta licença temporária já expirou.');
    END IF;
    
    -- Se a chave já tiver HWID registrado e for diferente do usuário ativo (pirataria)
    IF v_key.hwid IS NOT NULL AND v_key.hwid <> p_hwid THEN
        RETURN json_build_object('success', false, 'error', 'Esta chave já está vinculada a outro computador.');
    END IF;
    
    -- Primeira ativação da chave: vincula o HWID ativo e calcula a expiração
    IF v_key.hwid IS NULL THEN
        v_expiration := v_key.expires_at;
        
        -- Calcula o dia de expiração a partir de HOJE caso tenha duração definida
        IF v_key.duration_days IS NOT NULL AND v_key.duration_days > 0 THEN
            v_expiration := now() + (v_key.duration_days || ' days')::interval;
        END IF;
        
        UPDATE public.keys 
        SET hwid = p_hwid, expires_at = v_expiration
        WHERE id = v_key.id;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'Licença vinculada ao hardware com sucesso.',
            'expires_at', v_expiration
        );
    END IF;
    
    -- Caso já estivesse ativada nesta mesma máquina
    RETURN json_build_object(
        'success', true, 
        'message', 'Licença validada com sucesso.',
        'expires_at', v_key.expires_at
    );
END;
$$;

-- 7. Função Segura RPC para Checagem periódica de status da chave
CREATE OR REPLACE FUNCTION public.check_license_status(p_key_code text, p_hwid text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key RECORD;
    v_days_remaining integer;
BEGIN
    SELECT * INTO v_key FROM public.keys WHERE key_code = trim(p_key_code);
    
    IF v_key IS NULL THEN
        RETURN json_build_object('isActivated', false);
    END IF;
    
    -- Se a chave não estiver ativa
    IF v_key.status <> 'active' THEN
        RETURN json_build_object('isActivated', false);
    END IF;
    
    -- Se estiver vinculada a outro HWID
    IF v_key.hwid IS NOT NULL AND v_key.hwid <> p_hwid THEN
        RETURN json_build_object('isActivated', false);
    END IF;
    
    -- Se tiver data de expiração e já passou
    IF v_key.expires_at IS NOT NULL AND now() > v_key.expires_at THEN
        UPDATE public.keys SET status = 'expired' WHERE id = v_key.id;
        RETURN json_build_object('isActivated', false);
    END IF;
    
    -- Calcula os dias restantes
    IF v_key.expires_at IS NOT NULL THEN
        v_days_remaining := EXTRACT(DAY FROM (v_key.expires_at - now()));
        IF v_days_remaining < 0 THEN
            v_days_remaining := 0;
        END IF;
    ELSE
        v_days_remaining := NULL;
    END IF;
    
    RETURN json_build_object(
        'isActivated', true,
        'key', v_key.key_code,
        'expiresAt', v_key.expires_at,
        'durationDays', v_key.duration_days,
        'daysRemaining', v_days_remaining
    );
END;
$$;

-- 8. Concede acesso de execução das duas funções à role anon e authenticated
GRANT EXECUTE ON FUNCTION public.activate_license_key(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_license_status(text, text) TO anon, authenticated;
