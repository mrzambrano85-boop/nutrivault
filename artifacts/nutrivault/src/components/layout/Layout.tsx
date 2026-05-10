import { Link, useLocation } from "wouter";
import { LayoutDashboard, User, Ticket, ShoppingBasket, BookOpen, Pill, Trophy, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/despensa", label: "Despensa", icon: ShoppingBasket },
  { href: "/recetas", label: "Recetas", icon: BookOpen },
  { href: "/suplementos", label: "Suplementos", icon: Pill },
  { href: "/puntos", label: "Puntos", icon: Trophy },
];

function NavLinks({ isMobile = false, closeMenu = () => {} }) {
  const [location] = useLocation();

  return (
    <nav className={`flex flex-col gap-2 ${isMobile ? 'mt-8' : ''}`} data-testid="sidebar-nav">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={isMobile ? closeMenu : undefined}>
            <span
              data-testid={`nav-item-${item.label.toLowerCase()}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${
                isActive 
                  ? "bg-accent text-accent-foreground font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-6" data-testid="desktop-sidebar">
        <div className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">NutriVault</span>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">NutriVault</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-6">
              <NavLinks isMobile />
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
