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

/** True when the app is running from the home screen rather than a browser tab. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export type SpeechAvailability = "available" | "unavailable-standalone" | "unavailable-browser";

/**
 * iOS does not expose SpeechRecognition to home-screen web apps, so the same
 * device can support voice in Safari and not in the installed app. Worth
 * telling apart, since the fix differs.
 */
export function speechAvailability(): SpeechAvailability {
  if (isSpeechRecognitionSupported()) return "available";
  return isStandaloneDisplay() ? "unavailable-standalone" : "unavailable-browser";
}

export function speechUnavailableMessage(availability: SpeechAvailability): string {
  if (availability === "unavailable-standalone") {
    return "Voice input is not available in the installed app. Open the site in your browser to recite aloud.";
  }
  return "This browser has no speech recognition. Chrome, Edge, or Safari support it.";
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
