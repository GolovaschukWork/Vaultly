import { Button, cn } from '@vaultly/ui';
import { Menu, PanelLeftClose, PanelLeftOpen, Vault } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import { useUIStore } from '@/stores/ui-store';

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  activityPanel?: React.ReactNode;
  header?: React.ReactNode;
}

export function AppShell({ children, sidebar, activityPanel, header }: AppShellProps) {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();

  return (
    <div className="bg-surface flex min-h-screen flex-col">
      <header className="border-border bg-surface/95 supports-[backdrop-filter]:bg-surface/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-4 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? t('common:closeSidebar') : t('common:openSidebar')}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? t('common:closeSidebar') : t('common:openSidebar')}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>

          <Link to="/" className="text-content-primary flex items-center gap-2 font-semibold">
            <Vault className="text-brand-600 h-6 w-6" />
            <span className="hidden sm:inline">{t('common:appName')}</span>
          </Link>

          <div className="flex-1" />

          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {header && <div className="border-border border-t px-4 py-3">{header}</div>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <>
            <aside
              className={cn(
                'border-border bg-surface fixed inset-y-0 top-14 left-0 z-30 w-64 border-r transition-transform lg:static lg:translate-x-0',
                sidebarOpen
                  ? 'translate-x-0'
                  : '-translate-x-full lg:w-0 lg:overflow-hidden lg:border-0',
              )}
            >
              {sidebar}
            </aside>

            {sidebarOpen && (
              <div
                className="fixed inset-0 top-14 z-20 bg-black/50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
          </>
        )}

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
            {activityPanel && (
              <aside className="hidden w-72 shrink-0 xl:block">{activityPanel}</aside>
            )}
          </div>
          {activityPanel && <div className="xl:hidden">{activityPanel}</div>}
        </main>
      </div>
    </div>
  );
}
