import { useEffect, useMemo, useState } from "react";
import type { MemorizationProgress, ReviewMethod, ReviewRating, Scripture } from "../models";
import {
  HIDE_WORD_PROGRESSION,
  TOTAL_MEMORIZATION_STAGES,
  firstLetterTokens,
  hideWordTokens,
  readingTokens,
} from "../services/memorization";
import { compareRecall, scoreCategory, type CompareResult } from "../services/scriptureCompare";
import { ratingFromScore } from "../services/reviewScheduler";
import {
  listenForRecitation,
  speechAvailability,
  speechUnavailableMessage,
} from "../services/speechService";
import { BUZZ_CORRECT, BUZZ_MISS, BUZZ_TAP, buzz } from "../utils/haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Confetti } from "./Confetti";
import { PhaseBadge, PhaseStepper } from "./PhaseStepper";
import { ReviewControls } from "./ReviewControls";
import { ScoreRing } from "./ScoreRing";
import { VerseDiff } from "./VerseDiff";
import { VerseText } from "./VerseText";

type LearnPhase =
  | "read"
  | "hide-0"
  | "hide-1"
  | "hide-2"
  | "hide-3"
  | "first-letter"
  | "reference"
  | "typing"
  | "graded";

const LEARN_PHASES: LearnPhase[] = [
  "read",
  "hide-0",
  "hide-1",
  "hide-2",
  "hide-3",
  "first-letter",
  "reference",
  "typing",
  "graded",
];

const REVIEW_PHASES: LearnPhase[] = ["reference", "typing", "graded"];

const PHASE_META: Record<LearnPhase, { icon: string; label: string; prompt: string; cta: string }> = {
  read: {
    icon: "📖",
    label: "Read It",
    prompt: "Read it through a few times. Say it out loud if you can.",
    cta: "I'm Ready",
  },
  "hide-0": {
    icon: "🌤️",
    label: "A Few Gone",
    prompt: "A fifth of the words are gone. Fill them in as you read — tap a blank to peek.",
    cta: "Got It",
  },
  "hide-1": {
    icon: "⛅",
    label: "Half Gone",
    prompt: "More words have dropped out. Keep the rhythm going.",
    cta: "Got It",
  },
  "hide-2": {
    icon: "🌥️",
    label: "Mostly Gone",
    prompt: "Only the anchors are left. Carry the rest from memory.",
    cta: "Got It",
  },
  "hide-3": {
    icon: "🌫️",
    label: "Nearly Bare",
    prompt: "Almost nothing left. You are doing the heavy lifting now.",
    cta: "Got It",
  },
  "first-letter": {
    icon: "🔤",
    label: "First Letters",
    prompt: "Just the first letter of each word. Recite the whole verse.",
    cta: "Recited It",
  },
  reference: {
    icon: "🧠",
    label: "From Memory",
    prompt: "No hints. Recall the entire Scripture from the reference alone.",
    cta: "I've Recalled It",
  },
  typing: {
    icon: "⌨️",
    label: "Write It Out",
    prompt: "Type the verse from memory.",
    cta: "Check Answer",
  },
  graded: {
    icon: "🎯",
    label: "Results",
    prompt: "",
    cta: "",
  },
};

interface ReviewItemProps {
  scripture: Scripture;
  progress: MemorizationProgress;
  speechEnabled: boolean;
  /** Consecutive non-"again" ratings in this session, used for the bonus. */
  streak: number;
  onComplete: (result: {
    method: ReviewMethod;
    score: number;
    rating: ReviewRating;
    advanceStage: boolean;
    xp: number;
  }) => void;
}

