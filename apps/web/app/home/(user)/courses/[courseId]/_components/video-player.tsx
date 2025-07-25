'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@kit/ui/button';
import { Progress } from '@kit/ui/progress';

interface VideoPlayerProps {
  src: string;
  isPlaceholder?: boolean;
  onProgress?: (progress: number) => void;
  onCompletion?: (completed: boolean) => void;
}

export function VideoPlayer({ 
  src, 
  isPlaceholder = false, 
  onProgress, 
  onCompletion 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set up mobile compatibility
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', 'true'); // For some Android browsers
    video.setAttribute('x5-video-player-type', 'h5'); // For QQ browser
    video.setAttribute('x5-video-player-fullscreen', 'false');
    
    // Set CORS attribute
    video.crossOrigin = 'anonymous';
    
    console.log('📱 Mobile video setup:', {
      src: video.src?.substring(0, 50) + '...',
      readyState: video.readyState,
      networkState: video.networkState,
      error: video.error
    });
    
    // Load video metadata
    video.load();

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const total = video.duration;
      
      setCurrentTime(current);
      setDuration(total);
      
      if (total > 0) {
        const progressPercent = (current / total) * 100;
        setProgress(progressPercent);
        
        // Call onProgress callback
        if (onProgress) {
          onProgress(progressPercent);
        }
        
        // Check for completion (95% threshold)
        if (progressPercent >= 95 && onCompletion) {
          onCompletion(true);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setShowPlayButton(false);
    };
    const handlePause = () => setIsPlaying(false);
    
    const handleError = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      console.error('🚨 Video error:', {
        error: video.error,
        code: video.error?.code,
        message: video.error?.message,
        src: video.src?.substring(0, 50) + '...',
        readyState: video.readyState,
        networkState: video.networkState
      });
      
      let errorMessage = 'Unable to play video';
      if (video.error) {
        switch (video.error.code) {
          case 1: errorMessage = 'Video loading aborted'; break;
          case 2: errorMessage = 'Network error while loading video'; break;
          case 3: errorMessage = 'Video format not supported'; break;
          case 4: errorMessage = 'Video source not found'; break;
        }
      }
      setVideoError(errorMessage);
    };
    
    const handleLoadStart = () => {
      console.log('🎬 Video load started');
    };
    
    const handleCanPlay = () => {
      console.log('✅ Video can play');
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onProgress, onCompletion]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        console.error('Playback failed:', err);
        setVideoError('Unable to play video. Please try again.');
        setShowPlayButton(true);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = seekTime;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.log('Fullscreen failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black group">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        preload="metadata"
        onContextMenu={(e) => e.preventDefault()} // Disable right-click
        {...{ 'webkit-playsinline': 'true' } as any}
      />
      
      {isPlaceholder && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-4xl mb-2">🎥</div>
            <p className="text-sm">Sample Video for Testing</p>
          </div>
        </div>
      )}
      
      {/* Play Button Overlay for Mobile */}
      {showPlayButton && !isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
          onClick={togglePlay}
        >
          <div className="bg-white/90 rounded-full p-4 md:p-6 shadow-lg">
            <svg className="w-12 h-12 md:w-16 md:h-16 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Video Controls - Always visible on mobile */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 md:p-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        <div className="mb-2 md:mb-3 py-2 -my-2">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="w-full h-2 md:h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #4b5563 ${progress}%, #4b5563 100%)`
            }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="text-white hover:bg-white/20 p-3 md:p-2 rounded-full min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center transition-colors"
            >
              <span className="text-xl md:text-base">{isPlaying ? '⏸️' : '▶️'}</span>
            </button>

            {/* Time Display */}
            <span className="text-xs md:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Volume Controls - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 p-3 md:p-2 rounded-full min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-7 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-white text-center max-w-md px-4">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-sm mb-4">{videoError}</p>
            <button 
              onClick={() => {
                setVideoError(null);
                setShowPlayButton(true);
                const video = videoRef.current;
                if (video) video.load();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      
      {/* Loading/Error States */}
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-white text-center">
            <div className="text-4xl mb-2">🎥</div>
            <p className="text-sm">No video source</p>
          </div>
        </div>
      )}
    </div>
  );
}