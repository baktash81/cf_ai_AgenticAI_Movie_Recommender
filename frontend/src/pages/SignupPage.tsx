import SignupForm from '../components/auth/SignupForm';
import { Film } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary-600 rounded-2xl mb-3 sm:mb-4">
            <Film className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">MovieMind</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create your account to get started
          </p>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Create account
          </h2>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
