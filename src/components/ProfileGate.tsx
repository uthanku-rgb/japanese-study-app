"use client";

import { useState } from "react";
import { StudyProfile } from "@/types/japanese";
import { Check, Pencil, X, Sparkles } from "lucide-react";

interface ProfileGateProps {
  profiles: StudyProfile[];
  masteredByProfile: Record<string, number>;
  totalVocab: number;
  activeProfileId: string | null;
  onSelect: (profileId: string) => void;
  onRename: (profileId: string, nextName: string) => Promise<void>;
  onClose?: () => void;
}

export default function ProfileGate({
  profiles,
  masteredByProfile,
  totalVocab,
  activeProfileId,
  onSelect,
  onRename,
  onClose,
}: ProfileGateProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (profile: StudyProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(profile.id);
    setDraftName(profile.display_name);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setDraftName("");
  };

  const submitEdit = async (profileId: string, e: React.FormEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onRename(profileId, trimmed);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 fade-in">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 p-2 rounded-xl text-ink-500 hover:bg-cream-200 transition-colors"
              title="닫기"
            >
              <X size={18} />
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">
            <Sparkles size={13} />
            일본어 스터디
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-ink-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            누가 공부할까요?
          </h1>
          <p className="text-sm text-ink-500">
            프로필마다 외운 단어와 퀴즈 기록이 따로 저장돼요.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {profiles.map((profile) => {
            const isSelected = activeProfileId === profile.id;
            const isRose = profile.theme_color === "rose";
            const mastered = masteredByProfile[profile.id] || 0;
            const isEditing = editingId === profile.id;

            return (
              <div
                key={profile.id}
                onClick={() => {
                  if (!isEditing) onSelect(profile.id);
                }}
                className={`relative cursor-pointer rounded-3xl p-6 border-2 transition-all bg-cream-50 flex flex-col items-center text-center gap-3 shadow-xs hover:shadow-md ${
                  isSelected
                    ? isRose
                      ? "border-rose-500 ring-2 ring-rose-100"
                      : "border-sage-500 ring-2 ring-sage-100"
                    : "border-cream-200 hover:border-sage-300"
                }`}
              >
                {!isEditing && (
                  <button
                    type="button"
                    onClick={(e) => startEdit(profile, e)}
                    className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-ink-300 hover:text-ink-700 hover:bg-cream-200/70 transition-colors"
                    title="이름 변경"
                  >
                    <Pencil size={14} />
                  </button>
                )}

                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${
                    isRose ? "bg-rose-100" : "bg-sage-100"
                  }`}
                >
                  {profile.emoji}
                </div>

                {isEditing ? (
                  <form
                    onSubmit={(e) => submitEdit(profile.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full space-y-2"
                  >
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={16}
                      autoFocus
                      className="w-full px-3 py-1.5 rounded-xl bg-cream-100 border border-sage-300 text-sm text-center font-semibold text-ink-900 focus:outline-none focus:border-sage-500"
                      placeholder="이름 입력"
                    />
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="submit"
                        disabled={saving || !draftName.trim()}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-sage-500 text-cream-50 text-xs font-semibold disabled:opacity-50"
                      >
                        <Check size={12} /> 저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2.5 py-1 rounded-lg bg-cream-200 text-ink-700 text-xs font-medium"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="text-lg font-bold text-ink-900">
                      {profile.display_name}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isRose
                          ? "bg-rose-100 text-rose-500"
                          : "bg-sage-100 text-sage-700"
                      }`}
                    >
                      외운 단어 {mastered} / {totalVocab}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-ink-500">
          오른쪽 위 연필 아이콘을 눌러 이름을 바꿀 수 있어요.
        </p>
      </div>
    </div>
  );
}
