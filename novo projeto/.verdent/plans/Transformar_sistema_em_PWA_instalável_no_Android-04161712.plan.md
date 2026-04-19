
## Objetivo
Fazer o sistema funcionar como aplicativo instalável no Android via Chrome, sem precisar da Play Store.

## O que o usuário verá
- Ao acessar `https://jdtelecom.online` no Chrome, aparece botão **"Instalar aplicativo"**
- Após instalar, fica com ícone na tela inicial igual a um app normal
- Abre em tela cheia sem barra do navegador

---

## Mudanças

### 1. Instalar plugin PWA no frontend
```
npm install vite-plugin-pwa -D
```

### 2. `frontend/vite.config.js`
- Adicionar `VitePWA` com configuração:
  - Nome: **JD Telecom**
  - Nome curto: **JD Telecom**
  - Ícones 192x192 e 512x512
  - Tema azul (`#1e50b4`)
  - `registerType: 'autoUpdate'`

### 3. `frontend/public/manifest.json`
- `name`: JD Telecom — Gold Fibra
- `short_name`: JD Telecom
- `start_url`: `/`
- `display`: `standalone`
- `theme_color`: `#1e50b4`
- `background_color`: `#0f172a`
- Ícones gerados automaticamente pelo plugin

### 4. Criar ícones em `frontend/public/`
- `logo192.png` — ícone 192x192 (fundo azul com "JD")
- `logo512.png` — ícone 512x512

### 5. `frontend/index.html`
- Adicionar meta tags:
  - `theme-color`
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-title`
  - Link para manifest

### 6. Build e envio para servidor
- `npm run build` gera `dist/` com service worker automático
- Enviar `dist/` para o VPS via `scp`
- O Nginx já serve os arquivos estáticos — nenhuma mudança no servidor necessária

---

## Verificação
| Passo | Critério |
|---|---|
| Build sem erro | `✓ built` no terminal |
| Manifest acessível | `https://jdtelecom.online/manifest.json` retorna 200 |
| Instalável no Android | Chrome mostra banner "Adicionar à tela inicial" |
| Ícone na tela do celular | App aparece com ícone JD Telecom |
