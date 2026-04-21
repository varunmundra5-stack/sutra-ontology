import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Protected } from "./components/Protected";
import Admin from "./pages/Admin";
import AiModels from "./pages/AiModels";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Governance from "./pages/Governance";
import Instances from "./pages/Instances";
import Login from "./pages/Login";
import Ontology from "./pages/Ontology";
import Register from "./pages/Register";
import Sparql from "./pages/Sparql";

export default function App() {
  return (
    <Routes>
      {/* Public auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected app shell */}
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ontology" element={<Ontology />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/sparql" element={<Sparql />} />
        <Route path="/ai" element={<AiModels />} />
        <Route
          path="/governance"
          element={
            <Protected roles={["admin", "editor"]}>
              <Governance />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected roles={["admin"]}>
              <Admin />
            </Protected>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
