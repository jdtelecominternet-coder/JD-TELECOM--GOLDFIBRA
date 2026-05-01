-- Script SQL para inserir dados diretamente
-- Execute: sqlite3 database.sqlite < seed.sql

-- Planos
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (1, 'Plano Básico', 79.90, '50 Mega', 1);
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (2, 'Plano Intermediário', 99.90, '100 Mega', 1);
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (3, 'Plano Avançado', 149.90, '300 Mega', 1);
INSERT OR IGNORE INTO plans (id, name, price, speed, active) VALUES (4, 'Plano Premium', 199.90, '500 Mega', 1);

-- Clientes
INSERT OR IGNORE INTO clients (id, name, cpf, email, phone, address, plan_id, active) VALUES 
(1, 'João Silva', '123.456.789-00', 'joao@email.com', '(11) 98765-4321', 'Rua A, 123 - Centro', 1, 1);
INSERT OR IGNORE INTO clients (id, name, cpf, email, phone, address, plan_id, active) VALUES 
(2, 'Maria Santos', '987.654.321-00', 'maria@email.com', '(11) 91234-5678', 'Rua B, 456 - Jardim', 2, 1);
INSERT OR IGNORE INTO clients (id, name, cpf, email, phone, address, plan_id, active) VALUES 
(3, 'Pedro Oliveira', '456.789.123-00', 'pedro@email.com', '(11) 95678-1234', 'Rua C, 789 - Vila', 3, 1);
INSERT OR IGNORE INTO clients (id, name, cpf, email, phone, address, plan_id, active) VALUES 
(4, 'Ana Costa', '789.123.456-00', 'ana@email.com', '(11) 94321-8765', 'Rua D, 321 - Bairro', 1, 1);
INSERT OR IGNORE INTO clients (id, name, cpf, email, phone, address, plan_id, active) VALUES 
(5, 'Carlos Souza', '321.654.987-00', 'carlos@email.com', '(11) 96789-4321', 'Rua E, 654 - Centro', 2, 1);

-- Ordens de Serviço
INSERT OR IGNORE INTO service_orders (client_id, technician_id, status, created_at) VALUES 
(1, 2, 'pendente', datetime('now', '-2 days'));
INSERT OR IGNORE INTO service_orders (client_id, technician_id, status, created_at) VALUES 
(2, 2, 'em_andamento', datetime('now', '-1 day'));
INSERT OR IGNORE INTO service_orders (client_id, technician_id, status, created_at) VALUES 
(3, 3, 'concluida', datetime('now', '-3 days'));
INSERT OR IGNORE INTO service_orders (client_id, technician_id, status, created_at) VALUES 
(4, 2, 'pendente', datetime('now'));
INSERT OR IGNORE INTO service_orders (client_id, technician_id, status, created_at) VALUES 
(5, 3, 'cancelada', datetime('now', '-5 days'));