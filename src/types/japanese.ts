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

export function speakJapanese(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.toLowerCase().startsWith("ja"));
    if (jaVoice) utterance.voice = jaVoice;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("TTS failed:", err);
  }
}

export function stopJapaneseSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
