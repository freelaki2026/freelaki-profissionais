
-- 1) Add birth_date_verified column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date_verified boolean DEFAULT false;

-- 2) Create age validation function (18+)
CREATE OR REPLACE FUNCTION public.is_user_18_plus(_birth_date date)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _birth_date IS NOT NULL
     AND _birth_date <= (CURRENT_DATE - INTERVAL '18 years')::date;
$$;

-- 3) Trigger to block under-18 birth_date inserts/updates on profiles
CREATE OR REPLACE FUNCTION public.enforce_18_plus_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL
     AND NEW.birth_date > (CURRENT_DATE - INTERVAL '18 years')::date THEN
    RAISE EXCEPTION 'Você precisa ter 18 anos ou mais para usar o Freelaki.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_18_plus ON public.profiles;
CREATE TRIGGER trg_enforce_18_plus
BEFORE INSERT OR UPDATE OF birth_date ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_18_plus_on_profile();

-- 4) Deactivate old terms v1.0
UPDATE public.terms SET is_active = false WHERE version = '1.0';

-- 5) Insert Terms v2.0 (App Store compliant)
INSERT INTO public.terms (version, is_active, content)
VALUES (
  '2.0',
  true,
$TXT$TERMOS DE USO — FREELAKI PROFISSIONAIS

Versão 2.0 — Atualizado em abril de 2026

1. IDENTIFICAÇÃO DA PLATAFORMA
A Freelaki é uma plataforma digital que conecta profissionais autônomos da área de mídia (fotógrafos, videomakers, filmmakers, social media, storymakers e designers) a clientes contratantes. Contato oficial: suporte@freelaqui.com.br.

2. ELEGIBILIDADE — IDADE MÍNIMA DE 18 ANOS
O uso do Freelaki é restrito a pessoas maiores de 18 anos com plena capacidade civil. Ao se cadastrar, o usuário declara, sob as penas da lei, possuir idade igual ou superior a 18 anos. A Freelaki se reserva o direito de solicitar comprovação documental (RG, CNH ou Passaporte) e de suspender ou cancelar contas que não atendam a este requisito ou que apresentem informações divergentes do documento enviado.

3. CADASTRO E RESPONSABILIDADE PELOS DADOS
O usuário é o único responsável pela veracidade, exatidão e atualização de todas as informações fornecidas no cadastro, incluindo nome completo, CPF, data de nascimento, endereço, telefone, dados bancários e documentos. O fornecimento de dados falsos sujeita o usuário ao banimento imediato e às sanções legais aplicáveis.

4. POLÍTICA DE CONTEÚDO E CONDUTA
É expressamente proibido publicar, enviar ou compartilhar pelo aplicativo (chat, perfil, portfólio, mensagens) qualquer conteúdo que: (i) seja ofensivo, discriminatório, racista, sexista ou de assédio; (ii) contenha nudez, pornografia ou exploração sexual; (iii) incite violência, ódio ou atividades ilegais; (iv) viole direitos autorais ou de imagem de terceiros; (v) configure spam, fraude ou enganação. A Freelaki disponibiliza canal de denúncia em suporte@freelaqui.com.br e se compromete a analisar e tomar providências em até 24 horas. Usuários infratores serão banidos sem aviso prévio.

5. PRIVACIDADE E LGPD
A Freelaki coleta, trata e armazena dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018). Os dados coletados são utilizados exclusivamente para: (i) viabilizar o funcionamento da plataforma; (ii) processar pagamentos via parceiro Asaas; (iii) cumprir obrigações legais. O usuário tem direito a acessar, corrigir, excluir ou portar seus dados a qualquer momento, mediante solicitação ao suporte. A Política de Privacidade completa está disponível em /privacidade.

6. PAGAMENTOS VIA ASAAS
Todas as transações financeiras são processadas pelo parceiro Asaas (Asaas Gestão Financeira IP S.A.). A Freelaki NÃO opera assinaturas recorrentes nem cobra mensalidade do profissional. A receita da plataforma é exclusivamente uma taxa percentual sobre cada serviço efetivamente concluído, deduzida automaticamente do pagamento ao profissional. O profissional autoriza a custódia temporária dos valores até a conclusão do serviço e a posterior transferência líquida via Pix para sua conta cadastrada.

7. CANCELAMENTO E REEMBOLSO
Os percentuais de reembolso ao cliente, multa e pagamento ao profissional em caso de cancelamento seguem as regras vigentes detalhadas em "Regras de Cancelamento" no aplicativo, podendo variar conforme a antecedência do cancelamento e a parte responsável (cliente ou profissional). Cancelamentos com menos de 24h de antecedência podem implicar multa.

8. DISPUTAS
Em caso de divergência entre cliente e profissional sobre execução, qualidade ou cobrança do serviço, qualquer das partes pode abrir uma disputa pelo aplicativo. A Freelaki atuará como mediadora, analisará as evidências apresentadas (fotos, mensagens, contratos, aditivos) e emitirá decisão em até 7 dias úteis. A decisão da mediação é vinculante para ambas as partes dentro da plataforma.

9. PROPRIEDADE INTELECTUAL
O usuário mantém todos os direitos autorais sobre o conteúdo que publica (fotos de portfólio, descrições, etc.). Ao publicar, concede à Freelaki uma licença não exclusiva, mundial e gratuita para exibir tal conteúdo dentro da plataforma com a finalidade de viabilizar o funcionamento do serviço. A marca, logotipo, layout e código-fonte do aplicativo são propriedade exclusiva da Freelaki.

10. HORAS EXTRAS E FOTO-PROVA
Caso o serviço se estenda além do horário pactuado em contrato, o profissional deverá registrar pelo aplicativo um aditivo de horas extras com foto-prova obrigatória do local ou do relógio no momento exato da prorrogação, em prazo não superior a 30 minutos. O aceite digital do aditivo pelo contratante constitui consentimento expresso para a cobrança adicional. A foto-prova fica vinculada ao contrato como evidência em caso de disputa.

11. SUSPENSÃO E ENCERRAMENTO DE CONTA
A Freelaki pode suspender ou encerrar contas que: (i) violem estes Termos; (ii) sejam reportadas por outros usuários e confirmadas em análise; (iii) apresentem documentação falsa; (iv) tentem burlar a plataforma (pagamentos por fora, contato direto para evitar a taxa, etc.). O usuário também pode encerrar sua conta a qualquer momento, mediante solicitação ao suporte.

12. ALTERAÇÕES NESTES TERMOS
A Freelaki pode atualizar estes Termos a qualquer momento. Alterações materiais serão comunicadas no aplicativo e exigirão novo aceite. O uso continuado após a comunicação implica concordância com a nova versão.

13. FORO
Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer questões decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

Ao aceitar, você declara ter lido, compreendido e concordado integralmente com estes Termos, e confirma ter 18 anos ou mais.$TXT$
);
