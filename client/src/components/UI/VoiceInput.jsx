import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

export default function VoiceInput({ onTranscript, placeholder = 'Speak...' }) {
  const { language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const onTranscriptRef = useRef(onTranscript);

  // Always keep ref up-to-date with latest callback
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    const rec = new SpeechRecognition();
    // Enable continuous listening and interim results to increase listening time and provide live updates
    rec.continuous = true;
    rec.interimResults = true;

    // Map global app language to Speech Recognition locales
    const localeMap = {
      en: 'en-US',
      ta: 'ta-IN',
      hi: 'hi-IN'
    };
    rec.lang = localeMap[language] || 'en-US';

    let silenceTimer = null;

    rec.onstart = () => {
      setIsListening(true);
      resetSilenceTimer();
    };

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      // Auto-stop after 60 seconds of absolute silence (custom long safety timeout)
      silenceTimer = setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
            toast.success(language === 'ta' ? 'குரல் உள்ளீடு தானாகவே முடிந்தது' : language === 'hi' ? 'आवाज इनपुट स्वतः समाप्त हो गया' : 'Voice input paused after inactivity', { id: 'voice-toast' });
          } catch (e) {
            console.error(e);
          }
        }
      }, 60000);
    };

    rec.onresult = (event) => {
      resetSilenceTimer();
      let currentResult = '';
      for (let i = 0; i < event.results.length; i++) {
        currentResult += event.results[i][0].transcript;
      }
      
      if (currentResult && onTranscriptRef.current) {
        onTranscriptRef.current(currentResult);
      }
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please check your browser settings.');
      } else if (event.error !== 'no-speech') {
        toast.error(`Voice input error: ${event.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      if (silenceTimer) clearTimeout(silenceTimer);
    };

    recognitionRef.current = rec;

    return () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.error(err);
        }
      }
    };
  }, [language]);

  const toggleListening = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Please try Google Chrome or MS Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error(err);
        toast.error('Failed to start microphone. Please try again.');
      }
    }
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null; // Gracefully hide if completely unsupported

  return (
    <button
      onClick={toggleListening}
      className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
        isListening
          ? 'bg-red-500 hover:bg-red-600 text-white voice-pulsing'
          : 'bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
      }`}
      title={isListening ? 'Listening... click to stop' : `Click to speak (${language.toUpperCase()})`}
      type="button"
    >
      {isListening ? (
        <MicOff size={16} className="animate-pulse" />
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
}
