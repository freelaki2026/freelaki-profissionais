# Travar tipo de documento de identidade

## Problema atual

Na tela `/documentos`, o usuário pode escolher entre **RG**, **CNH** ou **Passaporte**. Hoje:

- Os 3 tipos gravam no mesmo `doc_type = "rg_frente"` no banco (CNH e Passaporte reaproveitam), então o app **não sabe qual tipo o usuário realmente escolheu** depois de recarregar a página.
- O seletor de tipo continua visível mesmo depois de enviar/aprovar/rejeitar, deixando confuso o que foi enviado e permitindo o usuário “trocar” o tipo no meio do caminho.
- Quando o documento é rejeitado, a UI não destaca claramente qual documento (RG/CNH/Passaporte) foi reprovado e mistura com as outras opções.

## Objetivo

Uma vez que o usuário envia o 1º arquivo do documento de identidade, os outros 2 tipos **desaparecem da tela**. Só sobra o tipo escolhido — com status (em análise / aprovado / rejeitado) e botão de **Reenviar** quando rejeitado.

## Mudanças

### 1. Banco de dados (migration)

Adicionar coluna em `profiles` para persistir a escolha:

```text
profiles.identity_doc_type  text  CHECK IN ('rg','cnh','passaporte')  NULL
```

- Preenchida automaticamente no 1º upload de documento de identidade.
- Limpa apenas pelo backoffice se algum dia o documento for invalidado totalmente (fora do escopo desta task).

### 2. `src/pages/DocumentosPage.tsx`

- Carregar `identity_doc_type` junto com `approval_status`.
- Estado `selectedDocType`:
  - Se `identity_doc_type` está setado no banco → trava nesse valor (não permite trocar).
  - Se ainda nulo → mostra os 3 botões normalmente para o usuário escolher.
- No `handleUpload`, quando o `docType` for de identidade (`rg_frente` ou `rg_verso`) **e** `profiles.identity_doc_type` ainda for `null`, gravar `identity_doc_type = selectedDocType` no mesmo fluxo.
- Renderização condicional do card "DOCUMENTO DE IDENTIDADE":
  - **Sem tipo travado**: 3 botões seletores como hoje.
  - **Com tipo travado**: 
    - Esconde os 3 botões.
    - Mostra um header pequeno tipo `RG selecionado` com um link discreto `Trocar tipo` **apenas se** nenhum arquivo ainda foi enviado (caso de borda — improvável depois da gravação, mas defensivo).
    - Renderiza só o(s) `UploadItem` daquele tipo (RG = 2 itens frente/verso, CNH = 1, Passaporte = 1).
- Tratamento de rejeição:
  - O `DocUploadArea` já mostra badge "Rejeitado ✗" + motivo + botão "Reenviar". Como agora só o tipo escolhido aparece, fica claro qual documento precisa reenvio.
  - Adicionar destaque visual extra no card quando algum doc de identidade está `rejected`: borda vermelha sutil ao redor do `UploadItem` correspondente.

### 3. Atualização do `types.ts`

Após a migration aprovada, regenera automaticamente.

## Fluxos resultantes

```text
Primeira vez (identity_doc_type = null)
└── 3 botões [RG] [CNH] [Passaporte] visíveis
    └── usuário toca em CNH → área de upload CNH aparece
        └── envia arquivo → grava doc + profiles.identity_doc_type = 'cnh'

Próximas aberturas (identity_doc_type = 'cnh')
└── Sem botões. Só "CNH" + área de upload com status atual
    ├── pending  → badge "Em análise"
    ├── approved → badge "Aprovado ✓"
    └── rejected → badge "Rejeitado ✗" + motivo + botão "Reenviar"
```

## Arquivos tocados

- `supabase/migrations/<nova>.sql` — adiciona coluna `identity_doc_type`.
- `src/pages/DocumentosPage.tsx` — lógica de trava + renderização condicional.
- `src/integrations/supabase/types.ts` — regenerado.

Selfie e Comprovante de Residência ficam inalterados.