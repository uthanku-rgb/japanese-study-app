export type JapaneseLevel = "입문" | "N5" | "N4" | "N3" | "N2" | "N1" | "회화";
export type LessonStatus = "studying" | "review" | "mastered";
export type VocabStatus = "learning" | "review" | "mastered";
export type QuizType = "jp_to_kr" | "jp_to_reading" | "kr_to_jp";

export interface StudyProfile {
  id: string;
  display_name: string;
  emoji: string;
  theme_color: "sage" | "rose" | string;
}

export interface VocabProgressRow {
  profile_id: string;
  vocab_id: string;
  status: VocabStatus;
  updated_at?: string;
}

export interface GrammarExample {
  jp: string;
  reading?: string;
  ko: string;
}

export interface GrammarItem {
  pattern: string;
  summary: string;
  examples: GrammarExample[];
}

export interface DialogueLine {
  speaker: string;
  jp: string;
  reading?: string;
  ko: string;
}

export interface JapaneseLesson {
  id: string;
  book_title: string | null;
  lesson_number: number | null;
  title: string;
  level: string;
  study_date: string;
  summary: string | null;
  content: string;
  grammar_points: string[];
  grammar_items: GrammarItem[];
  dialogues: DialogueLine[];
  exercises: unknown[];
  status: LessonStatus;
  created_at: string;
  updated_at: string;
}

export interface JapaneseVocab {
  id: string;
  lesson_id: string | null;
  lesson_number: number | null;
  word: string;
  reading: string;
  meaning: string;
  example_jp: string | null;
  example_kr: string | null;
  level: string;
  category: string;
  status: VocabStatus;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizWrongWord {
  word: string;
  reading: string;
  meaning: string;
}

// Keep references so Chrome/Safari don't GC active utterances or audio
let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesInitialized = false;

function initVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (voicesInitialized) return;
  voicesInitialized = true;
  const load = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

function getJapaneseVoice(): SpeechSynthesisVoice | null {
  initVoices();
  const list =
    cachedVoices.length > 0
      ? cachedVoices
      : typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis.getVoices()
      : [];
  const jaVoices = list.filter((v) =>
    v.lang.toLowerCase().replace("_", "-").startsWith("ja")
  );
  if (jaVoices.length === 0) return null;
  // Prefer Google / Natural / Kyoko / Nanami / Haruka voices
  return (
    jaVoices.find((v) => /google|natural|nanami|kyoko|o-ren/i.test(v.name)) ||
    jaVoices[0]
  );
}

function playFallbackAudio(
  text: string,
  onEnd?: () => void,
  onError?: () => void
) {
  if (typeof window === "undefined") {
    onError?.();
    return;
  }
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    const clean = text.trim();
    if (!clean) {
      onEnd?.();
      return;
    }
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=${encodeURIComponent(
      clean
    )}`;
    const audio = new Audio();
    // Prevent Referer blocking
    (audio as HTMLAudioElement & { referrerPolicy?: string }).referrerPolicy =
      "no-referrer";
    audio.src = url;
    audio.playbackRate = 0.95;
    activeAudio = audio;
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      onError?.();
    };
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        if (activeAudio === audio) activeAudio = null;
        onError?.();
      });
    }
  } catch {
    onError?.();
  }
}

export function stopJapaneseSpeech() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  activeUtterance = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function speakJapanese(
  text: string,
  options?: { rate?: number; onEnd?: () => void; onError?: () => void }
) {
  if (typeof window === "undefined") return;
  const clean = text.trim();
  if (!clean) {
    options?.onEnd?.();
    return;
  }

  stopJapaneseSpeech();

  const hasSpeech = "speechSynthesis" in window;
  const jaVoice = hasSpeech ? getJapaneseVoice() : null;

  // If browser/OS has no Japanese voice installed (common on Korean Windows),
  // immediately use cloud TTS audio fallback so sound always plays.
  if (!hasSpeech || !jaVoice) {
    playFallbackAudio(clean, options?.onEnd, options?.onError);
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "ja-JP";
    utterance.voice = jaVoice;
    utterance.rate = options?.rate ?? 0.9;
    activeUtterance = utterance;

    let finished = false;
    utterance.onend = () => {
      if (finished) return;
      finished = true;
      if (activeUtterance === utterance) activeUtterance = null;
      options?.onEnd?.();
    };
    utterance.onerror = () => {
      if (finished) return;
      finished = true;
      if (activeUtterance === utterance) activeUtterance = null;
      // Fallback to audio if Web Speech fails
      playFallbackAudio(clean, options?.onEnd, options?.onError);
    };

    // Chrome sometimes pauses speechSynthesis or drops speak() right after cancel()
    window.speechSynthesis.resume();
    window.setTimeout(() => {
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch {
        playFallbackAudio(clean, options?.onEnd, options?.onError);
      }
    }, 30);
  } catch {
    playFallbackAudio(clean, options?.onEnd, options?.onError);
  }
}
