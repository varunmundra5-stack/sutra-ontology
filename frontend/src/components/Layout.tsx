import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        {children ?? <Outlet />}
      </main>
      <footer className="mx-auto max-w-7xl px-4 py-8 text-xs muted text-center">
        Sutra OS · Personal project · Open-source stack: Fuseki · ArcadeDB · TimescaleDB · Valkey · OPA · FastAPI
      </footer>
    </div>
  );
}
