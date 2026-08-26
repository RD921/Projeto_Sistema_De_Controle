// src/controllers/moduleController.js
const pool = require("../config/db");

// Lista o catálogo inteiro. Módulos nativos aparecem sempre como
// "instalado", independente da tabela tenant_modules — eles são
// núcleo do sistema, não passam por instalação.
exports.list = async (req, res) => {
  try {
    const [catalogo] = await pool.query("SELECT * FROM modules_catalog ORDER BY nativo DESC, disponivel DESC, label");
    const [instalados] = await pool.query(
      "SELECT module_id, status FROM tenant_modules WHERE tenant_id = ?",
      [req.tenant_id]
    );
    const mapaInstalados = Object.fromEntries(instalados.map(i => [i.module_id, i.status]));

    const resultado = catalogo.map(m => ({
      ...m,
      instalado: m.nativo ? true : mapaInstalados[m.id] === "active",
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar módulos", details: err.message });
  }
};

exports.install = async (req, res) => {
  try {
    const { id } = req.params;
    const [[modulo]] = await pool.query("SELECT * FROM modules_catalog WHERE id = ?", [id]);
    if (!modulo) return res.status(404).json({ error: "Módulo não encontrado" });
    if (modulo.nativo) return res.status(409).json({ error: "Este módulo é nativo e já está sempre ativo" });
    if (!modulo.disponivel) return res.status(409).json({ error: "Este módulo ainda não está disponível" });

    await pool.query(
      `INSERT INTO tenant_modules (tenant_id, module_id, status)
       VALUES (?, ?, 'active')
       ON DUPLICATE KEY UPDATE status = 'active'`,
      [req.tenant_id, id]
    );
    res.json({ message: "Módulo instalado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao instalar módulo", details: err.message });
  }
};

exports.uninstall = async (req, res) => {
  try {
    const { id } = req.params;
    const [[modulo]] = await pool.query("SELECT nativo FROM modules_catalog WHERE id = ?", [id]);
    if (modulo?.nativo) return res.status(409).json({ error: "Este módulo é nativo e não pode ser removido" });

    await pool.query(
      "UPDATE tenant_modules SET status = 'inactive' WHERE tenant_id = ? AND module_id = ?",
      [req.tenant_id, id]
    );
    res.json({ message: "Módulo desinstalado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desinstalar módulo", details: err.message });
  }
};