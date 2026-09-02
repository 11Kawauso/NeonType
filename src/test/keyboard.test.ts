import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";
import { Keyboard, keycapFor } from "../components/Keyboard.tsx";

describe("keycapFor", () => {
  it("maps letters, space, and shifted symbols to keycaps", () => {
    expect(keycapFor("m")).toBe("m");
    expect(keycapFor("M")).toBe("m");
    expect(keycapFor(" ")).toBe(" ");
    expect(keycapFor("!")).toBe("1");
    expect(keycapFor("{")).toBe("[");
    expect(keycapFor('"')).toBe("'");
    expect(keycapFor("_")).toBe("-");
    expect(keycapFor(null)).toBe(null);
  });
});

describe("Keyboard", () => {
  it("lights the next key yellow and keeps cyan press on top", () => {
    const nextOnly = renderToStaticMarkup(createElement(Keyboard, { lit: null, next: "m" }));
    expect(nextOnly).toContain(">M</div>");
    expect(nextOnly.match(/class="key next">M</)?.[0]).toBeDefined();
    expect(nextOnly.match(/class="key next"/g)?.length).toBe(1);

    const both = renderToStaticMarkup(createElement(Keyboard, { lit: "m", next: "m" }));
    expect(both).toContain('class="key next lit">M<');

    const shifted = renderToStaticMarkup(createElement(Keyboard, { lit: null, next: "{" }));
    expect(shifted).toContain('class="key next">[<');

    const space = renderToStaticMarkup(createElement(Keyboard, { lit: null, next: " " }));
    expect(space).toContain('class="key space next">SPACE<');

    const hidden = renderToStaticMarkup(createElement(Keyboard, { lit: null, next: null }));
    expect(hidden).not.toContain("key next");
  });
});
