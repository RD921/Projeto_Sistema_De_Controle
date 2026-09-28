const pool = require("../src/config/db");
pool.query(
  "SELECT id, label, disponivel, nativo, rota FROM modules_catalog WHERE id LIKE ? OR label LIKE ?",
  ["%comm%", "%ommerce%"]
).then(([rows]) => {
  console.log(rows);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});