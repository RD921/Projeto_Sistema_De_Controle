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
import Integracoes from "./pages/Integracoes";
import Automacoes from "./pages/Automacoes";
import AutomationEditorPage from "./pages/AutomationEditorPage";
import Layout from "./components/Layout";

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
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Modulos />} />
          <Route path="central-controle" element={<CentralControle />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="assistente" element={<Assistente />} />
          <Route path="integracoes" element={<Integracoes />} />
          <Route path="automacoes" element={<Automacoes />} />
          <Route path="automacoes/:id/editor" element={<AutomationEditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}