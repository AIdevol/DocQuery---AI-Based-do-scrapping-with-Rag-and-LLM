import {
  Menu,
  Search,
  Cpu,
  Settings,
  ChevronDown,
  Building2,
  Server
} from 'lucide-react';
import { AIProviderConfig } from '../../types/index.js';
import { NavView } from './Sidebar.js';

interface TopNavProps {
  activeProvider?: AIProviderConfig;
  onOpenSettings: (view: NavView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileNav?: () => void;
  backendConnected?: boolean | null;
  onOpenServerSettings?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeProvider,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  onOpenMobileNav,
  backendConnected,
  onOpenServerSettings
}) => {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 select-none">
      {/* Left: Mobile hamburger & Workspace Indicator */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Button */}
        {onOpenMobileNav && (
          <button
            onClick={onOpenMobileNav}
            className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition-colors cursor-pointer"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Workspace Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
          <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="hidden xs:inline truncate">Universal File Q&A</span>
          <span className="xs:hidden">DocuQuery</span>
        </div>
      </div>

      {/* Global Search Bar (hidden on mobile, visible md+) */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files, tables, sheets, or clauses..."
          className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
        />
      </div>

      {/* Right Controls: AI Provider indicator & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Backend Status Warning Pill if disconnected */}
        {backendConnected === false && (
          <button
            onClick={onOpenServerSettings || (() => onOpenSettings('settings'))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs cursor-pointer animate-pulse"
            title="Backend server is disconnected or unreachable. Click to configure backend URL."
          >
            <Server className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Backend Offline</span>
            <span className="text-[10px] bg-amber-200 dark:bg-amber-900/80 px-1.5 py-0.5 rounded-md font-bold">Fix</span>
          </button>
        )}

        {/* Backend Connected Subtle Pill */}
        {backendConnected === true && (
          <button
            onClick={onOpenServerSettings || (() => onOpenSettings('settings'))}
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
            title="Backend Connected. Click to configure server connection."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-[10px]">API Connected</span>
          </button>
        )}

        {/* Active AI Provider & Model pill */}
        <button
          onClick={() => onOpenSettings('settings')}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:border-teal-400 dark:hover:border-teal-600 transition-all text-left shadow-2xs group cursor-pointer"
          title="Configure AI Provider & Model"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Cpu className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <div className="flex flex-col truncate max-w-[120px] sm:max-w-[200px]">
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-1 truncate">
              {activeProvider ? activeProvider.name.split(' ')[0] : 'AI'}
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
              <span className="text-teal-600 dark:text-teal-400 font-mono text-[10px] hidden sm:inline truncate">
                {activeProvider?.defaultModel || 'auto'}
              </span>
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => onOpenSettings('settings')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] sm:text-xs font-semibold shadow-xs shrink-0">
            DT
          </div>
          <div className="hidden xl:flex flex-col truncate">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">Devesh Tiwari</span>
            <span className="text-[10px] text-slate-400 truncate">Workspace Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};
