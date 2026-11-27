"use client";

import { useState } from "react";
import { GrammarItem } from "@/types/japanese";
import FuriganaText from "./FuriganaText";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowDownRight,
  AlertCircle,
} from "lucide-react";

interface CheatCardItem {
  badge?: string;
  formula: string;
  formulaReading?: string;
  meaning: string;
  example?: string;
  exampleReading?: string;
  tip?: string;
  jumpToIndex?: number;
}

interface CheatSection {
  title: string;
  tone?: "sage" | "honey" | "rose" | "lavender";
  columns?: 1 | 2 | 3;
  items: CheatCardItem[];
  footnote?: {
    label: string;
    tokens: { word: string; reading?: string; meaning?: string }[];
    jumpToIndex?: number;
  };
}

interface LessonCheatSheet {
  headline: string;
  sections: CheatSection[];
}

const LESSON_CHEAT_SHEETS: Record<number, LessonCheatSheet> = {
  5: {
    headline: "な형용사 4단 변형 · 기간 · 달력 핵심 공식",
    sections: [
      {
        title: "な형용사 4단 변형 (예: しずかだ → 어간 しずか)",
        tone: "sage",
        columns: 2,
        items: [
          {
            badge: "명사 수식",
            formula: "어간 + な + 명사",
            meaning: "~한 명사",
            example: "しずかな へや (조용한 방)",
            tip: "예외: おなじ(같은)는 な 없이 おなじ なまえ",
            jumpToIndex: 0,
          },
          {
            badge: "긍정 정중",
            formula: "어간 + です",
            meaning: "~합니다",
            example: "ひまです / おんがくが すきです",
            tip: "すき·きらい·じょうず 앞 대상은 조사 ～が!",
            jumpToIndex: 1,
          },
          {
            badge: "연결 (~고/~해서)",
            formula: "어간 + で",
            meaning: "~하고, ~해서",
            example: "きれいで しずかです",
            tip: "명사 연결도 똑같이 「명사 + で」",
            jumpToIndex: 4,
          },
          {
            badge: "부정 정중",
            formula: "어간 + じゃ ありません",
            meaning: "~하지 않습니다 (= じゃ ないです)",
            example: "あまり まじめじゃ ありません",
            tip: "あまり + 부정 = 그다지 ~않다",
            jumpToIndex: 5,
          },
        ],
      },
      {
        title: "기간 · 역접 · 달력 암기 포인트",
        tone: "honey",
        columns: 2,
        items: [
          {
            badge: "기간 · 역접",
            formula: "A から B まで  /  ～が",
            meaning: "A부터 B까지  /  ~하지만",
            example: "ついたちから ここのかまで",
            jumpToIndex: 2,
          },
          {
            badge: "달력 예외 읽기",
            formula: "4월 しがつ · 7월 しちがつ · 9월 くがつ",
            meaning: "1~10일(ついたち~とおか) · 14일(じゅうよっか) · 20일(はつか) · 24일(にじゅうよっか)",
            jumpToIndex: 3,
          },
        ],
      },
    ],
  },
  6: {
    headline: "장소 지시어 · 사물 존재 · 조수사 · 주문 핵심",
    sections: [
      {
        title: "장소 지시어 (코·소·아·도) & 사물 존재",
        tone: "sage",
        columns: 2,
        items: [
          {
            badge: "장소 지시어",
            formula: "ここ · そこ · あそこ · どこ",
            meaning: "여기(나) · 거기(상대) · 저기(둘 다 먼 곳) · 어디",
            jumpToIndex: 0,
          },
          {
            badge: "사물 존재",
            formula: "[장소]に [사물]が あります / ありません",
            meaning: "~에 ~이 있습니다 / 없습니다 (식물·사물·시간)",
            tip: "사람·동물에는 쓰지 않아요 (→ 7과 います)",
            jumpToIndex: 1,
          },
          {
            badge: "주문·요청",
            formula: "～を [수량] ください",
            meaning: "~을/를 [수량] 주세요",
            example: "ベージュを 2まい ください",
            jumpToIndex: 5,
          },
          {
            badge: "가격 & 인사",
            formula: "[수량]で [금액]えんです",
            meaning: "~에 ~엔입니다",
            tip: "すみません = ① 죄송 ② 저기요 ③ 감사",
            jumpToIndex: 10,
          },
        ],
      },
      {
        title: "조수사 4종 + 금액 소리 변화 주의",
        tone: "honey",
        columns: 2,
        items: [
          {
            badge: "～つ (1~10개)",
            formula: "ひとつ ~ とお (몇 개: いくつ)",
            meaning: "고유어 개수 세기",
            jumpToIndex: 6,
          },
          {
            badge: "～こ (개)",
            formula: "いっこ · ろっこ · はっこ · じゅっこ",
            meaning: "1·6·8·10에 촉음(っ) 주의 (몇 개: なんこ)",
            jumpToIndex: 7,
          },
          {
            badge: "～ほん (병·자루)",
            formula: "1·6·8·10 ぽん / 3 ぼん",
            meaning: "いっぽん · さんぼん · ろっぽん · はっぽん · じゅっぽん",
            jumpToIndex: 8,
          },
          {
            badge: "～まい (장) · ～えん (엔)",
            formula: "いちまい~じゅうまい / 300 さんびゃく · 600 ろっぴゃく · 800 はっぴゃく",
            meaning: "3,000 さんぜん · 8,000 はっせん · 4엔 よえん",
            jumpToIndex: 9,
          },
        ],
      },
    ],
  },
  7: {
    headline: "사람·동물 존재 · 가족 호칭 · 열거 · 위치 · 이유",
    sections: [
      {
        title: "존재 · 사람 수 · 열거 비교",
        tone: "sage",
        columns: 2,
        items: [
          {
            badge: "사람·동물 존재",
            formula: "～が います / いません",
            meaning: "(사람·동물이) 있습니다 / 없습니다",
            tip: "사물·식물은 あります (6과)와 구별!",
            jumpToIndex: 0,
          },
          {
            badge: "사람 세기 (～にん)",
            formula: "1명 ひとり · 2명 ふたり",
            meaning: "3명부터 숫자+にん (4명 よにん · 9명 くにん 주의)",
            jumpToIndex: 4,
          },
          {
            badge: "열거 비교",
            formula: "A と B  vs  A や B など",
            meaning: "と = 전부 나열(~와/과) / や…など = 대표 예시(~랑 ~등)",
            jumpToIndex: 5,
          },
          {
            badge: "강조 · 이유",
            formula: "수량 + も  /  ～から",
            meaning: "も = 긍정(~이나)·부정(~도) / から = ~기 때문에",
            example: "みっつも あります / ひとりも いません",
            jumpToIndex: 7,
          },
        ],
      },
      {
        title: "위치 명사 & 가족 호칭 구분",
        tone: "honey",
        columns: 2,
        items: [
          {
            badge: "위치 공식",
            formula: "명사 + の + [위치] + に",
            meaning: "まえ(앞)·うしろ(뒤)·うえ(위)·した(아래)·よこ(옆)·なか(안)·そと(밖)",
            jumpToIndex: 6,
          },
          {
            badge: "가족 호칭",
            formula: "내 가족 (겸양)  vs  남의 가족·부를 때",
            meaning: "はは·ちち·あね·あに  vs  おかあさん·おとうさん·おねえさん·おにいさん",
            jumpToIndex: 2,
          },
        ],
      },
    ],
  },
  8: {
    headline: "동사 1·2·3그룹 구분 · 필수 조사 · 명사수식 · もの/こと",
    sections: [
      {
        title: "1. 동사 3그룹 구분 공식 (모든 동사는 う단 어미!)",
        tone: "sage",
        columns: 3,
        items: [
          {
            badge: "1그룹",
            formula: "る 이외 어미 전부 / [a·u·o]る",
            meaning: "う·く·ぐ·す·つ·ぬ·む·ぶ 또는 a/u/o + る",
            example: "言う · 行く · 作る · 守る",
            jumpToIndex: 1,
          },
          {
            badge: "2그룹",
            formula: "[i / e] + る",
            meaning: "る 바로 앞 소리가 i단 또는 e단",
            example: "見る · 起きる · 食べる · 寝る",
            jumpToIndex: 2,
          },
          {
            badge: "3그룹 (딱 2개!)",
            formula: "来る · する",
            formulaReading: "くる · する",
            meaning: "오다 · 하다 (+ 한자어 + する)",
            example: "勉強する (공부하다)",
            jumpToIndex: 3,
          },
        ],
        footnote: {
          label: "예외 1그룹 8개 암기 (겉은 [i/e]る지만 1그룹!)",
          jumpToIndex: 1,
          tokens: [
            { word: "帰る", reading: "かえる", meaning: "돌아가다" },
            { word: "切る", reading: "きる", meaning: "자르다" },
            { word: "走る", reading: "はしる", meaning: "달리다" },
            { word: "入る", reading: "はいる", meaning: "들어가다" },
            { word: "要る", reading: "いる", meaning: "필요하다" },
            { word: "握る", reading: "にぎる", meaning: "쥐다" },
            { word: "知る", reading: "しる", meaning: "알다" },
            { word: "減る", reading: "へる", meaning: "줄다" },
          ],
        },
      },
      {
        title: "2. 꼭 외울 조사 & 동사 활용 공식",
        tone: "honey",
        columns: 2,
        items: [
          {
            badge: "함께 (~와/과)",
            formula: "사람/동물 + と",
            meaning: "공동 행동 대상",
            example: "友だちと 海外に 行く",
            jumpToIndex: 4,
          },
          {
            badge: "이동 목적지",
            formula: "장소 + に(へ) + 이동동사",
            meaning: "~에/으로 가다·오다·돌아가다",
            tip: "조사 へ는 '에(e)'로 발음!",
            jumpToIndex: 5,
          },
          {
            badge: "주의! を ❌ → に ⭕",
            formula: "대상 + に 会う / 乗る",
            meaning: "~을/를 만나다 · ~을/를 타다",
            example: "先生に 会う · 電車に 乗る",
            jumpToIndex: 6,
          },
          {
            badge: "명사 수식",
            formula: "동사 기본형 + 명사",
            meaning: "~하는 명사 (형태 변화 없음!)",
            example: "食べること · 本を 読む 予定",
            jumpToIndex: 7,
          },
        ],
      },
      {
        title: "3. 형식명사 (もの vs こと) & 필수 의문사",
        tone: "lavender",
        columns: 2,
        items: [
          {
            badge: "もの vs こと",
            formula: "もの (구체 물건)  vs  こと (추상 일·행위)",
            meaning: "둘 다 '~것'이지만 눈에 보이면 もの, 안 보이면 こと",
            example: "かわいい もの / 寝ること",
            jumpToIndex: 8,
          },
          {
            badge: "의문사 8개",
            formula: "何(무엇) · なぜ/どうして(왜) · いつ(언제) · だれ(누구)",
            meaning: "どこ(어디) · どれ(어느 것) · どちら(어느 쪽) · どのくらい(어느 정도)",
            jumpToIndex: 9,
          },
        ],
      },
    ],
  },
};

