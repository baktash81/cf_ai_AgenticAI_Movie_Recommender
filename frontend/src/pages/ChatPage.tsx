import { useLocation } from 'react-router-dom';
import ChatInterface from '../components/chat/ChatInterface';

export default function ChatPage() {
  const location = useLocation();
  const initialQuery = (location.state as { initialQuery?: string })?.initialQuery;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Movie Recommendations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Chat with AI to discover your next favorite movie
        </p>
      </div>
      
      <div className="card">
        <ChatInterface initialQuery={initialQuery} />
      </div>
    </div>
  );
}
