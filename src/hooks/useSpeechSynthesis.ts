import { useState, useCallback, useRef } from 'react';

// 检查当前浏览器是否支持 SpeechSynthesis API
const isSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// iOS Safari 检测（某些版本存在 TTS 静音 bug）
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

// Chrome 存在 15秒 TTS 静音 bug，超长文本需分段朗读
const SEGMENT_CHAR_LIMIT = 180;

export interface SpeechSynthesisHook {
    speak: (text: string, onEnd?: () => void) => void;
    cancel: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
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
        .replace(/[-_~]/g, '')
        .trim();
}

export function useSpeechSynthesis({ lang = 'zh-CN', rate = 1.0, pitch = 1.0 } = {}): SpeechSynthesisHook {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    // 分段朗读队列索引
    const segmentIndexRef = useRef(0);
    const segmentsRef = useRef<string[]>([]);
    const onEndCallbackRef = useRef<(() => void) | undefined>(undefined);

    // 朗读单个段落
    const speakSegment = useCallback((segment: string, isLast: boolean) => {
        const utterance = new SpeechSynthesisUtterance(segment);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => setIsSpeaking(true);

        utterance.onend = () => {
            if (isLast) {
                setIsSpeaking(false);
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
            onEndCallbackRef.current?.();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [lang, rate, pitch]);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (!isSynthesisSupported) {
            onEnd?.();
            return;
        }

        // 中断上一条语音
        window.speechSynthesis.cancel();

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
    }, []);

    return {
        speak,
        cancel,
        isSpeaking,
        isSupported: isSynthesisSupported,
    };
}
