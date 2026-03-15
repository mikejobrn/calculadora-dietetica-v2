"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-5xl mx-auto flex justify-around py-2">
        <NavItem href="/calculadora" icon="calculator" label="Calculadora" currentPath={pathname} />
        <NavItem href="/produtos" icon="package" label="Produtos" currentPath={pathname} />
        <NavItem href="/metodos" icon="flask" label="Fórmulas" currentPath={pathname} />
        <NavItem href="/perfil" icon="user" label="Perfil" currentPath={pathname} />
      </div>
    </nav>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  currentPath 
}: { 
  href: string; 
  icon: string; 
  label: string; 
  currentPath: string;
}) {
  const isActive = currentPath.startsWith(href);

  const icons: Record<string, React.ReactNode> = {
    calculator: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    package: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    flask: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    user: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  };

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 transition-colors px-3 py-1 ${
        isActive 
          ? "text-primary" 
          : "text-muted-foreground hover:text-primary"
      }`}
    >
      {icons[icon]}
      <span className="text-xs font-medium">{label}</span>
      {isActive && (
        <span className="absolute bottom-0 w-8 h-1 bg-primary rounded-t-full" />
      )}
    </Link>
  );
}
