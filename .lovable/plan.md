# Tour Guiado — Primeiro Acesso

Tutorial interativo que aparece **uma única vez**, logo após o primeiro login bem-sucedido, destacando as principais funções do app com legenda, navegação (avançar/voltar) e botão de fechar.

## Como vai funcionar

- Dispara automaticamente quando o usuário entra no `/dashboard` pela primeira vez.
- Overlay escuro semi-transparente cobre a tela, recortando ("spotlight") o elemento destacado da etapa atual.
- Card flutuante com: título curto, legenda (1–2 linhas), contador (ex: "2 de 6"), botão **Voltar**, **Avançar / Concluir** e **X** para fechar a qualquer momento.
- Possibilidade de **pular tour** (link discreto). Se pular ou concluir, não aparece mais.
- Indicador de progresso (bolinhas) no rodapé do card.
- Animação suave de transição entre etapas (fade + slide), respeitando o design system Tech Startup.

## Etapas propostas (6)

1. **Boas-vindas** — modal central: "Bem-vindo ao Freelaki! Vamos te mostrar o essencial em 1 minuto." (sem spotlight)
2. **Oportunidades** (item da BottomNav) — "Veja jobs abertos perto de você e candidate-se com 1 toque."
3. **Agenda** (BottomNav) — "Acompanhe seus jobs aceitos, contratos e horários."
4. **Mensagens / Notificações** (sino no topo) — "Avise e receba atualizações em tempo real dos clientes."
5. **Ganhos** (BottomNav ou card do dashboard) — "Acompanhe quanto entrou, quanto está pendente e saque por PIX."
6. **Menu / Perfil** — "Complete seu perfil, documentos e dados bancários para receber jobs." → CTA final: "Começar".

## Onde persistir o "já viu"

Tabela `profiles` (ou nova coluna): `tour_completed_at timestamptz`. Persistir no Supabase garante que o tour não reaparece em outro dispositivo. Fallback em `localStorage` para evitar piscar enquanto carrega.

Migration necessária:
```sql
alter table public.profiles
  add column if not exists tour_completed_at timestamptz;
```

## Arquivos a criar / editar

- `src/components/tour/AppTour.tsx` — componente do overlay + card (spotlight com `getBoundingClientRect` no elemento alvo, recalculado em resize/scroll).
- `src/components/tour/tourSteps.ts` — array das etapas (selector, título, legenda, posição do card).
- `src/hooks/useAppTour.ts` — lê/escreve `tour_completed_at`, controla `open`, `stepIndex`, `next/prev/close/skip`.
- `src/pages/DashboardPage.tsx` — monta `<AppTour />` e dispara via hook.
- `src/components/dashboard/BottomNav.tsx` — adicionar `data-tour="oportunidades|agenda|ganhos|menu"` nos itens.
- `src/components/dashboard/NotificationPanel.tsx` (ou onde está o sino) — `data-tour="notificacoes"`.
- Migration Supabase para `tour_completed_at`.
- Atualizar `mem://` com uma nova memória `features/app-tour-onboarding`.

## Detalhes técnicos

- Sem libs externas — implementação própria leve (~150 linhas) para manter bundle enxuto.
- Spotlight via `box-shadow: 0 0 0 9999px rgba(0,0,0,.72)` no rect calculado + `border-radius` arredondado.
- Card se posiciona acima ou abaixo do alvo conforme espaço disponível na viewport (390×775 já testado).
- Bloqueia scroll do body enquanto ativo; libera ao fechar.
- Acessível: `role="dialog"`, `aria-label`, foco no botão primário, fecha com `Esc`.
- Capacitor/iOS-safe: usa `playsInline`-equivalent (sem mídia) e respeita `safe-area-inset-top/bottom`.
- Não dispara se o usuário ainda está no fluxo de cascade (sem categorias, email não confirmado).

## Fora de escopo

- Re-disparar o tour manualmente a partir do Menu/Ajuda (pode ser adicionado depois — quer que eu já inclua?).
- Tours específicos por página (ex: tour da página Ganhos). Por enquanto só o overview no Dashboard.
