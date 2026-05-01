import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// 检查当前浏览器是否支持 SpeechSynthesis API
const isSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// iOS Safari 检测（某些版本存在 TTS 静音 bug）
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

// Chrome 存在 15秒 TTS 静音 bug，超长文本需分段朗读
const SEGMENT_CHAR_LIMIT = 180;

export interface SpeechSynthesisHook {
    speak: (text: string, onEnd?: () => void) => void;
    cancel: () => void;
    pause: () => void;
    resume: () => void;
    isSpeaking: boolean;
    isPaused: boolean;
    isSupported: boolean;
    voices: SpeechSynthesisVoice[];
    selectedVoiceURI: string;
    setSelectedVoiceURI: (voiceURI: string) => void;
    rate: number;
    setRate: (rate: number) => void;
    // 是否自动朗读 AI 回复（持久化到 localStorage）
    autoSpeakEnabled: boolean;
    setAutoSpeakEnabled: (enabled: boolean) => void;
}

/**
 * 将长文本按句号/感叹号/问号/换行分段，每段不超过 SEGMENT_CHAR_LIMIT 字符
 * 避免 Chrome 15秒 TTS 静音 bug
 */
function splitTextIntoSegments(text: string): string[] {
    if (text.length <= SEGMENT_CHAR_LIMIT) return [text];

    const segments: string[] = [];
    // 按中文/英文标点分句
    const sentences = text.split(/(?<=[。！？\n.!?])/);
    let current = '';

    for (const sentence of sentences) {
        if ((current + sentence).length > SEGMENT_CHAR_LIMIT && current) {
            segments.push(current.trim());
            current = sentence;
        } else {
            current += sentence;
        }
    }
    if (current.trim()) segments.push(current.trim());
    return segments;
}

/**
 * 清除 Markdown 格式符号，避免朗读出 **、# 等噪音
 */
function cleanMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/[_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const VOICE_URI_KEY = 'ai_tts_voice_uri';
const VOICE_RATE_KEY = 'ai_tts_rate';
// 是否自动朗读 AI 回复（用户可关闭）
const VOICE_AUTO_ENABLED_KEY = 'ai_tts_auto_enabled';

export function useSpeechSynthesis({ lang = 'zh-CN', rate: initialRate = 0.92, pitch = 1.05 } = {}): SpeechSynthesisHook {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURIState] = useState(() => {
        try {
            return localStorage.getItem(VOICE_URI_KEY) || '';
        } catch {
            return '';
        }
    });
    const [rate, setRateState] = useState(() => {
        try {
            const saved = Number(localStorage.getItem(VOICE_RATE_KEY));
            return Number.isFinite(saved) && saved >= 0.6 && saved <= 1.4 ? saved : initialRate;
        } catch {
            return initialRate;
        }
    });
    // 自动朗读开关，默认开启；读取本地存储
    const [autoSpeakEnabled, setAutoSpeakEnabledState] = useState(() => {
        try {
            const saved = localStorage.getItem(VOICE_AUTO_ENABLED_KEY);
            // 仅当存储为 "false" 字符串时关闭，其余默认启用
            return saved === null ? true : saved !== 'false';
        } catch {
            return true;
        }
    });
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    // 分段朗读队列索引
    const segmentIndexRef = useRef(0);
    const segmentsRef = useRef<string[]>([]);
    const onEndCallbackRef = useRef<(() => void) | undefined>(undefined);

    useEffect(() => {
        if (!isSynthesisSupported) return;

        const updateVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };

        updateVoices();
        window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
        return () => window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
    }, []);

    const selectedVoice = useMemo(() => {
        const explicitVoice = voices.find(voice => voice.voiceURI === selectedVoiceURI);
        if (explicitVoice) return explicitVoice;
        return voices.find(voice => voice.lang?.toLowerCase().startsWith('zh') && /xiaoxiao|xiaoyi|tingting|hanhan|huihui|premium|natural/i.test(voice.name))
            || voices.find(voice => voice.lang?.toLowerCase().startsWith('zh'))
            || voices.find(voice => voice.lang?.toLowerCase().startsWith(lang.toLowerCase()))
            || null;
    }, [lang, selectedVoiceURI, voices]);

    const setSelectedVoiceURI = useCallback((voiceURI: string) => {
        setSelectedVoiceURIState(voiceURI);
        try {
            if (voiceURI) localStorage.setItem(VOICE_URI_KEY, voiceURI);
            else localStorage.removeItem(VOICE_URI_KEY);
        } catch { /* ignore storage failures */ }
    }, []);

    const setRate = useCallback((value: number) => {
        const normalizedRate = Math.min(Math.max(value, 0.6), 1.4);
        setRateState(normalizedRate);
        try {
            localStorage.setItem(VOICE_RATE_KEY, String(normalizedRate));
        } catch { /* ignore storage failures */ }
    }, []);

    // 自动朗读开关切换并持久化
    const setAutoSpeakEnabled = useCallback((enabled: boolean) => {
        setAutoSpeakEnabledState(enabled);
        try {
            localStorage.setItem(VOICE_AUTO_ENABLED_KEY, String(enabled));
        } catch { /* ignore storage failures */ }
    }, []);

    // 朗读单个段落
    const speakSegment = useCallback((segment: string, isLast: boolean) => {
        const utterance = new SpeechSynthesisUtterance(segment);
        utterance.lang = lang;
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
        };

        utterance.onend = () => {
            if (isLast) {
                setIsSpeaking(false);
                setIsPaused(false);
                onEndCallbackRef.current?.();
            } else {
                // 朗读下一个段落
                segmentIndexRef.current++;
                const nextIdx = segmentIndexRef.current;
                if (nextIdx < segmentsRef.current.length) {
                    speakSegment(
                        segmentsRef.current[nextIdx],
                        nextIdx === segmentsRef.current.length - 1
                    );
                }
            }
        };

        utterance.onerror = (event) => {
            // 区分错误类型，仅记录非用户主动取消的错误
            if (event.error !== 'canceled' && event.error !== 'interrupted') {
                console.warn(`[TTS] 朗读错误: ${event.error}`);
            }
            setIsSpeaking(false);
            setIsPaused(false);
            onEndCallbackRef.current?.();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [lang, pitch, rate, selectedVoice]);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (!isSynthesisSupported) {
            onEnd?.();
            return;
        }

        // 中断上一条语音
        window.speechSynthesis.cancel();
        setIsPaused(false);

        // iOS Safari workaround：cancel 后短暂延迟再 speak
        const doSpeak = () => {
            const cleanText = cleanMarkdown(text);
            if (!cleanText) {
                onEnd?.();
                return;
            }

            // 分段朗读
            const segments = splitTextIntoSegments(cleanText);
            segmentsRef.current = segments;
            segmentIndexRef.current = 0;
            onEndCallbackRef.current = onEnd;

            speakSegment(segments[0], segments.length === 1);
        };

        if (isIOS) {
            // iOS 需要短延迟确保 cancel 生效
            setTimeout(doSpeak, 100);
        } else {
            doSpeak();
        }
    }, [speakSegment]);

    const cancel = useCallback(() => {
        if (!isSynthesisSupported) return;
        window.speechSynthesis.cancel();
        segmentsRef.current = [];
        segmentIndexRef.current = 0;
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    const pause = useCallback(() => {
        if (!isSynthesisSupported || !window.speechSynthesis.speaking || window.speechSynthesis.paused) return;
        window.speechSynthesis.pause();
        setIsPaused(true);
    }, []);

    const resume = useCallback(() => {
        if (!isSynthesisSupported || !window.speechSynthesis.paused) return;
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsSpeaking(true);
    }, []);

    return {
        speak,
        cancel,
        pause,
        resume,
        isSpeaking,
        isPaused,
        isSupported: isSynthesisSupported,
        voices,
        selectedVoiceURI,
        setSelectedVoiceURI,
        rate,
        setRate,
        autoSpeakEnabled,
        setAutoSpeakEnabled,
    };
}
