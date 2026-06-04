import { useState, FormEvent } from 'react';
import { usePreferences } from '../../hooks/useMovies';
import { Loader2, Sparkles, MessageSquare } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const EXAMPLE_PROMPTS = [
  "I love action movies and sci-fi. My favorite directors are Christopher Nolan and Denis Villeneuve. I prefer movies with ratings above 7.",
  "I enjoy romantic comedies and feel-good movies. I don't like horror or very violent films. I watch movies in English mostly.",
  "Big fan of classic films from the 80s and 90s. Love Spielberg and Scorsese. Minimum rating 8.0 for me.",
];

export default function PreferenceForm({ onComplete }: Props) {
  const [input, setInput] = useState('');
  const [step, setStep] = useState<'input' | 'questions' | 'complete'>('input');
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  
  const { analyzePreferences, isAnalyzing } = usePreferences();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    try {
      const result = await analyzePreferences(input);
      
      if (result.questions && result.questions.length > 0 && result.confidence < 0.8) {
        setQuestions(result.questions);
        setStep('questions');
      } else {
        setStep('complete');
        setTimeout(onComplete, 1500);
      }
    } catch (error) {
      console.error('Failed to analyze preferences:', error);
    }
  };

  const handleFollowUp = async (e: FormEvent) => {
    e.preventDefault();
    
    // Combine original input with follow-up answers
    const combinedInput = `${input}\n\nAdditional preferences:\n${followUpAnswers.join('\n')}`;
    
    try {
      await analyzePreferences(combinedInput);
      setStep('complete');
      setTimeout(onComplete, 1500);
    } catch (error) {
      console.error('Failed to analyze preferences:', error);
    }
  };

  if (step === 'complete') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Profile Complete!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting you to the chat...
        </p>
      </div>
    );
  }

  if (step === 'questions') {
    return (
      <form onSubmit={handleFollowUp} className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            A few more questions...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Help us understand your taste better
          </p>
        </div>

        {questions.map((question, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {question}
            </label>
            <input
              type="text"
              value={followUpAnswers[index] || ''}
              onChange={(e) => {
                const newAnswers = [...followUpAnswers];
                newAnswers[index] = e.target.value;
                setFollowUpAnswers(newAnswers);
              }}
              className="input-field"
              placeholder="Your answer..."
            />
          </div>
        ))}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              setStep('complete');
              setTimeout(onComplete, 1500);
            }}
            className="flex-1 btn-secondary"
          >
            Skip
          </button>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tell us about your movie preferences
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          className="input-field resize-none"
          placeholder="Describe your movie taste in your own words..."
        />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Include genres, actors, directors, rating preferences, or anything else that matters to you.
        </p>
      </div>

      {/* Example prompts */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Or try one of these examples:
        </p>
        <div className="space-y-2">
          {EXAMPLE_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setInput(prompt)}
              className="w-full text-left p-3 sm:p-4 min-h-[44px] bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MessageSquare className="h-4 w-4 inline-block mr-2 text-gray-400" />
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isAnalyzing || !input.trim()}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Analyze My Preferences
          </>
        )}
      </button>
    </form>
  );
}
