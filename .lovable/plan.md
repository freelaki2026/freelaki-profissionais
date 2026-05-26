# Inputs com fundo escuro + Mapa tema claro

## Diagnóstico

**Inputs escuros:** Não é um caso por componente. O app tem tema claro (`--background: 0 0% 100%`), mas `src/index.css` não declara `color-scheme`. No iOS/Safari (e Chrome com "Force Dark"), o sistema aplica automaticamente o esquema escuro do dispositivo a `<input>`, `<textarea>` e `<select>` quando o site não declara explicitamente que é "light". Resultado: o card `bg-white` aparece branco, mas o campo nativo dentro dele fica cinza/preto com texto claro — e quando o nosso CSS força `text-foreground` (preto), o texto preto colide com o fundo escuro do user-agent.

Isso explica por que afeta **todas** as áreas de preenchimento (redes sociais, perfil, cadastro, endereço, bancário, etc.) sem precisar mexer em cada uma.

**Mapa escuro:** `src/pages/MapaPage.tsx` carrega o tile `cartocdn.com/dark_all/...` e força `bg-black` no wrapper + popups/controles escuros via `<style>` inline.

## Mudanças

### 1) `src/index.css` — corrige todos os inputs de uma vez
- Adicionar `color-scheme: light;` em `:root` para travar form controls em tema claro no iOS/Android/desktop.
- Reforço defensivo em `@layer base`:
  ```css
  input, textarea, select {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    -webkit-text-fill-color: hsl(var(--foreground)); /* iOS autofill */
  }
  input::placeholder, textarea::placeholder {
    color: hsl(var(--muted-foreground));
  }
  /* Remove o amarelo do autofill do Chrome/Safari que também vira escuro */
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px hsl(var(--background)) inset;
    -webkit-text-fill-color: hsl(var(--foreground));
  }
  ```

Isso resolve PerfilPage (redes sociais, nome, telefone, bio), Cadastro, Login, ResetPassword, DadosPessoais, DadosBancarios, Endereço, Equipamentos, Suporte etc. — sem editar cada página.

### 2) `src/pages/MapaPage.tsx` — tema claro
- Trocar tile URL de `dark_all` para `light_all` (mesmo provedor CartoDB, drop-in).
- Wrapper raiz: `bg-black text-white` → `bg-white text-zinc-900`.
- `<style>` inline: `.leaflet-container` fundo `#f1f5f9`; popup wrapper/tip `#ffffff` com texto `#0a0a0a`; controles zoom fundo branco com borda `#e4e4e7`; attribution sobre `rgba(255,255,255,.7)`.
- Header flutuante: gradiente `from-white/85 via-white/40 to-transparent`; cards `bg-white/95 border-zinc-200`; ícones/textos para tons escuros.
- Bottom sheet: `bg-white/95 border-zinc-200`; cards de oportunidade `bg-zinc-50 border-zinc-200` com texto escuro; ícones mantêm acento (azul/amarelo) para contraste.
- Popup interno do marcador: texto preto, endereço `text-zinc-500`, valor amarelo escuro `#a16207`, botão "Ver detalhes" `bg-zinc-900 text-white`.
- Empty state (sem geolocalização): mesmas cores invertidas (texto escuro sobre branco), botão "Permitir localização" `bg-zinc-900 text-white`.

## O que NÃO vou mexer
- Páginas dark intencionais (Login, Cadastro, Splash, Dashboard, etc.) continuam com `bg-black` — o usuário só pediu que **os campos de preenchimento** fiquem brancos, não as telas. O fix do `color-scheme` já garante que os inputs dentro dessas telas escuras tenham fundo branco com texto preto legível.
- Nenhuma lógica, nenhuma chamada Supabase, nenhum hook.

## Validação
- Abrir `/perfil` → adicionar rede social → o input no bottom sheet deve aparecer branco com texto preto.
- Abrir `/cadastro`, `/login`, `/dados-pessoais` → todos os inputs brancos/legíveis.
- Abrir `/mapa` → mapa claro, marcadores ainda visíveis, popups legíveis.
