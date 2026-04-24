

# Plano de ajustes pré-aprovação App Store

Vamos dividir em **6 blocos pequenos e independentes**, aplicados um de cada vez para evitar bugs. Você só precisa testar/aprovar entre os blocos — nenhuma ação manual necessária da sua parte.

---

## Bloco 1 — Limpeza de Categorias (banco)

Objetivo: deixar APENAS as 6 categorias permitidas no app inteiro.

- Migration SQL para **desativar** (`is_active = false`) as 6 categorias extras: Roteirista, Entrevistador, Mestre de Cerimônia, Recepcionista de Eventos, Operador de Luz, Operador de Som.
- As 6 que ficam ativas: Fotógrafo, Videomaker Mobile, Filmmaker, Social Media, Storymaker, Designer.
- Não deletamos para não quebrar oportunidades antigas vinculadas.
- Adicionar tile estático **"Em breve mais categorias 🚀"** (não selecionável, visual cinza) na grade da `CategoriasPage`, do `CadastroStep3` e em qualquer filtro de categoria.

---

## Bloco 2 — Obrigatoriedades de cadastro/perfil

Objetivo: garantir que o profissional só fique online/aprovado se tiver dados mínimos.

**a) Nome completo no cadastro (Etapa 1)** — já existe validação "nome + sobrenome" (`fullNameValid`). Vou reforçar: cada palavra ≥ 2 letras, mínimo 2 palavras, mensagem clara.

**b) Endereço-base obrigatório** — adicionar validação no enforcer (gate) que impede o profissional de ficar online sem endereço salvo.

**c) Pelo menos 1 categoria** — já é obrigatório no onboarding, mas vou também travar na `PerfilPage` (não pode salvar com 0).

**d) Pelo menos 1 equipamento e 1 rede social** — adicionar validação no `usePendingReviewEnforcer` para mostrar checklist na tela de perfil:
  - ✅ Nome completo (2+ palavras)
  - ✅ Endereço cadastrado
  - ✅ ≥ 1 categoria
  - ✅ ≥ 1 equipamento
  - ✅ ≥ 1 rede social/portfólio
  - ✅ Documentos enviados
  - ✅ Dados bancários

Sem todos, o toggle "Ficar Online" fica desabilitado com mensagem explicativa e CTA direto pra aba pendente.

---

## Bloco 3 — Endereço-base no Mapa do cliente

Objetivo: profissional aparecer no mapa do cliente usando lat/lng do endereço-base.

- Adicionar colunas `base_lat double precision` e `base_lng double precision` na tabela `addresses` (migration).
- Na `EnderecoPage`, ao buscar CEP via ViaCEP, fazer geocoding adicional via **Nominatim (OpenStreetMap, grátis e sem chave)** com `street + number + city + state` para preencher lat/lng automaticamente.
- Fallback: botão "Usar minha localização atual" se geocoding falhar.
- Salvar `base_lat`/`base_lng` no `addresses`.
- O app do cliente (fora deste repo) já consegue ler `addresses.base_lat/lng` para plotar no mapa.

> Nota: este projeto é só o app do **profissional**. O mapa que mostra o cliente já existe (`MapaPage`) e mostra oportunidades. A peça que faltava era persistir lat/lng do endereço-base do profissional — é isso que entregamos aqui.

---

## Bloco 4 — Foto-prova de hora extra (contrato + FAQ)

Objetivo: orientar e exigir foto quando passar do horário combinado.

**a) Contrato** — alterar a função `generate_contract` (migration) para incluir uma nova cláusula:

> "11. HORAS EXTRAS E PRORROGAÇÃO — Caso o serviço se estenda além do horário pactuado, o profissional deverá registrar via aplicativo um aditivo de horas extras com **foto-prova obrigatória** do local/relógio no momento da prorrogação. O aceite digital do aditivo pelo contratante constitui consentimento expresso para a cobrança adicional."

**b) Componente de aditivo** — já obriga foto pra `extra_hours` (vimos no schema). Vou adicionar:
  - Banner explicativo "Tire a foto do relógio/local no momento exato"
  - Tooltip de orientação (boas práticas)
  - Bloqueio se foto > 30 min do registro (timestamp)

