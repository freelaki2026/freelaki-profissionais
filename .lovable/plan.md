# Plano: Exclusão de Conta com Período de Carência

Implementação em 3 blocos independentes para evitar instabilidades.

## Bloco 1 — Backend (Supabase)

### Schema (`profiles`)
Adicionar colunas:
- `deletion_requested_at timestamptz` — quando o usuário pediu exclusão
- `deletion_scheduled_for timestamptz` — data de exclusão definitiva (request + 15d)
- `deletion_reason text` — motivo escolhido
- `deletion_feedback text` — comentário livre opcional
- `deleted_at timestamptz` — quando foi efetivamente apagada

### RPCs (security definer)
- `request_account_deletion(p_reason, p_feedback)` — valida que não há contratos `accepted`/`in_progress`/`awaiting_signatures`. Se houver, retorna `{success:false, error:'has_active_contracts', count:N}`. Caso contrário, marca `deletion_requested_at = now()`, `deletion_scheduled_for = now() + 15 days`, salva motivo/feedback.
- `cancel_account_deletion()` — limpa os 3 campos (`deletion_requested_at`, `deletion_scheduled_for`, motivo/feedback).
- `is_account_pending_deletion(uid)` — helper para o frontend/RLS.

### Cron job (pg_cron + pg_net)
Job diário `purge-deleted-accounts` (03:00 BRT) que:
1. Busca profiles com `deletion_scheduled_for <= now()` e `deleted_at IS NULL`
2. Chama edge function `purge-account` via `net.http_post` com service_role
3. A edge function apaga: documentos no Storage, registros em tabelas dependentes (sem FK cascade clara), depois `auth.admin.deleteUser(id)` (cascateia profile via trigger existente)

### Trigger de bloqueio de login
Não bloquear via Supabase Auth (complexo). Em vez disso, no app: ao carregar sessão, se `deletion_requested_at IS NOT NULL`, redirecionar para `/conta-em-exclusao`.

## Bloco 2 — UI de Solicitação (dentro de `/perfil`)

Nova seção no fim da página `PerfilPage.tsx`:
- Botão vermelho discreto "Excluir minha conta" → abre **bottom sheet** em 3 passos:
  1. **Pesquisa**: dropdown de motivos (`Não uso mais`, `Encontrei outro app`, `Problemas técnicos`, `Privacidade`, `Outro`) + textarea opcional 200 chars
  2. **Aviso + Termos**: pop-up com texto completo (ver abaixo) + checkbox "Li e aceito"
  3. **Confirmação final**: campo onde usuário digita `EXCLUIR` para confirmar
- Botão "Confirmar exclusão" chama `request_account_deletion`, exibe toast de sucesso e faz signOut.

### Texto dos Termos (pop-up)
> **Termos de Exclusão de Conta — Freelaki Profissionais**
>
> Ao solicitar a exclusão da sua conta, você declara estar ciente de que:
>
> 1. Sua conta será **desativada imediatamente** e ficará inacessível durante o período de carência de **15 dias corridos**.
> 2. Durante esse período, você poderá **reativar sua conta** a qualquer momento fazendo login novamente.
> 3. Após **15 dias**, todos os seus dados pessoais, perfil, portfólio, mensagens, avaliações e histórico serão **excluídos definitivamente** dos nossos servidores e não poderão ser recuperados.
> 4. Dados fiscais e financeiros (contratos concluídos, pagamentos, notas fiscais) serão **mantidos pelo prazo legal de 5 anos** conforme exigência da Receita Federal, mesmo após a exclusão da conta.
> 5. Você não poderá solicitar exclusão se tiver **contratos em andamento** (aceitos, em execução ou aguardando assinatura). Conclua-os antes.
> 6. Saques pendentes serão processados normalmente para a chave PIX cadastrada antes da exclusão definitiva.
>
> Esta ação está em conformidade com a **LGPD (Lei 13.709/18), Art. 18**.

## Bloco 3 — Tela de Reativação + Gate no App

### Nova rota `/conta-em-exclusao`
- Ícone laranja + título "Sua conta está em processo de exclusão"
- Mostra "Faltam **X dias** para a exclusão definitiva" (calculado de `deletion_scheduled_for`)
- Dois botões:
  - **Reativar minha conta** (primário) → chama `cancel_account_deletion`, redireciona para `/dashboard`
  - **Sair** (secundário) → signOut

### Gate em `useAuth` / `ProtectedRoute`
Ao detectar sessão, fazer fetch leve de `profiles.deletion_requested_at`. Se preenchido E rota atual ≠ `/conta-em-exclusao`, redirecionar para lá. Bloqueia acesso a todas as outras telas autenticadas.

---

## Detalhes técnicos

- **Edge function `purge-account`**: usa `SUPABASE_SERVICE_ROLE_KEY`, recebe `{user_id}`, apaga objetos do Storage (avatars/{id}/, documents/{id}/, portfolio/{id}/), depois `supabase.auth.admin.deleteUser(user_id)`. Tabelas com `ON DELETE CASCADE` via auth.uid já caem juntas; demais (notifications, addresses, etc.) são apagadas explicitamente antes.
- **pg_cron**: agendar via `INSERT` (não migration, pois contém URL/key do projeto).
- **Bloqueio de contratos ativos**: query `SELECT COUNT(*) FROM contracts WHERE (client_id = uid OR professional_id = uid) AND status IN ('pending','accepted','in_progress','awaiting_signatures')`.
- **Memory update**: adicionar `mem://features/account-deletion` ao índice.

## Ordem de execução
1. Migration (schema + RPCs)
2. Edge function `purge-account` + INSERT do cron
3. UI no `/perfil` + bottom sheet de 3 passos
4. Rota `/conta-em-exclusao` + gate no `useAuth`
5. Smoke test: solicitar exclusão, ver tela, reativar, voltar ao normal