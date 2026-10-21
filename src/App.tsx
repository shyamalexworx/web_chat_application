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
import { InviteChannelMembersModal } from './components/modals/InviteChannelMembersModal';
import { ToastContainer } from './components/toast/ToastContainer';
import { AuthPage } from './components/auth/AuthPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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

  return (
    <>
      {!isAuthenticated ? (
        <ErrorBoundary componentName="Authentication">
          <AuthPage />
        </ErrorBoundary>
      ) : (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#0B0D12] text-[#F5F7FA] fixed inset-0">
          {/* Top Global Navigation Bar (Section 4D) */}
          <ErrorBoundary componentName="Top Navigation">
            <TopNavigation />
          </ErrorBoundary>

          {/* Main Workspace Frame */}
          <div className="flex-1 min-h-0 w-full flex overflow-hidden relative">
            {/* Leftmost Workspace Rail */}
            <ErrorBoundary componentName="Workspace Rail">
              <WorkspaceRail />
            </ErrorBoundary>

            {/* Collapsible Channels & DMs Sidebar */}
            <ErrorBoundary componentName="Sidebar">
              <ChannelSidebar />
            </ErrorBoundary>

            {/* Central Conversation Feed (Section 4B) */}
            <main 
              aria-label="Main conversation feed"
              className="flex-1 min-h-0 flex flex-col min-w-0 bg-[#0B0D12] relative overflow-hidden"
            >
              <ErrorBoundary componentName="Chat Header">
                <ChatHeader />
              </ErrorBoundary>
              <ErrorBoundary componentName="Message Feed">
                <MessageList />
              </ErrorBoundary>
              <ErrorBoundary componentName="Message Composer">
                <MessageComposer />
              </ErrorBoundary>
            </main>

            {/* Side Thread Panel (if thread is open) */}
            {activeThreadMessage && (
              <ErrorBoundary componentName="Thread Panel">
                <ThreadDrawer />
              </ErrorBoundary>
            )}

            {/* Pulse AI Copilot Drawer */}
            {isAIAssistantOpen && (
              <ErrorBoundary componentName="AI Copilot">
                <AIAssistantDrawer />
              </ErrorBoundary>
            )}

            {/* Right Collapsible Inspector Panel */}
            {isRightPanelOpen && (
              <ErrorBoundary componentName="Info Panel">
                <RightInfoPanel />
              </ErrorBoundary>
            )}
          </div>

          {/* Modals & Overlays */}
          <ErrorBoundary componentName="Dialogs & Modals">
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
            <InviteChannelMembersModal />
          </ErrorBoundary>
        </div>
      )}

      {/* Global Notifications accessible everywhere */}
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary componentName="PulseChat Root">
      <ChatProvider>
        <ErrorBoundary componentName="Dashboard Frame">
          <ChatDashboard />
        </ErrorBoundary>
      </ChatProvider>
    </ErrorBoundary>
  );
}
