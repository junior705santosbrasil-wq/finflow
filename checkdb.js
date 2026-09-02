const { Client } = require("pg");
const url = "postgresql://neondb_owner:npg_4IF9HneEYfWZ@ep-sweet-grass-acapqya2-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  const r = await client.query("SELECT id, nome, email FROM usuarios ORDER BY id");
  console.log("Total de usuarios:", r.rowCount);
  for (const u of r.rows) console.log(`#${u.id} | ${u.nome} | ${u.email}`);
  await client.end();
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
