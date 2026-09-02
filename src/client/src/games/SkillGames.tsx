import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius, typography } from '../theme';
import { authColors } from '../theme/auth';

const gameBlue = authColors.primary;

interface TapSprintProps {
  durationSeconds: number;
  onComplete: (score: number) => void;
}

export function TapSprintGame({ durationSeconds, onComplete }: TapSprintProps) {
  const theme = useTheme();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [taps, setTaps] = useState(0);
  const tapsRef = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('done');
      if (!finished.current) {
        finished.current = true;
        onComplete(tapsRef.current);
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, onComplete]);

  const handleTap = () => {
    if (phase === 'playing') {
      tapsRef.current += 1;
      setTaps(tapsRef.current);
    }
  };

  return (
    <View style={styles.container}>
      {phase === 'ready' && (
        <>
          <Text style={styles.gameEmoji}>👏</Text>
          <Text style={[styles.title, { color: theme.text }]}>Tap Party!</Text>
          <Text style={[styles.bigNumber, { color: gameBlue }]}>{countdown || 'GO'}</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap the button as fast as you can</Text>
        </>
      )}
      {phase === 'playing' && (
        <Pressable style={[styles.tapZone, { backgroundColor: gameBlue }]} onPress={handleTap}>
          <Text style={styles.tapTimer}>{timeLeft}s left</Text>
          <Text style={styles.tapEmoji}>👏</Text>
          <Text style={styles.tapCount}>{taps}</Text>
          <Text style={styles.tapHint}>TAP TAP TAP</Text>
        </Pressable>
      )}
      {phase === 'done' && (
        <Text style={[styles.title, { color: theme.text }]}>Time&apos;s up — {taps} taps</Text>
      )}
    </View>
  );
}

interface ReactionRushProps {
  rounds: number;
  onComplete: (score: number) => void;
}

export function ReactionRushGame({ rounds, onComplete }: ReactionRushProps) {
  const theme = useTheme();
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'wait' | 'go' | 'early' | 'result'>('wait');
  const [totalScore, setTotalScore] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const goAt = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);

  const startRound = useCallback(() => {
    setPhase('wait');
    setLastMs(null);
    const delay = 1500 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      goAt.current = Date.now();
      setPhase('go');
    }, delay);
  }, []);

  useEffect(() => {
    startRound();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startRound]);

  const handleTap = () => {
    if (phase === 'wait') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase('early');
      setTimeout(() => {
        if (round + 1 >= rounds) {
          if (!finished.current) {
            finished.current = true;
            onComplete(totalScore);
          }
        } else {
          setRound((r) => r + 1);
          startRound();
        }
      }, 800);
      return;
    }

    if (phase === 'go') {
      const ms = Date.now() - goAt.current;
      const points = Math.max(0, Math.round(1000 - ms));
      setLastMs(ms);
      setTotalScore((s) => s + points);
      setPhase('result');
      setTimeout(() => {
        if (round + 1 >= rounds) {
          if (!finished.current) {
            finished.current = true;
            onComplete(totalScore + points);
          }
        } else {
          setRound((r) => r + 1);
          startRound();
        }
      }, 900);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.roundLabel, { color: theme.textSecondary }]}>
        Round {Math.min(round + 1, rounds)} of {rounds}
      </Text>
      <Pressable
        style={[
          styles.reactionZone,
          {
            backgroundColor:
              phase === 'go' ? theme.success : phase === 'early' ? theme.error : theme.surfaceSecondary,
            borderColor: theme.border,
          },
        ]}
        onPress={handleTap}
      >
        <Text style={[styles.reactionText, { color: phase === 'go' ? '#FFF' : theme.text }]}>
          {phase === 'wait' && 'Wait... 🚦'}
          {phase === 'go' && 'TAP NOW! 🎉'}
          {phase === 'early' && 'Too soon! 😅'}
          {phase === 'result' && `${lastMs}ms ⚡`}
        </Text>
      </Pressable>
      <Text style={[styles.scoreLine, { color: theme.text }]}>Score: {totalScore} ⭐</Text>
    </View>
  );
}

interface QuickMathProps {
  durationSeconds: number;
  onComplete: (score: number) => void;
}

function buildMathProblem(): { text: string; answer: number; options: number[] } {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const answer = a + b;
  const text = `${a} + ${b}`;

  const wrong = new Set<number>();
  while (wrong.size < 3) {
    const delta = Math.floor(Math.random() * 7) - 3;
    const candidate = answer + delta;
    if (candidate !== answer && candidate >= 0) wrong.add(candidate);
  }

  const options = [answer, ...wrong];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { text, answer, options };
}

