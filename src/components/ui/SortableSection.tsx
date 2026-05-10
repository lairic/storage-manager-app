"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";

interface Props {
  id: string;
  children: React.ReactNode;
}

export function SortableSection({ id, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="w-full flex justify-center pb-1.5 touch-none cursor-grab active:cursor-grabbing select-none"
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
      >
        <GripHorizontal size={14} className="text-slate-300 dark:text-slate-600" />
      </button>
      <div className={isDragging ? "opacity-50" : ""}>{children}</div>
    </div>
  );
}
