import { useMemo, useState } from "react";
import type { MemorizationProgress, ReviewMethod, ReviewRating, Scripture } from "../models";
import {
  HIDE_WORD_PROGRESSION,
  TOTAL_MEMORIZATION_STAGES,
  firstLetterHints,
  hideWords,
} from "../services/memorization";
import { compareRecall, scoreCategory, type CompareResult } from "../services/scriptureCompare";
import { ratingFromScore } from "../services/reviewScheduler";
import { isSpeechRecognitionSupported, listenForRecitation } from "../services/speechService";
import { ReviewControls } from "./ReviewControls";

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

interface ReviewItemProps {
  scripture: Scripture;
  progress: MemorizationProgress;
  speechEnabled: boolean;
  onComplete: (result: {
    method: ReviewMethod;
    score: number;
    rating: ReviewRating;
    advanceStage: boolean;
  }) => void;
}

export function ReviewItem({ scripture, progress, speechEnabled, onComplete }: ReviewItemProps) {
  const isLearning = progress.stage < TOTAL_MEMORIZATION_STAGES;
  const phases = isLearning ? LEARN_PHASES : REVIEW_PHASES;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [method, setMethod] = useState<ReviewMethod>("typing");
  const [listening, setListening] = useState(false);

  const phase = phases[phaseIndex];

  const hiddenText = useMemo(() => {
    if (!phase.startsWith("hide-")) return null;
    const step = Number(phase.split("-")[1]);
    return hideWords(scripture.text, HIDE_WORD_PROGRESSION[step]);
  }, [phase, scripture.text]);

  const hintedText = useMemo(() => {
    if (phase !== "first-letter") return null;
    return firstLetterHints(scripture.text);
  }, [phase, scripture.text]);

  function goToNextPhase() {
    setPhaseIndex((i) => Math.min(i + 1, phases.length - 1));
  }

  function handleCheckAnswer() {
    const result = compareRecall(scripture.text, typedAnswer);
    setCompareResult(result);
    goToNextPhase();
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
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {scripture.reference}
      </p>

      {phase === "read" && (
        <>
          <p className="mt-3 whitespace-pre-wrap text-xl leading-relaxed text-slate-800">
            {scripture.text}
          </p>
          <p className="mt-2 text-sm text-slate-500">Read it a few times, then begin.</p>
          <ActionButton onClick={goToNextPhase}>Begin Memorizing</ActionButton>
        </>
      )}

      {hiddenText !== null && (
        <>
          <p className="mt-3 whitespace-pre-wrap text-xl leading-relaxed text-slate-800">
            {hiddenText}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Fill in the blanks from memory, then continue.
          </p>
          <ActionButton onClick={goToNextPhase}>Continue</ActionButton>
        </>
      )}

      {hintedText !== null && (
        <>
          <p className="mt-3 whitespace-pre-wrap text-xl leading-relaxed tracking-wide text-slate-800">
            {hintedText}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Use the first letters as a guide and recite the whole verse.
          </p>
          <ActionButton onClick={goToNextPhase}>Continue</ActionButton>
        </>
      )}

      {phase === "reference" && (
        <>
          <p className="mt-3 text-2xl font-semibold text-slate-800">{scripture.reference}</p>
          <p className="mt-2 text-sm text-slate-500">
            Recall the entire Scripture without hints, then continue.
          </p>
          <ActionButton onClick={goToNextPhase}>I've Recalled It</ActionButton>
        </>
      )}

      {phase === "typing" && (
        <>
          <p className="mt-1 text-sm text-slate-500">Type the verse from memory:</p>
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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <ActionButton onClick={handleCheckAnswer} disabled={!typedAnswer.trim()}>
              Check Answer
            </ActionButton>
            {speechEnabled && isSpeechRecognitionSupported() && (
              <button
                type="button"
                onClick={handleRecite}
                disabled={listening}
                className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                {listening ? "Listening…" : "Recite Aloud"}
              </button>
            )}
          </div>
        </>
      )}

      {phase === "graded" && compareResult && (
        <div className="mt-3">
          <p className="text-3xl font-bold text-slate-900">{compareResult.score}%</p>
          <p className="text-sm font-medium text-slate-500">{scoreCategory(compareResult.score)}</p>
          <div className="mt-3 space-y-1 text-sm">
            {compareResult.missingWords.length > 0 && (
              <p className="text-red-700">
                Missing: {compareResult.missingWords.join(", ")}
              </p>
            )}
            {compareResult.incorrectWords.length > 0 && (
              <p className="text-amber-700">
                Incorrect: {compareResult.incorrectWords.join(", ")}
              </p>
            )}
            {compareResult.extraWords.length > 0 && (
              <p className="text-slate-500">Extra: {compareResult.extraWords.join(", ")}</p>
            )}
            {compareResult.missingWords.length === 0 &&
              compareResult.incorrectWords.length === 0 &&
              compareResult.extraWords.length === 0 && (
                <p className="text-emerald-700">Perfect recall!</p>
              )}
          </div>
          <div className="mt-4">
            <ReviewControls onRate={handleRate} />
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            Suggested: {ratingFromScore(compareResult.score)} — you can override above.
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
      className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