export function QuickMathGame({ durationSeconds, onComplete }: QuickMathProps) {
  const theme = useTheme();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [correct, setCorrect] = useState(0);
  const correctRef = useRef(0);
  const [problem, setProblem] = useState(buildMathProblem);
  const finished = useRef(false);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('done');
      if (!finished.current) {
        finished.current = true;
        onComplete(correctRef.current);
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, onComplete]);

  const pickAnswer = (value: number) => {
    if (phase !== 'playing') return;
    if (value === problem.answer) {
      correctRef.current += 1;
      setCorrect(correctRef.current);
    }
    setProblem(buildMathProblem());
  };

  return (
    <View style={styles.container}>
      {phase === 'ready' && (
        <>
          <Text style={styles.gameEmoji}>🔢</Text>
          <Text style={[styles.title, { color: theme.text }]}>Number Pop</Text>
          <Text style={[styles.bigNumber, { color: gameBlue }]}>{countdown || 'GO'}</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap the correct answer</Text>
        </>
      )}
      {phase === 'playing' && (
        <>
          <Text style={[styles.timer, { color: gameBlue }]}>{timeLeft}s</Text>
          <Text style={[styles.scoreLine, { color: theme.text }]}>{correct} correct 🎉</Text>
          <Text style={[styles.mathProblem, { color: theme.text }]}>{problem.text} = ?</Text>
          <View style={styles.optionsGrid}>
            {problem.options.map((option) => (
              <Pressable
                key={`${problem.text}-${option}`}
                style={[styles.optionBtn, { backgroundColor: gameBlue, borderColor: gameBlue }]}
                onPress={() => pickAnswer(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {phase === 'done' && (
        <Text style={[styles.title, { color: theme.text }]}>{correct} correct answers</Text>
      )}
    </View>
  );
}

const FLASH_PADS = [
  { id: 0, emoji: '🍎', color: '#EF4444' },
  { id: 1, emoji: '⭐', color: '#F59E0B' },
  { id: 2, emoji: '🎈', color: '#3B82F6' },
  { id: 3, emoji: '🎵', color: '#22C55E' },
];

interface MemoryFlashProps {
  maxRounds: number;
  onComplete: (score: number) => void;
}

export function MemoryFlashGame({ maxRounds, onComplete }: MemoryFlashProps) {
  const theme = useTheme();
  const [phase, setPhase] = useState<'ready' | 'show' | 'input' | 'done'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [sequence, setSequence] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [inputIndex, setInputIndex] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const finished = useRef(false);

  const finishGame = useCallback(
    (score: number) => {
      if (finished.current) return;
      finished.current = true;
      setFinalScore(score);
      setPhase('done');
      onComplete(score);
    },
    [onComplete]
  );

  const beginRound = useCallback((startingSequence: number[], roundIndex: number) => {
    setSequence(startingSequence);
    setLevel(roundIndex);
    setInputIndex(0);
    setStep(0);
    setPhase('show');
  }, []);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (countdown <= 0) {
      beginRound([Math.floor(Math.random() * 4)], 0);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, beginRound]);

  useEffect(() => {
    if (phase !== 'show') return;
    if (step >= sequence.length) {
      setPhase('input');
      return;
    }

    setActivePad(sequence[step]);
    const flash = setTimeout(() => setActivePad(null), 450);
    const next = setTimeout(() => setStep((s) => s + 1), 650);
    return () => {
      clearTimeout(flash);
      clearTimeout(next);
    };
  }, [phase, step, sequence]);

  const handlePadPress = (padId: number) => {
    if (phase !== 'input') return;

    if (padId !== sequence[inputIndex]) {
      finishGame(level);
      return;
    }

    const nextIndex = inputIndex + 1;
    if (nextIndex >= sequence.length) {
      const nextLevel = level + 1;
      if (nextLevel >= maxRounds) {
        finishGame(nextLevel);
      } else {
        const extended = [...sequence, Math.floor(Math.random() * 4)];
        setTimeout(() => beginRound(extended, nextLevel), 400);
      }
      return;
    }

    setInputIndex(nextIndex);
  };

  return (
    <View style={styles.container}>
      {phase === 'ready' && (
        <>
          <Text style={styles.gameEmoji}>🧩</Text>
          <Text style={[styles.title, { color: theme.text }]}>Pattern Pal</Text>
          <Text style={[styles.bigNumber, { color: gameBlue }]}>{countdown || 'GO'}</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Watch the emojis, then tap them back</Text>
        </>
      )}
      {(phase === 'show' || phase === 'input') && (
        <>
          <Text style={[styles.roundLabel, { color: theme.textSecondary }]}>
            Level {level + 1} · {phase === 'show' ? 'Watch' : 'Your turn'}
          </Text>
          <View style={styles.padGrid}>
            {FLASH_PADS.map((pad) => {
              const lit = activePad === pad.id;
              return (
                <Pressable
                  key={pad.id}
                  style={[
                    styles.flashPad,
                    {
                      backgroundColor: lit ? pad.color : pad.color + '44',
                      borderColor: pad.color,
                    },
                  ]}
                  onPress={() => handlePadPress(pad.id)}
                  disabled={phase !== 'input'}
                >
                  <Text style={styles.flashPadEmoji}>{pad.emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      {phase === 'done' && (
        <Text style={[styles.title, { color: theme.text }]}>Level {finalScore} reached! 🎉</Text>
      )}
    </View>
  );
}

interface Balloon {
  id: string;
  left: number;
  top: number;
  color: string;
}

const BALLOON_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899'];

interface BalloonBlitzProps {
  durationSeconds: number;
  onComplete: (score: number) => void;
}

export function BalloonBlitzGame({ durationSeconds, onComplete }: BalloonBlitzProps) {
  const theme = useTheme();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [pops, setPops] = useState(0);
  const popsRef = useRef(0);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const finished = useRef(false);
  const idRef = useRef(0);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('done');
      if (!finished.current) {
        finished.current = true;
        onComplete(popsRef.current);
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, onComplete]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const spawn = setInterval(() => {
      setBalloons((prev) => {
        if (prev.length >= 5) return prev;
        const id = String(idRef.current++);
        const balloon: Balloon = {
          id,
          left: 8 + Math.random() * 72,
          top: 8 + Math.random() * 68,
          color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        };
        setTimeout(() => {
          setBalloons((current) => current.filter((b) => b.id !== id));
        }, 2200);
        return [...prev, balloon];
      });
    }, 750);

    return () => clearInterval(spawn);
  }, [phase]);

  const popBalloon = (id: string) => {
    setBalloons((prev) => prev.filter((b) => b.id !== id));
    popsRef.current += 1;
    setPops(popsRef.current);
  };

  return (
    <View style={styles.container}>
      {phase === 'ready' && (
        <>
          <Text style={styles.gameEmoji}>🎈</Text>
          <Text style={[styles.title, { color: theme.text }]}>Balloon Pop</Text>
          <Text style={[styles.bigNumber, { color: gameBlue }]}>{countdown || 'GO'}</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Pop balloons before they float away</Text>
        </>
      )}
      {phase === 'playing' && (
        <>
          <Text style={[styles.timer, { color: gameBlue }]}>{timeLeft}s</Text>
          <Text style={[styles.scoreLine, { color: theme.text }]}>{pops} pops 🎈</Text>
          <View style={[styles.balloonArena, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
            {balloons.map((balloon) => (
              <Pressable
                key={balloon.id}
                style={[styles.balloon, { left: `${balloon.left}%`, top: `${balloon.top}%`, backgroundColor: balloon.color }]}
                onPress={() => popBalloon(balloon.id)}
              >
                <View style={styles.balloonKnot} />
              </Pressable>
            ))}
          </View>
        </>
      )}
      {phase === 'done' && (
        <Text style={[styles.title, { color: theme.text }]}>{pops} balloons popped</Text>
      )}
    </View>
  );
}

const DEFAULT_PHRASES = [
  'family time is the best',
  'we love game night',
  'home is where we laugh',
  'together we win',
  'memories last forever',
  'hugs make everything better',
  'share joy every day',
  'famora keeps us close',
  'grandma makes cookies',
  'let us play again',
];

function shuffleWords(words: string[]): string[] {
  const copy = [...words];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildWordChoices(correct: string, pool: string[]): string[] {
  const wrong = new Set<string>();
  while (wrong.size < 3) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick !== correct) wrong.add(pick);
  }
  return shuffleWords([correct, ...wrong]);
}

interface WordChainProps {
  durationSeconds: number;
  phrases?: string[];
  onComplete: (score: number) => void;
}

/** Tap words in order — no keyboard needed, fun for all ages */
export function WordChainGame({ durationSeconds, phrases, onComplete }: WordChainProps) {
  const theme = useTheme();
  const pool = phrases?.length ? phrases : DEFAULT_PHRASES;
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordsDone, setWordsDone] = useState(0);
  const wordsDoneRef = useRef(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [flashWrong, setFlashWrong] = useState(false);
  const finished = useRef(false);

  const words = pool[phraseIndex % pool.length].split(' ');
  const nextWord = words[wordIndex];
  const built = words.slice(0, wordIndex).join(' ');

  useEffect(() => {
    if (phase !== 'playing' || !nextWord) return;
    const allWords = pool.flatMap((p) => p.split(' '));
    setChoices(buildWordChoices(nextWord, allWords));
  }, [phase, phraseIndex, wordIndex, nextWord, pool]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('done');
      if (!finished.current) {
        finished.current = true;
        onComplete(wordsDoneRef.current);
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, onComplete]);

  const pickWord = (word: string) => {
    if (phase !== 'playing' || !nextWord) return;
    if (word !== nextWord) {
      setFlashWrong(true);
      setTimeout(() => setFlashWrong(false), 400);
      return;
    }

    const nextWordIndex = wordIndex + 1;
    wordsDoneRef.current += 1;
    setWordsDone(wordsDoneRef.current);

    if (nextWordIndex >= words.length) {
      setPhraseIndex((i) => i + 1);
      setWordIndex(0);
    } else {
      setWordIndex(nextWordIndex);
    }
  };

  return (
    <View style={styles.container}>
      {phase === 'ready' && (
        <>
          <Text style={styles.gameEmoji}>🔗</Text>
          <Text style={[styles.title, { color: theme.text }]}>Word Chain</Text>
          <Text style={[styles.bigNumber, { color: gameBlue }]}>{countdown || 'GO'}</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Tap each word in order to build the phrase
          </Text>
        </>
      )}
      {phase === 'playing' && (
        <>
          <Text style={[styles.timer, { color: gameBlue }]}>{timeLeft}s</Text>
          <Text style={[styles.scoreLine, { color: theme.text }]}>{wordsDone} words linked 🔗</Text>
          <View style={[styles.phraseBox, { borderColor: flashWrong ? theme.error : theme.border, backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.builtPhrase, { color: theme.text }]}>
              {built ? `${built} ` : ''}
              <Text style={{ color: gameBlue, fontWeight: '800' }}>___</Text>
            </Text>
          </View>
          <View style={styles.optionsGrid}>
            {choices.map((word) => (
              <Pressable
                key={`${wordIndex}-${word}`}
                style={[styles.wordChip, { backgroundColor: gameBlue, borderColor: gameBlue }]}
                onPress={() => pickWord(word)}
              >
                <Text style={styles.wordChipText}>{word}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {phase === 'done' && (
        <>
          <Text style={styles.gameEmoji}>🎉</Text>
          <Text style={[styles.title, { color: theme.text }]}>{wordsDone} words linked!</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Great job — play again to beat your score</Text>
        </>
      )}
    </View>
  );
}

interface TypingSpeedProps {
  durationSeconds: number;
  phrases?: string[];
  onComplete: (score: number) => void;
}

/** @deprecated Use WordChainGame — kept for compatibility */
export function TypingSpeedGame(props: TypingSpeedProps) {
  return <WordChainGame {...props} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, width: '100%' },
  gameEmoji: { fontSize: 48 },
  title: { ...typography.title, fontSize: 20 },
  bigNumber: { fontSize: 64, fontWeight: '800' },
  hint: { ...typography.caption, textAlign: 'center', textTransform: 'none', letterSpacing: 0 },
  tapZone: {
    width: '100%',
    minHeight: 280,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapTimer: { color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: '600' },
  tapEmoji: { fontSize: 40, marginBottom: spacing.xs },
  tapCount: { color: '#FFF', fontSize: 56, fontWeight: '800', marginVertical: spacing.xs },
  tapHint: { color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: '700', letterSpacing: 4 },
  roundLabel: { ...typography.label, textTransform: 'none', letterSpacing: 0 },
  reactionZone: {
    width: '100%',
    minHeight: 220,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionText: { ...typography.headline, fontSize: 24, textAlign: 'center' },
  scoreLine: { ...typography.title, fontSize: 18 },
  timer: { ...typography.display, fontSize: 36 },
  mathProblem: { ...typography.display, fontSize: 40, marginVertical: spacing.sm },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', width: '100%' },
  optionBtn: {
    width: '47%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  optionText: { color: '#FFF', fontWeight: '800', fontSize: 22 },
  padGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', width: '100%' },
  flashPad: {
    width: '47%',
    aspectRatio: 1.2,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashPadEmoji: { fontSize: 36 },
  builtPhrase: { ...typography.body, fontSize: 18, lineHeight: 26, textAlign: 'center' },
  wordChip: {
    minWidth: '47%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
  },
  wordChipText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  balloonArena: {
    width: '100%',
    height: 320,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  balloon: {
    position: 'absolute',
    width: 52,
    height: 64,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  balloonKnot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  statsRow: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  statLabel: { ...typography.caption, fontWeight: '600' },
  phraseBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 72,
    justifyContent: 'center',
  },
});
