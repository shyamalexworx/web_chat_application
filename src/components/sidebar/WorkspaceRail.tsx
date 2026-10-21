import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Bot,
  Plus,
  Compass,
  ChevronRight,
  Circle,
  UserCheck,
  Settings,
  Volume2,
  VolumeX,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const WorkspaceRailInner: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    setIsCreateWorkspaceOpen,
    setIsBrowseChannelsOpen,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    toggleAIAssistant,
    isAIAssistantOpen,
    currentUser,
    updateCurrentUserProfile,
    setIsUserProfileOpen,
    logout,
    addToast,
    t,
  } = useChat();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundFX.isEnabled());

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFX.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundFX.play('chime');
    addToast(next ? 'Sound notifications enabled' : 'Sound notifications muted', 'info');
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0B0D12] workspace-rail-bg flex flex-col items-center justify-between select-none flex-shrink-0">
      <div className={`w-full flex flex-col items-center flex-1 min-h-0 ${isMobile ? 'border-r border-slate-200 dark:border-[#252B36]' : ''}`}>
        {/* Top Header Section: perfectly aligned at 44px (h-11) with ChannelSidebar and ChatHeader */}
        <div className="h-11 min-h-[44px] w-full border-b border-slate-200 dark:border-[#252B36] flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-[#0B0D12] workspace-rail-bg">
          <div className="relative group">
            <button
              onClick={toggleAIAssistant}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white transition-all duration-200 ${
                isAIAssistantOpen
                  ? 'bg-gradient-to-tr from-[#4F8CFF] to-[#A855F7] ring-2 ring-[#4F8CFF] shadow-accent-glow scale-105'
                  : 'bg-gradient-to-tr from-[#1E2330] to-[#252B36] hover:from-[#4F8CFF] hover:to-[#A855F7] border border-[#252B36]'
              }`}
              title="Pulse AI Assistant"
            >
              <Bot className="w-4 h-4 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#4F8CFF] rounded-full animate-pulse" />
            </button>

            {/* Tooltip */}
            <div className="absolute left-14 px-2.5 py-1.5 bg-[#181C25] text-xs font-medium text-[#F5F7FA] rounded-md shadow-modal border border-[#252B36] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {t('ai_assistant')}
            </div>
          </div>
        </div>

        {/* Workspaces list (Yellow section stepped up) */}
        <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden py-2.5">

          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace.id;
            return (
              <div key={ws.id} className="relative group flex items-center justify-center w-full">
                {/* Active indicator bar */}
                <div
                  className={`absolute left-0 w-0.5 rounded-r transition-all duration-200 ${
                    isActive
                      ? 'h-6 bg-[#4F8CFF]'
                      : 'h-2 bg-transparent group-hover:h-4 group-hover:bg-[#929BAA]'
                  }`}
                />

                <button
                  onClick={() => {
                    if (isMobile) {
                      setActiveWorkspaceId(ws.id);
                    } else {
                      if (isActive) {
                        toggleSidebarCollapsed();
                      } else {
                        setActiveWorkspaceId(ws.id);
                        if (isSidebarCollapsed) {
                          toggleSidebarCollapsed();
                        }
                      }
                    }
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-200 relative cursor-pointer ${
                    isActive
                      ? 'ring-2 ring-[#4F8CFF] text-white shadow-lg scale-105'
                      : 'text-white hover:scale-105 hover:brightness-110 hover:shadow-md hover:ring-2 hover:ring-[#4F8CFF]/50 active:scale-95'
                  }`}
                  style={{
                    backgroundColor: ws.iconBg || '#181C25',
                  }}
                  title={!isMobile && isActive ? (isSidebarCollapsed ? `Expand ${ws.name} Sidebar` : `Collapse ${ws.name} Sidebar`) : ws.name}
                >
                  {ws.avatar ? (
                    <img src={ws.avatar} alt={ws.name} className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <span className="text-white drop-shadow-sm">{ws.icon}</span>
                  )}

                  {/* Indicator if active workspace & collapsed in desktop view */}
                  {!isMobile && isActive && isSidebarCollapsed && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#4F8CFF] rounded-full ring-2 ring-[#0B0D12]" />
                  )}
                </button>

                {/* Tooltip on hover */}
                <div className="absolute left-14 px-2.5 py-1.5 bg-[#181C25] text-xs font-medium text-[#F5F7FA] rounded-md shadow-modal border border-[#252B36] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {ws.name}
              </div>
            </div>
          );
        })}

        {/* Add Workspace Button */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <button
            onClick={() => setIsCreateWorkspaceOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#12151C] hover:bg-[#181C25] border border-dashed border-[#252B36] hover:border-[#4F8CFF] text-[#929BAA] hover:text-[#4F8CFF] flex items-center justify-center transition-all group-hover:scale-105"
            title={t('create_workspace')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="absolute left-14 px-2.5 py-1.5 bg-[#181C25] text-xs font-medium text-[#F5F7FA] rounded-md shadow-modal border border-[#252B36] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {t('create_workspace')}
          </div>
        </div>

        {/* Explore Channels Directory */}
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={() => setIsBrowseChannelsOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#12151C] hover:bg-[#181C25] border border-[#252B36] text-[#929BAA] hover:text-[#F5F7FA] flex items-center justify-center transition-all"
            title={t('channel_directory')}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
          <div className="absolute left-14 px-2.5 py-1.5 bg-[#181C25] text-xs font-medium text-[#F5F7FA] rounded-md shadow-modal border border-[#252B36] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {t('channel_directory')}
          </div>
        </div>
      </div>
    </div>

      {/* USER PROFILE SECTION MOVED TO BOTTOM LEFT RAIL (Aligned with Chat Composer bottom toolbar) */}
      <div className={`h-11 min-h-[44px] border-t border-slate-200 dark:border-[#252B36] w-full flex items-center ${isMobile ? 'justify-end pr-1' : 'justify-center'} relative flex-shrink-0 bg-slate-50 dark:bg-[#0B0D12]`}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-[#252B36] hover:border-[#4F8CFF] transition-all relative cursor-pointer"
          aria-label="User profile and settings"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-full h-full object-cover"
          />
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-[#0B0D12] ${
              currentUser.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
            }`}
          />
        </button>

        {/* User Flyout Menu with click outside backdrop */}
        {userMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setUserMenuOpen(false)} 
            />
            <div className="absolute bottom-2 left-14 w-64 bg-white dark:bg-[#181C25] border border-slate-200 dark:border-[#252B36] rounded-2xl shadow-xl p-2 z-50 animate-slide-down space-y-1">
            <div className="px-3 py-2 border-b border-slate-200 dark:border-[#252B36]">
              <div className="text-xs font-semibold text-slate-800 dark:text-[#F5F7FA] flex items-center gap-1.5">
                {currentUser.name}
                {currentUser.statusEmoji && <span>{currentUser.statusEmoji}</span>}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-[#929BAA]">{currentUser.email}</div>
              <div className="text-[10px] text-[#4F8CFF] font-medium mt-0.5 uppercase tracking-wider">
                {currentUser.role} &bull; {currentUser.title}
              </div>
            </div>

            {/* Online Status Toggle */}
            <button
              onClick={() => {
                updateCurrentUserProfile({ isOnline: !currentUser.isOnline });
                setUserMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E2330] transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="relative flex items-center justify-center">
                  <Circle
                    className={`w-3.5 h-3.5 fill-current ${
                      currentUser.isOnline ? 'text-[#10B981]' : 'text-slate-400 dark:text-[#636D7E]'
                    }`}
                  />
                  {currentUser.isOnline && (
                    <span className="absolute w-2 h-2 rounded-full bg-[#10B981] animate-ping opacity-75" />
                  )}
                </div>
                <span className="font-semibold text-slate-800 dark:text-[#F5F7FA]">
                  {currentUser.isOnline ? t('online') : t('offline')}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  currentUser.isOnline
                    ? 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30'
                    : 'text-slate-400 bg-slate-100 dark:bg-[#12151C] border-slate-200 dark:border-[#252B36]'
                }`}
              >
                {currentUser.isOnline ? 'Active' : 'Away'}
              </span>
            </button>

            {/* Profile & Settings */}
            <button
              onClick={() => {
                setIsUserProfileOpen(true);
                setUserMenuOpen(false);
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E2330] transition-colors cursor-pointer group"
            >
              <Settings className="w-4 h-4 text-[#4F8CFF]" />
              <span className="font-semibold text-slate-800 dark:text-[#F5F7FA]">Profile & Settings</span>
            </button>

            {/* Toggle Sound */}
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E2330] transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#F05D6C]" />
                )}
                <span className="font-semibold text-slate-800 dark:text-[#F5F7FA]">{t('sound_chimes')}</span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  soundEnabled
                    ? 'text-[#4F8CFF] bg-[#4F8CFF]/15 border-[#4F8CFF]/30'
                    : 'text-[#F05D6C] bg-[#F05D6C]/15 border-[#F05D6C]/30'
                }`}
              >
                {soundEnabled ? 'ON' : 'MUTED'}
              </span>
            </button>

            {/* Logout */}
            <div className="pt-1 border-t border-slate-200 dark:border-[#252B36]">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-[#F05D6C] hover:bg-[#F05D6C]/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('log_out')}</span>
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export const WorkspaceRail: React.FC = () => {
  return (
    <aside 
      aria-label="Workspaces"
      className="hidden md:flex w-12 h-full bg-slate-50 dark:bg-[#0B0D12] workspace-rail border-r border-slate-200 dark:border-[#252B36] flex-col items-center select-none flex-shrink-0 z-30"
    >
      <WorkspaceRailInner />
    </aside>
  );
};
