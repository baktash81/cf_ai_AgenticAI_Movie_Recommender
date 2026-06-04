import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, User, Home, Plus, Trash2, Clock, Compass, Bookmark, Film, X } from 'lucide-react';
import { useConversations } from '../../hooks/useMovies';
import { useLayout } from '../../context/LayoutContext';

interface SidebarProps {
  onSelectConversation?: (conversationId: string) => void;
  onNewChat?: () => void;
  currentConversationId?: string | null;
}

function NavItems({
  onSelectConversation,
  onNewChat,
  currentConversationId,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat';
  const { conversations, deleteConversation, isDeleting } = useConversations(isChatRoute);

  const handleNewChat = () => {
    onNewChat?.();
    navigate('/chat');
    onNavigate?.();
  };

  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation?.(conversationId);
    navigate('/chat');
    onNavigate?.();
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      deleteConversation(conversationId);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 sm:px-4 py-3 rounded-lg transition-colors min-h-[44px] sm:min-h-0 ${
      isActive
        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <>
      <NavLink to="/" end className={linkClass} onClick={onNavigate}>
        <Home className="h-5 w-5 flex-shrink-0" />
        Home
      </NavLink>

      <button
        onClick={handleNewChat}
        className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-lg transition-colors min-h-[44px] sm:min-h-0 ${
          location.pathname === '/chat' && !currentConversationId
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Plus className="h-5 w-5 flex-shrink-0" />
        New Chat
      </button>

      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="px-3 sm:px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Discover
        </h3>
        <NavLink to="/discover" className={linkClass} onClick={onNavigate}>
          <Compass className="h-5 w-5 flex-shrink-0" />
          Discover
        </NavLink>
        <NavLink to="/collections" className={linkClass} onClick={onNavigate}>
          <Film className="h-5 w-5 flex-shrink-0" />
          Collections
        </NavLink>
        <NavLink to="/watchlist" className={linkClass} onClick={onNavigate}>
          <Bookmark className="h-5 w-5 flex-shrink-0" />
          Watchlist
        </NavLink>
      </div>

      <NavLink to="/profile" className={linkClass} onClick={onNavigate}>
        <User className="h-5 w-5 flex-shrink-0" />
        Profile
      </NavLink>

      {conversations.length > 0 && (
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="px-3 sm:px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Chat History
          </h3>
          <div className="space-y-1 max-h-[40vh] overflow-y-auto">
            {conversations.slice(0, 10).map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => handleSelectConversation(conv.conversation_id)}
                className={`w-full group flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg transition-colors text-left min-h-[44px] sm:min-h-0 ${
                  currentConversationId === conv.conversation_id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    {formatDate(conv.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.conversation_id)}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity flex-shrink-0"
                  disabled={isDeleting}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function Sidebar({ onSelectConversation, onNewChat, currentConversationId }: SidebarProps) {
  const { isMobileNavOpen, closeMobileNav } = useLayout();

  const closeNav = () => closeMobileNav();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeNav}
          aria-label="Close menu"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(100%,20rem)] max-w-xs flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-16 transform transition-transform duration-200 ease-out lg:hidden ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isMobileNavOpen}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
          <button
            type="button"
            onClick={closeNav}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItems
            onSelectConversation={onSelectConversation}
            onNewChat={onNewChat}
            currentConversationId={currentConversationId}
            onNavigate={closeNav}
          />
        </nav>
        <div className="p-3 m-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl">
          <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">Pro Tip</h4>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Try: "Show me sci-fi movies from the 90s with high ratings"
          </p>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavItems
            onSelectConversation={onSelectConversation}
            onNewChat={onNewChat}
            currentConversationId={currentConversationId}
          />
        </nav>
        <div className="p-4 m-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl">
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">Pro Tip</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Try asking: "Show me sci-fi movies from the 90s with high ratings"
          </p>
        </div>
      </aside>
    </>
  );
}
