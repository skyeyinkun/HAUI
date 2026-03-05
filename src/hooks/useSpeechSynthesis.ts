import { useState, useCallback, useRef } from 'react';

// 检查当前浏览器是否支持 SpeechSynthesis API
const isSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export interface SpeechSynthesisHook {
    speak: (text: string, onEnd?: () => void) => void;
    cancel: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
}

export function useSpeechSynthesis({ lang = 'zh-CN', rate = 1.0, pitch = 1.0 } = {}): SpeechSynthesisHook {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (!isSynthesisSupported) return;

        // 中断上一条语音
        window.speechSynthesis.cancel();

        // 清除 markdown 格式符号，避免朗读出 **、# 等噪音
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/#{1,6}\s/g, '')
            .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[-_~]/g, '')
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => setIsSpeaking(true);

        utterance.onend = () => {
            setIsSpeaking(false);
            onEnd?.();
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            onEnd?.();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [lang, rate, pitch]);

    const cancel = useCallback(() => {
        if (!isSynthesisSupported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        speak,
        cancel,
        isSpeaking,
        isSupported: isSynthesisSupported,
    };
}
