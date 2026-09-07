interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionConstructor() !== undefined;
}

export interface SpeechListenHandle {
  stop: () => void;
}

export function listenForRecitation(
  onResult: (transcript: string) => void,
  onError: (message: string) => void,
): SpeechListenHandle {
  const Recognition = getRecognitionConstructor();
  if (!Recognition) {
    onError("Speech recognition is not supported in this browser.");
    return { stop: () => {} };
  }

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? "")
      .join(" ")
      .trim();
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    onError(event.error || "Speech recognition failed.");
  };

  recognition.start();

  return {
    stop: () => recognition.stop(),
  };
}
