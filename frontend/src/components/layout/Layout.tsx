import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { ChatProvider, useChatContext } from '../../context/ChatContext';
import { Linkedin, Mail } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 lg:ml-64">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Created by <span className="font-semibold text-gray-900 dark:text-white">Baktash Ansari</span>
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/baktashans/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Linkedin className="h-4 w-4" />
              <span>LinkedIn</span>
            </a>
            <a
              href="mailto:baktash.ansari1381@gmail.com"
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LayoutContent() {
  const { currentConversationId, loadConversation, startNewConversation } = useChatContext();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
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
      <Footer />
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
