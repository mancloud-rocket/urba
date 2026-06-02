import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Sales from "./pages/Sales";
import Agent from "./pages/Agent";
import Cash from "./pages/Cash";
import Expenses from "./pages/Expenses";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="clientes/:codigo" element={<ClientDetail />} />
          <Route path="ventas" element={<Sales />} />
          <Route path="caja" element={<Cash />} />
          <Route path="gastos" element={<Expenses />} />
          <Route path="agente" element={<Agent />} />
        </Route>
      </Route>
    </Routes>
  );
}
