import { useLocation } from 'react-router-dom';
import ChatInterface from '../components/chat/ChatInterface';

export default function ChatPage() {
  const location = useLocation();
  const initialQuery = (location.state as { initialQuery?: string })?.initialQuery;

  return (
    <div className="page-container">
      <div className="mb-4 sm:mb-6">
        <h1 className="page-title">Movie Recommendations</h1>
        <p className="page-subtitle">
          Chat with AI to discover your next favorite movie
        </p>
      </div>

      <div className="card p-3 sm:p-4 md:p-6">
        <ChatInterface initialQuery={initialQuery} />
      </div>
    </div>
  );
}
