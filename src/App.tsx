import React from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { TopNavigation } from './components/topbar/TopNavigation';
import { WorkspaceRail } from './components/sidebar/WorkspaceRail';
import { ChannelSidebar } from './components/sidebar/ChannelSidebar';
import { ChatHeader } from './components/chat/ChatHeader';
import { MessageList } from './components/chat/MessageList';
import { MessageComposer } from './components/chat/MessageComposer';
import { ThreadDrawer } from './components/chat/ThreadDrawer';
import { RightInfoPanel } from './components/info/RightInfoPanel';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';

// Modals
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { BrowseChannelsModal } from './components/modals/BrowseChannelsModal';
import { NewDirectMessageModal } from './components/modals/NewDirectMessageModal';
import { CreateWorkspaceModal } from './components/modals/CreateWorkspaceModal';
import { WorkspaceSettingsModal } from './components/modals/WorkspaceSettingsModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { TranslationModal } from './components/modals/TranslationModal';
import { GoogleMeetModal } from './components/modals/GoogleMeetModal';
import { SecurityModal } from './components/modals/SecurityModal';
import { ToastContainer } from './components/toast/ToastContainer';
import { AuthPage } from './components/auth/AuthPage';

const ChatDashboard: React.FC = () => {
  const {
    isAuthenticated,
    activeThreadMessage,
    isRightPanelOpen,
    isAIAssistantOpen,
  } = useChat();

  // Lock window and document scrolling so nested containers never shift ancestor layout
  React.useEffect(() => {
    const lockScroll = () => {
      window.scrollTo(0, 0);
      if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
      if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
    };
    lockScroll();
    window.addEventListener('resize', lockScroll);
    window.addEventListener('scroll', lockScroll);
    return () => {
      window.removeEventListener('resize', lockScroll);
      window.removeEventListener('scroll', lockScroll);
    };
  }, []);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#0B0D12] text-[#F5F7FA] fixed inset-0">
      {/* Top Global Navigation Bar (Section 4D) */}
      <TopNavigation />

      {/* Main Workspace Frame */}
      <div className="flex-1 min-h-0 w-full flex overflow-hidden relative">
        {/* Leftmost Workspace Rail */}
        <WorkspaceRail />

        {/* Collapsible Channels & DMs Sidebar (Mac-style Genie animation to workspace button) */}
        <ChannelSidebar />

        {/* Central Conversation Feed (Section 4B) */}
        <main 
          aria-label="Main conversation feed"
          className="flex-1 min-h-0 flex flex-col min-w-0 bg-[#0B0D12] relative overflow-hidden"
        >
          <ChatHeader />
          <MessageList />
          <MessageComposer />
        </main>

        {/* Side Thread Panel (if thread is open) */}
        {activeThreadMessage && <ThreadDrawer />}

        {/* Pulse AI Copilot Drawer (Red circled one) */}
        {isAIAssistantOpen && <AIAssistantDrawer />}

        {/* Right Collapsible Inspector Panel (Section 4C) */}
        {isRightPanelOpen && <RightInfoPanel />}
      </div>

      {/* Modals & Overlays */}
      <CreateChannelModal />
      <BrowseChannelsModal />
      <NewDirectMessageModal />
      <CreateWorkspaceModal />
      <WorkspaceSettingsModal />
      <UserProfileModal />
      <GlobalSearchModal />
      <KeyboardShortcutsModal />
      <TranslationModal />
      <GoogleMeetModal />
      <SecurityModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ChatProvider>
      <ChatDashboard />
    </ChatProvider>
  );
}
