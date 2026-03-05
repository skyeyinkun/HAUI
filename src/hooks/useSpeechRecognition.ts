import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechRecognitionOptions {
    lang?: string;
    /** 用户停止说话且有最终识别结果时触发，供对话模式自动发送使用 */
    onSpeechEnd?: (finalText: string) => void;
}

export interface SpeechRecognitionResult {
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    error: string | null;
}

export function useSpeechRecognition({ lang = 'zh-CN', onSpeechEnd }: SpeechRecognitionOptions = {}): SpeechRecognitionResult {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef<any>(null);
    // 用 ref 保存最新的 onSpeechEnd，避免闭包捕获旧值
    const onSpeechEndRef = useRef(onSpeechEnd);
    onSpeechEndRef.current = onSpeechEnd;

    // 保存累积的最终识别文本（用于 onend 时回调）
    const finalTextRef = useRef('');

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsSupported(false);
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event: any) => {
            let finalStr = '';
            let interimStr = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalStr += event.results[i][0].transcript;
                } else {
                    interimStr += event.results[i][0].transcript;
                }
            }

            if (finalStr) {
                finalTextRef.current += finalStr;
                setTranscript(prev => prev + finalStr);
            }
            setInterimTranscript(interimStr);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                setError(event.error);
            }
            if (['not-allowed', 'service-not-allowed', 'network'].includes(event.error)) {
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            // 有识别到内容时触发 onSpeechEnd 回调
            const finalText = finalTextRef.current.trim();
            if (finalText && onSpeechEndRef.current) {
                onSpeechEndRef.current(finalText);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { /* ignore */ }
            }
        };
    }, [lang]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            finalTextRef.current = '';
            try {
                recognitionRef.current.start();
                setError(null);
                setInterimTranscript('');
            } catch (err: any) {
                console.warn('Failed to start recognition:', err);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch (e) { /* ignore */ }
            setIsListening(false);
        }
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        finalTextRef.current = '';
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        error,
    };
}
