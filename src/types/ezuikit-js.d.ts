// ezuikit-js 没有提供官方 TypeScript 类型声明
// 此处仅声明模块以消除 TS2307 错误
declare module 'ezuikit-js';

// Speech Recognition API 类型声明
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
  webkitAudioContext?: typeof AudioContext;
}
