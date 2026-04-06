import { Mouse, Keyboard } from 'lucide-react';

interface ControlsHelpProps {
  isLocked: boolean;
}

export function ControlsHelp({ isLocked }: ControlsHelpProps) {
  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${isLocked ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Keyboard className="w-4 h-4" />
          <span>WASD</span>
          <span className="text-gray-600">Move</span>
        </div>
        <div className="w-px h-4 bg-gray-700" />
        <div className="flex items-center gap-2 text-gray-400">
          <Mouse className="w-4 h-4" />
          <span className="text-gray-600">Look</span>
        </div>
        <div className="w-px h-4 bg-gray-700" />
        <div className="flex items-center gap-2 text-gray-400">
          <span className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">SHIFT</span>
          <span className="text-gray-600">Boost</span>
        </div>
        <div className="w-px h-4 bg-gray-700" />
        <div className="flex items-center gap-2 text-gray-400">
          <span className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">ESC</span>
          <span className="text-gray-600">Release</span>
        </div>
      </div>
    </div>
  );
}