export function ReviewItem({
  scripture,
  progress,
  speechEnabled,
  streak,
  onComplete,
}: ReviewItemProps) {
  const isLearning = progress.stage < TOTAL_MEMORIZATION_STAGES;
  const phases = isLearning ? LEARN_PHASES : REVIEW_PHASES;
  const reducedMotion = useReducedMotion();

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [method, setMethod] = useState<ReviewMethod>("typing");
  const [listening, setListening] = useState(false);
  const [peeks, setPeeks] = useState(0);
  const [nudged, setNudged] = useState(false);

  const phase = phases[phaseIndex];
  const meta = PHASE_META[phase];
  const voiceAvailability = speechAvailability();

  const verseTokens = useMemo(() => {
    if (phase === "read") return readingTokens(scripture.text);
    if (phase.startsWith("hide-")) {
      const step = Number(phase.split("-")[1]);
      return hideWordTokens(scripture.text, HIDE_WORD_PROGRESSION[step]);
    }
    if (phase === "first-letter") return firstLetterTokens(scripture.text);
    if (phase === "reference" && nudged) return firstLetterTokens(scripture.text);
    return null;
  }, [phase, scripture.text, nudged]);

  /** Recomputed as the user types so the bar fills word by word. It gives a count, never the words. */
  const liveResult = useMemo(() => {
    if (phase !== "typing" || !typedAnswer.trim()) return null;
    return compareRecall(scripture.text, typedAnswer);
  }, [phase, scripture.text, typedAnswer]);

  const xpEarned = compareResult
    ? Math.round(compareResult.score + (peeks === 0 ? 25 : 0) + streak * 5)
    : 0;

  function advance() {
    setPhaseIndex((i) => Math.min(i + 1, phases.length - 1));
  }

  function goToNextPhase() {
    buzz(BUZZ_TAP);
    advance();
  }

  function handleCheckAnswer() {
    const result = compareRecall(scripture.text, typedAnswer);
    setCompareResult(result);
    buzz(result.score >= 85 ? BUZZ_CORRECT : BUZZ_MISS);
    advance();
  }

  function handleRecite() {
    setListening(true);
    listenForRecitation(
      (transcript) => {
        setListening(false);
        setMethod("recitation");
        setTypedAnswer(transcript);
      },
      () => setListening(false),
    );
  }

  function handleRate(rating: ReviewRating) {
    onComplete({
      method,
      score: compareResult?.score ?? 0,
      rating,
      advanceStage: isLearning,
      xp: rating === "again" ? Math.round(xpEarned * 0.4) : xpEarned,
    });
  }

  // Enter advances the read-along phases without reaching for the button.
  useEffect(() => {
    if (phase === "typing" || phase === "graded") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "BUTTON" || target.tagName === "TEXTAREA")) return;
      event.preventDefault();
      setPhaseIndex((i) => Math.min(i + 1, phases.length - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, phases.length]);

  const celebrate = Boolean(compareResult && compareResult.score >= 95);
  const stumbled = Boolean(compareResult && compareResult.score < 70);

  return (
    <div
      className={`sm-card-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
        stumbled && phase === "graded" ? "sm-shake" : ""
      }`}
    >
      {celebrate && phase === "graded" && <Confetti fireKey={scripture.id} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {scripture.reference}
        </p>
        <PhaseBadge key={phase} icon={meta.icon} label={meta.label} />
      </div>

      <div className="mt-3">
        <PhaseStepper
          steps={phases.length}
          currentIndex={phaseIndex}
          ariaLabel={`Phase ${phaseIndex + 1} of ${phases.length}: ${meta.label}`}
        />
      </div>

      {verseTokens && (
        <>
          <VerseText key={phase} tokens={verseTokens} onPeek={() => setPeeks((p) => p + 1)} />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{meta.prompt}</p>
          <ActionButton onClick={goToNextPhase}>{meta.cta}</ActionButton>
        </>
      )}

      {phase === "reference" && !nudged && (
        <>
          <p className="sm-pop-in mt-6 text-center text-3xl font-bold text-slate-800 dark:text-slate-200">
            {scripture.reference}
          </p>
          <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{meta.prompt}</p>
          <ActionButton onClick={goToNextPhase}>{meta.cta}</ActionButton>
          <button
            type="button"
            onClick={() => {
              buzz(BUZZ_TAP);
              setNudged(true);
              setPeeks((p) => p + 1);
            }}
            className="sm-tap mt-2 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
          >
            Stuck? Show the first letters
          </button>
        </>
      )}

      {phase === "typing" && (
        <>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{meta.prompt}</p>
          <textarea
            value={typedAnswer}
            onChange={(e) => {
              setMethod("typing");
              setTypedAnswer(e.target.value);
            }}
            rows={4}
            className="input mt-2 resize-y"
            autoFocus
          />

          <div className="mt-3 h-6">
            {liveResult && (
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (liveResult.correctCount / Math.max(1, liveResult.totalWords)) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {liveResult.correctCount}/{liveResult.totalWords} words
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <ActionButton onClick={handleCheckAnswer} disabled={!typedAnswer.trim()}>
              {meta.cta}
            </ActionButton>
            {speechEnabled && voiceAvailability === "available" && (
              <button
                type="button"
                onClick={handleRecite}
                disabled={listening}
                className="sm-tap mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span className={listening && !reducedMotion ? "sm-flicker" : ""} aria-hidden="true">
                  🎤
                </span>
                {listening ? "Listening…" : "Recite Aloud"}
              </button>
            )}
          </div>

          {speechEnabled && voiceAvailability !== "available" && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              🎤 {speechUnavailableMessage(voiceAvailability)}
            </p>
          )}
        </>
      )}

      {phase === "graded" && compareResult && (
        <div className="relative mt-4">
          <ScoreRing score={compareResult.score} label={scoreCategory(compareResult.score)} />

          <p className="sm-float-up pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            +{xpEarned} XP
          </p>

          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            {peeks === 0 ? "No peeks — 25 XP bonus" : `${peeks} ${peeks === 1 ? "peek" : "peeks"}`}
            {streak > 0 && ` · ${streak}x streak bonus`}
          </p>

          <div className="mt-5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <VerseDiff
              wordResults={compareResult.wordResults}
              extraWords={compareResult.extraWords}
            />
          </div>

          {compareResult.hasOrderIssue && (
            <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-400">
              Some words came back out of order.
            </p>
          )}

          <div className="mt-5">
            <ReviewControls onRate={handleRate} suggested={ratingFromScore(compareResult.score)} />
          </div>
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
            Suggested: {ratingFromScore(compareResult.score)} — press 1–4 or tap.
          </p>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="sm-tap mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
    >
      {children}
    </button>
  );
}
