import { useEffect, useRef, useState, useCallback } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Sidebar, type PerformanceSettings } from '@/components/Sidebar';
import { AsteroidDetail } from '@/components/AsteroidDetail';
import { ControlsHelp } from '@/components/ControlsHelp';
import { HUD } from '@/components/HUD';
import { loadAsteroidData, type LoadProgress } from '@/lib/dataLoader';
import { getAllAsteroids, getStatistics, type Asteroid } from '@/lib/indexedDB';
import { SceneController } from '@/three/SceneController';

export default function Home() {
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({
    phase: 'checking',
    current: 0,
    total: 100,
    message: 'Initializing...',
  });

  // Scene controller
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneController | null>(null);
  const isLoadingStarted = useRef(false);

  // Data state
  const [statistics, setStatistics] = useState({
    totalCount: 0,
    totalValue: 0,
    neoCount: 0,
    phaCount: 0,
  });
  const [navigationItems, setNavigationItems] = useState<Array<{ name: string; type: string }>>([]);

  // UI state
  const [selectedAsteroid, setSelectedAsteroid] = useState<Asteroid | null>(null);
  const [isControlsLocked, setIsControlsLocked] = useState(false);
  const [timeScale, setTimeScale] = useState(1); // Default: Real-time (change from sidebar)
  const [isTracking, setIsTracking] = useState(false);
  const [trackingTarget, setTrackingTarget] = useState<string | null>(null);
  const [asteroidLoadProgress, setAsteroidLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [performanceSettings, setPerformanceSettings] = useState({
    showAsteroids: true,
    showLabels: true,
    showGalaxy: true,
    enableBloom: true,
    useFrustumCulling: true,
    useLOD: true,
    freeze: false,
  });
  const [skipAsteroids, setSkipAsteroids] = useState(false);

  // AbortController ref for cancelling data load
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handler for skipping asteroid loading - shows cancelling and waits for abort
  const handleSkipAsteroids = useCallback(() => {
    console.warn('🛑 Skipping asteroid loading - aborting and waiting...');

    // Show cancelling state - keep loading screen visible
    setLoadProgress({
      phase: 'complete',
      current: 0,
      total: 100,
      message: 'Cancelling... please wait',
    });

    // Abort the fetch/processing - the catch block will handle transition
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // Don't null it yet - let the abort propagate
    }

    setSkipAsteroids(true);

    // DON'T set isLoading = false here!
    // The loadAsteroidData promise will reject with AbortError,
    // and the catch block will set isLoading = false after cleanup
  }, []);

  // Load asteroid data into IndexedDB
  useEffect(() => {
    console.log('📦 App: Data loading useEffect triggered');
    console.time('⏱️ App: Total data loading');

    // Prevent double fetch in StrictMode
    if (isLoadingStarted.current) {
      console.log('📦 App: Skipping duplicate load (already started)');
      return;
    }
    isLoadingStarted.current = true;

    // Create AbortController for this load
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function loadData() {
      try {
        console.time('⏱️ App: loadAsteroidData');
        await loadAsteroidData(setLoadProgress, abortController.signal);
        console.timeEnd('⏱️ App: loadAsteroidData');

        // Get statistics (don't load all asteroids yet - scene will do it progressively)
        console.time('⏱️ App: getStatistics');
        const stats = await getStatistics();
        console.timeEnd('⏱️ App: getStatistics');
        setStatistics(stats);

        // Show scene immediately - asteroids will load progressively
        console.log('📦 App: Data loaded, showing scene');
        console.timeEnd('⏱️ App: Total data loading');
        setIsLoading(false);
      } catch (error) {
        // Check if this was an abort (user skipped)
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('📦 App: Data loading aborted - now loading scene');
          console.timeEnd('⏱️ App: Total data loading');
          setIsLoading(false); // NOW we can show the scene - abort completed!
          return;
        }

        console.error('Failed to load asteroid data:', error);
        setLoadProgress({
          phase: 'complete',
          current: 0,
          total: 100,
          message: 'Failed to load data. Using demo mode.',
        });
        setTimeout(() => setIsLoading(false), 1000);
      }
    }

    loadData();

    // Cleanup: abort if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    console.log('🎮 App: Scene init useEffect triggered, isLoading:', isLoading);
    if (isLoading || !containerRef.current) return;

    console.time('⏱️ App: SceneController creation');
    const controller = new SceneController({
      container: containerRef.current,
      onObjectSelected: (name) => {
        console.log('Selected:', name);
      },
      onControlsLocked: setIsControlsLocked,
      onTrackingChange: (tracking, target) => {
        setIsTracking(tracking);
        setTrackingTarget(target);
      },
      onAsteroidLoadProgress: (loaded, total) => {
        setAsteroidLoadProgress({ loaded, total });
        if (loaded >= total) {
          // Clear progress after a delay
          setTimeout(() => setAsteroidLoadProgress(null), 2000);
        }
      },
    });
    console.timeEnd('⏱️ App: SceneController creation');

    sceneRef.current = controller;
    setNavigationItems(controller.getNavigationItems());

    // Apply initial performance settings (using defaults, not state, to avoid dependency issues)
    // Settings state starts with these defaults and user changes go through handlePerformanceSettingsChange
    console.log('🎮 App: Applying initial settings');
    controller.setFrustumCullingEnabled(true);
    controller.setLODEnabled(true);
    controller.setFreeze(false);
    controller.setAsteroidsVisible(true);
    controller.setLabelsVisible(true);
    controller.setPostProcessingEnabled(true);

    // Load asteroids progressively (after scene is visible) - unless skipped
    if (!skipAsteroids) {
      console.time('⏱️ App: getAllAsteroids + loadAsteroids');
      getAllAsteroids().then(allAsteroids => {
        console.log('🎮 App: Got', allAsteroids.length, 'asteroids, loading into scene...');
        controller.loadAsteroids(allAsteroids).then(() => {
          console.timeEnd('⏱️ App: getAllAsteroids + loadAsteroids');
        });
      });
    } else {
      console.log('Asteroids loading skipped by user');
      // Hide asteroid belts since we're not loading asteroids
      controller.setAsteroidsVisible(false);
    }

    return () => {
      console.log('🎮 App: Disposing scene controller');
      controller.dispose();
      sceneRef.current = null;
    };
  }, [isLoading, skipAsteroids]);

  // Handlers
  const handleNavigate = useCallback((name: string) => {
    sceneRef.current?.flyTo(name);
  }, []);

  const handleAsteroidSelect = useCallback((asteroid: Asteroid) => {
    setSelectedAsteroid(asteroid);
  }, []);

  const handleFlyToAsteroid = useCallback((asteroid: Asteroid) => {
    sceneRef.current?.flyToAsteroid(asteroid);
    setSelectedAsteroid(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedAsteroid(null);
  }, []);

  const handleTimeScaleChange = useCallback((scale: number) => {
    setTimeScale(scale);
    sceneRef.current?.setTimeScale(scale);
  }, []);

  const handleExitFocus = useCallback(() => {
    sceneRef.current?.stopTracking();
    setIsTracking(false);
    setTrackingTarget(null);
  }, []);

  const handlePerformanceSettingsChange = useCallback((settings: PerformanceSettings) => {
    setPerformanceSettings(settings);
    if (sceneRef.current) {
      sceneRef.current.setAsteroidsVisible(settings.showAsteroids);
      sceneRef.current.setLabelsVisible(settings.showLabels);
      sceneRef.current.setGalaxyVisible(settings.showGalaxy);
      sceneRef.current.setPostProcessingEnabled(settings.enableBloom);
      sceneRef.current.setFrustumCullingEnabled(settings.useFrustumCulling);
      sceneRef.current.setLODEnabled(settings.useLOD);
      sceneRef.current.setFreeze(settings.freeze);
    }
  }, []);

  // Callbacks for HUD - must return current values from scene
  const getCurrentSpeed = useCallback(() => {
    return sceneRef.current?.getCurrentSpeed() ?? 0;
  }, []);

  const getSimulatedTime = useCallback(() => {
    return sceneRef.current?.getSimulatedTime() ?? 0;
  }, []);

  const getVisibleAsteroids = useCallback(() => {
    return sceneRef.current?.getVisibleAsteroids() ?? 0;
  }, []);

  // Render loading screen
  if (isLoading) {
    return <LoadingScreen progress={loadProgress} onSkip={handleSkipAsteroids} />;
  }

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* UI Overlay */}
      <Sidebar
        navigationItems={navigationItems}
        onNavigate={handleNavigate}
        onAsteroidSelect={handleAsteroidSelect}
        statistics={statistics}
        timeScale={timeScale}
        onTimeScaleChange={handleTimeScaleChange}
        performanceSettings={performanceSettings}
        onPerformanceSettingsChange={handlePerformanceSettingsChange}
      />

      {/* Asteroid detail panel */}
      {selectedAsteroid && (
        <AsteroidDetail
          asteroid={selectedAsteroid}
          onClose={handleCloseDetail}
          onFlyTo={handleFlyToAsteroid}
        />
      )}

      {/* Controls help */}
      <ControlsHelp isLocked={isControlsLocked} />
      {/* Click indicator removed - was ClickToFly */}

      {/* HUD - Speed, time, date */}
      <HUD
        getCurrentSpeed={getCurrentSpeed}
        getSimulatedTime={getSimulatedTime}
        timeScale={timeScale}
        getVisibleAsteroids={getVisibleAsteroids}
      />

      {/* Exit Focus Mode button */}
      {isTracking && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleExitFocus}
            className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg 
                       backdrop-blur-sm border border-red-500/50 transition-all
                       flex items-center gap-2 shadow-lg"
          >
            <span className="text-sm font-medium">Exit Focus Mode</span>
            {trackingTarget && (
              <span className="text-xs opacity-75">({trackingTarget})</span>
            )}
          </button>
        </div>
      )}

      {/* Title */}
      <div className="fixed top-4 right-4 z-40 text-right">
        <h1 className="text-xl font-bold bg-linear-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Solar System Explorer
        </h1>
        <p className="text-xs text-gray-500">
          {statistics.totalCount.toLocaleString()} asteroids mapped
        </p>
      </div>

      {/* Asteroid loading progress */}
      {asteroidLoadProgress && (
        <div className="fixed bottom-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Loading asteroids into scene...</div>
          <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-cyan-500 to-purple-500 transition-all duration-100"
              style={{ width: `${(asteroidLoadProgress.loaded / asteroidLoadProgress.total) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {asteroidLoadProgress.loaded.toLocaleString()} / {asteroidLoadProgress.total.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
