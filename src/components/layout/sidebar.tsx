/**
 * Sidebar Navigation Component
 * 
 * Main navigation sidebar for the dashboard area.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Layout,
  Users,
  FolderKanban,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  teams?: Array<{
    id: string;
    name: string;
  }>;
}

export function Sidebar({ teams = [] }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const mainNavItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/teams', icon: Users, label: 'Teams' },
    { href: '/projects', icon: FolderKanban, label: 'Projects' },
  ];

  const bottomNavItems = [
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  const NavItem = ({
    href,
    icon: Icon,
    label,
    isActive,
  }: {
    href: string;
    icon: typeof Home;
    label: string;
    isActive: boolean;
  }) => {
    const content = (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          isActive
            ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/20 dark:text-violet-100'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn('flex h-16 items-center border-b border-slate-200 dark:border-slate-800', collapsed ? 'justify-center px-2' : 'px-4')}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                Jira Lite
              </span>
            )}
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}

          {/* Teams Section */}
          {teams.length > 0 && (
            <div className="mt-6">
              {!collapsed && (
                <div className="mb-2 flex items-center justify-between px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Teams
                  </span>
                  <Link href="/teams/new">
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )}
              <div className="space-y-1">
                {teams.slice(0, 5).map((team) => (
                  <NavItem
                    key={team.id}
                    href={`/teams/${team.id}`}
                    icon={Layout}
                    label={team.name}
                    isActive={pathname.startsWith(`/teams/${team.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          {bottomNavItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href}
            />
          ))}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
