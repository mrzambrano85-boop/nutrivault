import { Link, useLocation } from "wouter";
import { LayoutDashboard, User, Ticket, ShoppingBasket, BookOpen, Pill, Trophy, Menu, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/despensa", label: "Despensa", icon: ShoppingBasket },
  { href: "/recetas", label: "Recetas", icon: BookOpen },
  { href: "/suplementos", label: "Suplementos", icon: Pill },
  { href: "/puntos", label: "Puntos", icon: Trophy },
];

function NavLinks({ isMobile = false, closeMenu = () => {} }: { isMobile?: boolean; closeMenu?: () => void }) {
  const [location] = useLocation();

  return (
    <nav className={`flex flex-col gap-1 ${isMobile ? "mt-8" : ""}`} data-testid="sidebar-nav">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={isMobile ? closeMenu : undefined}>
            <span
              data-testid={`nav-item-${item.label.toLowerCase()}`}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors cursor-pointer text-sm ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserPanel() {
  const { user, signOut } = useAuth();
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
        title="Cerrar sesión"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card p-4" data-testid="desktop-sidebar">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">N</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">NutriVault</span>
        </div>
        <NavLinks />
        <UserPanel />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">N</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">NutriVault</span>
          </div>
          <Sheet>
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
              <NavLinks isMobile />
              <UserPanel />
            </SheetContent>
          </Sheet>
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
