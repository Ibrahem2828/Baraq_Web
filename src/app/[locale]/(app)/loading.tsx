import { LoadingState } from "@/components/feedback/LoadingState";

export default function AppSectionLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingState />
    </div>
  );
}
