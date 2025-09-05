'use client';

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

interface VideoJSPlayerProps {
  src: string;
  lessonId?: string;
  initialTime?: number;
  onProgress?: (progress: number) => void;
  onCompletion?: (completed: boolean) => void;
  className?: string;
}

export function VideoJSPlayer({ 
  src, 
  lessonId,
  initialTime = 0,
  onProgress, 
  onCompletion,
  className = ''
}: VideoJSPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const progressSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentProgressRef = useRef<{ time: number; duration: number } | null>(null);

  useEffect(() => {
    // Initialize Video.js player
    if (!videoRef.current) return;

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered', 'vjs-fill');
    videoRef.current.appendChild(videoElement);

    // Video.js options with mobile optimizations
    const options = {
      sources: [{
        src: src,
        type: src.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
      }],
      controls: true,
      preload: 'auto',
      fluid: false, // Disable fluid to have more control
      fill: true, // Fill the container
      responsive: true,
      playbackRates: [], // Disable playback speed control
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false
      },
      // Mobile specific settings
      userActions: {
        hotkeys: false, // Disable keyboard shortcuts
        doubleClick: false // Disable double-click to fullscreen
      },
      controlBar: {
        volumePanel: {
          inline: false // Better for mobile
        },
        playbackRateMenuButton: {
          show: false // Hide playback rate
        },
        skipButtons: false // No skip buttons
      }
    };

    const player = playerRef.current = videojs(videoElement, options, function onPlayerReady() {
      console.log('🎥 Video.js player ready');
      
      // Set up mobile attributes
      const videoEl = player.el().querySelector('video');
      if (videoEl) {
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('webkit-playsinline', 'true');
        videoEl.setAttribute('x5-playsinline', 'true');
      }
    });

    // Function to send progress to server
    const maybeSendProgress = (currentTime: number, duration: number) => {
      if (!lessonId || duration <= 0) return;
      
      // Throttle to ~5 seconds
      const shouldSend = !lastSentProgressRef.current || 
        Math.abs(currentTime - lastSentProgressRef.current.time) >= 5;
      
      if (shouldSend) {
        // Clear any pending timeout
        if (progressSendTimeoutRef.current) {
          clearTimeout(progressSendTimeoutRef.current);
        }
        
        // Set a new timeout to batch the send
        progressSendTimeoutRef.current = setTimeout(() => {
          const deviceInfo = {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          };
          
          const payload = {
            lessonId,
            currentTime: Math.floor(currentTime),
            duration: Math.floor(duration),
            deviceInfo
          };
          
          // Try sendBeacon first, fallback to fetch
          const dataStr = JSON.stringify(payload);
          const blob = new Blob([dataStr], { type: 'application/json' });
          
          if (navigator.sendBeacon) {
            const sent = navigator.sendBeacon('/api/lessons/video-progress', blob);
            if (sent) {
              console.log('📤 Progress sent via beacon:', currentTime);
            } else {
              // Fallback to fetch
              fetch('/api/lessons/video-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: dataStr,
                keepalive: true
              }).catch(err => console.error('Failed to send progress:', err));
            }
          } else {
            // No beacon support, use fetch
            fetch('/api/lessons/video-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: dataStr,
              keepalive: true
            }).catch(err => console.error('Failed to send progress:', err));
          }
          
          lastSentProgressRef.current = { time: currentTime, duration };
        }, 500); // Small delay to batch rapid updates
      }
    };
    
    // Track time updates
    let lastReportedProgress = 0;
    player.on('timeupdate', () => {
      const currentTime = player.currentTime() || 0;
      const duration = player.duration() || 0;
      
      // Update max watched time only if moving forward
      if (currentTime > maxWatchedTime) {
        setMaxWatchedTime(currentTime);
        
        // Calculate and report progress
        if (duration > 0) {
          const progress = (currentTime / duration) * 100;
          
          // Report progress in 5% increments to reduce calls
          if (Math.floor(progress / 5) > Math.floor(lastReportedProgress / 5)) {
            lastReportedProgress = progress;
            onProgress?.(progress);
          }
          
          // Check for completion (95% threshold)
          if (progress >= 95 && !hasCompleted) {
            setHasCompleted(true);
            onCompletion?.(true);
          }
          
          // Send progress to server
          maybeSendProgress(currentTime, duration);
        }
      }
    });

    // Prevent forward seeking
    let isSeeking = false;
    player.on('seeking', () => {
      if (!isSeeking) {
        isSeeking = true;
        const currentTime = player.currentTime() || 0;
        
        // Check if trying to seek beyond watched portion
        if (currentTime > maxWatchedTime + 1) { // 1 second buffer
          player.currentTime(maxWatchedTime);
          console.log('⏪ Prevented forward skip beyond', maxWatchedTime);
          
          // Show message to user
          player.one('seeked', () => {
            const textDisplay = player.controlBar.addChild('component', {
              el: videojs.dom.createEl('div', {
                className: 'vjs-seek-blocked-message',
                innerHTML: 'You must watch the video to progress'
              })
            });
            
            setTimeout(() => {
              player.controlBar.removeChild(textDisplay);
            }, 3000);
          });
        }
        
        setTimeout(() => {
          isSeeking = false;
        }, 100);
      }
    });

    // Handle errors
    player.on('error', () => {
      const error = player.error();
      console.error('🚨 Video.js error:', error);
      
      // Try to provide helpful error messages
      let message = 'Unable to play video';
      if (error) {
        switch (error.code) {
          case 1: message = 'Video loading was aborted'; break;
          case 2: message = 'Network error - please check your connection'; break;
          case 3: message = 'Video format not supported by your browser'; break;
          case 4: message = 'Video not found or access denied'; break;
        }
      }
      
      // Display error in player
      player.errorDisplay.content(message);
    });

    // Mobile play handling
    player.on('play', () => {
      console.log('▶️ Video playing');
    });
    
    // Handle waiting/buffering
    player.on('waiting', () => {
      console.log('⏳ Video buffering...');
    });
    
    player.on('playing', () => {
      console.log('▶️ Video resumed after buffering');
    });

    player.on('loadedmetadata', () => {
      const duration = player.duration();
      console.log('📊 Video metadata loaded:', {
        duration: duration,
        width: player.videoWidth(),
        height: player.videoHeight(),
        initialTime: initialTime
      });
      
      // Seek to initial time if provided and valid
      if (initialTime && initialTime > 0 && duration > 0) {
        // Only seek if within duration minus 5 seconds (don't resume at very end)
        if (initialTime < duration - 5) {
          player.currentTime(initialTime);
          setMaxWatchedTime(initialTime);
          console.log('⏱️ Resumed at', initialTime, 'seconds');
        }
      }
    });

    // Send progress on visibility change or page unload
    const sendFinalProgress = () => {
      if (playerRef.current && !playerRef.current.isDisposed() && lessonId) {
        const currentTime = playerRef.current.currentTime() || 0;
        const duration = playerRef.current.duration() || 0;
        
        if (duration > 0) {
          const deviceInfo = {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            event: 'page_unload'
          };
          
          const payload = JSON.stringify({
            lessonId,
            currentTime: Math.floor(currentTime),
            duration: Math.floor(duration),
            deviceInfo
          });
          
          // Use sendBeacon for reliable unload sending
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/lessons/video-progress', 
              new Blob([payload], { type: 'application/json' }));
          }
        }
      }
    };
    
    // Add event listeners for page visibility/unload
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendFinalProgress();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', sendFinalProgress);
    window.addEventListener('beforeunload', sendFinalProgress);
    
    // Cleanup
    return () => {
      // Clear any pending progress timeout
      if (progressSendTimeoutRef.current) {
        clearTimeout(progressSendTimeoutRef.current);
      }
      
      // Send final progress before cleanup
      sendFinalProgress();
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', sendFinalProgress);
      window.removeEventListener('beforeunload', sendFinalProgress);
      
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, lessonId, initialTime]); // Reinitialize if these change

  // Update max watched time when it changes
  useEffect(() => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      const player = playerRef.current;
      
      // Update progress bar to show watched portion
      const progressControl = player.controlBar.progressControl;
      if (progressControl) {
        const duration = player.duration() || 0;
        if (duration > 0) {
          const watchedPercent = (maxWatchedTime / duration) * 100;
          
          // Add custom class to style the progress bar
          const seekBar = progressControl.seekBar;
          if (seekBar) {
            seekBar.el().style.setProperty('--watched-percent', `${watchedPercent}%`);
          }
        }
      }
    }
  }, [maxWatchedTime]);

  return (
    <div className={`video-js-container ${className}`}>
      <div ref={videoRef} className="w-full h-full" />
      <style jsx global>{`
        /* Video.js custom styles */
        .video-js-container {
          width: 100%;
          height: 100%;
          position: relative;
          background: rgb(17 24 39); /* gray-900 */
        }
        
        /* Mobile optimizations */
        .video-js {
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Ensure video fits properly on mobile */
        .video-js video {
          object-fit: contain;
        }
        
        /* Adjust big play button for mobile */
        @media (max-width: 768px) {
          .video-js .vjs-big-play-button {
            width: 50px;
            height: 50px;
            line-height: 50px;
            font-size: 1.5em;
            left: 50%;
            top: 50%;
            margin-left: -25px;
            margin-top: -25px;
          }
        }
        
        /* Custom progress bar styling to show watched portion */
        .video-js .vjs-progress-holder {
          position: relative;
        }
        
        .video-js .vjs-progress-holder::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: var(--watched-percent, 0%);
          background: rgba(255, 255, 255, 0.2);
          z-index: 0;
        }
        
        /* Seek blocked message */
        .vjs-seek-blocked-message {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          white-space: nowrap;
          pointer-events: none;
        }
        
        /* Mobile control bar adjustments */
        @media (max-width: 768px) {
          .video-js .vjs-control-bar {
            height: 3em;
          }
          
          .video-js .vjs-button {
            width: 3em;
          }
          
          .video-js .vjs-time-control {
            padding: 0 0.3em;
            font-size: 1em;
          }
        }
        
        /* Hide volume on mobile */
        @media (max-width: 640px) {
          .video-js .vjs-volume-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}