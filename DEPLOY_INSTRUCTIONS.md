# Instruções de Deploy - Atualização do Menu

## Arquivos Modificados

### 1. Frontend
- **Arquivo**: `frontend/src/components/Layout.jsx`
- **Mudanças**:
  - Corrigidos erros de português:
    - "Configuracoes" → "Configurações"
    - "Solicitacoes" → "Solicitações"
    - "Gestao de Vendas" → "Gestão de Vendas"
    - "Servicos Executados" → "Serviços Executados"
    - "Relatório Técnicos" → "Relatório de Técnicos"
  - Menu organizado por setores com ícones separados:
    - 📋 **Administrativo**: Dashboard, Usuários, Clientes, Planos, Ordens de Serviço
    - 🔧 **Técnico**: Módulo Técnico, Ocorrências CTO, Serviço de Rede, Estoque Técnico, Controle de Qualidade, Provedor/CORE
    - 💰 **Financeiro/Vendas**: Gestão de Vendas, Serviços Executados, Relatórios, Relatório de Técnicos
    - 💬 **Comunicação**: Chat, Solicitações
    - ⚙️ **Sistema**: Assistente IA, Configurações

### 2. Backend (Stock)
- **Arquivo**: `backend/src/routes/stock.js`
- **Mudanças**:
  - Adicionada rota `POST /api/stock/retirar` - técnico pode retirar ONU disponível
  - Adicionada rota `POST /api/stock/swap` - técnico pode trocar ONU em uso

## Como fazer o Deploy

### Opção 1: Deploy Automático (se a conexão melhorar)
```bash
# No servidor, executar:
cd /var/www/jdtelecom/assets
unzip -o index.zip
mv index-BptLQt5E.js index.js  # ou ajustar o index.html

# Reiniciar backend
pm2 restart all
```

### Opção 2: Deploy Manual via FileZilla/WinSCP
1. Conectar no servidor: `root@jdtelecom.online`
2. Navegar para `/var/www/jdtelecom/assets/`
3. Fazer backup do arquivo JS atual: `cp index-*.js index-backup.js`
4. Enviar o novo arquivo: `index-BptLQt5E.js` (ou renomear para o mesmo nome do atual)
5. Se necessário, atualizar o `index.html` para apontar para o novo nome do arquivo

### Opção 3: Deploy via Git
Se o projeto estiver em um repositório git no servidor:
```bash
ssh root@jdtelecom.online
cd /root/jd-backend
git pull
npm run build  # se houver build no backend
pm2 restart all

# Frontend
cd /var/www/jdtelecom
git pull
# ou copiar os arquivos do dist/
```

## Verificação após Deploy

1. Acessar o sistema e verificar se o menu está organizado por setores
2. Verificar se os textos estão corretos (com acentos)
3. Testar as funcionalidades de Retirar e Trocar ONU no estoque do técnico

## Arquivos de Backup
Os arquivos originais estão em:
- `C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\components\Layout.jsx.bak` (se existir)
- Ou no git: `git diff` para ver as mudanças
