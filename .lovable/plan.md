

## Plano: Aditivos de contrato no app do Profissional

### O que vai acontecer

Trazer o componente `ContractAddendums.tsx` (já existente no app Cliente) para o app Profissional, com `userRole="professional"`, e renderizá-lo dentro da tela `Acompanhar Chamado` (`/chamado/:id` → `OportunidadeDetalhePage.tsx`), logo abaixo da seção de status do contrato.

Toda a lógica pesada (RPCs `propose_contract_addendum` / `respond_contract_addendum` / `cancel_contract_addendum`, RLS, hash jurídico, notificações, soma na cobrança original) já está pronta no Supabase compartilhado — não precisa de migração nem de edge function nesta etapa.

### Arquivos

**1. Criar `src/components/ContractAddendums.tsx`** (cópia 1:1 do app Cliente, 654 linhas)
- Mesmo componente, mesma assinatura: `{ contractId, contractStatus, userRole, professionalId, onChange }`
- Funciona para os dois lados: detecta `auth.uid()` no banco e só mostra botões "Aprovar/Recusar" quando o aditivo NÃO foi proposto pelo usuário atual (linha `!isMine`); mostra "Cancelar proposta" quando foi.
- Modal de criação carrega `professional_pricing.hourly_rate` + `professional_extras` do profissional do contrato → no nosso caso é o próprio usuário, mas a query continua igual (busca pelo `professionalId` passado como prop).

**2. Editar `src/pages/OportunidadeDetalhePage.tsx`**
- Importar `ContractAddendums`
- Renderizar quando `contract?.id` existir e o status não for `cancelled` nem `completed`, em uma posição visível (acima do bloco de ações de status, dentro do container principal). Props:
  ```tsx
  <ContractAddendums
    contractId={contract.id}
    contractStatus={contract.status}
    userRole="professional"
    professionalId={user?.id ?? null}
    onChange={loadDetail}  // recarrega total_amount da opp
  />
  ```

### O que já está pronto (sem ação necessária)

- **Cadastro de preços/extras**: `MeusServicosPage.tsx` já gerencia `professional_pricing.hourly_rate` e `professional_extras`. Se o profissional não tiver cadastrado, o modal mostra o aviso "Não cadastrou hora extra nem serviços extras".
- **RLS `contract_addendums`**: políticas `addendum_parties_select/insert/update` já cobrem o profissional (`professional_id = auth.uid()`).
- **Notificações**: as RPCs disparam automaticamente para a contraparte (📑 recebido / ✅ aprovado / ❌ recusado / 💳 pague aditivo).
- **Soma na cobrança original**: lógica em `respond_contract_addendum` já decide `merged_with_original` baseado no status do pagamento Asaas.

### Fora do escopo desta entrega

- Edge function de cobrança PIX **separada** para aditivos aprovados após pagamento original confirmado (mencionada no pedido como "ainda precisa criar"). Fica para uma próxima task se desejado.

### Diagrama do fluxo

```text
Profissional em /chamado/:id
        │
        ▼
ContractAddendums (userRole=professional)
        │
   ┌────┴────────────────┐
   ▼                     ▼
Lista aditivos       Botão "Novo"
   │                     │
   ▼                     ▼
Aprovar/Recusar     Modal com hourly_rate
(se proposto pelo    + extras do próprio
 cliente)            profissional
   │                     │
   ▼                     ▼
respond_contract_   propose_contract_
addendum RPC        addendum RPC
   │                     │
   └─────────┬───────────┘
             ▼
   Notificação automática
   ao cliente + soma na
   cobrança ou nova fatura
```

