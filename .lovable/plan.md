## Problema

O `FloatingNav` (barra flutuante inferior) fica posicionado em `fixed bottom-10` e está sobrepondo botões/conteúdo no final das páginas — como o botão azul "Salvar" da tela `/meus-servicos` no print.

## Solução

1. **Padronizar espaço seguro inferior**
   - Criar utilitário CSS `pb-nav-safe` em `src/index.css` que reserve `~140px` no final (altura da nav 56px + margem `bottom-10` 40px + folga 32px + `env(safe-area-inset-bottom)` para iOS).
   - Substituir paddings inferiores ad-hoc (`pb-24`, `pb-32`, `mb-20`) por essa classe nas páginas que usam `FloatingNav`/`BottomNav`: `MeusServicosPage`, `DashboardPage`, `ContratosPage`, `MensagensPage`, `MenuPage`, `OportunidadesPage`, `GanhosPage`, `AgendaPage`, `MapaPage`, `PerfilPage`, `FinanceiroPage` (apenas as que realmente renderizam a nav).

2. **Ajustar o FloatingNav**
   - Manter o tamanho atual (a barra já está adequada visualmente — aumentar muito quebraria o look "pill flutuante" Uber/Nubank do design system). A correção real é o espaço de respiro, não aumentar a barra.
   - Garantir que botões fixos de ação (ex.: "Salvar" do `MeusServicosPage`) que ficam em `position: fixed` no rodapé tenham `bottom` calculado acima da nav (`bottom: calc(96px + env(safe-area-inset-bottom))`) ou recebam a classe `pb-nav-safe` no container.

3. **Popups / Toasts / Sheets**
   - Verificar `Toaster` (sonner) e ajustar `offset` para `120px` no mobile para não cair atrás da nav.
   - Sheets/Dialogs já usam overlay full-screen com z-index acima — sem mudança necessária.

## Arquivos afetados

- `src/index.css` — adicionar classe utilitária e ajuste do toaster offset
- `src/components/FloatingNav.tsx` — confirmar `z-50` (já está) e adicionar `data-floating-nav` para referência
- Páginas listadas acima — trocar padding inferior pela classe nova
- `src/pages/MeusServicosPage.tsx` — corrigir o botão "Salvar" fixo especificamente (caso do print)

## Fora de escopo

- Não alterar dimensões visuais da nav (mantém o design pill 40px de altura).
- Não mexer em telas sem nav (Splash, Login, Cadastro, etc.).
