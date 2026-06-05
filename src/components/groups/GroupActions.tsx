"use client";

import { useState } from "react";
import { Plus, Hash } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import JoinGroupModal from "./JoinGroupModal";

interface GroupActionsProps {
  /** Show as large CTA buttons (empty state) or small secondary buttons */
  variant?: "empty" | "compact";
}

export default function GroupActions({ variant = "empty" }: GroupActionsProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  if (variant === "compact") {
    return (
      <>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-[#00c85a]/10 text-[#00c85a] text-xs font-semibold rounded-xl border border-[#00c85a]/20 hover:bg-[#00c85a]/15 transition-colors"
          >
            <Plus size={13} />
            Crear grupo
          </button>
          <button
            onClick={() => setJoinOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-[#20203a] text-[#94a3b8] text-xs font-semibold rounded-xl border border-[#2a2a45] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
          >
            <Hash size={13} />
            Unirse
          </button>
        </div>

        <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />
        <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setCreateOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-[#00c85a] text-[#0a0a12] text-xs font-bold rounded-xl hover:bg-[#00e87a] transition-colors"
        >
          <Plus size={14} />
          Crear grupo
        </button>
        <button
          onClick={() => setJoinOpen(true)}
          className="flex-1 h-9 bg-[#20203a] text-[#94a3b8] text-xs font-semibold rounded-xl border border-[#2a2a45] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
        >
          Tengo un código
        </button>
      </div>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}
