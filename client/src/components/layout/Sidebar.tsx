import React from 'react';
import {
  LayoutDashboard,
  Files,
  MessageSquare,
  History,
  FolderKanban,
  Settings,
  Sparkles,
  HardDrive,
  Sun,
  Moon,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export type NavView = 'dashboard' | 'files' | 'file-detail' | 'chat' | 'history' | 'collections' | 'settings';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  filesCount: number;
  activeChatSessionsCount: number;
  darkMode: boolean;
  onToggleTheme: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  filesCount,
  activeChatSessionsCount,
  darkMode,
  onToggleTheme,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navItems = [
    { id: 'dashboard' as NavView, label: 'Home', icon: LayoutDashboard },
    { id: 'files' as NavView, label: 'Files', icon: Files, badge: filesCount > 0 ? filesCount : undefined },
    { id: 'chat' as NavView, label: 'Chat', icon: MessageSquare, highlight: true },
    { id: 'history' as NavView, label: 'Recent Questions', icon: History, badge: activeChatSessionsCount > 0 ? activeChatSessionsCount : undefined },
    { id: 'collections' as NavView, label: 'Collections', icon: FolderKanban },
    { id: 'settings' as NavView, label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (id: NavView) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (isDrawer: boolean) => (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Top Branding & Navigation */}
      <div>
        <div className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 ${
          !isDrawer && isCollapsed ? 'justify-center px-2' : 'justify-between px-4 sm:px-6'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {(isDrawer || !isCollapsed) && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  DocuQuery AI
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                    PRO
                  </span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">Universal File Q&A</span>
              </div>
            )}
          </div>

          {/* Close drawer button on mobile */}
          {isDrawer && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop collapse toggle */}
          {!isDrawer && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden md:inline-flex cursor-pointer ${
                isCollapsed ? 'mt-1' : ''
              }`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="p-2 sm:p-3 space-y-1">
          {(isDrawer || !isCollapsed) && (
            <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Workspace
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'files' && currentView === 'file-detail');

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                title={!isDrawer && isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                  !isDrawer && isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors shrink-0 ${
                    isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`} />
                  {(isDrawer || !isCollapsed) && <span>{item.label}</span>}
                </div>

                {(isDrawer || !isCollapsed) && (
                  <div className="flex items-center gap-1.5">
                    {item.badge !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-teal-200/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-teal-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Storage & Theme Card */}
      <div className={`border-t border-slate-200 dark:border-slate-800 ${
        !isDrawer && isCollapsed ? 'p-2 space-y-2' : 'p-3 sm:p-4 space-y-3'
      }`}>
        {/* Storage Widget (expanded or drawer only) */}
        {(isDrawer || !isCollapsed) && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-teal-500" />
                Indexed Storage
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">52.1 MB / 10 GB</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full w-[1.2%]" />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>Optimized Vectors</span>
              <span className="text-teal-600 dark:text-teal-400 font-medium">99.5% Free</span>
            </div>
          </div>
        )}

        {/* Theme Toggle Button */}
        <div className={`flex items-center ${
          !isDrawer && isCollapsed ? 'justify-center pt-1' : 'justify-between px-2 pt-1 text-xs text-slate-500 dark:text-slate-400'
        }`}>
          {(isDrawer || !isCollapsed) && <span>Appearance</span>}
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer ${
              !isDrawer && isCollapsed ? 'p-2.5' : 'px-2.5 py-1.5'
            }`}
            title="Toggle theme"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                {(isDrawer || !isCollapsed) && <span>Light</span>}
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                {(isDrawer || !isCollapsed) && <span>Dark</span>}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 select-none flex-shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent(false)}
      </aside>
    </>
  );
};
