import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/feedback/EmptyState";

describe("EmptyState", () => {
  it("renders the title, description, and action", () => {
    render(
      <EmptyState
        title="Your library is empty"
        description="Upload your first study source to get started"
        action={<button>Upload a source</button>}
      />,
    );

    expect(screen.getByText("Your library is empty")).toBeInTheDocument();
    expect(screen.getByText("Upload your first study source to get started")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload a source" })).toBeInTheDocument();
  });

  it("omits the description paragraph when none is given", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
