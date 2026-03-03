import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type KeypadProps = {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
};

export function Keypad({ onDigit, onBackspace, onClear, disabled, className }: KeypadProps) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {keys.slice(0, 9).map((k) => (
        <Button
          key={k}
          type="button"
          variant="outline"
          className="h-14 text-xl font-black"
          onClick={() => onDigit(k)}
          disabled={disabled}
        >
          {k}
        </Button>
      ))}

      <Button
        type="button"
        variant="outline"
        className="h-14 text-sm font-bold"
        onClick={() => onClear?.()}
        disabled={disabled || !onClear}
      >
        Clear
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-14 text-xl font-black"
        onClick={() => onDigit("0")}
        disabled={disabled}
      >
        0
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-14 text-sm font-bold"
        onClick={onBackspace}
        disabled={disabled}
      >
        ⌫
      </Button>
    </div>
  );
}
