## O que vai ser construído

Uma nova tela de **boas-vindas** que é a primeira coisa que o usuário vê ao abrir o app (antes do Splash, somente para visitantes). Essa tela tem:

- Identidade Freelaki (logo + tagline curta).
- 2 botões principais:
  - **"Já tenho convite"** → abre uma tela onde a pessoa digita o código + email cadastrado. Se válido, libera o cadastro normal (`/cadastro`).
  - **"Quero me cadastrar"** → abre formulário curto de aplicação (waitlist). Salva no banco, envia notificação para você no Admin, e mostra tela de "pedido recebido".

Quem já está logado **não vê essa tela** — vai direto pro Splash → Dashboard (mantém o fluxo atual).

---

## Fluxo completo (visual)

```text
Abre o app
    │
    ├── Já logado? ──Sim──> Splash → Dashboard (igual hoje)
    │
    └── Não logado
            │
            ▼
      [Pré-cadastro / Boas-vindas]
       ┌──────────────────────┐
       │   ⚡ freelaki         │
       │   profissionais       │
       │                       │
       │  100% do que você     │
       │  ganha é seu.         │
       │                       │
       │  [Já tenho convite]   │──> /convite ──> valida código ──> /cadastro?token=...
       │  [Quero me cadastrar] │──> /pre-cadastro (form) ──> salva ──> "Pedido recebido"
       │                       │
       │  Já tenho conta       │──> /login
       └──────────────────────┘
```

---

## Formulário de aplicação (waitlist)

Campos curtos, pensado para você ter info suficiente para aprovar:

1. Nome completo
2. Email
3. Telefone (WhatsApp)
4. Cidade / Estado
5. Categoria principal (dropdown com as 8 categorias atuais)
6. Instagram ou link do portfólio (opcional mas recomendado)
7. Mensagem curta (máx 280 caracteres) — "Por que você quer entrar?"

Validação client-side com **zod** (nome, email válido, telefone, etc.). Bloqueia envio duplicado pelo mesmo email (retorna mensagem amigável).

---

## Código de convite

- **Único por pessoa**, formato `FRLK-XXXXXX` (6 chars alfanuméricos).
- Você gera o código no Admin ao aprovar a pessoa.
- Vinculado ao **email aprovado** — só funciona se a pessoa digitar o mesmo email no cadastro.
- **Uso único**: ao concluir o cadastro, o código é marcado como `used` e não funciona de novo.
- Códigos vencem em 30 dias (configurável).

---

## Integração com o Admin (Freelaki Admin)

Como o Admin é um app separado, vou:

1. Criar as tabelas e RPCs no Supabase compartilhado (ambos os apps acessam).
2. Gerar um arquivo único `WaitlistAdmin.tsx` em `/mnt/documents/` com a aba completa pronta para você colar no app Admin. A aba tem:
   - Lista de pedidos pendentes (com badge de contagem).
   - Filtros: pendente / aprovado / recusado.
   - Click no usuário → abre painel lateral com **todas as informações enviadas no formulário**.
   - Botões **"Aprovar e gerar código"** (gera FRLK-XXXXXX, marca como aprovado) e **"Recusar"**.
   - Após aprovar, mostra o código gerado com botão "Copiar" — você manda manualmente para a pessoa (WhatsApp/email pessoal), conforme você pediu.
3. **Notificação no Admin**: cada novo pedido cria uma `notification` para todos os admins (sino vai piscar, igual já funciona no app).

---

## Mudanças técnicas (resumo)

### Banco de dados (1 migração)

Nova tabela **`waitlist_applications`**:
- `id`, `full_name`, `email` (unique), `phone`, `city`, `state`, `category_id`, `portfolio_url`, `message`
- `status` (`pending` / `approved` / `rejected`)
- `invite_code` (gerado na aprovação), `code_used_at`, `code_expires_at`
- `approved_by`, `approved_at`, `rejected_reason`, `created_at`

**RLS**:
- INSERT público (qualquer um pode se candidatar — sem auth).
- SELECT/UPDATE só para admins.
- RPC pública `validate_invite_code(code, email)` que retorna `{valid, application_id}` sem expor outros dados.
- RPC pública `submit_waitlist_application(...)` com validação de email único.
- RPC `consume_invite_code(code)` chamada no fim do cadastro para marcar como usado.

### App Profissional (este projeto)

- **Nova rota `/`** → `BoasVindasPage.tsx` (tela com 2 botões). Splash vira `/splash`.
- **`Splash.tsx`** ajustado: se não há sessão, redireciona pra `/` (boas-vindas) em vez de `/login`. Se há sessão, fluxo igual hoje.
- **Nova rota `/pre-cadastro`** → formulário de aplicação.
- **Nova rota `/convite`** → input de código + email, valida via RPC.
- **`Cadastro.tsx`** ajustado: lê `?token=FRLK-XXXX&email=...` da URL, trava o email, e chama `consume_invite_code` no submit. Se acessar `/cadastro` sem token válido, redireciona para `/`.
- **Memória atualizada**: novo passo no Onboarding Cascade.

### App Admin (arquivo entregável)

- `/mnt/documents/WaitlistAdmin.tsx` — componente standalone pronto pra colar. Usa o mesmo `supabase` client, sem deps externas além das que o Admin já tem.

---

## O que NÃO muda

- Login normal continua funcionando igual.
- Quem já está logado pula direto pro Splash/Dashboard.
- Cadastro em si (steps 1, 2, 3) não muda — só ganha um gate de token na entrada.
- Email de confirmação Supabase continua igual.

---

Posso prosseguir com a implementação?