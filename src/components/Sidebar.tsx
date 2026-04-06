import { useState, useCallback, useRef, useEffect } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Gem,
    Activity,
    AlertTriangle,
    CircleDot,
    Sparkles,
    TrendingUp,
    Filter,
    X,
    Clock,
    Settings,
    Eye,
    EyeOff,
    Zap,
    Tag,
    ArrowUpDown
} from 'lucide-react';
import { type Asteroid, searchAsteroids, getAsteroidsByPage } from '@/lib/indexedDB';
import { formatCompactValue } from '@/lib/dataLoader';

export interface PerformanceSettings {
    showAsteroids: boolean;
    showLabels: boolean;
    showGalaxy: boolean;
    enableBloom: boolean;
    useFrustumCulling: boolean;
    useLOD: boolean;
    freeze: boolean;
}

// Format full currency value with proper separators
function formatFullValue(value: number): string {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// Calculate approximate distance to Earth (simplified orbital distance)
// Returns distance in AU based on semi-major axis and eccentricity
function getApproxDistanceToEarth(asteroid: Asteroid): number {
    // Simplified: distance = |a - 1| (Earth is at 1 AU)
    // Better approximation using perihelion (q) and aphelion (ad)
    const earthA = 1; // AU
    const minDist = Math.min(Math.abs(asteroid.q - earthA), Math.abs(asteroid.ad - earthA));
    return minDist;
}

// Format distance in AU or millions of km
function formatDistance(auDistance: number): string {
    const KM_PER_AU = 149_597_870.7;
    const km = auDistance * KM_PER_AU;

    if (auDistance < 0.01) {
        return `${(km / 1000).toFixed(0).toLocaleString()} km`;
    } else if (auDistance < 0.1) {
        return `${(km / 1e6).toFixed(2)} M km`;
    } else {
        return `${auDistance.toFixed(2)} AU`;
    }
}

interface SidebarProps {
    navigationItems: Array<{ name: string; type: string }>;
    onNavigate: (name: string) => void;
    onAsteroidSelect: (asteroid: Asteroid) => void;
    statistics: {
        totalCount: number;
        totalValue: number;
        neoCount: number;
        phaCount: number;
    };
    timeScale: number;
    onTimeScaleChange: (scale: number) => void;
    performanceSettings: PerformanceSettings;
    onPerformanceSettingsChange: (settings: PerformanceSettings) => void;
}

export function Sidebar({
    navigationItems,
    onNavigate,
    onAsteroidSelect,
    statistics,
    timeScale,
    onTimeScaleChange,
    performanceSettings,
    onPerformanceSettingsChange,
}: SidebarProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'nav' | 'asteroids' | 'stats'>('nav');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'value' | 'diameter' | 'name' | 'distance'>('value');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [displayAsteroids, setDisplayAsteroids] = useState<Asteroid[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const pageSize = 50;

    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sort asteroids helper
    const sortAsteroids = useCallback((asteroids: Asteroid[]) => {
        return [...asteroids].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'value':
                    comparison = a.estimatedValue - b.estimatedValue;
                    break;
                case 'diameter':
                    comparison = a.diameter - b.diameter;
                    break;
                case 'name':
                    comparison = (a.name || a.pdes).localeCompare(b.name || b.pdes);
                    break;
                case 'distance':
                    comparison = getApproxDistanceToEarth(a) - getApproxDistanceToEarth(b);
                    break;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }, [sortBy, sortOrder]);

    // Search asteroids from IndexedDB
    useEffect(() => {
        async function performSearch() {
            setIsSearching(true);
            try {
                if (searchQuery.trim()) {
                    // Search with query
                    const { results, total } = await searchAsteroids(searchQuery, currentPage, pageSize);
                    // Apply client-side filter for category
                    const filtered = filterCategory === 'all' ? results : results.filter(a =>
                        (filterCategory === 'neo' && a.neo) ||
                        (filterCategory === 'pha' && a.pha) ||
                        a.category === filterCategory
                    );
                    setDisplayAsteroids(sortAsteroids(filtered));
                    setTotalResults(total);
                } else {
                    // Load by page when no search query
                    const results = await getAsteroidsByPage(currentPage, pageSize);
                    const filtered = filterCategory === 'all' ? results : results.filter(a =>
                        (filterCategory === 'neo' && a.neo) ||
                        (filterCategory === 'pha' && a.pha) ||
                        a.category === filterCategory
                    );
                    setDisplayAsteroids(sortAsteroids(filtered));
                    setTotalResults(statistics.totalCount);
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
            setIsSearching(false);
        }

        // Debounce search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(performSearch, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, currentPage, filterCategory, statistics.totalCount, sortAsteroids]);

    const totalPages = Math.ceil(totalResults / pageSize);

    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(0);
    }, []);

    const handleFilterChange = useCallback((filter: string) => {
        setFilterCategory(filter);
        setCurrentPage(0);
    }, []);

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

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'text-green-400';
            case 'Moderate': return 'text-yellow-400';
            case 'Difficult': return 'text-orange-400';
            case 'Very Difficult': return 'text-red-400';
            case 'Extreme': return 'text-purple-400';
            default: return 'text-gray-400';
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
                    {/* Tabs */}
                    <div className="flex border-b border-gray-700">
                        <button
                            onClick={() => setActiveTab('nav')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'nav' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Navigate
                        </button>
                        <button
                            onClick={() => setActiveTab('asteroids')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'asteroids' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Asteroids
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'stats' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Stats
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Navigation Tab */}
                        {activeTab === 'nav' && (
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

                                {/* Performance Settings */}
                                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Settings className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs text-gray-400">Display Settings</span>
                                    </div>

                                    {/* Show Asteroids Toggle */}
                                    <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                        <div className="flex items-center gap-2">
                                            {performanceSettings.showAsteroids ? (
                                                <Eye className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-500" />
                                            )}
                                            <span className="text-sm text-gray-300">Show Asteroids</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={performanceSettings.showAsteroids}
                                            onChange={(e) => onPerformanceSettingsChange({
                                                ...performanceSettings,
                                                showAsteroids: e.target.checked
                                            })}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                        />
                                    </label>

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

                                    {/* Separator for Performance Controls */}
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

                                    {/* LOD Toggle */}
                                    <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-mono px-1 rounded ${performanceSettings.useLOD ? 'bg-blue-600' : 'bg-gray-600'}`}>LOD</span>
                                            <span className="text-sm text-gray-300">Level of Detail</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={performanceSettings.useLOD}
                                            onChange={(e) => onPerformanceSettingsChange({
                                                ...performanceSettings,
                                                useLOD: e.target.checked
                                            })}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                                        />
                                    </label>

                                    {/* Freeze Toggle */}
                                    <label className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 -mx-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-mono px-1 rounded ${performanceSettings.freeze ? 'bg-red-600' : 'bg-gray-600'}`}>❄</span>
                                            <span className="text-sm text-gray-300">Freeze (Debug)</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={performanceSettings.freeze}
                                            onChange={(e) => onPerformanceSettingsChange({
                                                ...performanceSettings,
                                                freeze: e.target.checked
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
                        )}

                        {/* Asteroids Tab */}
                        {activeTab === 'asteroids' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Search */}
                                <div className="p-4 border-b border-gray-700 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Search asteroids..."
                                            value={searchQuery}
                                            onChange={handleSearch}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filter */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                                        {['all', 'neo', 'pha', 'Inner Main Belt', 'Outer Main Belt'].map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => handleFilterChange(filter)}
                                                className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${filterCategory === filter
                                                    ? 'bg-cyan-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {filter === 'neo' ? 'NEO' : filter === 'pha' ? 'PHA' : filter === 'all' ? 'All' : filter}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Sort */}
                                    <div className="flex items-center gap-2">
                                        <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
                                        <select
                                            value={sortBy}
                                            onChange={(e) => {
                                                setSortBy(e.target.value as typeof sortBy);
                                                setCurrentPage(0);
                                            }}
                                            className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="value">Value</option>
                                            <option value="diameter">Diameter</option>
                                            <option value="distance">Distance to Earth</option>
                                            <option value="name">Name</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                                                setCurrentPage(0);
                                            }}
                                            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                                        >
                                            {sortOrder === 'desc' ? '↓' : '↑'}
                                        </button>
                                    </div>

                                    {/* Search progress / status */}
                                    {isSearching ? (
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Searching...</p>
                                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500 animate-pulse" style={{ width: '60%' }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">
                                            Showing {displayAsteroids.length} of {totalResults.toLocaleString()} asteroids
                                        </p>
                                    )}
                                </div>

                                {/* Asteroid List */}
                                <div className="flex-1 overflow-y-auto">
                                    {displayAsteroids.map((asteroid) => (
                                        <button
                                            key={asteroid.id}
                                            onClick={() => onAsteroidSelect(asteroid)}
                                            className="w-full p-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors text-left"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate">
                                                        {asteroid.name || asteroid.pdes}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {asteroid.category}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-bold text-green-400" title={formatFullValue(asteroid.estimatedValue)}>
                                                        {formatCompactValue(asteroid.estimatedValue)}
                                                    </p>
                                                    <p className={`text-xs ${getDifficultyColor(asteroid.miningDifficulty)}`}>
                                                        {asteroid.miningDifficulty}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {asteroid.neo && (
                                                    <span className="px-1.5 py-0.5 text-xs bg-blue-600/30 text-blue-400 rounded">
                                                        NEO
                                                    </span>
                                                )}
                                                {asteroid.pha && (
                                                    <span className="px-1.5 py-0.5 text-xs bg-red-600/30 text-red-400 rounded flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> PHA
                                                    </span>
                                                )}
                                                {asteroid.diameter > 0 && (
                                                    <span className="text-xs text-gray-500" title="Diameter">
                                                        ⌀ {asteroid.diameter.toFixed(1)} km
                                                    </span>
                                                )}
                                                <span className="text-xs text-cyan-500/70" title="Min. distance to Earth orbit">
                                                    ↔ {formatDistance(getApproxDistanceToEarth(asteroid))}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="p-3 border-t border-gray-700 flex items-center justify-between">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                            disabled={currentPage === 0}
                                            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-400">
                                            {currentPage + 1} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={currentPage >= totalPages - 1}
                                            className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stats Tab */}
                        {activeTab === 'stats' && (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="space-y-3">
                                    <h3 className="text-gray-400 text-xs uppercase tracking-wider">Overview</h3>

                                    <div className="p-4 bg-linear-to-br from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-700/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Gem className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs text-gray-400">Total Asteroids</span>
                                        </div>
                                        <p className="text-2xl font-bold bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                            {statistics.totalCount.toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-linear-to-br from-green-900/50 to-emerald-900/50 rounded-lg border border-green-700/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-gray-400">Total Estimated Value</span>
                                        </div>
                                        <p className="text-xl font-bold bg-linear-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                            {formatCompactValue(statistics.totalValue)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
                                            <div className="flex items-center gap-1 mb-1">
                                                <CircleDot className="w-3 h-3 text-blue-400" />
                                                <span className="text-xs text-gray-400">NEO</span>
                                            </div>
                                            <p className="text-lg font-bold text-blue-400">
                                                {statistics.neoCount.toLocaleString()}
                                            </p>
                                        </div>

                                        <div className="p-3 bg-red-900/30 rounded-lg border border-red-700/50">
                                            <div className="flex items-center gap-1 mb-1">
                                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                                <span className="text-xs text-gray-400">PHA</span>
                                            </div>
                                            <p className="text-lg font-bold text-red-400">
                                                {statistics.phaCount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-gray-400 text-xs uppercase tracking-wider">Legend</h3>
                                    <div className="text-xs space-y-1 text-gray-400">
                                        <p><span className="text-blue-400 font-semibold">NEO</span> - Near Earth Object</p>
                                        <p><span className="text-red-400 font-semibold">PHA</span> - Potentially Hazardous Asteroid</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
