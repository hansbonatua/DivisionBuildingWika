import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import type { BerkasDto } from "@/components/dashboard/berkas/types";

// Same bootstrap pattern as BerkasSignatureField.test.tsx: jsdom must exist
// before @testing-library/react is loaded, and signature_pad needs a canvas
// context object because jsdom has no 2D backend.

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const browserWindow = dom.window as unknown as Window & typeof globalThis;
const globals = globalThis as unknown as Record<string, unknown>;

globals.window = browserWindow;
globals.document = browserWindow.document;
try {
  Object.defineProperty(globalThis, "navigator", {
    value: browserWindow.navigator,
    configurable: true,
  });
} catch {
  // Node's own navigator is fine for these tests.
}
for (const key of [
  "HTMLElement",
  "HTMLCanvasElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "CustomEvent",
  "MutationObserver",
  "DocumentFragment",
  "NodeList",
  "SVGElement",
  "getComputedStyle",
]) {
  globals[key] = (browserWindow as unknown as Record<string, unknown>)[key];
}
globals.IS_REACT_ACT_ENVIRONMENT = true;

URL.createObjectURL = () => "blob:mock-url";
URL.revokeObjectURL = () => undefined;

const canvasContext = new Proxy({} as Record<string | symbol, unknown>, {
  get: (target, property) =>
    property in target ? target[property] : () => undefined,
  set: (target, property, next) => {
    target[property] = next;
    return true;
  },
});
(
  dom.window.HTMLCanvasElement.prototype as unknown as {
    getContext: () => unknown;
  }
).getContext = () => canvasContext;

// The dialog imports `uploadFile` from a TypeScript module, whose exports are
// live bindings (getter-only). Replace the cached module exports with a
// delegating wrapper so each test can install its own mock.
// eslint-disable-next-line @typescript-eslint/no-require-imports
type UploadImpl = (
  ...args: unknown[]
) => Promise<{ pathname: string; url: string }>;
let uploadImpl: UploadImpl = async () => {
  throw new Error("uploadFile mock not installed");
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const uploadModuleId = require.resolve("@/lib/storage/upload-client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const realUploadClient = require(uploadModuleId) as Record<string, unknown>;
if (require.cache[uploadModuleId]) {
  require.cache[uploadModuleId].exports = {
    ...realUploadClient,
    uploadFile: (...args: unknown[]) => uploadImpl(...args),
  };
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanup, fireEvent, render, screen, waitFor } = require("@testing-library/react") as typeof import("@testing-library/react");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: BerkasTtdDialog } = require("./BerkasTtdDialog") as typeof import("./BerkasTtdDialog");

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

const BERKAS_ID = "55555555-5555-4555-8555-555555555555";
const UPLOADED_PATHNAME = `berkas/${BERKAS_ID}/validasi/1/ttd-mock.png`;

const berkas = {
  id: BERKAS_ID,
  judul: "Berita Acara Serah Terima",
  status: "MENUNGGU_TTD_1",
} as unknown as BerkasDto;

function pngFile(): File {
  return new File([new Uint8Array([1, 2, 3])], "ttd.png", { type: "image/png" });
}

function renderDialog(overrides: Partial<React.ComponentProps<typeof BerkasTtdDialog>> = {}) {
  const onSaved = mock.fn();
  const onClose = mock.fn();
  const view = render(
    createElement(BerkasTtdDialog, {
      berkas,
      urutan: 1,
      onClose,
      onSaved,
      ...overrides,
    }),
  );
  return { ...view, onSaved, onClose };
}

function selectPng(container: HTMLElement): File {
  const input = container.querySelector('input[type="file"]');
  assert.ok(input, "signature file input should be rendered");
  const file = pngFile();
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

test("dialog menampilkan tab Upload File aktif dan tab Gambar TTD", () => {
  renderDialog();

  assert.equal(
    screen.getByRole("tab", { name: "Upload File" }).getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    screen.getByRole("tab", { name: "Gambar TTD" }).getAttribute("aria-selected"),
    "false",
  );
});

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type UploadFn = (
  body: File,
  tokenRoute: string,
  options: { pathname: string },
) => Promise<{ pathname: string; url: string }>;

test("submit tanpa TTD menampilkan error lokal dan tidak memanggil fetch", () => {
  const fetchMock = mock.fn<FetchFn>(async () => new Response("{}", { status: 200 }));
  globals.fetch = fetchMock;
  renderDialog();

  fireEvent.click(screen.getByRole("button", { name: "Simpan TTD 1" }));

  assert.ok(screen.getByText("Pilih atau gambar TTD terlebih dahulu."));
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("upload PNG lalu Simpan mengirim pathname dan catatan ke API", async () => {
  const uploadMock = mock.fn<UploadFn>(async () => ({
    pathname: UPLOADED_PATHNAME,
    url: `https://storage.test/wibex-public/${UPLOADED_PATHNAME}`,
  }));
  uploadImpl = uploadMock as unknown as typeof uploadImpl;
  const fetchMock = mock.fn<FetchFn>(async () => new Response("{}", { status: 200 }));
  globals.fetch = fetchMock;

  const { container, onSaved } = renderDialog();
  const file = selectPng(container);

  fireEvent.click(screen.getByRole("button", { name: "Simpan TTD 1" }));

  await waitFor(() => assert.equal(onSaved.mock.callCount(), 1));

  assert.equal(uploadMock.mock.callCount(), 1);
  const uploadArgs = uploadMock.mock.calls[0]?.arguments ?? [];
  assert.equal(uploadArgs[0], file);
  assert.equal(uploadArgs[1], "/api/berkas/upload-token");
  const uploadOptions = uploadArgs[2] as { pathname: string };
  assert.match(
    uploadOptions.pathname,
    new RegExp(`^berkas/${BERKAS_ID}/validasi/1/`),
  );

  assert.equal(fetchMock.mock.callCount(), 1);
  const fetchArgs = fetchMock.mock.calls[0]?.arguments ?? [];
  assert.equal(fetchArgs[0], `/api/berkas/${BERKAS_ID}/ttd`);
  const init = fetchArgs[1] as RequestInit;
  assert.equal(init.method, "POST");
  assert.deepEqual(JSON.parse(String(init.body)), {
    ttd: { pathname: UPLOADED_PATHNAME },
    catatan: null,
  });
});

test("berpindah ke tab Gambar TTD merender canvas", () => {
  renderDialog();

  fireEvent.click(screen.getByRole("tab", { name: "Gambar TTD" }));

  assert.equal(
    screen.getByRole("tab", { name: "Gambar TTD" }).getAttribute("aria-selected"),
    "true",
  );
  assert.ok(screen.getByLabelText("Area tanda tangan"));
});

test("catatan 2000 karakter menampilkan 2000/2000", () => {
  const { container } = renderDialog();
  const textarea = container.querySelector("textarea");
  assert.ok(textarea, "catatan textarea should be rendered");

  fireEvent.change(textarea, { target: { value: "x".repeat(2000) } });

  assert.ok(screen.getByText("2000/2000"));
});
