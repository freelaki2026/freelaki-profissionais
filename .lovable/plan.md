## Objetivo
Gerar PNGs 1080×1920 em alta qualidade das telas reais do app Freelaki Profissionais, preenchidas com dados fictícios PT-BR realistas, para uso em apresentação.

## Abordagem
Vou usar **Playwright dentro do sandbox** para abrir o app real em `http://localhost:8080` num viewport mobile (390×844 CSS @ 2.77x DPR = saída 1080×1920), injetar dados fictícios via mocks/seed temporários e capturar cada tela.

Como o app depende do Supabase real, vou usar **dois modos** dependendo da tela:
1. **Telas pré-auth e estáticas** (Splash, Login, Cadastro, Boas-vindas, Categorias vazias) → captura direta.
2. **Telas autenticadas com dados** (Dashboard, Oportunidades, Detalhe, Chat, Contrato, Ganhos, Saque, Perfil, Avaliações, Mapa, Meus Serviços, Agenda, Contratos, Financeiro, Menu, Notificações, Trabalho Concluído) → vou interceptar as chamadas Supabase via `page.route()` e devolver respostas fictícias, OU criar um modo "demo" temporário em código que injeta um seed quando uma query string `?demo=1` está presente.

Recomendo o **modo demo via flag** porque é mais robusto: cada page lê de um `demoSeed.ts` quando `localStorage.demoMode === '1'`, garantindo que o layout REAL é renderizado com dados consistentes — sem inventar botões/cores/abas.

## Dados fictícios (amostra)
- **Profissional logado**: Rafael Moreira, Fotógrafo · Filmmaker, ★4.9, 87 freelas, R$ 4.280 disponível, R$ 2.850 reservado, R$ 18.420 sacado.
- **Clientes**: Marina Costa, João Silva, Letícia Mendes, Clínica Sorrir, Café da Esquina.
- **Oportunidades**: Ensaio gestante (R$680), Vídeo institucional (R$2.400), Reels (R$480), Cobertura casamento (R$3.200).
- **Chat**: 4 conversas com últimas mensagens realistas em PT-BR.
- **Contrato assinado**: Marina Costa, R$ 1.350, assinatura digital "Rafael Moreira da Silva", IP capturado.
- **Saque**: R$ 2.000 via PIX, confirmado em 22/04/2026.

## Telas a capturar (22 PNGs)
**Onboarding/Cadastro** (5): Splash, Pré-cadastro, Login, Cadastro Step1, Categorias  
**Essenciais** (10): Dashboard, Oportunidades (lista), Mapa, Detalhe da oportunidade, Chat (lista), Chat (conversa), Contrato assinado, Trabalho concluído (celebração), Perfil público, Avaliações  
**Gestão** (7): Meus Serviços, Agenda, Contratos, Ganhos/Carteira, Saque (modal), Saque concluído, Financeiro, Menu, Notificações

## Implementação técnica
1. Criar `src/lib/demoSeed.ts` com todos os dados fictícios e um helper `useDemoData<T>(realQueryFn, demoData)`.
2. Adicionar gate `if (localStorage.demoMode === '1') return demoData;` nos hooks/queries das páginas listadas (mudança mínima e isolada — não altera comportamento normal).
3. Adicionar `?demo=1` handler em `src/main.tsx` que liga o flag.
4. Script Playwright em `/tmp/screenshots/capture.py` que:
   - Lança Chromium headless, viewport 390×844, DPR 2.77.
   - Para cada rota, navega → aguarda render → `page.screenshot({path, clip: 1080×1920})`.
5. Salvar todos os PNGs em `/mnt/documents/screenshots/` e emitir `<presentation-artifact>` para cada um.

## Entregáveis
22 arquivos PNG 1080×1920 em `/mnt/documents/screenshots/`, nomeados `01-splash.png`, `02-login.png`, … `22-menu.png`, prontos para baixar e colar nos slides.

## Observação
Para minimizar mudanças no código de produção, o seed só ativa com a flag `?demo=1` (controlada por localStorage). Após capturar, basta desligar — nenhum botão/tela/cor nova será adicionado, apenas dados de leitura serão substituídos quando o flag está ativo.