import { useState, useRef, useEffect } from 'react';
import { Mic, CheckCircle2, XCircle } from 'lucide-react';

interface Feedback {
  score: number;
  mistakes: string[];
  improvement: string;
  finalLine: string;
}

function App() {
  const [currentView, setCurrentView] = useState<'hero' | 'input' | 'loading' | 'output'>('hero');
  const [userInput, setUserInput] = useState('');
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleStartInterview = () => {
    setCurrentView('input');
    setTimeout(() => {
      inputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const parseFeedback = (text: string): Feedback | null => {
    try {
      const scoreMatch = text.match(/(?:Score|score)[\s:]+(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;

      const mistakesMatch = text.match(/(?:Mistakes?|mistakes?)[\s:]*\n?((?:[^\n]*\n?)*?)(?=Improvement|improvement|\*\*|✅|$)/i);
      const mistakesText = mistakesMatch ? mistakesMatch[1] : '';
      const mistakes = mistakesText
        .split('\n')
        .filter((line) => line.trim())
        .slice(0, 2)
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((line) => line.length > 0);

      const improvementMatch = text.match(/(?:Improvement|improvement)[\s:]*\n?([^\n]+)/i);
      const improvement = improvementMatch ? improvementMatch[1].replace(/^[-•*]\s*/, '').trim() : 'Stay focused and specific.';

      const lines = text.split('\n');
      const finalLine = lines[lines.length - 1]?.trim() || "I wouldn't remember you after this answer.";

      return {
        score: Math.min(10, Math.max(1, score)),
        mistakes: mistakes.length >= 2 ? mistakes : ['Missing concrete examples.', 'Too vague and generic.'],
        improvement: improvement || 'Add specific examples to your answers.',
        finalLine: finalLine.length > 10 ? finalLine : "I wouldn't remember you after this answer.",
      };
    } catch {
      return null;
    }
  };

  const handleGetFeedback = async () => {
    if (!userInput.trim()) return;

    setCurrentView('loading');
    setError(null);
    setFeedbackIndex(0);

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyAsrrR1wByyCPmctladnW0BkjjyFZMCl8s',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Act like a brutally honest interviewer. Analyze this answer:
- Give 2 mistakes (numbered or bulleted)
- Give 1 improvement
- Give a score out of 10
- End with one short harsh sentence (max 10 words)
Keep it short and sharp.

Answer: "${userInput}"

Format your response exactly like this:
Mistakes:
- [Mistake 1]
- [Mistake 2]

Improvement:
- [One improvement]

Score: [number]/10

[One final harsh sentence about the answer]`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const parsed = parseFeedback(generatedText);
      if (parsed) {
        setFeedback(parsed);
      } else {
        throw new Error('Failed to parse feedback');
      }

      setTimeout(() => {
        setCurrentView('output');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get feedback');
      setCurrentView('input');
    }
  };

  const handleTryAgain = () => {
    setUserInput('');
    setFeedbackIndex(0);
    setCurrentView('input');
    setTimeout(() => {
      inputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  useEffect(() => {
    if (currentView === 'output' && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'output' && feedbackIndex < 3) {
      const timer = setTimeout(() => {
        setFeedbackIndex(feedbackIndex + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [feedbackIndex, currentView]);

  return (
    <div className="min-h-screen bg-black text-white">
      {currentView === 'hero' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fadeIn">
          <div className="max-w-2xl text-center space-y-8">
            <h1 className="text-7xl font-bold tracking-tight">SachBol</h1>
            <p className="text-2xl text-gray-400 font-light">
              If it's not clear, it's not good enough.
            </p>
            <button
              onClick={handleStartInterview}
              className="mt-12 px-10 py-4 bg-white text-black text-lg font-medium rounded-full hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300"
            >
              Start Interview
            </button>
          </div>
        </div>
      )}

      {currentView === 'input' && (
        <div
          ref={inputSectionRef}
          className="min-h-screen flex flex-col items-center justify-center px-6 animate-fadeIn"
        >
          <div className="w-full max-w-3xl space-y-6">
            <h2 className="text-3xl font-semibold text-center mb-8">Tell me about yourself</h2>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Tell me about yourself…"
              className="w-full h-64 bg-zinc-900 text-white text-lg p-6 rounded-2xl border border-zinc-800 focus:border-zinc-600 focus:outline-none resize-none placeholder:text-gray-600"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleGetFeedback}
              disabled={!userInput.trim()}
              className="w-full py-4 bg-white text-black text-lg font-medium rounded-full hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              Get Feedback
            </button>
          </div>
        </div>
      )}

      {currentView === 'loading' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <div className="text-center space-y-6 animate-pulse">
            <div className="w-16 h-16 mx-auto border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="text-2xl text-gray-400">Analyzing your answer…</p>
          </div>
        </div>
      )}

      {currentView === 'output' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 animate-slideUp">
          <div className="w-full max-w-3xl space-y-8">
            <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Mic className="w-6 h-6 text-gray-400" />
                  <span className="text-gray-400 font-medium">AI is responding…</span>
                </div>
                <div className="text-right">
                  <div className="text-7xl font-black text-white tracking-tight">{feedback?.score || 6}</div>
                  <div className="text-gray-500 text-lg font-medium mt-1">/10</div>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-gray-500 text-sm mb-3 tracking-wide uppercase">Voice Feedback</p>
                <audio
                  ref={audioRef}
                  controls
                  className="w-full rounded-lg accent-white"
                  style={{
                    filter: 'invert(1) hue-rotate(180deg)',
                  }}
                >
                  <source src="https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav" type="audio/wav" />
                </audio>
              </div>

              <div className="space-y-3">
                {feedback?.mistakes[0] && (
                  <div
                    className={`flex items-start gap-4 p-4 bg-red-950/20 rounded-xl border border-red-900/30 transition-all duration-500 ${
                      feedbackIndex >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <p className="text-gray-300 leading-relaxed">{feedback.mistakes[0]}</p>
                  </div>
                )}

                {feedback?.mistakes[1] && (
                  <div
                    className={`flex items-start gap-4 p-4 bg-red-950/20 rounded-xl border border-red-900/30 transition-all duration-500 ${
                      feedbackIndex >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <p className="text-gray-300 leading-relaxed">{feedback.mistakes[1]}</p>
                  </div>
                )}

                {feedback?.improvement && (
                  <div
                    className={`flex items-start gap-4 p-4 bg-green-950/20 rounded-xl border border-green-900/30 transition-all duration-500 ${
                      feedbackIndex >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <p className="text-gray-300 leading-relaxed">{feedback.improvement}</p>
                  </div>
                )}
              </div>

              {feedback?.finalLine && (
                <div className="mt-8 pt-8 border-t border-zinc-800">
                  <p className="text-2xl font-bold text-gray-100 leading-tight">{feedback.finalLine}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleTryAgain}
              className="w-full py-4 bg-zinc-800 text-white text-lg font-medium rounded-full hover:bg-zinc-700 hover:scale-[1.02] transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
