import { Bell, Menu, Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMe } from "@/infra/hooks/queries";
import { cn } from "@/utils/cn";
import { ButtonLink, Logo } from "../shared/ui";

const NAV = [
  { to: "/eventos", label: "Eventos" },
  { to: "/sparring", label: "Sparring" },
  { to: "/servicos", label: "Serviços" },
  { to: "/organizador", label: "Organizadores" },
  { to: "/planos", label: "Planos" },
];

function Header() {
  const { session } = useAuth();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    if (q) navigate(`/servicos?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-6 px-4 lg:gap-10 lg:px-[120px]">
        <Logo />
        <nav aria-label="Principal" className="hidden gap-7 lg:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center border-b-2 px-1 text-base font-semibold",
                  isActive ? "border-brand-hot text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <form onSubmit={onSearch} className="hidden xl:block">
          <label className="flex h-11 w-[280px] items-center gap-2 rounded-[10px] border border-line bg-surface px-3">
            <Search className="h-4 w-4 text-ink-muted" aria-hidden />
            <input
              name="q"
              placeholder="Atletas, serviços, eventos"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </label>
        </form>
        {session ? (
          <div className="hidden items-center gap-3 sm:flex">
            {me?.isAdmin && (
              <Link to="/admin" className="text-[15px] font-semibold text-gold">
                Admin
              </Link>
            )}
            <Link
              to="/conta"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-surface"
              aria-label="Notificações e conta"
            >
              <Bell className="h-5 w-5" />
              {!!me?.unreadNotifications && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-hot" />
              )}
            </Link>
            <ButtonLink to="/conta" variant="secondary">
              Minha conta
            </ButtonLink>
          </div>
        ) : (
          <div className="hidden items-center gap-5 sm:flex">
            <Link to="/entrar" className="text-[15px] font-semibold text-ink">
              Entrar
            </Link>
            <ButtonLink to="/entrar?criar=1">Criar perfil</ButtonLink>
          </div>
        )}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav
          aria-label="Menu"
          className="flex flex-col gap-1 border-t border-line px-4 py-3 lg:hidden"
          onClick={() => setOpen(false)}
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-3 text-base font-semibold text-ink-soft hover:bg-surface"
            >
              {n.label}
            </NavLink>
          ))}
          <NavLink
            to={session ? "/conta" : "/entrar"}
            className="rounded-lg px-3 py-3 text-base font-semibold text-brand-hot"
          >
            {session ? "Minha conta" : "Entrar / criar perfil"}
          </NavLink>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const cols = [
    {
      title: "Plataforma",
      links: [
        ["Sparring", "/sparring"],
        ["Serviços", "/servicos"],
        ["Eventos", "/eventos"],
        ["Planos", "/planos"],
      ],
    },
    {
      title: "Para quem",
      links: [
        ["Atletas", "/planos?tipo=fighter"],
        ["Prestadores", "/planos?tipo=provider"],
        ["Organizadores", "/planos?tipo=organizer"],
        ["Equipes", "/planos?tipo=coach"],
      ],
    },
    {
      title: "Wardraw",
      links: [
        ["Sobre", "/sobre"],
        ["Privacidade e LGPD", "/privacidade"],
        ["Termos de uso", "/termos"],
        ["Contato", "/contato"],
      ],
    },
  ];
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 md:grid-cols-4 lg:px-[120px]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-muted">
            Tudo que a luta precisa, num lugar só. MMA, Muay Thai, Boxe e Jiu-Jitsu.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="flex flex-col gap-2">
            <span className="font-cond text-[13px] font-semibold uppercase tracking-[1.2px] text-ink-muted">
              {c.title}
            </span>
            {c.links.map(([label, to]) => (
              <Link key={label} to={to} className="text-sm text-ink-soft hover:text-ink">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Standard page container (desktop gutter 120px like the designs, 16px on phones). */
export const Container = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("mx-auto w-full max-w-[1440px] px-4 lg:px-[120px]", className)}>{children}</div>
);
