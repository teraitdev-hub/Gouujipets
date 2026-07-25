import React, { useState, useEffect, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onTranscript(transcript);
          }
          setIsListening(false);
        };
        
        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };
        
        rec.onend = () => {
          setIsListening(false);
        };
        
        setRecognition(rec);
      } else {
        setSupported(false);
      }
    }
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognition || disabled) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  }, [recognition, isListening, disabled]);

  if (!supported) return null;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`relative p-3 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
          isListening 
            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
            : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <AnimatePresence>
          {isListening && (
            <motion.div 
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-red-400 z-0"
            />
          )}
        </AnimatePresence>
        <Mic className="w-5 h-5 relative z-10" />
      </button>
      
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap z-20"
          >
            <div className="flex items-end space-x-1 h-3 mr-2">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-red-400 rounded-t-sm"
                  animate={{ height: ['20%', '100%', '20%'] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium text-white tracking-wider uppercase">Listening...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
