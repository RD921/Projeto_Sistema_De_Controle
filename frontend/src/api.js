import axios from "axios";

// Endereço da API:
// - no seu PC (npm run dev), usa o servidor em localhost:3000
// - no ar (Render), usa o mesmo endereço do painel
// - VITE_API_URL permite trocar, se um dia a API ficar em outro lugar
export const API_ORIGIN =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000" : "");
export const API_URL = API_ORIGIN + "/api";
// Endereço completo (com https://...), para links que o cliente copia
export const API_PUBLIC_URL = (API_ORIGIN || window.location.origin) + "/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;