import { Router, Request, Response } from "express";
import pool from "../config/db";
import { sql, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM produtos WHERE ativo = true) AS total_produtos,
        (SELECT COUNT(*) FROM produtos WHERE estoque_atual <= estoque_minimo AND ativo = true) AS produtos_estoque_baixo,
        (SELECT COUNT(*) FROM pedidos) AS total_pedidos,
        (SELECT COUNT(*) FROM pedidos WHERE status = 'pendente') AS pedidos_pendentes,
        (SELECT COUNT(*) FROM pedidos WHERE DATE(criado_em) = CURDATE()) AS pedidos_hoje,
        (SELECT COUNT(*) FROM clientes) AS total_clientes,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos
          WHERE DATE_FORMAT(criado_em, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) AS receita_mes,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos
          WHERE DATE(criado_em) = CURDATE()) AS receita_hoje,
        (SELECT COUNT(*) FROM alertas WHERE resolvido = false) AS alertas_pendentes
    `);

    const stats = (rows as any[])[0];

    res.json({
      kpis: stats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar dashboard" });
  }
});

export default router;