**c) FAQ** — inserir 3 novas perguntas:
  1. "Como solicitar pagamento por horas extras?"
  2. "Por que preciso enviar uma foto-prova?"
  3. "O que acontece se o cliente recusar o aditivo?"

---

## Bloco 5 — FloatingNav some quando há pop-up/sheet aberto

Objetivo: nav flutuante não bloquear cliques em modais/bottom sheets.

- Criar um **store global leve** (Zustand ou Context) `useUiOverlay` com `register()/unregister()` e contador de overlays abertos.
- `FloatingNav` lê o store: se `count > 0`, retorna `null` (com fade out via `AnimatePresence`).
- Auditar e instrumentar todos os pontos identificados:
  - `PerfilPage` (2 sheets de redes sociais)
  - `EquipamentosPage` (form sheet)
  - `FinanceiroPage` (sheet de saque)
  - `OportunidadeDetalhePage` (4 modais)
  - `MeusServicosPage`, `ContratosPage`, `MenuPage`, `MensagensPage`, `ContractAddendums`, etc.
- Cada componente que abre overlay chama `useUiOverlay.register()` no `useEffect` quando `open === true`.

---

## Bloco 6 — Termos de Uso compatíveis com App Store

Objetivo: termos atendendo às diretrizes da Apple (App Review Guidelines 1.2, 3.1, 5.1).

Inserir nova versão `2.0` na tabela `terms` (insert) cobrindo:

1. **Identificação da plataforma** (CNPJ/empresa, contato `suporte@freelaqui.com.br`)
2. **Elegibilidade** (18+ anos, capacidade civil)
3. **Cadastro e responsabilidade pelos dados**
4. **Política de conteúdo gerado pelo usuário (UGC)** — proibição de assédio, conteúdo ofensivo, mecanismo de denúncia em até 24h, banimento (exigência Apple Guideline 1.2)
5. **Privacidade e LGPD** — coleta, finalidade, retenção, direitos do titular, link pra Política de Privacidade
6. **Pagamentos via Asaas** — sem assinatura recorrente (importante p/ não cair em Guideline 3.1.1)
7. **Cancelamento e reembolso** (regras já existentes na tabela `cancellation_rules`)
8. **Disputas** — fluxo via suporte, mediação Freelaki
9. **Propriedade intelectual** — usuário mantém direitos sobre seus posts; concede licença limitada à plataforma
10. **Hora extra com foto-prova** (referência ao novo fluxo)
11. **Foro** São Paulo/SP
12. **Versão e data** (2.0, data de hoje)

Marcar `2.0` como `is_active = true` e `1.0` como `false`.

Adicionar **Política de Privacidade** linkada (criar tela `/privacidade` simples puxando da tabela `terms` com slug específico — ou nova tabela `privacy_policy` se preferir; recomendo reusar `terms` com campo `kind`).

---

## Detalhes técnicos (resumo)

| Bloco | Migrations | Frontend | Edge functions |
|---|---|---|---|
| 1 | UPDATE categories SET is_active=false (6 rows) | `CategoriasPage`, `CadastroStep3`, filtros | — |
| 2 | — | `Cadastro.tsx`, `PerfilPage`, novo `useOnboardingChecklist` hook, `OnlineToggle` | — |
| 3 | ALTER TABLE addresses ADD base_lat, base_lng | `EnderecoPage` (Nominatim fetch) | — |
| 4 | CREATE OR REPLACE FUNCTION generate_contract; INSERT 3 FAQs | `ContractAddendums.tsx` (banner) | — |
| 5 | — | Novo `src/stores/useUiOverlay.ts`, modificar `FloatingNav`, instrumentar ~12 componentes | — |
| 6 | INSERT terms v2.0; UPDATE terms set is_active=false where version='1.0' | `TermosPage` já lê `is_active=true` (sem mudança); novo link de Política de Privacidade no `AjudaPage` | — |

## O que você precisa fazer

Nada durante a execução. Após cada bloco eu te aviso "Bloco X concluído, teste e me confirme" — você abre o app, clica nas telas afetadas e me diz se está OK antes de eu seguir pro próximo.

## Ordem de execução

1 → 2 → 3 → 4 → 5 → 6

Posso começar pelo **Bloco 1** assim que você aprovar este plano. Se quiser priorizar outra ordem (ex: começar pelos termos pra já mandar pra Apple), me avise.

