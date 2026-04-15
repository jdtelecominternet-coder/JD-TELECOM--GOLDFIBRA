# JD TELECOM - GOLD FIBRA
## Sistema de Gestão de Vendas e Instalações

---

## REQUISITOS

- Node.js 18+ instalado
- NPM 9+

---

## INSTALAÇÃO

### Passo 1 — Instalar dependências
Clique duas vezes em: `instalar.bat`

Ou manualmente:
```
cd backend && npm install
cd ../frontend && npm install
```

### Passo 2 — Iniciar o sistema
Clique duas vezes em: `iniciar.bat`

O sistema abrirá automaticamente no navegador.

---

## PRIMEIRO ACESSO

| Campo | Valor |
|-------|-------|
| **ID** | JD000001 |
| **Senha** | admin123 |

> Altere a senha após o primeiro login!

---

## URLs

| Serviço | Endereço |
|---------|----------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |

---

## TIPOS DE USUÁRIO

| Tipo | Permissões |
|------|-----------|
| **Administrador** | Acesso total ao sistema |
| **Vendedor** | Clientes, OS, Dashboard próprio |
| **Técnico** | Módulo técnico, suas OS |

---

## FUNCIONALIDADES

- Login seguro com ID formato JD + 6 números
- Gestão de usuários (admin)
- Cadastro de clientes com busca de CEP (ViaCEP)
- Cadastro de planos de internet
- Ordens de Serviço com status automático
- Módulo técnico com upload de fotos obrigatórias
- Controle de materiais (DROP, esticador, conector, etc.)
- Redistribuição de OS entre técnicos (manobra)
- Atualização automática de status do cliente
- Relatórios em PDF (vendas, instalações, materiais)
- Upload de logotipo pela administração
- Upload de foto de perfil

---

## TECNOLOGIAS

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Banco:** SQLite (better-sqlite3)
- **Auth:** JWT
- **PDF:** jsPDF + AutoTable
- **CEP:** ViaCEP API
