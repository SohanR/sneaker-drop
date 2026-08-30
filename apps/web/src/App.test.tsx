import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("frontend foundation", () => {
  it("renders the dashboard shell", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("The next drop lands here.");
    expect(html).toContain("Waiting for the first drop");
  });
});