const TONE_STYLES = {
  sage: {
    header: "text-sage-700",
    badge: "bg-sage-100 text-sage-700",
    border: "border-sage-300/60 hover:border-sage-500",
  },
  honey: {
    header: "text-ink-900",
    badge: "bg-honey-100 text-ink-900",
    border: "border-honey-500/35 hover:border-honey-500",
  },
  rose: {
    header: "text-rose-500",
    badge: "bg-rose-100 text-rose-500",
    border: "border-rose-300/70 hover:border-rose-500",
  },
  lavender: {
    header: "text-ink-900",
    badge: "bg-lavender-100 text-ink-900",
    border: "border-lavender-400/50 hover:border-lavender-400",
  },
};

interface GrammarCheatSheetProps {
  lessonNumber: number | null;
  lessonLabel: string;
  grammarItems: GrammarItem[];
  onJumpToItem: (index: number) => void;
}

export default function GrammarCheatSheet({
  lessonNumber,
  lessonLabel,
  grammarItems,
  onJumpToItem,
}: GrammarCheatSheetProps) {
  const [collapsed, setCollapsed] = useState(false);

  const curated =
    lessonNumber != null ? LESSON_CHEAT_SHEETS[lessonNumber] : undefined;

  if (!curated && grammarItems.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-sage-100/60 via-cream-50 to-honey-100/40 border-2 border-sage-300/70 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-500 text-cream-50 text-xs font-bold">
            <Sparkles size={13} />
            한눈에 보는 {lessonLabel} 핵심 암기 노트
          </div>
          <h2 className="text-base sm:text-lg font-bold text-ink-900">
            {curated
              ? curated.headline
              : `${lessonLabel} 핵심 문법 ${grammarItems.length}가지 요약`}
          </h2>
          <p className="text-xs text-ink-500">
            외워야 할 핵심만 모았어요 · 카드를 누르면 아래 상세 설명으로 바로 이동해요
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-50/90 border border-cream-200 text-xs font-semibold text-ink-700 hover:bg-cream-200 shrink-0"
        >
          {collapsed ? (
            <>
              펼치기 <ChevronDown size={14} />
            </>
          ) : (
            <>
              접기 <ChevronUp size={14} />
            </>
          )}
        </button>
      </div>

      {!collapsed &&
        (curated ? (
          <div className="space-y-4">
            {curated.sections.map((section, sIdx) => {
              const tone = TONE_STYLES[section.tone || "sage"];
              const gridCols =
                section.columns === 3
                  ? "sm:grid-cols-3"
                  : section.columns === 1
                  ? "grid-cols-1"
                  : "sm:grid-cols-2";

              return (
                <div key={sIdx} className="space-y-2">
                  <div
                    className={`text-xs font-bold tracking-tight ${tone.header}`}
                  >
                    {section.title}
                  </div>

                  <div className={`grid grid-cols-1 ${gridCols} gap-2.5`}>
                    {section.items.map((item, iIdx) => {
                      const clickable =
                        typeof item.jumpToIndex === "number" &&
                        item.jumpToIndex < grammarItems.length;

                      return (
                        <button
                          key={iIdx}
                          type="button"
                          disabled={!clickable}
                          onClick={() => {
                            if (clickable && item.jumpToIndex !== undefined) {
                              onJumpToItem(item.jumpToIndex);
                            }
                          }}
                          className={`text-left bg-cream-50/95 border rounded-2xl p-3.5 space-y-1.5 transition-all ${
                            tone.border
                          } ${
                            clickable
                              ? "cursor-pointer hover:shadow-sm"
                              : "cursor-default"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {item.badge && (
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${tone.badge}`}
                              >
                                {item.badge}
                              </span>
                            )}
                            {clickable && (
                              <ArrowDownRight
                                size={14}
                                className="text-ink-300 shrink-0"
                              />
                            )}
                          </div>

                          <div className="text-sm sm:text-[15px] font-bold text-ink-900 leading-snug">
                            {item.formulaReading ? (
                              <FuriganaText
                                word={item.formula}
                                reading={item.formulaReading}
                              />
                            ) : (
                              item.formula
                            )}
                          </div>

                          <div className="text-xs text-ink-700 leading-relaxed">
                            {item.meaning}
                          </div>

                          {item.example && (
                            <div className="text-xs text-sage-700 font-medium bg-sage-100/50 rounded-lg px-2 py-1">
                              예) {item.example}
                            </div>
                          )}

                          {item.tip && (
                            <div className="text-[11px] text-rose-500 font-semibold">
                              ※ {item.tip}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {section.footnote && (
                    <div
                      onClick={() => {
                        if (
                          typeof section.footnote?.jumpToIndex === "number" &&
                          section.footnote.jumpToIndex < grammarItems.length
                        ) {
                          onJumpToItem(section.footnote.jumpToIndex);
                        }
                      }}
                      className="cursor-pointer bg-rose-100/55 border border-rose-300/70 rounded-2xl p-3.5 space-y-2 hover:border-rose-500 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{section.footnote.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {section.footnote.tokens.map((tok, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-xl bg-cream-50 border border-rose-300/50 text-xs"
                          >
                            <span className="font-bold text-ink-900">
                              <FuriganaText
                                word={tok.word}
                                reading={tok.reading}
                                rtClassName="text-[0.65em] font-medium text-rose-500 select-none"
                              />
                            </span>
                            {tok.meaning && (
                              <span className="text-[11px] text-ink-500">
                                {tok.meaning}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Auto-generated compact cheat sheet for any future lesson */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {grammarItems.map((g, idx) => (
              <button
                key={`${g.pattern}-${idx}`}
                type="button"
                onClick={() => onJumpToItem(idx)}
                className="text-left bg-cream-50/95 border border-sage-300/60 hover:border-sage-500 rounded-2xl p-3.5 space-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sage-700">
                    <span className="w-5 h-5 rounded-lg bg-sage-500 text-cream-50 text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    핵심 포인트
                  </span>
                  <ArrowDownRight size={14} className="text-ink-300 shrink-0" />
                </div>
                <div className="text-sm font-bold text-ink-900 leading-snug">
                  {g.pattern}
                </div>
                <p className="text-xs text-ink-700 line-clamp-2 leading-relaxed">
                  {g.summary}
                </p>
              </button>
            ))}
          </div>
        ))}
    </section>
  );
}
