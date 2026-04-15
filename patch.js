const fs = require('fs'), path = require('path');
const BASE = "C:\\Users\\User\\Downloads\\remix_-jd-telecom---gold-fibra (3)";

// 1. database.js
const dbFile = path.join(BASE, 'backend/src/database.js');
let db = fs.readFileSync(dbFile, 'utf8');
db = db.replace('`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL`,\n  ];','`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL`,\n    `ALTER TABLE settings ADD COLUMN role_permissions TEXT DEFAULT NULL`,\n  ];');
fs.writeFileSync(dbFile, db);
console.log('OK database.js');

// 2. settings.js
const setFile = path.join(BASE, 'backend/src/routes/settings.js');
let set = fs.readFileSync(setFile, 'utf8');
if (!set.includes('role-permissions')) {
  set = set.replace('module.exports = router;', `const DEFAULT_ROLE_PERMS = {
  vendedor: { dashboard: true, users: false, clients: true, plans: true, orders: true, transfer: true, technical: false, reports: false, chat: false, settings: false },
  tecnico:  { dashboard: true, users: false, clients: false, plans: false, orders: false, transfer: false, technical: true, reports: false, chat: true, settings: false },
};
router.get('/role-permissions', authMiddleware, (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT role_permissions FROM settings WHERE id=1').get();
  if (s && s.role_permissions) { try { const stored = JSON.parse(s.role_permissions); return res.json({ vendedor: { ...DEFAULT_ROLE_PERMS.vendedor, ...(stored.vendedor||{}) }, tecnico: { ...DEFAULT_ROLE_PERMS.tecnico, ...(stored.tecnico||{}) } }); } catch(_){} }
  res.json(DEFAULT_ROLE_PERMS);
});
router.put('/role-permissions', authMiddleware, adminOnly, (req, res) => {
  const db = getDb(); const { role, permissions } = req.body;
  if (!['vendedor','tecnico'].includes(role)) return res.status(400).json({ error: 'Role invalido' });
  const current = db.prepare('SELECT role_permissions FROM settings WHERE id=1').get();
  let obj = {}; if (current && current.role_permissions) { try { obj = JSON.parse(current.role_permissions); } catch(_){} }
  obj[role] = { ...DEFAULT_ROLE_PERMS[role], ...permissions };
  db.prepare('UPDATE settings SET role_permissions=? WHERE id=1').run(JSON.stringify(obj));
  res.json({ message: 'Salvo' });
});
module.exports = router;`);
  fs.writeFileSync(setFile, set);
}
console.log('OK settings.js');

// 3. Layout.jsx
const layFile = path.join(BASE, 'frontend/src/components/Layout.jsx');
let lay = fs.readFileSync(layFile, 'utf8');
if (!lay.includes('roleGlobalPerms')) {
  lay = lay.replace("  const [logo, setLogo] = useState(null);","  const [logo, setLogo] = useState(null);\n  const [roleGlobalPerms, setRoleGlobalPerms] = useState(null);");
  lay = lay.replace("    api.get('/settings').then(r => setLogo(r.data.logo_url)).catch(() => {});","    api.get('/settings').then(r => setLogo(r.data.logo_url)).catch(() => {});\n    api.get('/settings/role-permissions').then(r => setRoleGlobalPerms(r.data)).catch(() => {});");
  lay = lay.replace("    if (user?.permissions && user.permissions[key] !== undefined) return user.permissions[key];\n    return defaultPerms[user?.role]?.[key] !== false;\n  });","    if (user?.permissions && user.permissions[key] !== undefined) return user.permissions[key];\n    if (roleGlobalPerms?.[user?.role]?.[key] !== undefined) return roleGlobalPerms[user.role][key];\n    return defaultPerms[user?.role]?.[key] !== false;\n  });");
  fs.writeFileSync(layFile, lay);
}
console.log('OK Layout.jsx');

// 4. Users.jsx
const usrFile = path.join(BASE, 'frontend/src/pages/Users.jsx');
let usr = fs.readFileSync(usrFile, 'utf8');
if (!usr.includes('GLOBAL_PERM_LABELS')) {
  usr = usr.replace("import { Plus, Search, Edit, Trash2, X, Eye, EyeOff, Shield, ShoppingBag, Wrench, UserX, CheckCircle, XCircle, Settings2 } from 'lucide-react';","import { Plus, Search, Edit, Trash2, X, Eye, EyeOff, Shield, ShoppingBag, Wrench, UserX, CheckCircle, XCircle, Settings2, Globe } from 'lucide-react';");
  usr = usr.replace('export default function Users() {',`const GLOBAL_PERM_LABELS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'users', label: 'Gerenciar Usuarios', icon: '👥' },
  { key: 'clients', label: 'Clientes', icon: '🤝' },
  { key: 'plans', label: 'Planos', icon: '📦' },
  { key: 'orders', label: 'Ordens de Servico', icon: '📋' },
  { key: 'transfer', label: 'Transferir OS', icon: '🔄' },
  { key: 'technical', label: 'Modulo Tecnico', icon: '🛠️' },
  { key: 'reports', label: 'Relatorios', icon: '📈' },
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'settings', label: 'Configuracoes', icon: '⚙️' },
];
export default function Users() {`);
  usr = usr.replace('  const [saving, setSaving] = useState(false);','  const [saving, setSaving] = useState(false);\n  const [globalPermsTab, setGlobalPermsTab] = useState("vendedor");\n  const [globalPerms, setGlobalPerms] = useState(null);\n  const [savingGlobal, setSavingGlobal] = useState(false);');
  usr = usr.replace('  useEffect(() => { load(); }, []);','  useEffect(() => { load(); }, []);\n  useEffect(() => { api.get("/settings/role-permissions").then(r => setGlobalPerms(r.data)).catch(() => {}); }, []);\n  async function saveGlobalPerms(role) { setSavingGlobal(true); try { await api.put("/settings/role-permissions", { role, permissions: globalPerms[role] }); toast.success("Permissoes salvas!"); } catch { toast.error("Erro"); } finally { setSavingGlobal(false); } }\n  function toggleGlobalPerm(role, key) { setGlobalPerms(prev => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } })); }');
  fs.writeFileSync(usrFile, usr);
}
console.log('OK Users.jsx');
console.log('Patch concluido! Reinicie o backend.');
