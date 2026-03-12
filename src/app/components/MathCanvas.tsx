"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MathInput from "./MathInput";
import katex from "katex";
import "katex/dist/katex.min.css";
import "@excalidraw/excalidraw/index.css";

interface CanvasNote {
  id: string;
  x: number;
  y: number;
  value: string;
  mode: "math" | "text";
}

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
  },
);

export default function MathCanvas() {
  const [notes, setNotes] = useState<CanvasNote[]>([]);
  const [activeInput, setActiveInput] = useState<{
    id?: string;
    x: number;
    y: number;
    value?: string;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleCanvasDoubleClick = (event: React.MouseEvent) => {
    if (!rootRef.current) {
      return;
    }

    const rect = rootRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setActiveInput({ x, y });
  };

  const handleSubmit = (value: string) => {
    if (!activeInput) {
      return;
    }

    const trimmed = value.trim();
    const mode: "math" | "text" = /\\[A-Za-z]/.test(trimmed) ? "math" : "text";

    if (!trimmed) {
      setActiveInput(null);
      return;
    }

    if (activeInput.id) {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeInput.id ? { ...note, value: trimmed, mode } : note,
        ),
      );
    } else {
      setNotes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          x: activeInput.x,
          y: activeInput.y,
          value: trimmed,
          mode,
        },
      ]);
    }

    setActiveInput(null);
  };

  const renderedNotes = useMemo(
    () =>
      notes.map((note) => {
        if (note.mode === "text") {
          return { id: note.id, html: "", isMath: false };
        }

        try {
          return {
            id: note.id,
            html: katex.renderToString(note.value, {
              throwOnError: false,
              displayMode: false,
            }),
            isMath: true,
          };
        } catch {
          return { id: note.id, html: note.value, isMath: false };
        }
      }),
    [notes],
  );

  return (
    <div
      ref={rootRef}
      className="relative h-screen w-full"
      onDoubleClick={handleCanvasDoubleClick}
    >
      <div className="absolute inset-0">
        <Excalidraw />
      </div>

      {activeInput && (
        <MathInput
          x={activeInput.x}
          y={activeInput.y}
          initialValue={activeInput.value}
          onSubmit={handleSubmit}
          onCancel={() => setActiveInput(null)}
        />
      )}

      {notes.map((note, index) => {
        const rendered = renderedNotes[index];
        return (
          <div
            key={note.id}
            className="absolute z-10 max-w-115 rounded px-1 py-0.5 text-zinc-900"
            style={{ left: note.x, top: note.y }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              setActiveInput({
                id: note.id,
                x: note.x,
                y: note.y,
                value: note.value,
              });
            }}
          >
            {rendered?.isMath ? (
              <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {note.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
