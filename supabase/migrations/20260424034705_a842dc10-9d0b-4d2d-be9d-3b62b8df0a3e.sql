-- Tabela de dicas/avisos do banner do dashboard
CREATE TABLE public.app_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('security', 'earnings', 'curiosity', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  emoji TEXT DEFAULT '💡',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_select_active"
ON public.app_tips
FOR SELECT
USING (
  is_active = true
  AND (start_at IS NULL OR start_at <= now())
  AND (end_at IS NULL OR end_at >= now())
);

CREATE POLICY "tips_admin_all"
ON public.app_tips
FOR ALL
USING (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text)
WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'user_type'::text) = 'admin'::text);

CREATE INDEX idx_app_tips_active ON public.app_tips (is_active, priority DESC) WHERE is_active = true;

-- Trigger de updated_at
CREATE TRIGGER trg_app_tips_updated_at
BEFORE UPDATE ON public.app_tips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds iniciais
INSERT INTO public.app_tips (category, emoji, title, body, priority) VALUES
-- Segurança
('security', '🔒', 'Nunca feche negócio fora do app', 'Aceitar trabalhos por fora cancela sua proteção: sem contrato, sem pagamento garantido e sem suporte em caso de problema.', 5),
('security', '📸', 'Sempre fotografe o local na chegada', 'Tire uma foto ao chegar e ao sair. Em qualquer disputa, isso protege você 100%.', 5),
('security', '⚠️', 'Desconfie de pagamento adiantado por fora', 'Cliente pediu PIX direto antes do contrato? Recuse. O dinheiro só está garantido pelo escrow da Freelaki.', 5),

-- Ganhos
('earnings', '💰', 'Sábado e domingo pagam mais', 'A taxa da plataforma cai pra 5% nos finais de semana e a demanda dobra. Fique online!', 3),
('earnings', '⏱️', 'Hora extra agora é automática', 'Passou do horário? Tire uma foto, abra o aditivo no chat e o cliente paga em segundos.', 3),
('earnings', '⭐', 'Avaliação 5 estrelas = mais convites', 'Profissionais com 4.8+ recebem 3x mais oportunidades privadas. Capriche no atendimento.', 3),

-- Curiosidades
('curiosity', '🚀', 'Sabia? O app prefetcha as próximas telas', 'A navegação é instantânea porque carregamos as telas antes mesmo de você clicar.', 1),
('curiosity', '📱', 'Você pode usar offline?', 'Em breve! Estamos preparando o modo offline para chats e visualização de contratos.', 1),
('curiosity', '🎯', 'Aceitou e desistiu? Tudo bem', 'Você pode desistir de uma oportunidade até a assinatura do contrato sem penalidade.', 1),

-- Avisos do sistema
('system', '✨', 'Nova versão disponível', 'O dashboard foi reorganizado para destacar suas oportunidades e ganhos. Aproveite!', 10),
('system', '🛡️', 'Mantenha seus dados atualizados', 'Profissionais com perfil 100% completo aparecem primeiro nas buscas dos clientes.', 8),
('system', '📍', 'Adicione seu endereço base', 'Clientes podem te encontrar no mapa pelo endereço cadastrado. Não esqueça de preencher!', 8);