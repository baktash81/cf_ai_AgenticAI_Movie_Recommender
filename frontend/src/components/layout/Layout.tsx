import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { ChatProvider, useChatContext } from '../../context/ChatContext';

function LayoutContent() {
  const { currentConversationId, loadConversation, startNewConversation } = useChatContext();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex">
        <Sidebar 
          onSelectConversation={loadConversation}
          onNewChat={startNewConversation}
          currentConversationId={currentConversationId}
        />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <ChatProvider>
      <LayoutContent />
    </ChatProvider>
  );
}
