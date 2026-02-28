import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Module mocks — must be before any import that touches the mocked modules
// ---------------------------------------------------------------------------

const mockGenerateUploadUrl = vi.fn();
const mockCreateAsset = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn((ref: string) => {
    if (ref === "assets:generateUploadUrl") return mockGenerateUploadUrl;
    if (ref === "assets:create") return mockCreateAsset;
    return vi.fn();
  }),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    assets: {
      generateUploadUrl: "assets:generateUploadUrl",
      create: "assets:create",
    },
  },
}));

vi.mock("lucide-react", () => ({
  Upload: (props: Record<string, unknown>) => (
    <svg data-testid="upload-icon" {...props} />
  ),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { UploadDropzone } from "../upload-dropzone";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const siteId = "site-123" as any;

function createMockFile(name: string, type: string, size = 1024): File {
  const file = new File(["x".repeat(size)], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function renderDropzone(
  overrides: { onUploadComplete?: (assetId: any) => void } = {},
) {
  const onUploadComplete = overrides.onUploadComplete ?? vi.fn();
  return {
    onUploadComplete,
    ...render(
      <UploadDropzone siteId={siteId} onUploadComplete={onUploadComplete} />,
    ),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGenerateUploadUrl.mockReset();
  mockCreateAsset.mockReset();
  // Default: successful upload flow
  mockGenerateUploadUrl.mockResolvedValue("https://upload.example.com/url");
  mockCreateAsset.mockResolvedValue("new-asset-id");

  // Mock global fetch for the upload step
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ storageId: "storage-abc" }),
    }),
  );

  // Mock URL.createObjectURL and URL.revokeObjectURL for image dimension detection
  vi.stubGlobal("URL", {
    ...globalThis.URL,
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UploadDropzone", () => {
  describe("rendering", () => {
    it("renders the upload icon", () => {
      renderDropzone();
      expect(screen.getByTestId("upload-icon")).toBeInTheDocument();
    });

    it("renders the default instructional text", () => {
      renderDropzone();
      expect(
        screen.getByText("Drop files here or click to upload"),
      ).toBeInTheDocument();
    });

    it("renders the supported files description", () => {
      renderDropzone();
      expect(
        screen.getByText("Images, documents, and other files up to 20MB"),
      ).toBeInTheDocument();
    });

    it("has a hidden file input", () => {
      const { container } = renderDropzone();
      const input = container.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass("hidden");
    });

    it("file input supports multiple files", () => {
      const { container } = renderDropzone();
      const input = container.querySelector('input[type="file"]');
      expect(input).toHaveAttribute("multiple");
    });

    it("has role=button and is focusable", () => {
      renderDropzone();
      const dropzone = screen.getByRole("button");
      expect(dropzone).toHaveAttribute("tabindex", "0");
    });
  });

  describe("click to upload", () => {
    it("opens file picker when the dropzone is clicked", async () => {
      const { container } = renderDropzone();
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      const dropzone = screen.getByRole("button");
      await userEvent.setup().click(dropzone);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("opens file picker on Enter keypress", () => {
      const { container } = renderDropzone();
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      const dropzone = screen.getByRole("button");
      fireEvent.keyDown(dropzone, { key: "Enter" });

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("drag and drop", () => {
    it("applies drag-over styling on dragOver", () => {
      renderDropzone();
      const dropzone = screen.getByRole("button");

      fireEvent.dragOver(dropzone);

      expect(dropzone.className).toMatch(/border-primary/);
    });

    it("removes drag styling on dragLeave", () => {
      renderDropzone();
      const dropzone = screen.getByRole("button");

      fireEvent.dragOver(dropzone);
      expect(dropzone.className).toMatch(/border-primary/);

      fireEvent.dragLeave(dropzone);
      expect(dropzone.className).not.toMatch(/border-primary bg-primary/);
    });

    it("handles file drop and triggers upload", async () => {
      const onUploadComplete = vi.fn();
      renderDropzone({ onUploadComplete });
      const dropzone = screen.getByRole("button");

      const file = createMockFile("photo.png", "image/png");
      const dataTransfer = { files: [file] };

      fireEvent.drop(dropzone, { dataTransfer });

      await waitFor(() => {
        expect(mockGenerateUploadUrl).toHaveBeenCalled();
      });
    });
  });

  describe("file input change", () => {
    it("triggers upload when files are selected via input", async () => {
      const onUploadComplete = vi.fn();
      const { container } = renderDropzone({ onUploadComplete });
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = createMockFile("doc.pdf", "application/pdf");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockGenerateUploadUrl).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockCreateAsset).toHaveBeenCalledWith(
          expect.objectContaining({
            siteId,
            storageId: "storage-abc",
            filename: "doc.pdf",
            mimeType: "application/pdf",
          }),
        );
      });
    });
  });

  describe("upload flow", () => {
    it("calls generateUploadUrl, then fetch, then createAsset for non-image files", async () => {
      const onUploadComplete = vi.fn();
      const { container } = renderDropzone({ onUploadComplete });
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = createMockFile("readme.txt", "text/plain", 512);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockGenerateUploadUrl).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "https://upload.example.com/url",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "text/plain" },
          }),
        );
      });

      await waitFor(() => {
        expect(mockCreateAsset).toHaveBeenCalledWith({
          siteId,
          storageId: "storage-abc",
          filename: "readme.txt",
          mimeType: "text/plain",
          size: 512,
          width: undefined,
          height: undefined,
        });
      });

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalledWith("new-asset-id");
      });
    });

    it("calls onUploadComplete for each uploaded file", async () => {
      const onUploadComplete = vi.fn();
      const { container } = renderDropzone({ onUploadComplete });
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file1 = createMockFile("a.txt", "text/plain");
      const file2 = createMockFile("b.txt", "text/plain");

      mockCreateAsset
        .mockResolvedValueOnce("asset-a")
        .mockResolvedValueOnce("asset-b");

      fireEvent.change(input, { target: { files: [file1, file2] } });

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalledTimes(2);
      });

      expect(onUploadComplete).toHaveBeenCalledWith("asset-a");
      expect(onUploadComplete).toHaveBeenCalledWith("asset-b");
    });
  });

  describe("uploading state", () => {
    it("shows uploading text with file count during upload", async () => {
      // Delay the upload so we can check the uploading state
      let resolveUpload!: (value: string) => void;
      mockGenerateUploadUrl.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve;
          }),
      );

      const { container } = renderDropzone();
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = createMockFile("photo.png", "image/png");
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Uploading 1 file...")).toBeInTheDocument();
      });

      // Clean up
      resolveUpload("https://upload.example.com/url");
    });

    it("shows plural text for multiple files", async () => {
      let resolveUpload!: (value: string) => void;
      mockGenerateUploadUrl.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve;
          }),
      );

      const { container } = renderDropzone();
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file1 = createMockFile("a.txt", "text/plain");
      const file2 = createMockFile("b.txt", "text/plain");
      fireEvent.change(input, { target: { files: [file1, file2] } });

      await waitFor(() => {
        expect(screen.getByText("Uploading 2 files...")).toBeInTheDocument();
      });

      // Clean up
      resolveUpload("https://upload.example.com/url");
    });

    it("applies disabled styling during upload", async () => {
      let resolveUpload!: (value: string) => void;
      mockGenerateUploadUrl.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve;
          }),
      );

      renderDropzone();
      const dropzone = screen.getByRole("button");
      const input = dropzone.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = createMockFile("photo.png", "image/png");
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(dropzone.className).toMatch(/pointer-events-none/);
        expect(dropzone.className).toMatch(/opacity-60/);
      });

      // Clean up
      resolveUpload("https://upload.example.com/url");
    });
  });

  describe("error handling", () => {
    it("does not throw when upload fails and shows error toast", async () => {
      mockGenerateUploadUrl.mockRejectedValue(new Error("Upload failed"));

      const { container } = renderDropzone();
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = createMockFile("bad.png", "image/png");
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Upload failed. Please try again.",
        );
      });

      // Dropzone should return to normal state after error
      await waitFor(() => {
        expect(
          screen.getByText("Drop files here or click to upload"),
        ).toBeInTheDocument();
      });
    });

    it("does not call onUploadComplete when upload fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockGenerateUploadUrl.mockRejectedValue(new Error("Network error"));

      const onUploadComplete = vi.fn();
      const { container } = renderDropzone({ onUploadComplete });
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = createMockFile("fail.txt", "text/plain");
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText("Drop files here or click to upload"),
        ).toBeInTheDocument();
      });

      expect(onUploadComplete).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe("empty file list", () => {
    it("does nothing when an empty file list is provided", () => {
      const { container } = renderDropzone();
      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(input, { target: { files: [] } });

      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
    });
  });
});
