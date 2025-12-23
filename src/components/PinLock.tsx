import { useState } from "react";

interface PinLockProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function PinLock({ onComplete, disabled = false }: PinLockProps) {
  const [input, setInput] = useState<number[]>([]);

  const handleInput = (num: number) => {
    if (disabled || input.length >= 6) return;
    const next = [...input, num];
    setInput(next);
    if (next.length === 6) {
      setTimeout(() => {
        onComplete(next.join(""));
        setInput([]);
      }, 300);
    }
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      {/* Indicators */}
      <div className="flex gap-2 mb-8 h-8 items-center justify-center bg-background/80 px-6 py-2 rounded border border-primary/20">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-8 transition-all duration-150 transform skew-x-[-10deg] ${
              i < input.length
                ? "bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
                : "bg-primary/10 border border-primary/20"
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleInput(num)}
            className="h-16 rounded-sm bg-transparent text-primary text-2xl font-bold font-mono border border-primary/20 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)] active:bg-primary active:text-primary-foreground transition-all"
          >
            {num}
          </button>
        ))}
        <div className="h-16" />
        <button
          type="button"
          onClick={() => handleInput(0)}
          className="h-16 rounded-sm bg-transparent text-primary text-2xl font-bold font-mono border border-primary/20 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)] active:bg-primary active:text-primary-foreground transition-all"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setInput((prev) => prev.slice(0, -1))}
          className="h-16 flex items-center justify-center text-destructive hover:text-destructive/80 active:scale-95 transition-transform"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
