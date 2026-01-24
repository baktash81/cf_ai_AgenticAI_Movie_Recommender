import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, User, Home, Plus, Trash2, Clock, Compass, Bookmark, Film } from 'lucide-react';
import { useConversations } from '../../hooks/useMovies';

interface SidebarProps {
  onSelectConversation?: (conversationId: string) => void;
  onNewChat?: () => void;
  currentConversationId?: string | null;
}

export default function Sidebar({ onSelectConversation, onNewChat, currentConversationId }: SidebarProps) {
  const { conversations, deleteConversation, isDeleting } = useConversations();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
    navigate('/chat');
  };

  const handleSelectConversation = (conversationId: string) => {
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    }
    navigate('/chat');
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

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {/* Main navigation */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <Home className="h-5 w-5" />
          Home
        </NavLink>

        {/* New Chat button */}
        <button
          onClick={handleNewChat}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            location.pathname === '/chat' && !currentConversationId
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Plus className="h-5 w-5" />
          New Chat
        </button>

        {/* Discovery & Social */}
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Discover
          </h3>
          
          <NavLink
            to="/discover"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <Compass className="h-5 w-5" />
            Discover
          </NavLink>

          <NavLink
            to="/collections"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <Film className="h-5 w-5" />
            Collections
          </NavLink>

          <NavLink
            to="/watchlist"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <Bookmark className="h-5 w-5" />
            Watchlist
          </NavLink>
        </div>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <User className="h-5 w-5" />
          Profile
        </NavLink>

        {/* Chat History */}
        {conversations.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Chat History
            </h3>
            <div className="space-y-1">
              {conversations.slice(0, 10).map((conv) => (
                <button
                  key={conv.conversation_id}
                  onClick={() => handleSelectConversation(conv.conversation_id)}
                  className={`w-full group flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-left ${
                    currentConversationId === conv.conversation_id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{conv.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(conv.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.conversation_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Pro tip */}
      <div className="p-4 m-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl">
        <h4 className="font-medium text-gray-900 dark:text-white mb-1">Pro Tip</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Try asking: "Show me sci-fi movies from the 90s with high ratings"
        </p>
      </div>
    </aside>
  );
}
