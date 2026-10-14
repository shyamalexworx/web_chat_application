import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Download } from 'lucide-react';
import { generateProceduralVoiceNote } from '../../utils/audioRecorder';

interface VoiceMessagePlayerProps {
  url: string;
  name?: string;
  duration?: number | string;
  senderAvatar?: string;
}

// WhatsApp-style waveform bar pattern
const WAVEFORM_BARS = [
  8, 14, 22, 12, 18, 26, 32, 16, 24, 28, 14, 20, 30, 22, 16,
  12, 24, 30, 20, 16, 26, 28, 18, 12, 22, 16, 24, 14, 10, 6
];

// Helper to extract duration from prop or filename (e.g. voice_message_0:05.wav)
const extractDuration = (durProp?: number | string, nameStr?: string): number => {
  if (typeof durProp === 'number' && !isNaN(durProp) && isFinite(durProp) && durProp > 0) {
    return Math.round(durProp);
  }
  if (typeof durProp === 'string') {
    const num = parseFloat(durProp);
    if (!isNaN(num) && isFinite(num) && num > 0) return Math.round(num);
    const match = durProp.match(/(\d+):(\d{2})/);
    if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  if (nameStr) {
    const match = nameStr.match(/(\d+):(\d{2})/);
    if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return 0;
};

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  url,
  name = 'Voice message',
  duration,
  senderAvatar,
}) => {
  const initialDuration = extractDuration(duration, name);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(initialDuration);
  const totalDurationRef = useRef<number>(initialDuration);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playableUrl, setPlayableUrl] = useState<string>(url);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep ref synchronized with state
  useEffect(() => {
    totalDurationRef.current = totalDuration;
  }, [totalDuration]);

  // Decode audio data via Web Audio API to resolve exact duration for any audio format
  // (Crucial for Chromium MediaRecorder WebM blobs where audio.duration evaluates to Infinity)
  useEffect(() => {
    if (!url || url === '#') return;

    let isCancelled = false;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((buf) => {
          if (isCancelled) return;
          const ctx = new AudioCtxClass();
          return ctx.decodeAudioData(buf).then((decoded) => {
            if (isCancelled) return;
            if (decoded && decoded.duration && isFinite(decoded.duration)) {
              const exact = Math.round(decoded.duration);
              if (exact > 0) {
                totalDurationRef.current = exact;
                setTotalDuration(exact);
              }
            }
            ctx.close();
          });
        })
        .catch(() => {
          // Fallback handled by metadata/name parser
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // Initialize audio and set up listeners
  useEffect(() => {
    let audioUrl = url;
    if (!url || url === '#') {
      const fallbackDur = initialDuration > 0 ? initialDuration : 4;
      const generated = generateProceduralVoiceNote(fallbackDur);
      audioUrl = generated.url;
      setPlayableUrl(audioUrl);
      totalDurationRef.current = fallbackDur;
      setTotalDuration(fallbackDur);
    } else {
      setPlayableUrl(url);
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        const d = Math.round(audio.duration);
        totalDurationRef.current = d;
        setTotalDuration(d);
      }
    };

    audio.onloadedmetadata = handleDuration;
    audio.ondurationchange = handleDuration;

    audio.ontimeupdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        const d = Math.round(audio.duration);
        if (d !== totalDurationRef.current) {
          totalDurationRef.current = d;
          setTotalDuration(d);
        }
      } else if (cur > totalDurationRef.current) {
        // Expand runtime dynamically if currentTime exceeds totalDuration
        const next = Math.ceil(cur);
        totalDurationRef.current = next;
        setTotalDuration(next);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio.currentTime > totalDurationRef.current) {
        const d = Math.round(audio.currentTime);
        totalDurationRef.current = d;
        setTotalDuration(d);
      }
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [url, initialDuration]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback prevented or file unplayable, regenerating audio fallback:', err);
        const durToUse = totalDurationRef.current > 0 ? totalDurationRef.current : 4;
        const fallback = generateProceduralVoiceNote(durToUse);
        setPlayableUrl(fallback.url);
        if (audioRef.current) {
          audioRef.current.src = fallback.url;
          audioRef.current.play().then(() => setIsPlaying(true));
        }
      });
    }
  };

  const displayTotalDuration = Math.max(totalDuration, Math.ceil(currentTime));

  const handleSeek = (index: number) => {
    if (!audioRef.current || displayTotalDuration === 0) return;
    const progress = Math.min(1, Math.max(0, index / (WAVEFORM_BARS.length - 1)));
    const targetTime = progress * displayTotalDuration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressFraction = displayTotalDuration > 0 ? currentTime / displayTotalDuration : 0;
  const currentActiveBarIndex = Math.floor(progressFraction * WAVEFORM_BARS.length);

  return (
    <div className="w-full max-w-sm bg-[#12151C] hover:bg-[#181C25] border border-[#252B36] rounded-2xl p-3 select-none transition-all shadow-subtle group/voice">
      <div className="flex items-center space-x-3">
        {/* WhatsApp-style Voice Memo Avatar / Mic badge */}
        <div className="relative flex-shrink-0">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-[#252B36]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#181C25] border border-[#252B36] flex items-center justify-center text-[#32C48D]">
              <Mic className="w-5 h-5" />
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#32C48D] text-white flex items-center justify-center shadow-sm">
            <Mic className="w-2.5 h-2.5" />
          </span>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#32C48D] hover:bg-[#2EB882] active:scale-95 text-white flex items-center justify-center flex-shrink-0 transition-all shadow-md cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play voice message'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* WhatsApp-style Animated / Interactive Waveform Bar Scrubber */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div
            className="flex items-center space-x-[2px] h-9 cursor-pointer py-1"
            title="Click along waveform to scrub"
          >
            {WAVEFORM_BARS.map((height, i) => {
              const isPlayed = i <= currentActiveBarIndex;
              return (
                <div
                  key={i}
                  onClick={() => handleSeek(i)}
                  className="flex-1 flex items-center justify-center h-full group/bar cursor-pointer"
                >
                  <div
                    className={`w-full rounded-full transition-all duration-150 ${
                      isPlayed
                        ? 'bg-[#32C48D]'
                        : 'bg-[#636D7E]/50 group-hover/bar:bg-[#929BAA]'
                    }`}
                    style={{
                      height: `${height}px`,
                      maxHeight: '100%',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Timestamp and Speed Control */}
          <div className="flex items-center justify-between text-[11px] text-[#929BAA] font-mono mt-0.5">
            <span>{formatTime(currentTime)} / {formatTime(displayTotalDuration)}</span>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={cycleSpeed}
                className="px-1.5 py-0.2 rounded bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] text-[10px] font-bold text-[#F5F7FA] transition-colors"
                title="Change playback speed"
              >
                {playbackSpeed}x
              </button>

              <a
                href={playableUrl}
                download={name}
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-[#929BAA] hover:text-[#F5F7FA] rounded hover:bg-[#181C25] transition-colors"
                title="Download voice note"
              >
                <Download className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
