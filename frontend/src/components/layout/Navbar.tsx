import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Film, LogOut, User, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 ml-2 lg:ml-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Film className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                MovieMind
              </span>
            </Link>
          </div>

          {/* User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'User'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                  {user?.name || user?.email || 'User'}
                </span>
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                  <Link
                    to="/profile"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/chat"
              onClick={() => setShowMobileMenu(false)}
              className="block px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Chat
            </Link>
            <Link
              to="/profile"
              onClick={() => setShowMobileMenu(false)}
              className="block px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Profile
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
