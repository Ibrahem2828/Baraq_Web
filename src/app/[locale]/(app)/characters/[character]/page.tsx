import { notFound } from "next/navigation";
import { CHARACTERS, type CharacterKey } from "@/config/characters";
import { CharacterDetailView } from "@/features/characters/CharacterDetailView";
import { KhotaHub } from "@/features/characters/KhotaHub";

function isCharacterKey(value: string): value is CharacterKey {
  return value in CHARACTERS;
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ character: string }>;
}) {
  const { character } = await params;
  if (!isCharacterKey(character)) {
    notFound();
  }

  // Khota (study planning) is a full workflow hub — highest Phase 2 feature
  // priority — not the generic identity page every other character gets.
  // Rasheed/Fahes get the same treatment as their own domains are built out.
  if (character === "khota") {
    return <KhotaHub character={CHARACTERS[character]} />;
  }

  return <CharacterDetailView character={CHARACTERS[character]} />;
}
