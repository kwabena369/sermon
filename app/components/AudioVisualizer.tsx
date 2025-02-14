import React from "react";
import { Pause, Circle } from "lucide-react";

interface AudioVisualizerProps {
  isListening: boolean;
  isPaused: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isListening, isPaused }) => {
  return (
    <div className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full">
      {isPaused ? (
        // Pause icon when paused
        <Pause className="h-6 w-6 text-gray-700" />
      ) : isListening ? (
        // Animated bars when listening
        <div className="flex items-end gap-1 h-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-blue-500 animate-bar-dance"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      ) : (
        // Circle icon when idle
        <Circle className="h-6 w-6 text-gray-700" />
      )}
    </div>
  );
};

export default AudioVisualizer;
