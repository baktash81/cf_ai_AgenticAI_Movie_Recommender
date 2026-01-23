import { NavLink } from 'react-router-dom';
import { MessageSquare, User, Home, Bookmark } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
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
