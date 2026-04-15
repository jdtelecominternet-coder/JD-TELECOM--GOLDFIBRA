const db=require('better-sqlite3')('./database.sqlite');
const bcrypt=require('bcryptjs');
const hash=bcrypt.hashSync('admin123',10);
db.prepare("INSERT OR IGNORE INTO users (jd_id,name,role) VALUES ('JD000001','Administrador','admin')").run();
const u=db.prepare("SELECT id FROM users WHERE jd_id='JD000001'").get();
db.prepare('INSERT OR REPLACE INTO passwords (user_id,hash) VALUES (?,?)').run(u.id,hash);
console.log('Admin criado!');
