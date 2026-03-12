"use client";

import { useEffect, useRef, useState } from "react";

interface MathInputProps {
  x: number;
  y: number;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

// LaTeX commands with autocomplete
const LATEX_COMMANDS = [
  { cmd: "\\frac", display: "½", description: "Fraction" },
  { cmd: "\\sqrt", display: "√", description: "Square root" },
  { cmd: "\\sum", display: "Σ", description: "Summation" },
  { cmd: "\\int", display: "∫", description: "Integral" },
  { cmd: "\\alpha", display: "α", description: "Alpha" },
  { cmd: "\\beta", display: "β", description: "Beta" },
  { cmd: "\\gamma", display: "γ", description: "Gamma" },
  { cmd: "\\theta", display: "θ", description: "Theta" },
  { cmd: "\\infty", display: "∞", description: "Infinity" },
  { cmd: "\\pi", display: "π", description: "Pi" },
  { cmd: "\\pm", display: "±", description: "Plus-minus" },
  { cmd: "\\times", display: "×", description: "Multiply" },
  { cmd: "\\div", display: "÷", description: "Divide" },
  { cmd: "\\leq", display: "≤", description: "Less equal" },
  { cmd: "\\geq", display: "≥", description: "Greater equal" },
  { cmd: "\\neq", display: "≠", description: "Not equal" },
  { cmd: "\\rightarrow", display: "→", description: "Arrow right" },
  { cmd: "\\leftarrow", display: "←", description: "Arrow left" },
  { cmd: "\\cdot", display: "·", description: "Dot product" },
  { cmd: "\\partial", display: "∂", description: "Partial derivative" },
];

export default function MathInput({
  x,
  y,
  initialValue,
  onSubmit,
  onCancel,
}: MathInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue ?? "");
  const [suggestions, setSuggestions] = useState<typeof LATEX_COMMANDS>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTriggerRange, setActiveTriggerRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const updateSuggestionsAtCursor = (
    nextValue: string,
    cursorPos: number | null,
  ) => {
    if (cursorPos === null) {
      setShowSuggestions(false);
      setActiveTriggerRange(null);
      return;
    }

    const beforeCursor = nextValue.slice(0, cursorPos);
    const triggerMatch = beforeCursor.match(/[\\/][A-Za-z]*$/);

    if (!triggerMatch || triggerMatch.index === undefined) {
      setShowSuggestions(false);
      setActiveTriggerRange(null);
      return;
    }

    const triggerStart = triggerMatch.index;
    const triggerText = triggerMatch[0];
    const queryWithoutTrigger = triggerText.slice(1);
    const normalizedQuery = `\\${queryWithoutTrigger}`;
    const filtered = LATEX_COMMANDS.filter((cmd) =>
      cmd.cmd.startsWith(normalizedQuery),
    );

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
    setActiveTriggerRange({ start: triggerStart, end: cursorPos });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    updateSuggestionsAtCursor(newValue, e.target.selectionStart);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        insertCommand(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const insertCommand = (cmd: (typeof LATEX_COMMANDS)[0]) => {
    if (!activeTriggerRange) {
      return;
    }

    const beforeTrigger = value.slice(0, activeTriggerRange.start);
    const afterTrigger = value.slice(activeTriggerRange.end);

    let insertion = cmd.cmd;
    if (cmd.cmd === "\\frac") insertion = "\\frac{}{}";
    else if (cmd.cmd === "\\sqrt") insertion = "\\sqrt{}";
    else if (cmd.cmd === "\\int") insertion = "\\int_{}^{}";
    else if (cmd.cmd === "\\sum") insertion = "\\sum_{}^{}";

    const newValue = beforeTrigger + insertion + afterTrigger;
    setValue(newValue);
    setShowSuggestions(false);
    setActiveTriggerRange(null);

    setTimeout(() => {
      const insertionStart = beforeTrigger.length;
      const bracesIndex = newValue.indexOf("{}", insertionStart);
      const cursorPos =
        bracesIndex >= 0 ? bracesIndex + 1 : insertionStart + insertion.length;
      inputRef.current?.setSelectionRange(cursorPos, cursorPos);
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="absolute z-50" style={{ left: x, top: y }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onClick={(event) =>
          updateSuggestionsAtCursor(value, event.currentTarget.selectionStart)
        }
        onKeyUp={(event) => {
          if (
            event.key !== "ArrowDown" &&
            event.key !== "ArrowUp" &&
            event.key !== "Enter" &&
            event.key !== "Tab"
          ) {
            updateSuggestionsAtCursor(value, event.currentTarget.selectionStart);
          }
        }}
        onBlur={() => {
          if (value.trim()) {
            onSubmit(value);
          } else {
            onCancel();
          }
        }}
        className="min-w-[2ch] border-none bg-transparent px-0 py-0 text-base text-zinc-900 outline-none"
        style={{ width: `${Math.max(2, value.length + 1)}ch` }}
        placeholder=""
      />

      {showSuggestions && (
        <div className="absolute left-0 top-full mt-1 max-h-48 min-w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.cmd}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                index === selectedIndex ? "bg-blue-100" : ""
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertCommand(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="text-2xl font-serif w-8 text-center">
                {suggestion.display}
              </span>
              <code className="text-sm text-gray-600 flex-1">
                {suggestion.cmd}
              </code>
              <span className="text-xs text-gray-400">
                {suggestion.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
