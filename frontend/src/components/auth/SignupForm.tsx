import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, User, AlertCircle, Loader2, Check } from 'lucide-react';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      setError('Password does not meet requirements');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name || undefined);
      navigate('/profile', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <li className={`flex items-center gap-2 text-sm ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
      <Check className={`h-4 w-4 ${met ? 'opacity-100' : 'opacity-30'}`} />
      {text}
    </li>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name (optional)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field pl-10"
            placeholder="John Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field pl-10"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field pl-10"
            placeholder="••••••••"
          />
        </div>
        
        {password.length > 0 && (
          <ul className="mt-2 space-y-1">
            <RequirementItem met={hasMinLength} text="At least 8 characters" />
            <RequirementItem met={hasUppercase} text="One uppercase letter" />
            <RequirementItem met={hasLowercase} text="One lowercase letter" />
            <RequirementItem met={hasNumber} text="One number" />
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Confirm Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="input-field pl-10"
            placeholder="••••••••"
          />
        </div>
        {confirmPassword.length > 0 && (
          <p className={`mt-1 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
            {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create account'
        )}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
