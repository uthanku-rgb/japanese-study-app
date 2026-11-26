"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  JapaneseLesson,
  JapaneseVocab,
  VocabStatus,
  QuizType,
  QuizWrongWord,
  StudyProfile,
  VocabProgressRow,
  speakJapanese,
  stopJapaneseSpeech,
} from "@/types/japanese";
import ProfileGate from "@/components/ProfileGate";
import {
  BookOpen,
  MessageSquare,
  Layers,
  Brain,
  Volume2,
  Play,
  Square,
  Eye,
  EyeOff,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Shuffle,
  List,
  CheckCircle2,
  XCircle,
  Trophy,
  RefreshCw,
  ArrowRight,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";

type StudyTab = "dialogue" | "grammar" | "cards" | "quiz";

interface QuizQuestion {
  target: JapaneseVocab;
  prompt: string;
  correctAnswer: string;
  options: string[];
}

const PROFILE_STORAGE_KEY = "japanese_study_active_profile_v1";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function JapaneseStudyApp() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [profiles, setProfiles] = useState<StudyProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showProfileGate, setShowProfileGate] = useState(false);

  const [lessons, setLessons] = useState<JapaneseLesson[]>([]);
  const [vocabList, setVocabList] = useState<JapaneseVocab[]>([]);
  const [progressMap, setProgressMap] = useState<
    Record<string, Record<string, VocabStatus>>
  >({});
  const [loading, setLoading] = useState(true);

  // Selected lesson & active tab
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudyTab>("dialogue");

  // Dialogue states
  const [hideTranslation, setHideTranslation] = useState(false);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);

  // Flashcard states
  const [cardView, setCardView] = useState<"card" | "list">("card");
  const [onlyUnmasteredCards, setOnlyUnmasteredCards] = useState(false);
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Touch swipe states for mobile flashcards
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Quiz states
  const [quizType, setQuizType] = useState<QuizType>("jp_to_kr");
  const [onlyUnmasteredQuiz, setOnlyUnmasteredQuiz] = useState(false);
  const [quizPhase, setQuizPhase] = useState<"ready" | "playing" | "result">(
    "ready"
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<QuizWrongWord[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [profilesRes, lessonsRes, vocabRes, progressRes] =
        await Promise.all([
          supabase
            .from("japanese_profiles")
            .select("id, display_name, emoji, theme_color")
            .order("created_at", { ascending: true }),
          supabase
            .from("japanese_lessons")
            .select("*")
            .order("lesson_number", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true }),
          supabase
            .from("japanese_vocab")
            .select("*")
            .order("lesson_number", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true }),
          supabase
            .from("japanese_vocab_progress")
            .select("profile_id, vocab_id, status"),
        ]);

      const fetchedProfiles = (profilesRes.data || []) as StudyProfile[];
      const fetchedLessons = (lessonsRes.data || []) as JapaneseLesson[];
      const fetchedVocab = (vocabRes.data || []) as JapaneseVocab[];
      const fetchedProgress = (progressRes.data || []) as VocabProgressRow[];

      const nextMap: Record<string, Record<string, VocabStatus>> = {};
      for (const row of fetchedProgress) {
        if (!nextMap[row.profile_id]) nextMap[row.profile_id] = {};
        nextMap[row.profile_id][row.vocab_id] = row.status;
      }

      setProfiles(fetchedProfiles);
      setLessons(fetchedLessons);
      setVocabList(fetchedVocab);
      setProgressMap(nextMap);

      setSelectedLessonId((prev) => {
        if (prev && fetchedLessons.some((l) => l.id === prev)) return prev;
        return fetchedLessons[0]?.id ?? null;
      });

      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        if (saved && fetchedProfiles.some((p) => p.id === saved)) {
          setActiveProfileId(saved);
        } else {
          setShowProfileGate(true);
        }
      }
    } catch (err) {
      console.error("Failed to load Japanese study data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAll();
    return () => stopJapaneseSpeech();
  }, [fetchAll]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || null,
    [profiles, activeProfileId]
  );

  // Merge active profile's progress onto vocabList
  const vocabWithStatus = useMemo(() => {
    const profileProgress = activeProfileId
      ? progressMap[activeProfileId] || {}
      : {};
    return vocabList.map((v) => ({
      ...v,
      status: profileProgress[v.id] || ("learning" as VocabStatus),
    }));
  }, [vocabList, progressMap, activeProfileId]);

  const masteredByProfile = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      const map = progressMap[p.id] || {};
      counts[p.id] = vocabList.filter((v) => map[v.id] === "mastered").length;
    }
    return counts;
  }, [profiles, progressMap, vocabList]);

  const handleSelectProfile = (profileId: string) => {
    stopJapaneseSpeech();
    setPlayingLineIdx(null);
    setActiveProfileId(profileId);
    setShowProfileGate(false);
    setCardIndex(0);
    setFlipped(false);
    setShuffledIds(null);
    setQuizPhase("ready");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, profileId);
    }
  };

  const handleRenameProfile = async (profileId: string, nextName: string) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId ? { ...p, display_name: nextName } : p
      )
    );
    const { error } = await supabase
      .from("japanese_profiles")
      .update({
        display_name: nextName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);
    if (error) {
      console.error("Failed to rename profile:", error);
    }
  };

  const currentLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) || lessons[0] || null,
    [lessons, selectedLessonId]
  );

  // Vocab belonging to the selected lesson
  const lessonVocab = useMemo(() => {
    if (!currentLesson) return [];
    return vocabWithStatus.filter(
      (v) =>
        v.lesson_id === currentLesson.id ||
        (currentLesson.lesson_number !== null &&
          v.lesson_number === currentLesson.lesson_number)
    );
  }, [vocabWithStatus, currentLesson]);

  const masteredCount = useMemo(
    () => lessonVocab.filter((v) => v.status === "mastered").length,
    [lessonVocab]
  );

  // Filtered + optionally shuffled cards
  const studyCards = useMemo(() => {
    const base = onlyUnmasteredCards
      ? lessonVocab.filter((v) => v.status !== "mastered")
      : lessonVocab;

    if (!shuffledIds) return base;
    const map = new Map(base.map((v) => [v.id, v]));
    const ordered = shuffledIds
      .map((id) => map.get(id))
      .filter((v): v is JapaneseVocab => Boolean(v));
    const missing = base.filter((v) => !shuffledIds.includes(v.id));
    return [...ordered, ...missing];
  }, [lessonVocab, onlyUnmasteredCards, shuffledIds]);

  const safeCardIdx =
    studyCards.length === 0 ? 0 : Math.min(cardIndex, studyCards.length - 1);
  const currentCard = studyCards[safeCardIdx];

  // Keyboard shortcuts for flashcards
  useEffect(() => {
    if (
      showProfileGate ||
      activeTab !== "cards" ||
      cardView !== "card" ||
      studyCards.length === 0
    )
      return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        setCardIndex((i) => (i + 1) % studyCards.length);
        setFlipped(false);
      } else if (e.key === "ArrowLeft") {
        setCardIndex((i) => (i <= 0 ? studyCards.length - 1 : i - 1));
        setFlipped(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showProfileGate, activeTab, cardView, studyCards.length]);

  const handleSelectLesson = (lessonId: string) => {
    stopJapaneseSpeech();
    setPlayingLineIdx(null);
    setSelectedLessonId(lessonId);
    setCardIndex(0);
    setFlipped(false);
    setShuffledIds(null);
    setQuizPhase("ready");
  };

  // Dialogue sequential playback
  const handlePlayAllDialogues = () => {
    const dialogues = currentLesson?.dialogues || [];
    if (dialogues.length === 0) return;

    if (playingLineIdx !== null) {
      stopJapaneseSpeech();
      setPlayingLineIdx(null);
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.toLowerCase().startsWith("ja"));

    const speakNext = (idx: number) => {
      if (idx >= dialogues.length) {
        setPlayingLineIdx(null);
        return;
      }
      setPlayingLineIdx(idx);
      const u = new SpeechSynthesisUtterance(
        dialogues[idx].reading || dialogues[idx].jp
      );
      u.lang = "ja-JP";
      u.rate = 0.88;
      if (jaVoice) u.voice = jaVoice;
      u.onend = () => speakNext(idx + 1);
      u.onerror = () => setPlayingLineIdx(null);
      window.speechSynthesis.speak(u);
    };

    speakNext(0);
  };

  // Update vocab status optimistically + Supabase per profile
  const markVocabStatus = async (
    vocab: JapaneseVocab,
    nextStatus: VocabStatus,
    advanceCard = false
  ) => {
    if (!activeProfileId) return;

    setProgressMap((prev) => ({
      ...prev,
      [activeProfileId]: {
        ...(prev[activeProfileId] || {}),
        [vocab.id]: nextStatus,
      },
    }));

    if (advanceCard && studyCards.length > 1) {
      setFlipped(false);
      setCardIndex((prev) => (prev + 1) % studyCards.length);
    }

    try {
      await supabase.from("japanese_vocab_progress").upsert(
        {
          profile_id: activeProfileId,
          vocab_id: vocab.id,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,vocab_id" }
      );
    } catch (err) {
      console.error("Failed to update vocab progress:", err);
    }
  };

  // Touch swipe handlers for flashcard
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setSwipeOffset(Math.max(-110, Math.min(110, dx)));
    }
  };

  const handleTouchEnd = () => {
    if (!currentCard) {
      touchStartRef.current = null;
      setSwipeOffset(0);
      return;
    }
    if (swipeOffset > 65) {
      markVocabStatus(currentCard, "mastered", true);
    } else if (swipeOffset < -65) {
      markVocabStatus(currentCard, "review", true);
    }
    touchStartRef.current = null;
    setSwipeOffset(0);
  };

  // Quiz pool & start
  const quizPool = useMemo(() => {
    return onlyUnmasteredQuiz
      ? lessonVocab.filter((v) => v.status !== "mastered")
      : lessonVocab;
  }, [lessonVocab, onlyUnmasteredQuiz]);

  const startQuiz = () => {
    if (quizPool.length < 4) return;
    const picked = shuffle(quizPool).slice(0, Math.min(10, quizPool.length));

    const generated: QuizQuestion[] = picked.map((target) => {
      const getVal = (v: JapaneseVocab) =>
        quizType === "jp_to_kr" ? v.meaning : v.word;
      const correctAnswer = getVal(target);
      const wrongOpts = shuffle(
        lessonVocab
          .filter((v) => v.id !== target.id && getVal(v) !== correctAnswer)
          .map(getVal)
      )
        .filter((val, i, arr) => arr.indexOf(val) === i)
        .slice(0, 3);

      return {
        target,
        prompt: quizType === "jp_to_kr" ? target.word : target.meaning,
        correctAnswer,
        options: shuffle([correctAnswer, ...wrongOpts]),
      };
    });

    setQuestions(generated);
    setQuizIdx(0);
    setSelectedOpt(null);
    setCorrectCount(0);
    setWrongWords([]);
    setQuizPhase("playing");
  };

  const handleQuizAnswer = (opt: string) => {
    if (selectedOpt !== null) return;
    const q = questions[quizIdx];
    setSelectedOpt(opt);
    if (opt === q.correctAnswer) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrongWords((prev) => [
        ...prev,
        {
          word: q.target.word,
          reading: q.target.reading,
          meaning: q.target.meaning,
        },
      ]);
      markVocabStatus(q.target, "review", false);
    }
  };

  const handleQuizNext = async () => {
    if (quizIdx + 1 < questions.length) {
      setQuizIdx((i) => i + 1);
      setSelectedOpt(null);
      return;
    }

    setQuizPhase("result");
    try {
      await supabase.from("japanese_quiz_logs").insert({
        profile_id: activeProfileId || "me",
        quiz_type: quizType,
        level_filter: currentLesson?.lesson_number
          ? `${currentLesson.lesson_number}과`
          : "ALL",
        total_questions: questions.length,
        correct_count: correctCount,
        wrong_words: wrongWords,
      });
    } catch (err) {
      console.error("Failed to save quiz log:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-ink-500">
        <Loader2 size={18} className="animate-spin text-sage-500" />
        불러오는 중...
      </div>
    );
  }

  if (showProfileGate || !activeProfile) {
    return (
      <ProfileGate
        profiles={profiles}
        masteredByProfile={masteredByProfile}
        totalVocab={vocabList.length}
        activeProfileId={activeProfileId}
        onSelect={handleSelectProfile}
        onRename={handleRenameProfile}
        onClose={activeProfile ? () => setShowProfileGate(false) : undefined}
      />
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-2">
        <p className="text-base font-semibold text-ink-900">
          아직 등록된 과가 없습니다.
        </p>
        <p className="text-sm text-ink-500">
          교재 과와 단어가 등록되면 자동으로 여기에 표시돼요.
        </p>
      </div>
    );
  }

  const dialogues = currentLesson.dialogues || [];
  const grammarItems = currentLesson.grammar_items || [];
  const lessonLabel = currentLesson.lesson_number
    ? `${currentLesson.lesson_number}과`
    : "레슨";
  const cleanTitle = currentLesson.title.replace(/^\d+과\s*[—-]\s*/, "");
  const isRoseProfile = activeProfile.theme_color === "rose";

  const tabs: {
    id: StudyTab;
    label: string;
    badge: string;
    icon: typeof MessageSquare;
  }[] = [
    {
      id: "dialogue",
      label: "본문 회화",
      badge: `${dialogues.length}`,
      icon: MessageSquare,
    },
    {
      id: "grammar",
      label: "핵심 문법",
      badge: `${grammarItems.length}`,
      icon: BookOpen,
    },
    {
      id: "cards",
      label: "단어카드",
      badge: `${masteredCount}/${lessonVocab.length}`,
      icon: Layers,
    },
    {
      id: "quiz",
      label: "퀴즈",
      badge: "10문제",
      icon: Brain,
    },
  ];

  return (
    <div className="min-h-screen pb-16">
      {/* Top Sticky Header with Profile Switcher */}
      <header className="sticky top-0 z-20 bg-cream-100/90 backdrop-blur-md border-b border-cream-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-sage-500 text-cream-50 flex items-center justify-center text-sm font-bold shrink-0">
              あ
            </span>
            <span
              className="text-base font-bold text-ink-900 truncate"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              일본어 스터디
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              stopJapaneseSpeech();
              setPlayingLineIdx(null);
              setShowProfileGate(true);
            }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors shrink-0 ${
              isRoseProfile
                ? "bg-rose-100 text-rose-500 border-rose-300 hover:bg-rose-300/40"
                : "bg-sage-100 text-sage-700 border-sage-300 hover:bg-sage-300/40"
            }`}
            title="프로필 전환"
          >
            <span>{activeProfile.emoji}</span>
            <span className="max-w-[110px] truncate">
              {activeProfile.display_name}
            </span>
            <ArrowLeftRight size={13} className="opacity-70" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* 1. 과 선택 영역 */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-sage-700 tracking-wide">
            {currentLesson.book_title || "다락원 일본어 독학 첫걸음"}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {lessons.map((lesson) => {
              const isSelected = lesson.id === currentLesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-sage-500 text-cream-50 shadow-sm"
                      : "bg-cream-50 border border-cream-200 text-ink-700 hover:border-sage-300"
                  }`}
                >
                  {lesson.lesson_number
                    ? `${lesson.lesson_number}과`
                    : lesson.title}
                </button>
              );
            })}
          </div>

          <h1
            className="text-xl sm:text-2xl font-bold text-ink-900 leading-snug"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <span className="text-sage-700 mr-2">{lessonLabel}</span>
            {cleanTitle}
          </h1>
        </div>

        {/* 2. 심플한 4개 학습 탭 */}
        <div className="grid grid-cols-4 gap-2 bg-cream-200/60 p-1.5 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  stopJapaneseSpeech();
                  setPlayingLineIdx(null);
                  setActiveTab(tab.id);
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-cream-50 text-ink-900 shadow-xs"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <Icon size={16} className={isActive ? "text-sage-700" : ""} />
                <span>{tab.label}</span>
                <span
                  className={`hidden sm:inline text-[11px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-sage-100 text-sage-700"
                      : "bg-cream-200 text-ink-500"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3-A. 본문 회화 */}
        {activeTab === "dialogue" && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePlayAllDialogues}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  playingLineIdx !== null
                    ? "bg-rose-500 text-cream-50"
                    : "bg-sage-500 text-cream-50 hover:bg-sage-700"
                }`}
              >
                {playingLineIdx !== null ? (
                  <>
                    <Square size={14} /> 멈추기
                  </>
                ) : (
                  <>
                    <Play size={14} /> 전체 듣기
                  </>
                )}
              </button>

              <button
                onClick={() => setHideTranslation(!hideTranslation)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cream-50 border border-cream-200 text-xs sm:text-sm font-medium text-ink-700 hover:bg-cream-200 transition-colors"
              >
                {hideTranslation ? (
                  <>
                    <Eye size={15} /> 해석 보기
                  </>
                ) : (
                  <>
                    <EyeOff size={15} /> 해석 가리기
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5">
              {dialogues.map((line, idx) => {
                const isFirst = line.speaker === dialogues[0]?.speaker;
                const isPlaying = playingLineIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => speakJapanese(line.reading || line.jp)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex items-start justify-between gap-3 ${
                      isPlaying
                        ? "bg-sage-100 border-sage-500 ring-2 ring-sage-100"
                        : "bg-cream-50 border-cream-200 hover:border-sage-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 mt-0.5 ${
                          isFirst
                            ? "bg-sage-500 text-cream-50"
                            : "bg-honey-500 text-cream-50"
                        }`}
                      >
                        {line.speaker}
                      </span>
                      <div className="space-y-1">
                        <div className="text-base sm:text-lg font-semibold text-ink-900 leading-relaxed">
                          {line.jp}
                        </div>
                        {!hideTranslation && (
                          <div className="text-sm text-ink-500">{line.ko}</div>
                        )}
                      </div>
                    </div>

                    <Volume2
                      size={18}
                      className="text-sage-700 shrink-0 mt-1 opacity-70"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3-B. 핵심 문법 */}
        {activeTab === "grammar" && (
          <div className="space-y-4 fade-in">
            {grammarItems.map((g, idx) => (
              <div
                key={`${g.pattern}-${idx}`}
                className="bg-cream-50 border border-cream-200 rounded-2xl p-5 space-y-3.5"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-sage-500 text-cream-50 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-ink-900">
                      {g.pattern}
                    </h3>
                    <p className="text-sm text-ink-700 leading-relaxed">
                      {g.summary}
                    </p>
                  </div>
                </div>

                {g.examples?.length > 0 && (
                  <div className="space-y-2 sm:pl-10">
                    {g.examples.map((ex, exIdx) => (
                      <div
                        key={exIdx}
                        onClick={() => speakJapanese(ex.reading || ex.jp)}
                        className="cursor-pointer bg-cream-100 hover:bg-sage-100/50 border border-cream-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm sm:text-base font-semibold text-ink-900">
                            {ex.jp}
                          </div>
                          <div className="text-xs sm:text-sm text-ink-500">
                            {ex.ko}
                          </div>
                        </div>
                        <Volume2
                          size={16}
                          className="text-sage-700 shrink-0 opacity-75"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 3-C. 단어카드 */}
        {activeTab === "cards" && (
          <div className="space-y-5 fade-in">
            {/* Top bar: progress + simple switches */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <span className="text-xs font-semibold text-sage-700 whitespace-nowrap">
                  외운 단어 {masteredCount} / {lessonVocab.length}
                </span>
                <div className="flex-1 max-w-[200px] h-2 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className="h-full bg-sage-500 transition-all duration-300"
                    style={{
                      width: `${
                        lessonVocab.length > 0
                          ? (masteredCount / lessonVocab.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setOnlyUnmasteredCards(!onlyUnmasteredCards);
                    setCardIndex(0);
                    setFlipped(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    onlyUnmasteredCards
                      ? "bg-sage-500 text-cream-50 border-sage-500"
                      : "bg-cream-50 text-ink-700 border-cream-200 hover:border-sage-300"
                  }`}
                >
                  못 외운 단어만
                </button>

                {cardView === "card" && (
                  <button
                    onClick={() => {
                      setShuffledIds(shuffle(lessonVocab.map((v) => v.id)));
                      setCardIndex(0);
                      setFlipped(false);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-50 border border-cream-200 text-xs font-medium text-ink-700 hover:bg-cream-200"
                  >
                    <Shuffle size={13} /> 섞기
                  </button>
                )}

                <button
                  onClick={() =>
                    setCardView(cardView === "card" ? "list" : "card")
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-50 border border-cream-200 text-xs font-medium text-ink-700 hover:bg-cream-200"
                >
                  {cardView === "card" ? (
                    <>
                      <List size={13} /> 전체 목록
                    </>
                  ) : (
                    <>
                      <Layers size={13} /> 카드로 보기
                    </>
                  )}
                </button>
              </div>
            </div>

            {studyCards.length === 0 ? (
              <div className="bg-cream-50 border border-cream-200 rounded-3xl p-12 text-center space-y-3">
                <Trophy size={32} className="mx-auto text-sage-500" />
                <p className="text-base font-bold text-ink-900">
                  모든 단어를 다 외웠어요!
                </p>
                <button
                  onClick={() => setOnlyUnmasteredCards(false)}
                  className="px-4 py-2 rounded-xl bg-sage-100 text-sage-700 text-xs font-semibold"
                >
                  전체 단어 다시 보기
                </button>
              </div>
            ) : cardView === "card" && currentCard ? (
              <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between text-xs text-ink-500 px-1">
                  <span className="font-semibold text-ink-700">
                    {safeCardIdx + 1} / {studyCards.length}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <RotateCw size={12} /> 눌러서 뜻 확인 · 좌우 스와이프
                  </span>
                </div>

                {/* Big Flashcard */}
                <div
                  onClick={() => setFlipped(!flipped)}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    transform:
                      swipeOffset !== 0
                        ? `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.04}deg)`
                        : undefined,
                  }}
                  className={`cursor-pointer bg-cream-50 border-2 rounded-3xl p-8 sm:p-12 min-h-[300px] flex flex-col items-center justify-center text-center shadow-sm transition-all select-none ${
                    swipeOffset > 45
                      ? "border-sage-500 bg-sage-100/40"
                      : swipeOffset < -45
                      ? "border-rose-500 bg-rose-100/40"
                      : "border-cream-200 hover:border-sage-300"
                  }`}
                >
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-cream-200 text-ink-700 mb-6">
                    {currentCard.category}
                  </span>

                  {!flipped ? (
                    <>
                      <div className="text-4xl sm:text-5xl font-bold text-ink-900 tracking-wide mb-6">
                        {currentCard.word}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(currentCard.reading || currentCard.word);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sage-100 text-sage-700 text-sm font-medium hover:bg-sage-300/60"
                      >
                        <Volume2 size={16} />
                        발음 듣기
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4 fade-in">
                      <div className="text-xl text-ink-500 font-medium">
                        {currentCard.word}
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-ink-900 leading-snug">
                        {currentCard.meaning}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(currentCard.reading || currentCard.word);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-medium hover:bg-sage-300/60"
                      >
                        <Volume2 size={14} />
                        다시 듣기
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Action Controls */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setCardIndex((i) =>
                        i <= 0 ? studyCards.length - 1 : i - 1
                      );
                      setFlipped(false);
                    }}
                    className="p-3 rounded-2xl bg-cream-50 border border-cream-200 text-ink-700 hover:bg-cream-200"
                    title="이전 카드"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-2.5 flex-1 justify-center">
                    <button
                      onClick={() => markVocabStatus(currentCard, "review", true)}
                      className={`flex-1 max-w-[150px] py-3 rounded-2xl text-sm font-semibold border transition-colors ${
                        currentCard.status === "review"
                          ? "bg-rose-500 text-cream-50 border-rose-500"
                          : "bg-rose-100 text-rose-500 border-rose-300 hover:bg-rose-300/40"
                      }`}
                    >
                      다시 볼래요
                    </button>
                    <button
                      onClick={() =>
                        markVocabStatus(currentCard, "mastered", true)
                      }
                      className={`flex-1 max-w-[150px] py-3 rounded-2xl text-sm font-semibold border transition-colors inline-flex items-center justify-center gap-1.5 ${
                        currentCard.status === "mastered"
                          ? "bg-sage-500 text-cream-50 border-sage-500"
                          : "bg-sage-100 text-sage-700 border-sage-300 hover:bg-sage-300/40"
                      }`}
                    >
                      <Check size={16} />
                      외웠어요
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setCardIndex((i) => (i + 1) % studyCards.length);
                      setFlipped(false);
                    }}
                    className="p-3 rounded-2xl bg-cream-50 border border-cream-200 text-ink-700 hover:bg-cream-200"
                    title="다음 카드"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ) : (
              /* Clean Simple Word List */
              <div className="bg-cream-50 border border-cream-200 rounded-2xl divide-y divide-cream-200 overflow-hidden">
                {studyCards.map((v) => {
                  const isMastered = v.status === "mastered";
                  return (
                    <div
                      key={v.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-cream-100/70 transition-colors"
                    >
                      <button
                        onClick={() => speakJapanese(v.reading || v.word)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <Volume2
                          size={16}
                          className="text-sage-700 shrink-0 opacity-75"
                        />
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-bold text-ink-900">
                              {v.word}
                            </span>
                            <span className="text-[11px] text-ink-500">
                              {v.category}
                            </span>
                          </div>
                          <div className="text-sm text-ink-700">
                            {v.meaning}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() =>
                          markVocabStatus(
                            v,
                            isMastered ? "learning" : "mastered",
                            false
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                          isMastered
                            ? "bg-sage-500 text-cream-50"
                            : "bg-cream-200 text-ink-500 hover:bg-sage-100 hover:text-sage-700"
                        }`}
                      >
                        {isMastered ? "외움 ✓" : "미암기"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3-D. 퀴즈 */}
        {activeTab === "quiz" && (
          <div className="max-w-xl mx-auto fade-in">
            {quizPhase === "ready" && (
              <div className="bg-cream-50 border border-cream-200 rounded-3xl p-7 text-center space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">
                    {lessonLabel} 단어 퀴즈
                  </h2>
                  <p className="text-sm text-ink-500 mt-1">
                    {lessonLabel} 단어 {quizPool.length}개 중에서 10문제를
                    랜덤으로 풀어보세요.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuizType("jp_to_kr")}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      quizType === "jp_to_kr"
                        ? "bg-sage-500 text-cream-50 border-sage-500"
                        : "bg-cream-100 text-ink-700 border-cream-200"
                    }`}
                  >
                    일본어 → 뜻
                  </button>
                  <button
                    onClick={() => setQuizType("kr_to_jp")}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      quizType === "kr_to_jp"
                        ? "bg-sage-500 text-cream-50 border-sage-500"
                        : "bg-cream-100 text-ink-700 border-cream-200"
                    }`}
                  >
                    뜻 → 일본어
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyUnmasteredQuiz}
                    onChange={(e) => setOnlyUnmasteredQuiz(e.target.checked)}
                    className="accent-sage-500"
                  />
                  못 외운 단어만 풀기 ({quizPool.length}개)
                </label>

                <div>
                  <button
                    disabled={quizPool.length < 4}
                    onClick={startQuiz}
                    className="w-full py-3.5 rounded-2xl bg-sage-500 text-cream-50 text-base font-semibold hover:bg-sage-700 disabled:opacity-40 shadow-sm transition-colors"
                  >
                    퀴즈 시작하기
                  </button>
                </div>
              </div>
            )}

            {quizPhase === "playing" && questions[quizIdx] && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-ink-500">
                    <span className="font-semibold text-ink-700">
                      {quizIdx + 1} / {questions.length}
                    </span>
                    <span>정답 {correctCount}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                    <div
                      className="h-full bg-sage-500 transition-all duration-300"
                      style={{
                        width: `${((quizIdx + 1) / questions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-cream-50 border border-cream-200 rounded-3xl p-8 text-center space-y-4">
                  <div className="text-3xl sm:text-4xl font-bold text-ink-900">
                    {questions[quizIdx].prompt}
                  </div>
                  {quizType === "jp_to_kr" && (
                    <button
                      type="button"
                      onClick={() =>
                        speakJapanese(
                          questions[quizIdx].target.reading ||
                            questions[quizIdx].target.word
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-medium"
                    >
                      <Volume2 size={14} /> 발음 듣기
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {questions[quizIdx].options.map((opt) => {
                    const isPicked = selectedOpt === opt;
                    const isCorrect = opt === questions[quizIdx].correctAnswer;
                    let cls =
                      "bg-cream-50 border-cream-200 text-ink-900 hover:border-sage-500";
                    if (selectedOpt !== null) {
                      if (isCorrect) {
                        cls =
                          "bg-sage-100 border-sage-500 text-sage-700 font-semibold";
                      } else if (isPicked) {
                        cls = "bg-rose-100 border-rose-500 text-rose-500";
                      } else {
                        cls =
                          "bg-cream-50 border-cream-200 text-ink-500 opacity-50";
                      }
                    }
                    return (
                      <button
                        key={opt}
                        disabled={selectedOpt !== null}
                        onClick={() => handleQuizAnswer(opt)}
                        className={`w-full text-left px-5 py-4 rounded-2xl border text-sm sm:text-base transition-all flex items-center justify-between ${cls}`}
                      >
                        <span>{opt}</span>
                        {selectedOpt !== null && isCorrect && (
                          <CheckCircle2
                            size={18}
                            className="text-sage-700 shrink-0"
                          />
                        )}
                        {selectedOpt !== null && isPicked && !isCorrect && (
                          <XCircle
                            size={18}
                            className="text-rose-500 shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedOpt !== null && (
                  <button
                    onClick={handleQuizNext}
                    className="w-full py-3.5 rounded-2xl bg-sage-500 text-cream-50 text-sm font-semibold hover:bg-sage-700 inline-flex items-center justify-center gap-2"
                  >
                    {quizIdx + 1 < questions.length ? "다음 문제" : "결과 보기"}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}

            {quizPhase === "result" && (
              <div className="bg-cream-50 border border-cream-200 rounded-3xl p-8 text-center space-y-5">
                <Trophy size={36} className="mx-auto text-sage-500" />
                <div>
                  <h3 className="text-xl font-bold text-ink-900">퀴즈 완료!</h3>
                  <p className="text-sm text-ink-500 mt-1">
                    {questions.length}문제 중{" "}
                    <span className="font-bold text-sage-700">
                      {correctCount}문제
                    </span>{" "}
                    정답
                  </p>
                </div>

                {wrongWords.length > 0 && (
                  <div className="text-left bg-rose-100/50 border border-rose-300/60 rounded-2xl p-4 space-y-2">
                    <div className="text-xs font-semibold text-rose-500">
                      틀린 단어 ({wrongWords.length}개)
                    </div>
                    <div className="divide-y divide-rose-300/30">
                      {wrongWords.map((w, i) => (
                        <div
                          key={`${w.word}-${i}`}
                          className="py-2 flex items-center justify-between text-sm gap-2"
                        >
                          <span className="font-semibold text-ink-900">
                            {w.word}
                          </span>
                          <span className="text-ink-700 text-right">
                            {w.meaning}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setQuizPhase("ready")}
                    className="flex-1 py-3 rounded-2xl bg-cream-200 text-ink-700 text-sm font-semibold"
                  >
                    돌아가기
                  </button>
                  <button
                    onClick={startQuiz}
                    className="flex-1 py-3 rounded-2xl bg-sage-500 text-cream-50 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={15} /> 다시 풀기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
