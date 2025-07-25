'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@kit/ui/spinner';

// Dynamically import Video.js component to avoid SSR issues
const VideoJSPlayer = dynamic(
  () => import('./videojs-player').then(mod => ({ default: mod.VideoJSPlayer })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Spinner className="mx-auto mb-4 h-8 w-8" />
          <p>Loading video player...</p>
        </div>
      </div>
    )
  }
);

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
  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="text-4xl mb-2">🎥</div>
          <p className="text-sm">No video source</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <VideoJSPlayer 
        src={src}
        onProgress={onProgress}
        onCompletion={onCompletion}
        className="w-full h-full"
      />
      
      {isPlaceholder && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
          <div className="text-white text-center">
            <div className="text-4xl mb-2">🎥</div>
            <p className="text-sm">Sample Video for Testing</p>
          </div>
        </div>
      )}
    </div>
  );
}