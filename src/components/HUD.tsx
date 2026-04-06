import { useEffect, useState } from 'react';

interface HUDProps {
  getCurrentSpeed: () => number;
  getSimulatedTime: () => number;
  timeScale: number;
  getVisibleAsteroids?: () => number;
}

// Format speed as simple number (AU units per frame)
function formatSpeed(speed: number): string {
  // Just show the raw speed value
  if (speed < 0.0001) {
    return speed.toExponential(2);
  } else if (speed < 1) {
    return speed.toFixed(4);
  } else {
    return speed.toFixed(2);
  }
}

// Convert simulated seconds to time breakdown
function formatSimulatedTime(seconds: number): { years: number; days: number; hours: number; minutes: number } {
  const SECONDS_PER_MINUTE = 60;
  const SECONDS_PER_HOUR = 3600;
  const SECONDS_PER_DAY = 86400;
  const SECONDS_PER_YEAR = 365.25 * SECONDS_PER_DAY;
  
  const years = Math.floor(seconds / SECONDS_PER_YEAR);
  seconds %= SECONDS_PER_YEAR;
  
  const days = Math.floor(seconds / SECONDS_PER_DAY);
  seconds %= SECONDS_PER_DAY;
  
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  seconds %= SECONDS_PER_HOUR;
  
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  
  return { years, days, hours, minutes };
}

// Calculate the simulated date from a start date
function getSimulatedDate(simulatedSeconds: number): Date {
  // Start from current real date
  const startDate = new Date('2024-01-01T00:00:00Z'); // Fixed start for consistency
  const simulatedMs = simulatedSeconds * 1000;
  return new Date(startDate.getTime() + simulatedMs);
}

export function HUD({ getCurrentSpeed, getSimulatedTime, timeScale, getVisibleAsteroids }: HUDProps) {
  const [speed, setSpeed] = useState(0);
  const [simulatedTime, setSimulatedTime] = useState(0);
  const [visibleAsteroids, setVisibleAsteroids] = useState(0);
  
  // Update at 10fps for smooth display
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed(getCurrentSpeed());
      setSimulatedTime(getSimulatedTime());
      if (getVisibleAsteroids) {
        setVisibleAsteroids(getVisibleAsteroids());
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [getCurrentSpeed, getSimulatedTime, getVisibleAsteroids]);
  
  const timeBreakdown = formatSimulatedTime(simulatedTime);
  const simulatedDate = getSimulatedDate(simulatedTime);
  
  // Format time scale for display
  const timeScaleDisplay = timeScale >= 1 
    ? `${timeScale.toFixed(0)}x` 
    : timeScale >= 0.01 
      ? `${timeScale.toFixed(4)}x`
      : timeScale.toExponential(2) + 'x';
  
  return (
    <div className="fixed bottom-4 left-80 z-40 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50 text-left min-w-44">
      {/* Movement Speed */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Speed (AU/s)</div>
        <div className="text-sm font-mono text-cyan-400">{formatSpeed(speed)}</div>
      </div>
      
      {/* Time Scale */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Time Scale</div>
        <div className="text-sm font-mono text-purple-400">{timeScaleDisplay}</div>
      </div>
      
      {/* Simulated Time Elapsed */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Sim. Elapsed</div>
        <div className="text-sm font-mono text-yellow-400">
          {timeBreakdown.years > 0 && <span>{timeBreakdown.years}y </span>}
          {timeBreakdown.days > 0 && <span>{timeBreakdown.days}d </span>}
          <span>{String(timeBreakdown.hours).padStart(2, '0')}:</span>
          <span>{String(timeBreakdown.minutes).padStart(2, '0')}</span>
        </div>
      </div>
      
      {/* Simulated Date */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Sim. Date</div>
        <div className="text-sm font-mono text-green-400">
          {simulatedDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
        <div className="text-xs font-mono text-green-400/70">
          {simulatedDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          })}
        </div>
      </div>
      
      {/* Objects counter */}
      {getVisibleAsteroids && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Objects</div>
          <div className="text-sm font-mono text-orange-400">
            {visibleAsteroids.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
