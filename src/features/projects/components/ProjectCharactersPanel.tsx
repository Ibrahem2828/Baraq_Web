"use client";

import { CharacterGrid } from "@/components/brand/CharacterGrid";

export function ProjectCharactersPanel({ projectId }: { projectId: string }) {
  return <CharacterGrid projectId={projectId} />;
}
