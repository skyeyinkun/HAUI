import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

export interface SpeechRecognitionOptions {
    lang?: string;
    /** 用户停止说话且有最终识别结果时触发，供对话模式自动发送使用 */
    onSpeechEnd?: (finalText: string) => void;
    /** 是否在 onend 后自动重启识别（用于语音对话持续模式） */
    autoRestart?: boolean;
    /** 静音超时（毫秒），超过此时间无语音输入时自动触发 onSpeechEnd。默认 8000ms */
    silenceTimeout?: number;
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

export function useSpeechRecognition({
    lang = 'zh-CN',
    onSpeechEnd,
    autoRestart = false,
    silenceTimeout = 8000,
}: SpeechRecognitionOptions = {}): SpeechRecognitionResult {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef<any>(null);
    // 用 ref 保存最新的回调和配置，避免闭包捕获旧值
    const onSpeechEndRef = useRef(onSpeechEnd);
    onSpeechEndRef.current = onSpeechEnd;
    const autoRestartRef = useRef(autoRestart);
    autoRestartRef.current = autoRestart;

    // 保存累积的最终识别文本（用于 onend 时回调）
    const finalTextRef = useRef('');
    // 用于标记是否由用户主动停止（主动停止时不自动重启）
    const manualStopRef = useRef(false);
    // 静音超时定时器
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // 错误重试计数器
    const retryCountRef = useRef(0);

    // 清除静音超时定时器
    const clearSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);

    // 重置静音超时定时器
    const resetSilenceTimer = useCallback(() => {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
            // 超时无语音输入，停止识别并触发回调
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
            }
        }, silenceTimeout);
    }, [silenceTimeout, clearSilenceTimer]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsSupported(false);
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        // 安卓端 continuous=true 可避免自动断开，iOS Safari 不支持 continuous
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        recognition.continuous = !isIOS;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            retryCountRef.current = 0;
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalStr = '';
            let interimStr = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalStr += event.results[i][0].transcript;
                } else {
                    interimStr += event.results[i][0].transcript;
                }
            }

            // 有语音活动，重置静音定时器
            resetSilenceTimer();

            if (finalStr) {
                finalTextRef.current += finalStr;
                setTranscript(prev => prev + finalStr);
            }
            setInterimTranscript(interimStr);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            logger.error('Speech recognition error', event.error);

            // no-speech 不算真正错误，只是没检测到语音
            if (event.error === 'no-speech') {
                return;
            }

            // 网络/音频捕获错误：自动重试一次
            if (['network', 'audio-capture'].includes(event.error) && retryCountRef.current < 1) {
                retryCountRef.current++;
                setTimeout(() => {
                    try { recognition.start(); } catch (_) { /* ignore */ }
                }, 500);
                return;
            }

            setError(event.error);
            if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
                setIsListening(false);
                clearSilenceTimer();
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            clearSilenceTimer();

            // 有识别到内容时触发 onSpeechEnd 回调
            const finalText = finalTextRef.current.trim();
            if (finalText && onSpeechEndRef.current) {
                onSpeechEndRef.current(finalText);
                finalTextRef.current = '';
            }

            // 自动重启：非用户主动停止，且开启了 autoRestart
            if (!manualStopRef.current && autoRestartRef.current) {
                finalTextRef.current = '';
                setTimeout(() => {
                    try { recognition.start(); } catch (_) { /* ignore */ }
                }, 300);
            }

            manualStopRef.current = false;
        };

        recognitionRef.current = recognition;

        return () => {
            clearSilenceTimer();
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
            }
        };
    }, [lang, clearSilenceTimer, resetSilenceTimer]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            manualStopRef.current = false;
            finalTextRef.current = '';
            try {
                recognitionRef.current.start();
                setError(null);
                setInterimTranscript('');
                resetSilenceTimer();
            } catch (err: unknown) {
                logger.warn('Failed to start recognition:', err);
            }
        }
    }, [isListening, resetSilenceTimer]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            manualStopRef.current = true;
            clearSilenceTimer();
            try {
                recognitionRef.current.stop();
            } catch (_) { /* ignore */ }
            setIsListening(false);
        }
    }, [isListening, clearSilenceTimer]);

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
