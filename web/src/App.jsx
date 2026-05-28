import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Sales from "./pages/Sales";
import Agent from "./pages/Agent";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="clientes/:codigo" element={<ClientDetail />} />
        <Route path="ventas" element={<Sales />} />
        <Route path="agente" element={<Agent />} />
      </Route>
    </Routes>
  );
}
