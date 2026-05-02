#!/bin/bash
# Script de correção completo para o SysFlowCloudi

echo "========================================"
echo "CORREÇÃO COMPLETA DO SYSTEMA"
echo "========================================"

cd /root/JD-TELECOM--GOLDFIBRA/backend

# 1. Verificar se o banco existe
if [ ! -f "database.sqlite3.bin" ]; then
    echo "Criando banco de dados..."
fi

# 2. Criar script SQL para inserir dados
SQL_FILE="/tmp/fix_data.sql"

cat > $SQL_FILE << 'EOF'
-- Planos
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (1, 'Plano Básico', 79.90, '50 Mega', 1);
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (2, 'Plano Intermediário', 99.90, '100 Mega', 1);
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (3, 'Plano Avançado', 149.90, '300 Mega', 1);
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (4, 'Plano Premium', 199.90, '500 Mega', 1);

-- Clientes
INSERT OR IGNORE INTO clients (id, name, cpf, whatsapp, street, number, neighborhood, city, state, plan_id, status, due_day) VALUES 
(1, 'João Silva', '123.456.789-00', '(11) 98765-4321', 'Rua A', '123', 'Centro', 'São Paulo', 'SP', 1, 'ativo', 10);
INSERT OR IGNORE INTO clients (id, name, cpf, whatsapp, street, number, neighborhood, city, state, plan_id, status, due_day) VALUES 
(2, 'Maria Santos', '987.654.321-00', '(11) 91234-5678', 'Rua B', '456', 'Jardim', 'São Paulo', 'SP', 2, 'ativo', 15);
INSERT OR IGNORE INTO clients (id, name, cpf, whatsapp, street, number, neighborhood, city, state, plan_id, status, due_day) VALUES 
(3, 'Pedro Oliveira', '456.789.123-00', '(11) 95678-1234', 'Rua C', '789', 'Vila', 'São Paulo', 'SP', 3, 'ativo', 20);
INSERT OR IGNORE INTO clients (id, name, cpf, whatsapp, street, number, neighborhood, city, state, plan_id, status, due_day) VALUES 
(4, 'Ana Costa', '789.123.456-00', '(11) 94321-8765', 'Rua D', '321', 'Bairro', 'São Paulo', 'SP', 1, 'ativo', 25);
INSERT OR IGNORE INTO clients (id, name, cpf, whatsapp, street, number, neighborhood, city, state, plan_id, status, due_day) VALUES 
(5, 'Carlos Souza', '321.654.987-00', '(11) 96789-4321', 'Rua E', '654', 'Centro', 'São Paulo', 'SP', 2, 'ativo', 5);

-- Verificar admin
SELECT COUNT(*) as c FROM users WHERE role='admin';
EOF

echo "Script SQL criado."

# 3. Verificar usuários
node -e "
const db = require('./src/database.js');
db.initDatabase().then(database => {
    const users = database.prepare('SELECT id, jd_id, name, role, active FROM users').all();
    console.log('Usuários encontrados:', users.length);
    users.forEach(u => console.log('  -', u.jd_id, u.name, '('+u.role+')'));
    
    const clients = database.prepare('SELECT COUNT(*) as c FROM clients').get();
    console.log('Clientes:', clients.c);
    
    const plans = database.prepare('SELECT COUNT(*) as c FROM plans').get();
    console.log('Planos:', plans.c);
    
    process.exit(0);
}).catch(e => {
    console.error('Erro:', e.message);
    process.exit(1);
});
"

echo ""
echo "========================================"
echo "Verificação concluída!"
echo "========================================"
