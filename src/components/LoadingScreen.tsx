import { Loader2, Rocket, Database, Download, Sparkles } from 'lucide-react';
import { type LoadProgress } from '@/lib/dataLoader';

// Pre-generate star positions outside component to avoid impure renders
const STAR_COUNT = 100;
const starPositions = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  left: `${(Math.sin(i * 123.456) * 0.5 + 0.5) * 100}%`,
  top: `${(Math.cos(i * 789.123) * 0.5 + 0.5) * 100}%`,
  delay: `${(i % 20) * 0.1}s`,
  duration: `${1 + (i % 10) * 0.2}s`,
  opacity: 0.3 + ((i % 7) / 10),
}));

interface LoadingScreenProps {
  progress: LoadProgress;
  onSkip?: () => void;
}

export function LoadingScreen({ progress, onSkip }: LoadingScreenProps) {
  const getIcon = () => {
    switch (progress.phase) {
      case 'checking':
        return <Database className="w-12 h-12 text-blue-400 animate-pulse" />;
      case 'downloading':
        return <Download className="w-12 h-12 text-cyan-400 animate-bounce" />;
      case 'parsing':
        return <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />;
      case 'storing':
        return <Database className="w-12 h-12 text-green-400 animate-pulse" />;
      case 'loading-cache':
        return <Database className="w-12 h-12 text-cyan-400 animate-pulse" />;
      case 'complete':
        return <Sparkles className="w-12 h-12 text-yellow-400 animate-pulse" />;
      default:
        return <Rocket className="w-12 h-12 text-white animate-bounce" />;
    }
  };

  const getPercentage = () => {
    if (progress.total === 0) return 0;
    const pct = (progress.current / progress.total) * 100;
    // Ensure we hit exactly 100 when current >= total
    if (progress.current >= progress.total) return 100;
    return Math.round(pct);
  };

  const getPhaseLabel = () => {
    switch (progress.phase) {
      case 'checking':
        return 'Checking Cache';
      case 'downloading':
        return 'Downloading Asteroid Data';
      case 'parsing':
        return 'Parsing Asteroids';
      case 'storing':
        return 'Storing in Database';
      case 'loading-cache':
        return 'Loading from Cache';
      case 'complete':
        return 'Ready for Launch';
      default:
        return 'Initializing';
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {starPositions.map((star) => (
          <div
            key={star.id}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.delay,
              animationDuration: star.duration,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {getIcon()}
            <div className="absolute inset-0 bg-current opacity-30 blur-xl rounded-full" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-linear-to-r pb-2 from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Solar System Explorer
          </h1>
          <p className="text-gray-400 text-lg">Mapping 958,000+ Asteroids</p>
        </div>

        {/* Progress section */}
        <div className="w-80 md:w-96 flex flex-col gap-4">
          <div className="flex justify-between text-sm text-gray-300">
            <span>{getPhaseLabel()}</span>
            <span>{getPercentage()}%</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${getPercentage()}%`,
                background: 'linear-gradient(to right, #06b6d4, #3b82f6, #a855f7)'
              }}
            />
          </div>

          {/* Status message */}
          <p className="text-center text-gray-400 text-sm min-h-6">
            {progress.message}
          </p>
        </div>

        {/* Fun facts while loading */}
        {progress.phase !== 'complete' && (
          <div className="mt-8 max-w-md text-center">
            <p className="text-gray-500 text-sm italic">
              "The asteroid belt contains billions of asteroids, but their total mass
              is less than 4% of Earth's Moon."
            </p>
          </div>
        )}

        {/* Skip button - only show during long loading phases */}
        {progress.phase !== 'complete' && progress.phase !== 'checking' && onSkip && (
          <button
            onClick={onSkip}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white 
                       rounded-lg border border-gray-600 transition-all text-sm flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>Skip Asteroids (Lower Performance)</span>
          </button>
        )}
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-8 flex items-center gap-2 text-gray-600">
        <Rocket className="w-4 h-4" />
        <span className="text-sm">Powered by Three.js & React</span>
      </div>
    </div>
  );
}
