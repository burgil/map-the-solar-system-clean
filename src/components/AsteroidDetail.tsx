import { X, MapPin, Gem, Activity, AlertTriangle, CircleDot, Crosshair, Scale, Timer } from 'lucide-react';
import { type Asteroid } from '@/lib/indexedDB';
import { formatValue } from '@/lib/dataLoader';

interface AsteroidDetailProps {
  asteroid: Asteroid;
  onClose: () => void;
  onFlyTo: (asteroid: Asteroid) => void;
}

export function AsteroidDetail({ asteroid, onClose, onFlyTo }: AsteroidDetailProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500';
      case 'Moderate': return 'bg-yellow-500';
      case 'Difficult': return 'bg-orange-500';
      case 'Very Difficult': return 'bg-red-500';
      case 'Extreme': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyWidth = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '20%';
      case 'Moderate': return '40%';
      case 'Difficult': return '60%';
      case 'Very Difficult': return '80%';
      case 'Extreme': return '100%';
      default: return '50%';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="relative p-4 bg-linear-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="p-2 bg-amber-600/20 rounded-lg">
            <Gem className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {asteroid.name || asteroid.pdes}
            </h2>
            <p className="text-sm text-gray-400">{asteroid.full_name}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-3">
          <span className="px-2 py-1 text-xs bg-gray-700 rounded-full">
            {asteroid.category}
          </span>
          {asteroid.neo && (
            <span className="px-2 py-1 text-xs bg-blue-600/30 text-blue-400 rounded-full flex items-center gap-1">
              <CircleDot className="w-3 h-3" /> NEO
            </span>
          )}
          {asteroid.pha && (
            <span className="px-2 py-1 text-xs bg-red-600/30 text-red-400 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> PHA
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Estimated Value */}
        <div className="p-4 bg-linear-to-br from-green-900/30 to-emerald-900/30 rounded-lg border border-green-700/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Estimated Value</span>
            <span className="text-2xl font-bold text-green-400 font-mono">
              {formatValue(asteroid.estimatedValue)}
            </span>
          </div>
        </div>

        {/* Mining Difficulty */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Mining Difficulty
            </span>
            <span className={`text-sm font-medium ${getDifficultyColor(asteroid.miningDifficulty).replace('bg-', 'text-')}`}>
              {asteroid.miningDifficulty}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${getDifficultyColor(asteroid.miningDifficulty)} transition-all duration-500`}
              style={{ width: getDifficultyWidth(asteroid.miningDifficulty) }}
            />
          </div>
        </div>

        {/* Physical Properties */}
        <div className="grid grid-cols-2 gap-3">
          {asteroid.diameter > 0 && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Scale className="w-3 h-3" /> Diameter
              </div>
              <p className="font-semibold">{asteroid.diameter.toFixed(2)} km</p>
            </div>
          )}

          {asteroid.albedo > 0 && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Gem className="w-3 h-3" /> Albedo
              </div>
              <p className="font-semibold">{asteroid.albedo.toFixed(3)}</p>
            </div>
          )}

          {asteroid.a > 0 && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <MapPin className="w-3 h-3" /> Semi-major Axis
              </div>
              <p className="font-semibold">{asteroid.a.toFixed(2)} AU</p>
            </div>
          )}

          {asteroid.per_y > 0 && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Timer className="w-3 h-3" /> Orbital Period
              </div>
              <p className="font-semibold">{asteroid.per_y.toFixed(2)} years</p>
            </div>
          )}
        </div>

        {/* Orbital Elements */}
        <div className="space-y-2">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider">Orbital Elements</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-gray-800/30 rounded">
              <span className="text-gray-500">e:</span> {asteroid.e?.toFixed(4) || 'N/A'}
            </div>
            <div className="p-2 bg-gray-800/30 rounded">
              <span className="text-gray-500">i:</span> {asteroid.i?.toFixed(2) || 'N/A'}°
            </div>
            <div className="p-2 bg-gray-800/30 rounded">
              <span className="text-gray-500">MOID:</span> {asteroid.moid?.toFixed(3) || 'N/A'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => onFlyTo(asteroid)}
          className="w-full py-3 px-4 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
        >
          <Crosshair className="w-4 h-4" />
          Fly to Asteroid
        </button>
      </div>
    </div>
  );
}
