import { JoinFlow } from "./JoinFlow";

/**
 * The invitation token is read here, on the server, and passed down.
 *
 * Reading the `searchParams` prop is what the Next documentation
 * recommends over calling `useSearchParams` in a client component, and it
 * keeps the token resolution on one side of the boundary.
 *
 * Rendered per request: the whole purpose of the route is to resolve a
 * credential that arrives in the URL, so a cached copy is both useless and
 * wrong.
 */
export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;

  return <JoinFlow initialToken={typeof token === "string" ? token : null} />;
}
