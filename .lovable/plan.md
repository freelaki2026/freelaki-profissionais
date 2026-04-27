## Objetivo

Restringir as categorias do app aos 8 itens abaixo, removendo todas as outras de forma segura (sem quebrar oportunidades, contratos ou perfis existentes), e gerar um único arquivo idêntico para colar no app do **Cliente**, mantendo tudo "linkado em tempo real" via Supabase compartilhado.

### Categorias finais (ordem do grid)
1. Videomaker
2. Filmmaker
3. Storymaker
4. Social Media
5. Videomaker Mobile
6. Designer
7. Editor de vídeo
8. Editor de vídeo com IA

---

## Diagnóstico atual

A tabela `categories` no Supabase tem 12 itens. As 6 que precisam sair já estão com `is_active=false` (Roteirista, Entrevistador, Mestre de Cerimônia, Recepcionista de Eventos, Operador de Luz, Operador de Som) e **0 profissionais / 0 oportunidades vinculados** — seguro deletar.

Itens a tratar:
- `Fotógrafo` (slug `fotografo`) — está ativo, **0 profissionais e 0 oportunidades**, será **desativado** (não removido, pois aparece hard-coded em `ContratosPage.tsx` como exemplo).
- Faltam 3 categorias novas: **Videomaker**, **Editor de vídeo**, **Editor de vídeo com IA**.

Como ambos os apps (Profissional e Cliente) leem da mesma tabela `categories` filtrando por `is_active=true`, qualquer mudança via SQL reflete em tempo real nos dois — basta atualizar o componente de ícones em ambos.

---

## Mudanças

### 1. Migração SQL (Supabase)

```sql
-- Desativar Fotógrafo (mantém histórico de referências)
UPDATE categories SET is_active = false WHERE slug = 'fotografo';

-- Remover definitivamente as 6 categorias inativas sem uso
DELETE FROM categories
WHERE slug IN (
  'roteirista','entrevistador','mestre-de-cerimonia',
  'recepcionista-eventos','operador-de-luz','operador-de-som'
);

-- Reordenar as restantes e inserir as 3 novas
UPDATE categories SET order_index = 1 WHERE slug = 'filmmaker';        -- já existia
UPDATE categories SET order_index = 4 WHERE slug = 'social-media';
UPDATE categories SET order_index = 3 WHERE slug = 'storymaker';
UPDATE categories SET order_index = 5 WHERE slug = 'videomaker-mobile';
UPDATE categories SET order_index = 6 WHERE slug = 'designer';

INSERT INTO categories (slug, name, is_active, order_index) VALUES
  ('videomaker',          'Videomaker',             true, 0),
  ('editor-de-video',     'Editor de vídeo',        true, 7),
  ('editor-de-video-ia',  'Editor de vídeo com IA', true, 8)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, is_active=true, order_index=EXCLUDED.order_index;
```

Ordem final: Videomaker (0), Filmmaker (1), Storymaker (3), Social Media (4), Videomaker Mobile (5), Designer (6), Editor de vídeo (7), Editor de vídeo com IA (8).

### 2. `src/components/ui/CategoryIcon.tsx`

Atualizar o mapa para os 8 slugs ativos e remover os obsoletos. Sugestão de ícones Lucide:
- `videomaker` → `Video`
- `filmmaker` → `Clapperboard`
- `storymaker` → `Sparkles`
- `social-media` → `Megaphone`
- `videomaker-mobile` → `Smartphone`
- `designer` → `Palette`
- `editor-de-video` → `Scissors`
- `editor-de-video-ia` → `Wand2`

Fallback continua sendo `Package` (para `fotografo` em contratos antigos).

### 3. `src/pages/ContratosPage.tsx` (linha 93)

Trocar `category_name: "Fotógrafo"` por `"Filmmaker"` no exemplo hard-coded (apenas placeholder visual de demonstração — não afeta dados reais).

### 4. Validação de não-quebra

- `CategoriasPage.tsx`, `OportunidadesPage.tsx`, `OportunidadeDetalhePage.tsx`, `PerfilPage.tsx` lêem categorias do banco — nenhuma mudança necessária, vão refletir os 8 itens automaticamente.
- Profissionais já cadastrados em `videomaker-mobile` / `filmmaker` / `social-media` continuam intactos.
- O `CategoryIcon` retorna `Package` como fallback para qualquer slug desconhecido — sem crash possível.

### 5. Arquivo único para o app do Cliente

Gerar `/mnt/documents/CategoryIcon.client.tsx` com:
- Mesmo `CATEGORY_ICON_MAP` dos 8 slugs.
- Mesmo componente `<CategoryIcon slug name size className />`.
- Comentário no topo explicando que o app do Cliente compartilha a tabela `categories` do mesmo projeto Supabase, então a sincronização é em tempo real — basta colar o arquivo em `src/components/ui/CategoryIcon.tsx` lá.

---

## Detalhes técnicos (resumo)

| Camada | Arquivo | Ação |
|---|---|---|
| DB | migração SQL | DELETE 6 + UPDATE fotografo + INSERT 3 + reorder |
| App Pro | `src/components/ui/CategoryIcon.tsx` | Reescrever mapa para 8 slugs |
| App Pro | `src/pages/ContratosPage.tsx` L93 | Trocar placeholder "Fotógrafo" → "Filmmaker" |
| App Cliente | `/mnt/documents/CategoryIcon.client.tsx` | Gerar arquivo idêntico para colar |

Sem alterações em RLS, edge functions, hooks ou rotas. Risco zero de crash: todas as queries continuam dinâmicas e o componente tem fallback.

Após aprovação, executo a migração (com confirmação do Supabase) e aplico os 2 edits no código.