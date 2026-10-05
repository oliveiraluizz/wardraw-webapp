import { BarChart3, Blocks, Database, FileCog, ShieldCheck, Tags, Ticket, Users, Wallet } from "lucide-react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { cn } from "@/utils/cn";
import { CouponsView } from "./CouponsView";
import { MetricsView } from "./MetricsView";
import { ModerationView } from "./ModerationView";
import { ModulesView } from "./ModulesView";
import { PlansMatrixView } from "./PlansMatrixView";
import { ResourcesView } from "./ResourcesView";
import { SettingsView } from "./SettingsView";
import { SubscriptionsView } from "./SubscriptionsView";
import { UsersView } from "./UsersView";

const NAV = [
  { to: "", label: "Números do piloto", icon: BarChart3 },
  { to: "moderacao", label: "Moderação", icon: ShieldCheck },
  { to: "modulos", label: "Módulos", icon: Blocks },
  { to: "planos", label: "Planos e recursos", icon: Tags },
  { to: "cupons", label: "Cupons e promoções", icon: Ticket },
  { to: "assinaturas", label: "Assinaturas", icon: Wallet },
  { to: "usuarios", label: "Usuários e descontos", icon: Users },
  { to: "parametros", label: "Parâmetros", icon: FileCog },
  { to: "cadastros", label: "Cadastros e catálogos", icon: Database },
];

export default function AdminPage() {
  return (
    <div className="flex min-h-[calc(100vh-76px)] flex-col lg:flex-row">
      <aside className="flex flex-col gap-1 border-b border-line bg-surface px-4 py-6 lg:w-[260px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <span className="mb-2 px-3 font-cond text-[13px] font-semibold uppercase tracking-[1.2px] text-gold">
          Administração
        </span>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            end={n.to === ""}
            to={`/admin/${n.to}`}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-[15px]",
                isActive ? "bg-brand font-bold" : "font-medium hover:bg-surface-2",
              )
            }
          >
            <n.icon className="h-[18px] w-[18px]" aria-hidden /> {n.label}
          </NavLink>
        ))}
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 lg:px-10">
        <Routes>
          <Route index element={<MetricsView />} />
          <Route path="moderacao" element={<ModerationView />} />
          <Route path="modulos" element={<ModulesView />} />
          <Route path="planos" element={<PlansMatrixView />} />
          <Route path="cupons" element={<CouponsView />} />
          <Route path="assinaturas" element={<SubscriptionsView />} />
          <Route path="usuarios" element={<UsersView />} />
          <Route path="parametros" element={<SettingsView />} />
          <Route path="cadastros/*" element={<ResourcesView />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
