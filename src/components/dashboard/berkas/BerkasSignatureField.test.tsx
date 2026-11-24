import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SignaturePad from "signature_pad";
import BerkasSignatureField, {
  isSignatureImageFile,
  signatureFileFromDataUrl,
  validateSignatureImageFile,
} from "./BerkasSignatureField";

// The project runs `node --test` (no Jest/Vitest). jsdom is installed only for
// this component suite because BerkasSignatureField needs a document, a canvas
// element and real DOM events.

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
  // Node's own navigator stays in place; nothing in the component needs it.
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

// jsdom ships no 2D canvas backend. signature_pad only needs a context object
// here, and this suite never draws a stroke, so every paint call is a no-op.
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

// Loaded after the jsdom globals exist: @testing-library reads `document` when
// its module is evaluated.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanup, fireEvent, render, screen } = require("@testing-library/react") as typeof import("@testing-library/react");

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

const noop = () => {};

function renderHtml(
  props: Partial<React.ComponentProps<typeof BerkasSignatureField>> = {},
): string {
  return renderToStaticMarkup(
    createElement(BerkasSignatureField, { value: null, onChange: noop, ...props }),
  );
}

function imageFile(name: string, type: string, size = 4): File {
  return new File([new Uint8Array(size)], name, { type });
}

// --- Static contract (server render) -------------------------------------

test("default mode menampilkan tab Upload File sebagai tab aktif", () => {
  const html = renderHtml();

  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true"[^>]*>Upload File/);
  assert.match(html, /aria-selected="false"[^>]*>Gambar TTD/);
  assert.match(html, /accept="image\/png,image\/jpeg,\.png,\.jpg,\.jpeg"/);
  assert.match(html, /PNG\/JPG, maksimal 2 MB/);
});

test("defaultMode draw merender canvas dan memindahkan tab aktif", () => {
  const html = renderHtml({ defaultMode: "draw" });

  assert.match(html, /aria-selected="false"[^>]*>Upload File/);
  assert.match(html, /aria-selected="true"[^>]*>Gambar TTD/);
  assert.match(html, /<canvas[^>]*aria-label="Area tanda tangan"/);
  assert.match(html, /aspect-\[3\/1\]/);
  assert.match(html, /touch-action:none/);
  assert.match(html, /background-color:#ffffff/);
  assert.doesNotMatch(html, /type="file"/);
});

test("mode draw menyediakan tombol Hapus dan Undo", () => {
  const html = renderHtml({ defaultMode: "draw" });

  assert.match(html, />Hapus</);
  assert.match(html, />Undo</);
  assert.match(html, /Gambar tanda tangan pada area di atas\./);
});

test("label dan error dari parent dirender sebagai role alert", () => {
  const html = renderHtml({ label: "TTD Penyusun", error: "TTD wajib diisi." });

  assert.match(html, />TTD Penyusun</);
  assert.match(html, /role="alert"/);
  assert.match(html, /TTD wajib diisi\./);
});

// --- Pure helpers --------------------------------------------------------

test("validasi menerima PNG/JPEG yang wajar dan menolak selain itu", () => {
  assert.equal(isSignatureImageFile(imageFile("ttd.png", "image/png")), true);
  assert.equal(isSignatureImageFile(imageFile("ttd.jpg", "image/jpeg")), true);
  // Extension fallback when the browser reports no MIME type.
  assert.equal(isSignatureImageFile(imageFile("ttd.jpeg", "")), true);
  assert.equal(isSignatureImageFile(imageFile("ttd.gif", "image/gif")), false);

  assert.equal(validateSignatureImageFile(imageFile("ttd.png", "image/png")), null);
  assert.equal(
    validateSignatureImageFile(imageFile("ttd.gif", "image/gif")),
    "TTD harus berupa gambar PNG atau JPG.",
  );
});

test("validasi menolak file kosong dan file di atas 2 MB", () => {
  assert.equal(
    validateSignatureImageFile(imageFile("ttd.png", "image/png", 0)),
    "Ukuran TTD maksimal 2 MB.",
  );
  assert.equal(
    validateSignatureImageFile(imageFile("ttd.png", "image/png", 2 * 1024 * 1024 + 1)),
    "Ukuran TTD maksimal 2 MB.",
  );
  assert.equal(
    validateSignatureImageFile(imageFile("ttd.png", "image/png", 2 * 1024 * 1024)),
    null,
  );
});

test("data URL canvas dikonversi menjadi File PNG bernama ttd-<timestamp>.png", async () => {
  const file = await signatureFileFromDataUrl("data:image/png;base64,iVBORw0KGgo=");

  assert.equal(file.type, "image/png");
  assert.match(file.name, /^ttd-\d+\.png$/);
  assert.ok(file.size > 0);
});

// --- Interaction (jsdom + Testing Library) -------------------------------

test("klik tab Gambar TTD merender canvas dan memindahkan aria-selected", () => {
  render(createElement(BerkasSignatureField, { value: null, onChange: noop }));

  fireEvent.click(screen.getByRole("tab", { name: "Gambar TTD" }));

  assert.equal(
    screen.getByRole("tab", { name: "Gambar TTD" }).getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    screen.getByRole("tab", { name: "Upload File" }).getAttribute("aria-selected"),
    "false",
  );
  assert.ok(screen.getByLabelText("Area tanda tangan"));
});

test("memilih file PNG di bawah 2 MB memanggil onChange dengan File tersebut", () => {
  const onChange = mock.fn();
  const { container } = render(
    createElement(BerkasSignatureField, { value: null, onChange }),
  );
  const input = container.querySelector('input[type="file"]');
  assert.ok(input instanceof browserWindow.HTMLInputElement);

  const file = imageFile("ttd.png", "image/png");
  fireEvent.change(input, { target: { files: [file] } });

  assert.equal(onChange.mock.callCount(), 1);
  assert.equal(onChange.mock.calls[0]?.arguments[0], file);
});

test("mode draw mendengarkan endStroke agar hasil goresan tersimpan", () => {
  const addSpy = mock.method(SignaturePad.prototype, "addEventListener");
  render(
    createElement(BerkasSignatureField, {
      value: null,
      onChange: noop,
      defaultMode: "draw",
    }),
  );

  const events = addSpy.mock.calls.map((call) => call.arguments[0]);
  assert.ok(
    events.includes("endStroke"),
    `expected an endStroke listener, got: ${events.join(", ")}`,
  );
  assert.ok(!events.includes("end"), "signature_pad 5.x does not emit \"end\"");
});

test("klik Hapus memanggil SignaturePad.clear", () => {
  const clearSpy = mock.method(SignaturePad.prototype, "clear");
  render(
    createElement(BerkasSignatureField, {
      value: null,
      onChange: noop,
      defaultMode: "draw",
    }),
  );
  const callsBefore = clearSpy.mock.callCount();

  fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

  assert.ok(
    clearSpy.mock.callCount() > callsBefore,
    "clear() should be called after clicking Hapus",
  );
});

test("mengganti tab memanggil onChange(null)", () => {
  const onChange = mock.fn();
  render(createElement(BerkasSignatureField, { value: null, onChange }));

  fireEvent.click(screen.getByRole("tab", { name: "Gambar TTD" }));

  const calls = onChange.mock.calls;
  assert.ok(calls.length >= 1);
  assert.equal(calls[calls.length - 1]?.arguments[0], null);
});
