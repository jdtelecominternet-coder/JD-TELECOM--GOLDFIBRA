// ── MASTER ADMIN — conta fixa, nunca apagada do sistema ──
const MASTER = {
  id: 'master',
  name: 'Administrador Master',
  username: 'MASTER',
  loginCode: 'MASTER',
  password: 'master@2025',
  role: 'master',
  oab: '',
  email: '',
  phone: '',
  userType: 'staff',
};

// Central data store using localStorage
const KEYS = {
  users: 'adv_users',
  clients: 'adv_clients',
  processes: 'adv_processes',
  contracts: 'adv_contracts',
  messages: 'adv_messages',
  files: 'adv_files',
  notifications: 'adv_notifications',
  currentUser: 'adv_current_user',
  loginCounter: 'adv_login_counter',
};

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function loadObj(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// ── Gerador de código de login ──
// Staff → AD001, AD002... | Clientes → CL001, CL002...
function nextLoginCode(prefix) {
  const counters = loadObj(KEYS.loginCounter) || {};
  const current = counters[prefix] || 0;
  const next = current + 1;
  counters[prefix] = next;
  localStorage.setItem(KEYS.loginCounter, JSON.stringify(counters));
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// Seed inicial
function seed() {
  if (localStorage.getItem('adv_seeded_v3')) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));

  // Define contadores iniciais
  localStorage.setItem(KEYS.loginCounter, JSON.stringify({ AD: 3, CL: 3 }));

  const users = [
    { id: 'u1', name: 'Dr. Ricardo Mendes', username: 'AD001', loginCode: 'AD001', password: '123456', role: 'admin', oab: 'OAB/SP 123456', email: '', phone: '' },
    { id: 'u2', name: 'Dra. Carolina Silva', username: 'AD002', loginCode: 'AD002', password: '123456', role: 'advogado', oab: 'OAB/SP 654321', email: '', phone: '' },
    { id: 'u3', name: 'Marcos Assistente', username: 'AD003', loginCode: 'AD003', password: '123456', role: 'assistente', oab: '', email: '', phone: '' },
  ];

  const clients = [
    { id: 'c1', name: 'Empresa ABC Ltda', username: 'CL001', loginCode: 'CL001', password: 'abc123', cpfCnpj: '12.345.678/0001-99', email: '', phone: '(11) 99999-1111', address: 'Rua das Flores, 100, SP', type: 'empresa', createdAt: new Date().toISOString() },
    { id: 'c2', name: 'João da Silva', username: 'CL002', loginCode: 'CL002', password: 'joao123', cpfCnpj: '123.456.789-00', email: '', phone: '(11) 88888-2222', address: 'Av. Paulista, 200, SP', type: 'pessoa', createdAt: new Date().toISOString() },
    { id: 'c3', name: 'Maria Souza', username: 'CL003', loginCode: 'CL003', password: 'maria123', cpfCnpj: '987.654.321-00', email: '', phone: '(11) 77777-3333', address: 'Rua Augusta, 300, SP', type: 'pessoa', createdAt: new Date().toISOString() },
  ];

  const processes = [
    { id: 'p1', number: '0001234-56.2024.8.26.0100', vara: '1ª Vara Cível', judge: 'Dr. Carlos Lima', type: 'Ação Civil Ordinária', clientId: 'c1', status: 'andamento', description: 'Cobrança de valores em contrato de prestação de serviços.', movements: [{ date: new Date().toISOString(), text: 'Processo distribuído', author: 'Sistema' }, { date: new Date(Date.now()-86400000).toISOString(), text: 'Petição inicial protocolada', author: 'Dr. Ricardo Mendes' }, { date: new Date().toISOString(), text: 'Audiência agendada para 15/07/2025', author: 'Dr. Ricardo Mendes' }], lawyerId: 'u1', honorarios: 15000, honorariosPago: 5000, createdAt: new Date().toISOString() },
    { id: 'p2', number: '0009876-12.2024.8.26.0100', vara: '3ª Vara Trabalhista', judge: 'Dra. Ana Pereira', type: 'Reclamação Trabalhista', clientId: 'c2', status: 'andamento', description: 'Horas extras não pagas e verbas rescisórias.', movements: [{ date: new Date().toISOString(), text: 'Reclamação distribuída', author: 'Sistema' }], lawyerId: 'u2', honorarios: 8000, honorariosPago: 0, createdAt: new Date().toISOString() },
    { id: 'p3', number: '0005555-78.2023.8.26.0100', vara: '2ª Vara de Família', judge: 'Dr. Paulo Ramos', type: 'Divórcio Litigioso', clientId: 'c3', status: 'finalizado', description: 'Dissolução de casamento com partilha de bens.', movements: [{ date: new Date().toISOString(), text: 'Sentença proferida', author: 'Sistema' }], lawyerId: 'u1', honorarios: 12000, honorariosPago: 12000, createdAt: new Date().toISOString() },
  ];

  const contracts = [
    { id: 'ct1', processId: 'p1', clientId: 'c1', title: 'Contrato de Honorários — Ação Civil Ordinária', content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nPelo presente instrumento particular, de um lado EMPRESA ABC LTDA, doravante CONTRATANTE, e de outro o escritório de advocacia, doravante CONTRATADO.\n\nCLÁUSULA 1ª — DO OBJETO\nPrestação de serviços advocatícios no processo nº 0001234-56.2024.8.26.0100.\n\nCLÁUSULA 2ª — DOS HONORÁRIOS\nOs honorários são fixados em R$ 15.000,00 (quinze mil reais), pagos conforme acordado.\n\nCLÁUSULA 3ª — DO PRAZO\nVigência pelo tempo necessário à conclusão do processo.\n\nCLÁUSULA 4ª — DAS OBRIGAÇÕES\nO advogado se obriga a defender os interesses do cliente com dedicação e ética profissional.`, honorarios: 15000, type: 'fixo', status: 'assinado', signatureData: null, signatureDate: new Date().toISOString(), photoData: null, createdAt: new Date().toISOString() },
  ];

  const messages = [
    { id: 'm1', processId: 'p1', senderId: 'c1', senderName: 'Empresa ABC', senderType: 'client', text: 'Bom dia! Gostaria de saber como está o andamento do processo.', time: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm2', processId: 'p1', senderId: 'u1', senderName: 'Dr. Ricardo Mendes', senderType: 'staff', text: 'Bom dia! O processo está em fase de instrução. Aguardamos a audiência marcada para o próximo mês.', time: new Date(Date.now() - 3000000).toISOString() },
  ];

  save(KEYS.users, users);
  save(KEYS.clients, clients);
  save(KEYS.processes, processes);
  save(KEYS.contracts, contracts);
  save(KEYS.messages, messages);
  save(KEYS.files, []);
  save(KEYS.notifications, []);
  localStorage.setItem('adv_seeded_v3', '1');
}

seed();

// ── AUTH ── login por código gerado (AD001, CL001, MASTER)
export function login(loginCode, password) {
  const code = loginCode.trim().toUpperCase();

  if (code === 'MASTER' && password === MASTER.password) {
    save(KEYS.currentUser, MASTER);
    return MASTER;
  }

  const users = load(KEYS.users);
  const clients = load(KEYS.clients);

  const user = users.find(x => x.loginCode?.toUpperCase() === code && x.password === password);
  if (user) { save(KEYS.currentUser, { ...user, userType: 'staff' }); return { ...user, userType: 'staff' }; }

  const client = clients.find(x => x.loginCode?.toUpperCase() === code && x.password === password);
  if (client) { save(KEYS.currentUser, { ...client, userType: 'client' }); return { ...client, userType: 'client' }; }

  return null;
}
export function logout() { localStorage.removeItem('adv_current_user'); }
export function getCurrentUser() { return loadObj(KEYS.currentUser); }
export function getMaster() { return MASTER; }

// ── USERS (staff) ──
export function getUsers() { return load(KEYS.users); }
export function addUser(u) {
  const list = load(KEYS.users);
  const loginCode = nextLoginCode('AD');
  const item = { ...u, id: 'u' + Date.now(), loginCode, username: loginCode };
  save(KEYS.users, [...list, item]);
  return item;
}
export function updateUser(id, data) { save(KEYS.users, load(KEYS.users).map(u => u.id === id ? { ...u, ...data } : u)); }
export function deleteUser(id) { save(KEYS.users, load(KEYS.users).filter(u => u.id !== id)); }

// ── CLIENTS ──
export function getClients() { return load(KEYS.clients); }
export function addClient(c) {
  const list = load(KEYS.clients);
  const loginCode = nextLoginCode('CL');
  const item = { ...c, id: 'c' + Date.now(), loginCode, username: loginCode, createdAt: new Date().toISOString() };
  save(KEYS.clients, [...list, item]);
  return item;
}
export function updateClient(id, data) { save(KEYS.clients, load(KEYS.clients).map(c => c.id === id ? { ...c, ...data } : c)); }
export function deleteClient(id) { save(KEYS.clients, load(KEYS.clients).filter(c => c.id !== id)); }
export function getClientById(id) { return load(KEYS.clients).find(c => c.id === id); }

// ── PROCESSES ──
export function getProcesses() { return load(KEYS.processes); }
export function addProcess(p) { const item = { ...p, id: 'p' + Date.now(), movements: [], createdAt: new Date().toISOString() }; save(KEYS.processes, [...load(KEYS.processes), item]); return item; }
export function updateProcess(id, data) { save(KEYS.processes, load(KEYS.processes).map(p => p.id === id ? { ...p, ...data } : p)); }
export function deleteProcess(id) { save(KEYS.processes, load(KEYS.processes).filter(p => p.id !== id)); }
export function addMovement(processId, text, author) {
  save(KEYS.processes, load(KEYS.processes).map(p => p.id === processId ? { ...p, movements: [...(p.movements || []), { date: new Date().toISOString(), text, author }] } : p));
}
export function getProcessById(id) { return load(KEYS.processes).find(p => p.id === id); }
export function getProcessesByClient(clientId) { return load(KEYS.processes).filter(p => p.clientId === clientId); }

// ── CONTRACTS ──
export function getContracts() { return load(KEYS.contracts); }
export function addContract(c) { const item = { ...c, id: 'ct' + Date.now(), status: 'pendente', createdAt: new Date().toISOString() }; save(KEYS.contracts, [...load(KEYS.contracts), item]); return item; }
export function updateContract(id, data) { save(KEYS.contracts, load(KEYS.contracts).map(c => c.id === id ? { ...c, ...data } : c)); }
export function getContractById(id) { return load(KEYS.contracts).find(c => c.id === id); }
export function getContractsByProcess(processId) { return load(KEYS.contracts).filter(c => c.processId === processId); }
export function getContractsByClient(clientId) { return load(KEYS.contracts).filter(c => c.clientId === clientId); }

// ── MESSAGES ──
export function getMessages(processId) { return load(KEYS.messages).filter(m => m.processId === processId); }
export function getAllMessages() { return load(KEYS.messages); }
export function addMessage(msg) { const item = { ...msg, id: 'm' + Date.now(), time: new Date().toISOString() }; save(KEYS.messages, [...load(KEYS.messages), item]); return item; }

// ── FILES ──
export function getFiles(processId) { return load(KEYS.files).filter(f => processId ? f.processId === processId : true); }
export function addFile(f) { const item = { ...f, id: 'f' + Date.now(), uploadedAt: new Date().toISOString() }; save(KEYS.files, [...load(KEYS.files), item]); return item; }
export function deleteFile(id) { save(KEYS.files, load(KEYS.files).filter(f => f.id !== id)); }

// ── NOTIFICATIONS ──
export function getNotifications(userId) { return load(KEYS.notifications).filter(n => n.userId === userId); }
export function addNotification(n) { save(KEYS.notifications, [...load(KEYS.notifications), { ...n, id: 'n' + Date.now(), read: false, createdAt: new Date().toISOString() }]); }
export function markNotifRead(id) { save(KEYS.notifications, load(KEYS.notifications).map(n => n.id === id ? { ...n, read: true } : n)); }

// ── STATS ──
export function getStats() {
  const processes = load(KEYS.processes);
  const total = processes.length;
  const andamento = processes.filter(p => p.status === 'andamento').length;
  const finalizado = processes.filter(p => p.status === 'finalizado').length;
  const aguardando = processes.filter(p => p.status === 'aguardando').length;
  const honorariosTotal = processes.reduce((s, p) => s + (p.honorarios || 0), 0);
  const honorariosPago = processes.reduce((s, p) => s + (p.honorariosPago || 0), 0);
  return { total, andamento, finalizado, aguardando, honorariosTotal, honorariosPago, aReceber: honorariosTotal - honorariosPago };
}
