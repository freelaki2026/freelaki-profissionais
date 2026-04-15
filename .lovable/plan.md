

# Plano: Saque instantâneo via PIX com Asaas

## Contexto
Atualmente, o saque apenas insere um registro na tabela `withdrawals` com status "pending" e mostra "até 2 dias úteis". O objetivo é integrar com a **API do Asaas** para realizar transferências PIX instantâneas ao profissional.

## Visão geral da arquitetura

```text
[Frontend: GanhosPage]
       │
       ▼ supabase.functions.invoke("process-pix-withdrawal")
[Edge Function: process-pix-withdrawal]
       │
       ├─ Valida sessão do usuário
       ├─ Busca bank_account (chave PIX)
       ├─ Busca saldo disponível em earnings
       ├─ Chama API Asaas POST /transfers
       ├─ Insere registro em withdrawals (status: completed ou failed)
       ├─ Atualiza earnings para status: withdrawn
       └─ Retorna resultado ao frontend
```

## Etapas

### 1. Configurar secret do Asaas
- Solicitar ao usuário a **API Key do Asaas** (sandbox e/ou produção)
- Adicionar como secret `ASAAS_API_KEY` no projeto Supabase
- Usar o ambiente sandbox (`https://sandbox.asaas.com/api/v3`) para testes e `https://api.asaas.com/api/v3` para produção

### 2. Criar Edge Function `process-pix-withdrawal`
- Valida JWT do usuário autenticado
- Busca a `bank_account` do profissional (chave PIX obrigatória)
- Calcula saldo disponível somando `earnings` com `status = 'available'`
- Chama a API Asaas `POST /v3/transfers` com:
  - `value`: valor do saque
  - `operationType`: "PIX"
  - `pixAddressKey`: chave PIX do profissional
  - `pixAddressKeyType`: tipo da chave (CPF, EMAIL, PHONE, EVP)
- Se sucesso: insere `withdrawal` com `status: completed`, atualiza `earnings` para `withdrawn`
- Se falha: insere `withdrawal` com `status: failed`, retorna erro ao frontend

### 3. Migração no banco de dados
- Adicionar coluna `asaas_transfer_id` na tabela `withdrawals` para rastrear a transação
- Adicionar coluna `pix_receipt_url` para comprovante

### 4. Atualizar o frontend (`GanhosPage.tsx`)
- `confirmWithdraw` passa a chamar a Edge Function ao invés de inserir direto no banco
- Exibir feedback instantâneo: "Transferência PIX realizada!" (ao invés de "até 2 dias úteis")
- Exibir comprovante/ID da transação no histórico de saques
- Exigir que o `payment_type` seja "pix" (não permitir saque para conta bancária convencional via esta integração)
- Atualizar o texto do bottom sheet: remover referência a "2 dias úteis", mostrar "⚡ Transferência instantânea via PIX"

### 5. Mapeamento de tipos de chave PIX
- O Asaas espera: `CPF`, `CNPJ`, `EMAIL`, `PHONE`, `EVP` (chave aleatória)
- Mapear a partir do campo `pix_key_type` da tabela `bank_accounts`

## O que o usuário precisa fazer
1. Criar uma conta no [Asaas](https://www.asaas.com) (se ainda não tiver)
2. Gerar a API Key no painel do Asaas
3. Fornecer a API Key para configurar como secret

## Orientações para o app do Cliente
- Nenhuma mudança necessária no app do cliente para esta funcionalidade — o saque é exclusivo do profissional

