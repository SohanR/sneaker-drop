import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardApp } from "./DashboardApp";

vi.mock("./hooks/use-realtime", () => ({ useRealtime: () => "idle" }));

describe("dashboard shell", () => {
  it("renders the live-drop heading and accessible loading state", () => {
    const html = renderToStaticMarkup(<DashboardApp />);
    expect(html).toContain("The next drop lands here.");
    expect(html).toContain("Loading drops");
    expect(html).toContain("Limited-drop concurrency simulation");
    expect(html).toContain("3-TIER DROP LAB");
    expect(html).toContain("Md Mizanur Rahman");
  });
});
