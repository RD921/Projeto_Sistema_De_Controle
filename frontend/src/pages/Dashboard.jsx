import { useEffect, useState } from "react";
import api from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const tenantId = localStorage.getItem("tenant_id") || 1;
    api.get(`/tenants/${tenantId}/stats`)
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  const cards = [
    { label: "Produtos", value: stats?.produtos ?? "-" },
    { label: "Pedidos", value: stats?.pedidos ?? "-" },
    { label: "Clientes", value: stats?.clientes ?? "-" },
    { label: "Receita Total", value: stats ? `R$ ${Number(stats.receita_total).toFixed(2)}` : "-" },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24, color: "#fff", fontWeight: 700 }}>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: "#111", padding: 24, borderRadius: 10,
            border: "1px solid #222",
          }}>
            <p style={{ color: "#555", marginBottom: 8, fontSize: 13 }}>{c.label}</p>
            <h2 style={{ fontSize: 28, color: "#fff" }}>{c.value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}