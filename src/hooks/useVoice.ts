import { useState, useEffect, useCallback, useRef } from 'react';

/** Voice input/output hook using Web Speech API */
export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('en-IN');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      // Support multiple Indian languages
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interimTranscript += t;
          }
        }
        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const startListening = useCallback((language?: string) => {
    if (!recognitionRef.current) return;
    try {
      const lang = language || 'en-IN';
      recognitionRef.current.lang = lang;
      setDetectedLanguage(lang);
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch {}
  }, []);

  const toggleListening = useCallback((language?: string) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(language);
    }
  }, [isListening, startListening, stopListening]);

  const speak = useCallback((text: string, language?: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || detectedLanguage || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [detectedLanguage]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    isSpeaking,
    detectedLanguage,
    toggleListening,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
};
