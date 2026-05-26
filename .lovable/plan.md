## Diagnóstico

Os logs do Supabase Auth confirmam: todas as chamadas `/recover` estão dando **504 timeout** (10s) porque o SMTP custom da Locaweb não responde. O código do app está correto — o problema é 100% configuração de SMTP. Apenas 1 em 6 tentativas conseguiu passar (e mesmo essa demorou 10s).

## Plano

### 1. Você desativa o SMTP custom no Supabase (ação manual)
- Acessar **Supabase Dashboard → Authentication → Emails → SMTP Settings**
- **Desativar** o toggle "Enable Custom SMTP"
- Salvar

Isso faz o Supabase voltar a usar o servidor de email interno dele (padrão). Limite: **4 emails/hora por projeto** — suficiente para testar agora.

### 2. Eu verifico/limpo o código do fluxo de recuperação
- Confirmar que `useAuth.resetPassword` está chamando `resetPasswordForEmail` com `redirectTo` correto
- Confirmar que a rota `/reset-password` está pública e funcional
- Mapear o erro 504/timeout em `src/lib/errors.ts` para mostrar mensagem clara ("Servidor de email temporariamente indisponível, tente novamente") em vez de `ERR-000`
- Mapear `over_email_send_rate_limit` (429) com mensagem amigável de cooldown

### 3. Validar
- Após você desativar o SMTP, testar com um email diferente do `thiago.kenned19@gmail.com` (esse pode estar em cooldown)
- Conferir caixa de entrada **e spam**
- Confirmar que o link cai em `/reset-password` e permite trocar a senha

### 4. (Opcional, depois) Migrar para Lovable Emails
Quando quiser remover o limite de 4/hora e ter branding próprio sem depender da Locaweb, posso configurar o sistema de emails gerenciado da Lovable (domínio próprio, templates customizados, sem timeout). Mas isso é uma segunda etapa — primeiro vamos fazer o básico funcionar.

## O que NÃO vou fazer
- Não vou reescrever `ResetPasswordPage`, `useAuth` ou `Login` do zero — eles já estão corretos. Reescrever gastaria créditos sem resolver nada (o problema é SMTP, não código).
- Não vou mexer em edge functions de email (todas já estão desativadas/removidas).

## Detalhe técnico
Arquivos que vou tocar apenas se necessário:
- `src/lib/errors.ts` — adicionar entradas para `over_email_send_rate_limit` e `request_timeout`
- `src/pages/ResetPasswordPage.tsx` e `src/hooks/useAuth.ts` — apenas leitura para confirmar que estão ok