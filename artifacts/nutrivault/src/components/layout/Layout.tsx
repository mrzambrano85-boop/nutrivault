import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, User, Ticket, ShoppingBasket,
  BookOpen, Pill, Trophy, Menu, LogOut,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const NAV_KEYS = [
  { href: "/",           key: "nav.dashboard",   icon: LayoutDashboard },
  { href: "/perfil",     key: "nav.perfil",       icon: User },
  { href: "/tickets",    key: "nav.tickets",      icon: Ticket },
  { href: "/despensa",   key: "nav.despensa",     icon: ShoppingBasket },
  { href: "/recetas",    key: "nav.recetas",      icon: BookOpen },
  { href: "/suplementos",key: "nav.suplementos",  icon: Pill },
  { href: "/puntos",     key: "nav.puntos",       icon: Trophy },
];

// ─── Language Toggle ──────────────────────────────────────────────────────────

function LangToggle() {
  const { lang, setLang } = useI18n();
  const next = lang === "es" ? "en" : "es";
  const label = lang === "es" ? "EN" : "ES";
  return (
    <button
      onClick={() => setLang(next)}
      className="h-8 px-2.5 rounded-md border border-border text-xs font-semibold tracking-wider text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-colors shrink-0"
      title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
      data-testid="btn-lang-toggle"
    >
      {label}
    </button>
  );
}

// ─── Nav Links ────────────────────────────────────────────────────────────────

function NavLinks({ isMobile = false, closeMenu = () => {} }: { isMobile?: boolean; closeMenu?: () => void }) {
  const [location] = useLocation();
  const { t } = useI18n();

  return (
    <nav className={`flex flex-col gap-1 ${isMobile ? "mt-8" : ""}`} data-testid="sidebar-nav">
      {NAV_KEYS.map((item) => {
        const isActive = location === item.href;
        const label = t(item.key);
        return (
          <Link key={item.href} href={item.href} onClick={isMobile ? closeMenu : undefined}>
            <span
              data-testid={`nav-item-${item.key.split(".")[1]}`}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors cursor-pointer text-sm ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── User Panel ───────────────────────────────────────────────────────────────

function UserPanel() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const [nombre, setNombre] = useState<string>("");

  useEffect(() => {
    async function fetchNombre() {
      if (!supabase || !user) return;
      const { data } = await supabase
        .from("usuarios")
        .select("nombre")
        .eq("id", user.id)
        .single();
      if (data?.nombre) setNombre(data.nombre);
    }
    fetchNombre();
  }, [user]);

  const displayName = nombre || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-2 py-3 border-t border-border mt-auto">
      <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <span className="text-primary font-semibold text-xs" data-testid="text-user-initials">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate" data-testid="text-username">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={signOut}
        data-testid="button-signout"
        title={t("nav.signout")}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card p-4" data-testid="desktop-sidebar">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">NutriVault</span>
          </div>
          <LangToggle />
        </div>
        <NavLinks />
        <UserPanel />
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">N</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">NutriVault</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">N</span>
                  </div>
                  <span className="font-bold text-lg tracking-tight">NutriVault</span>
                </div>
                <NavLinks isMobile closeMenu={() => setMobileOpen(false)} />
                <UserPanel />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
