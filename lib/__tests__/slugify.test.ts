import { describe, expect, it } from "vitest";
import { slugify } from "../slugify";

describe("slugify", () => {
  it.each([
    ["Hello World", "hello-world"],
    ["Hello, World!", "hello-world"],
    ["Hello   World---Test", "hello-world-test"],
    ["  Hello World  ", "hello-world"],
    ["hello_world test", "hello-world-test"],
    ["---Already--Sluggy---", "already-sluggy"],
    ["", ""],
    ["already-a-slug", "already-a-slug"],
  ])("slugifies %p as %p", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
