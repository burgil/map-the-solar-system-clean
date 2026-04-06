import { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    MapPin,
    Activity,
    CircleDot,
    Sparkles,
    Clock,
    Settings,
    Eye,
    EyeOff,
    Zap,
    Tag,
} from 'lucide-react';

export interface PerformanceSettings {
    showLabels: boolean;
    showGalaxy: boolean;
    enableBloom: boolean;
    useFrustumCulling: boolean;
}

interface SidebarProps {
    navigationItems: Array<{ name: string; type: string }>;
    onNavigate: (name: string) => void;
    timeScale: number;
    onTimeScaleChange: (scale: number) => void;
    performanceSettings: PerformanceSettings;
    onPerformanceSettingsChange: (settings: PerformanceSettings) => void;
}

export function Sidebar({
    navigationItems,
    onNavigate,
    timeScale,
    onTimeScaleChange,
    performanceSettings,
    onPerformanceSettingsChange,
}: SidebarProps) {
    const [isOpen, setIsOpen] = useState(true);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'star': return <Sparkles className="w-4 h-4 text-yellow-400" />;
            case 'planet': return <CircleDot className="w-4 h-4 text-blue-400" />;
            case 'region': return <MapPin className="w-4 h-4 text-purple-400" />;
            case 'blackhole': return <Activity className="w-4 h-4 text-red-400" />;
            case 'multiverse': return <Sparkles className="w-4 h-4 text-cyan-400" />;
            default: return <CircleDot className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <>
            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 transition-all duration-300 z-40 ${isOpen ? 'w-80 translate-x-0' : 'w-80 -translate-x-full'
                    }`}
            >
                {/* Toggle button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="fixed top-4 right-4 z-50 p-2 bg-gray-900/90 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                >
                    {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                <div className="flex flex-col h-full pt-16">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Time Scale Control */}
                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs text-gray-400">Time Speed</span>
                                <span className="ml-auto text-xs text-cyan-400 font-mono">
                                    {timeScale === 0 ? 'Paused' :
                                        timeScale === 1 ? 'Real-time' :
                                            timeScale === 3600 ? '1hr/sec' :
                                                timeScale === 86400 ? '1day/sec' :
                                                    timeScale === 604800 ? '1week/sec' :
                                                        timeScale === 2592000 ? '1month/sec' :
                                                            `${timeScale.toLocaleString()}x`}
                                </span>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {[
                                    { label: '⏸', value: 0 },
                                    { label: '1x', value: 1 },
                                    { label: '1h/s', value: 3600 },
                                    { label: '1d/s', value: 86400 },
                                    { label: '1w/s', value: 604800 },
                                    { label: '1m/s', value: 2592000 },
                                ].map(({ label, value }) => (
                                    <button
                                        key={value}
                                        onClick={() => onTimeScaleChange(value)}
                                        className={`px-2 py-1 text-xs rounded transition-colors ${timeScale === value
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Display Settings */}
                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Settings className="w-4 h-4 text-purple-400" />
                                <span className="text-xs text-gray-400">Display Settings</span>
                            </div>

                            {/* Show Labels Toggle */}
                            <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                <div className="flex items-center gap-2">
                                    {performanceSettings.showLabels ? (
                                        <Tag className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <Tag className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span className="text-sm text-gray-300">Show Labels</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={performanceSettings.showLabels}
                                    onChange={(e) => onPerformanceSettingsChange({
                                        ...performanceSettings,
                                        showLabels: e.target.checked
                                    })}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                />
                            </label>

                            {/* Show Galaxy Toggle */}
                            <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                <div className="flex items-center gap-2">
                                    {performanceSettings.showGalaxy ? (
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span className="text-sm text-gray-300">Show Galaxy</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={performanceSettings.showGalaxy}
                                    onChange={(e) => onPerformanceSettingsChange({
                                        ...performanceSettings,
                                        showGalaxy: e.target.checked
                                    })}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                />
                            </label>

                            {/* Enable Bloom Toggle */}
                            <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                <div className="flex items-center gap-2">
                                    {performanceSettings.enableBloom ? (
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                    ) : (
                                        <Zap className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span className="text-sm text-gray-300">Bloom Effects</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={performanceSettings.enableBloom}
                                    onChange={(e) => onPerformanceSettingsChange({
                                        ...performanceSettings,
                                        enableBloom: e.target.checked
                                    })}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                />
                            </label>

                            {/* Separator */}
                            <div className="border-t border-gray-600 my-2 pt-2">
                                <span className="text-xs text-gray-500">Performance</span>
                            </div>

                            {/* Frustum Culling Toggle */}
                            <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-mono px-1 rounded ${performanceSettings.useFrustumCulling ? 'bg-green-600' : 'bg-gray-600'}`}>BVH</span>
                                    <span className="text-sm text-gray-300">Frustum Culling</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={performanceSettings.useFrustumCulling}
                                    onChange={(e) => onPerformanceSettingsChange({
                                        ...performanceSettings,
                                        useFrustumCulling: e.target.checked
                                    })}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                />
                            </label>

                            {/* Visibility toggle */}
                            <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                <div className="flex items-center gap-2">
                                    {performanceSettings.showLabels ? (
                                        <Eye className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span className="text-sm text-gray-300">Show All Labels</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={performanceSettings.showLabels}
                                    onChange={(e) => onPerformanceSettingsChange({
                                        ...performanceSettings,
                                        showLabels: e.target.checked
                                    })}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                />
                            </label>
                        </div>

                        <h3 className="text-gray-400 text-xs uppercase tracking-wider">Solar System</h3>
                        {navigationItems.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => onNavigate(item.name)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-left"
                            >
                                {getTypeIcon(item.type)}
                                <span className="text-sm">{item.name.replace('BlackHole', 'Black Hole')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
