import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout({ children }: { children?: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0d1117]">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Navbar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col lg:ml-64 min-h-screen">

        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-sm border-b border-slate-200 dark:border-[#21262d] px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
              S
            </div>
            <span className="font-semibold text-sm">Sutra OS</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-5 py-6 md:px-8 md:py-7 max-w-7xl w-full mx-auto animate-fade-in">
          {children ?? <Outlet />}
        </main>

        {/* Footer */}
        <footer className="px-8 py-4 text-xs text-slate-400 dark:text-[#4d5566] border-t border-slate-100 dark:border-[#21262d]">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <span>Sutra OS · India Energy Intelligence Platform</span>
            <span className="hidden sm:block">
              Fuseki · TimescaleDB · Valkey · OPA · FastAPI
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
