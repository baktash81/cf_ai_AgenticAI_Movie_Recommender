import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLayout } from '../../context/LayoutContext';
import { Film, LogOut, User, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggleMobileNav } = useLayout();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={toggleMobileNav}
              className="lg:hidden p-2 -ml-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Film className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                MovieMind
              </span>
            </Link>
          </div>

          <div className="flex items-center flex-shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
                aria-expanded={showDropdown}
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block max-w-[120px] truncate">
                  {user?.name || user?.email || 'User'}
                </span>
              </button>

              {showDropdown && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdown(false)}
                    aria-label="Close menu"
                  />
                  <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <Link
                      to="/profile"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
