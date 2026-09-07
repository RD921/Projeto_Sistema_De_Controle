import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Modulos from "./pages/Modulos";
import CentralControle from "./pages/CentralControle";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Marketing from "./pages/Marketing";
import Assistente from "./pages/Assistente";
import Automacoes from "./pages/Automacoes";
import AutomationEditorPage from "./pages/AutomationEditorPage";
import Layout from "./components/Layout";
import Onboarding from "./pages/Onboarding";
import LojaModulos from "./pages/LojaModulos";
import IntegracoesHub from "./pages/IntegracoesHub";
import Financeiro from "./pages/Financeiro";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Modulos />} />
          <Route path="central-controle" element={<Navigate to="/central-controle/resumo" replace />} />
          <Route path="central-controle/:secao" element={<CentralControle />} /> 
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="marketing" element={<Navigate to="/marketing/visao-geral" replace />} />
          <Route path="marketing/:secao" element={<Marketing />} />
          <Route path="assistente" element={<Assistente />} />
          <Route path="integracoes" element={<Navigate to="/integracoes/canais-venda" replace />} />
          <Route path="integracoes/:categoria" element={<IntegracoesHub />} />
          <Route path="automacoes" element={<Navigate to="/automacoes/minhas" replace />} />
          <Route path="automacoes/:secao" element={<Automacoes />} />
          <Route path="automacoes/:id/editor" element={<AutomationEditorPage />} />
          <Route path="loja-modulos" element={<LojaModulos />} />
          <Route path="financeiro" element={<Navigate to="/financeiro/resumo" replace />} />
          <Route path="financeiro/:secao" element={<Financeiro />} />
          <Route path="financeiro/:secao/:sub" element={<Financeiro />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}