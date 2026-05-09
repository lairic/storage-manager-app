"use client";

import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import type { TenantNote } from "@/lib/types";

interface Props {
  notes: TenantNote[];
}

export function CommunicationsCard({ notes }: Props) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-teal-900/40">
          <MessageSquare size={16} className="text-teal-400" />
        </div>
        <p className="text-sm font-semibold text-white">Recent Communications</p>
      </div>

      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border-l-2 border-teal-700 pl-3">
              <p className="text-sm text-slate-200 leading-snug">{note.text}</p>
              <div className="flex items-center gap-2 mt-1">
                {note.tenantName && (
                  <span className="text-xs text-teal-400">{note.tenantName}</span>
                )}
                <span className="text-xs text-slate-500">
                  {formatDateTime(note.createdAt)}
                </span>
                {note.createdBy && (
                  <span className="text-xs text-slate-500">· {note.createdBy}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No recent communications</p>
      )}
    </Card>
  );
}
