import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LayoutContextType {
  isMobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setIsMobileNavOpen((v) => !v), []);

  return (
    <LayoutContext.Provider
      value={{ isMobileNavOpen, openMobileNav, closeMobileNav, toggleMobileNav }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return ctx;
}
