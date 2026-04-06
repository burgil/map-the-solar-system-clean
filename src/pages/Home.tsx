import { useEffect, useRef, useState, useCallback } from 'react';
import { Sidebar, type PerformanceSettings } from '@/components/Sidebar';
import { ControlsHelp } from '@/components/ControlsHelp';
import { HUD } from '@/components/HUD';
import { SceneController } from '@/three/SceneController';

export default function Home() {
  // Scene controller
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneController | null>(null);
  const isInitialized = useRef(false);

  // UI state
  const [navigationItems, setNavigationItems] = useState<Array<{ name: string; type: string }>>([]);
  const [isControlsLocked, setIsControlsLocked] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingTarget, setTrackingTarget] = useState<string | null>(null);
  const [performanceSettings, setPerformanceSettings] = useState({
    showLabels: true,
    showGalaxy: true,
    enableBloom: true,
    useFrustumCulling: true,
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (isInitialized.current || !containerRef.current) return;
    isInitialized.current = true;

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
    });

    sceneRef.current = controller;
    setNavigationItems(controller.getNavigationItems());

    controller.setFrustumCullingEnabled(true);
    controller.setLabelsVisible(true);
    controller.setPostProcessingEnabled(true);

    return () => {
      controller.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Handlers
  const handleNavigate = useCallback((name: string) => {
    sceneRef.current?.flyTo(name);
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
      sceneRef.current.setLabelsVisible(settings.showLabels);
      sceneRef.current.setGalaxyVisible(settings.showGalaxy);
      sceneRef.current.setPostProcessingEnabled(settings.enableBloom);
      sceneRef.current.setFrustumCullingEnabled(settings.useFrustumCulling);
    }
  }, []);

  const getCurrentSpeed = useCallback(() => {
    return sceneRef.current?.getCurrentSpeed() ?? 0;
  }, []);

  const getSimulatedTime = useCallback(() => {
    return sceneRef.current?.getSimulatedTime() ?? 0;
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* UI Overlay */}
      <Sidebar
        navigationItems={navigationItems}
        onNavigate={handleNavigate}
        timeScale={timeScale}
        onTimeScaleChange={handleTimeScaleChange}
        performanceSettings={performanceSettings}
        onPerformanceSettingsChange={handlePerformanceSettingsChange}
      />

      {/* Controls help */}
      <ControlsHelp isLocked={isControlsLocked} />

      {/* HUD - Speed, time, date */}
      <HUD
        getCurrentSpeed={getCurrentSpeed}
        getSimulatedTime={getSimulatedTime}
        timeScale={timeScale}
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
      </div>
    </div>
  );
}
