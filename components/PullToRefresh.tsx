import React, { useState, useRef, ReactNode, useCallback } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

const PULL_THRESHOLD = 70;
const PULL_RESISTANCE = 2.5;

interface PullToRefreshProps {
    onRefresh: () => Promise<any>;
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className, disabled = false, onScroll }) => {
    const [pullStart, setPullStart] = useState<number | null>(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (disabled || containerRef.current?.scrollTop !== 0 || isRefreshing) {
            setPullStart(null);
            return;
        }
        setPullStart(e.targetTouches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (disabled || pullStart === null || isRefreshing) return;

        const currentY = e.targetTouches[0].clientY;
        const distance = currentY - pullStart;

        if (distance > 0) {
            e.preventDefault();
            const resistedDistance = distance / PULL_RESISTANCE;
            setPullDistance(resistedDistance);
        }
    };

    const handleTouchEnd = useCallback(async () => {
        if (disabled) {
            setPullStart(null);
            setPullDistance(0);
            return;
        }
        
        setPullStart(null);
        if (isRefreshing) return;

        if (pullDistance > PULL_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(PULL_THRESHOLD); // Keep indicator visible while refreshing
            try {
                await onRefresh();
            } catch (error) {
                console.error("Refresh failed:", error);
            } finally {
                // Short delay to make it feel smoother before hiding
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }, 500);
            }
        } else {
            setPullDistance(0); // Snap back if not pulled far enough
        }
    }, [disabled, isRefreshing, pullDistance, onRefresh]);
    
    // The container for the spinning icon. It slides in from the top.
    const indicatorContainerStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${PULL_THRESHOLD}px`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1, // Positioned above the content
        transform: `translateY(${pullDistance - PULL_THRESHOLD}px)`,
        transition: pullStart === null ? 'transform 0.3s' : 'none',
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`} // The main scrollable container
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onScroll={onScroll}
        >
            <div style={indicatorContainerStyle} aria-hidden={!isRefreshing && pullDistance === 0}>
                <div 
                    className={`p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{ 
                        opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
                        transform: `scale(${isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1)})`
                    }}
                >
                    <ArrowPathIcon
                        className="h-6 w-6 text-purple-500"
                        style={{ transform: `rotate(${!isRefreshing ? pullDistance * 2.5 : 0}deg)` }}
                    />
                </div>
            </div>
            
            {/* The content no longer has a transform wrapper */}
            {children}
        </div>
    );
};

export default PullToRefresh;