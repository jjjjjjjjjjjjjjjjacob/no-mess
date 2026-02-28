import { act, renderHook } from "@testing-library/react";
import { usePreviewRefresh } from "../use-preview-refresh";

describe("usePreviewRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call onRefresh on initial mount", () => {
    const onRefresh = vi.fn();

    renderHook(() =>
      usePreviewRefresh({
        formData: { body: "hello" },
        title: "Test",
        isPreviewActive: true,
        onRefresh,
        delay: 500,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("calls onRefresh after debounce when form data changes", () => {
    const onRefresh = vi.fn();

    const { rerender } = renderHook(
      ({ formData, title }) =>
        usePreviewRefresh({
          formData,
          title,
          isPreviewActive: true,
          onRefresh,
          delay: 500,
        }),
      {
        initialProps: { formData: { body: "hello" }, title: "Test" },
      },
    );

    // Change form data
    rerender({ formData: { body: "hello world" }, title: "Test" });

    // Not called yet (debounce)
    expect(onRefresh).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("calls onRefresh after debounce when title changes", () => {
    const onRefresh = vi.fn();

    const { rerender } = renderHook(
      ({ formData, title }) =>
        usePreviewRefresh({
          formData,
          title,
          isPreviewActive: true,
          onRefresh,
          delay: 500,
        }),
      {
        initialProps: { formData: { body: "hello" }, title: "Test" },
      },
    );

    rerender({ formData: { body: "hello" }, title: "Updated Title" });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not call onRefresh when isPreviewActive is false", () => {
    const onRefresh = vi.fn();

    const { rerender } = renderHook(
      ({ formData, title }) =>
        usePreviewRefresh({
          formData,
          title,
          isPreviewActive: false,
          onRefresh,
          delay: 500,
        }),
      {
        initialProps: { formData: { body: "hello" }, title: "Test" },
      },
    );

    rerender({ formData: { body: "changed" }, title: "Test" });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("debounces multiple rapid changes into one call", () => {
    const onRefresh = vi.fn();

    const { rerender } = renderHook(
      ({ formData, title }) =>
        usePreviewRefresh({
          formData,
          title,
          isPreviewActive: true,
          onRefresh,
          delay: 500,
        }),
      {
        initialProps: { formData: { body: "a" }, title: "T" },
      },
    );

    rerender({ formData: { body: "ab" }, title: "T" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ formData: { body: "abc" }, title: "T" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ formData: { body: "abcd" }, title: "T" });

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
