"use client";

import React from "react";

const KANJI_TEST = /[\u4e00-\u9faf\u3400-\u4dbf々]/;
const KANJI_SPLIT = /([\u4e00-\u9faf\u3400-\u4dbf々]+)/g;

export interface FuriganaSegment {
  text: string;
  reading?: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

export function hasKanji(text: string): boolean {
  return KANJI_TEST.test(text);
}

/**
 * Aligns kanji runs in `word` with their corresponding hiragana reading
 * so furigana appears strictly over the kanji characters (not okurigana).
 */
export function splitFuriganaSegments(
  word: string,
  reading?: string | null
): FuriganaSegment[] {
  const cleanWord = word.trim();
  const cleanReading = reading?.trim() || "";

  if (!cleanReading || !hasKanji(cleanWord) || cleanWord === cleanReading) {
    return [{ text: word }];
  }

  const parts = cleanWord.split(KANJI_SPLIT).filter(Boolean);
  let pattern = "^";
  const kanjiIndices: number[] = [];

  parts.forEach((part, idx) => {
    if (KANJI_TEST.test(part)) {
      pattern += "(.+?)";
      kanjiIndices.push(idx);
    } else {
      pattern += escapeRegex(part);
    }
  });
  pattern += "$";

  try {
    const match = cleanReading.match(new RegExp(pattern));
    if (match && match.length === kanjiIndices.length + 1) {
      let groupIdx = 1;
      return parts.map((part) => {
        if (KANJI_TEST.test(part)) {
          const rt = match[groupIdx++];
          return { text: part, reading: rt };
        }
        return { text: part };
      });
    }
  } catch {
    // Fallback below
  }

  return [{ text: cleanWord, reading: cleanReading }];
}

interface FuriganaTextProps {
  word: string;
  reading?: string | null;
  showFurigana?: boolean;
  className?: string;
  rtClassName?: string;
}

export default function FuriganaText({
  word,
  reading,
  showFurigana = true,
  className,
  rtClassName = "text-[0.42em] font-medium text-sage-700 tracking-normal select-none",
}: FuriganaTextProps) {
  if (!showFurigana || !reading || !hasKanji(word)) {
    return <span className={className}>{word}</span>;
  }

  const segments = splitFuriganaSegments(word, reading);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.reading ? (
          <ruby
            key={i}
            className="mx-[0.02em]"
            style={{ rubyPosition: "over" }}
          >
            {seg.text}
            <rp>(</rp>
            <rt className={rtClassName}>{seg.reading}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </span>
  );
}
