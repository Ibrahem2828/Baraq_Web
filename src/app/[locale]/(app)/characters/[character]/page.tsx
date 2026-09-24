import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CHARACTERS, type CharacterKey } from "@/config/characters";
import { CharacterDetailView } from "@/features/characters/CharacterDetailView";
import { KhotaHub } from "@/features/characters/KhotaHub";
import { FahesHub } from "@/features/characters/FahesHub";
import { RasheedHub } from "@/features/characters/RasheedHub";
import { KholasaHub } from "@/features/characters/KholasaHub";
import { SadaHub } from "@/features/characters/SadaHub";
import { ActiveProjectProvider } from "@/features/projects/ActiveProjectContext";
import { RequireProject } from "@/features/projects/components/RequireProject";
import { LoadingState } from "@/components/feedback/LoadingState";

function isCharacterKey(value: string): value is CharacterKey {
  return value in CHARACTERS;
}

/**
 * Every supported character has a real hub. Availability and entitlement are
 * determined by the backend capabilities contract, never by a browser-only
 * rollout flag.
 */
export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ character: string }>;
}) {
  const { character } = await params;
  if (!isCharacterKey(character)) {
    notFound();
  }

  const definition = CHARACTERS[character];
  let content;
  if (definition.isLive) {
    switch (character) {
      case "khota":
        content = <KhotaHub character={definition} />;
        break;
      case "fahes":
        content = <FahesHub character={definition} />;
        break;
      case "rasheed":
        content = <RasheedHub character={definition} />;
        break;
      case "kholasa":
        content = <KholasaHub character={definition} />;
        break;
      case "sada":
        content = <SadaHub character={definition} />;
        break;
    }
  }
  content ??= <CharacterDetailView character={definition} />;

  return (
    <Suspense fallback={<LoadingState />}>
      <ActiveProjectProvider>
        <RequireProject>{content}</RequireProject>
      </ActiveProjectProvider>
    </Suspense>
  );
}
