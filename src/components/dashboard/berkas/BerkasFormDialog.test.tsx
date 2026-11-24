import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";

// Same bootstrap pattern as BerkasSignatureField.test.tsx / BerkasTtdDialog.test.tsx.
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
  "HTMLSelectElement",
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

// The dialog imports getPdfPageCount from the Berkas client bundle, which uses
// pdfjs and cannot parse in this environment. The module export is a
// non-configurable getter, so the cached module object is replaced before the
// dialog (and BerkasSignatureField) are required.
/* eslint-disable @typescript-eslint/no-require-imports */
const clientModuleId = require.resolve("@/components/dashboard/berkas/client");
const realClient = require(clientModuleId) as Record<string, unknown>;
if (require.cache[clientModuleId]) {
  require.cache[clientModuleId].exports = {
    ...realClient,
    getPdfPageCount: async () => 1,
  };
}
/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable @typescript-eslint/no-require-imports */
const blobClient = require("@vercel/blob/client") as {
  upload: (...args: unknown[]) => Promise<{ pathname: string }>;
};
const { cleanup, fireEvent, render, screen, waitFor } =
  require("@testing-library/react") as typeof import("@testing-library/react");
const { default: BerkasFormDialog } =
  require("./BerkasFormDialog") as typeof import("./BerkasFormDialog");
/* eslint-enable @typescript-eslint/no-require-imports */

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type UploadFn = (
  pathname: string,
  body: File,
  options?: unknown,
) => Promise<{ pathname: string }>;

const CURRENT_USER = {
  id: "99999999-9999-4999-8999-999999999999",
  name: "Penyusun Satu",
  position: "Site Engineer",
};
const OPTIONS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Validator Satu", position: "PM" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Validator Dua", position: "EM" },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetch(postHandler?: () => Response) {
  const fetchMock = mock.fn<FetchFn>(async (input, init) => {
    const url = String(input);
    if (url.includes("/api/berkas/user-options")) {
      return jsonResponse({ data: OPTIONS });
    }
    if (url === "/api/berkas" && init?.method === "POST") {
      return postHandler ? postHandler() : jsonResponse({ data: { id: "berkas-1" } }, 201);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  globals.fetch = fetchMock;
  return fetchMock;
}

function postCalls(fetchMock: ReturnType<typeof mock.fn<FetchFn>>) {
  return fetchMock.mock.calls.filter(
    (call) => String(call.arguments[0]) === "/api/berkas",
  );
}

function renderForm() {
  const onSaved = mock.fn();
  const onClose = mock.fn();
  const view = render(
    createElement(BerkasFormDialog, {
      currentUser: CURRENT_USER,
      onClose,
      onSaved,
    }),
  );
  return { ...view, onSaved, onClose };
}

async function fillForm(
  container: HTMLElement,
  options: { withTtd: boolean },
): Promise<void> {
  fireEvent.change(screen.getByLabelText(/Nama Berkas/), {
    target: { value: "Berita Acara Pemeriksaan" },
  });

  const pdfInput = container.querySelector('input[accept="application/pdf,.pdf"]');
  assert.ok(pdfInput, "PDF input should be rendered");
  fireEvent.change(pdfInput, {
    target: {
      files: [new File([new Uint8Array([1, 2, 3])], "dokumen.pdf", { type: "application/pdf" })],
    },
  });

  await waitForOptions(container);
  const selects = container.querySelectorAll("select");
  fireEvent.change(selects[0] as HTMLSelectElement, { target: { value: OPTIONS[0]!.id } });
  fireEvent.change(selects[1] as HTMLSelectElement, { target: { value: OPTIONS[1]!.id } });

  fireEvent.change(screen.getByLabelText(/Jabatan Penyusun/), {
    target: { value: "Site Engineer" },
  });
  fireEvent.change(screen.getByLabelText(/Jabatan Validasi 1/), {
    target: { value: "Project Manager" },
  });
  fireEvent.change(screen.getByLabelText(/Jabatan Validasi 2/), {
    target: { value: "Engineering Manager" },
  });

  if (options.withTtd) {
    const ttdInput = container.querySelector(
      'input[accept="image/png,image/jpeg,.png,.jpg,.jpeg"]',
    );
    assert.ok(ttdInput, "signature input should be rendered");
    fireEvent.change(ttdInput, {
      target: {
        files: [new File([new Uint8Array([1, 2, 3])], "ttd.png", { type: "image/png" })],
      },
    });
  }
}

async function waitForOptions(container: HTMLElement): Promise<void> {
  await waitFor(() => {
    const selects = container.querySelectorAll("select");
    assert.equal(selects.length, 2);
    assert.equal(selects[0]?.options.length, OPTIONS.length + 1);
  });
}

test("field TTD penyusun memakai tab Upload File sebagai default", async () => {
  installFetch();
  const { container } = renderForm();
  await waitForOptions(container);

  assert.equal(
    screen.getByRole("tab", { name: "Upload File" }).getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    screen.getByRole("tab", { name: "Gambar TTD" }).getAttribute("aria-selected"),
    "false",
  );
  assert.ok(screen.getByText("Upload TTD Penyusun"));
});

test("berpindah ke tab Gambar TTD merender canvas", async () => {
  installFetch();
  const { container } = renderForm();
  await waitForOptions(container);

  fireEvent.click(screen.getByRole("tab", { name: "Gambar TTD" }));

  assert.ok(screen.getByLabelText("Area tanda tangan"));
  assert.equal(
    screen.getByRole("tab", { name: "Gambar TTD" }).getAttribute("aria-selected"),
    "true",
  );
});

test("submit tanpa TTD menampilkan error inline dan tidak memanggil POST", async () => {
  const fetchMock = installFetch();
  const { container } = renderForm();

  await fillForm(container, { withTtd: false });
  fireEvent.click(screen.getByRole("button", { name: "Ajukan Berkas" }));

  assert.ok(screen.getByText("Upload TTD penyusun terlebih dahulu."));
  assert.equal(postCalls(fetchMock).length, 0);
});

test("respons 409 menampilkan banner error dan tombol Simpan kembali aktif", async () => {
  const fetchMock = installFetch(() =>
    jsonResponse({ error: { message: "Status Berkas sudah berubah." } }, 409),
  );
  const uploadMock = mock.fn<UploadFn>(async (pathname) => ({ pathname }));
  blobClient.upload = uploadMock as unknown as typeof blobClient.upload;

  const { container, onSaved } = renderForm();
  await fillForm(container, { withTtd: true });
  fireEvent.click(screen.getByRole("button", { name: "Ajukan Berkas" }));

  await waitFor(() => assert.ok(screen.getByText("Status Berkas sudah berubah.")));
  assert.equal(onSaved.mock.callCount(), 0);
  const submit = screen.getByRole("button", { name: "Ajukan Berkas" }) as HTMLButtonElement;
  assert.equal(submit.disabled, false);
  assert.equal(postCalls(fetchMock).length, 1);
});

test("submit lengkap mengirim penyusun[0].ttdPathname sebagai string", async () => {
  const fetchMock = installFetch(() => jsonResponse({ data: { id: "berkas-1" } }, 201));
  const uploadMock = mock.fn<UploadFn>(async (pathname) => ({ pathname }));
  blobClient.upload = uploadMock as unknown as typeof blobClient.upload;

  const { container, onSaved } = renderForm();
  await fillForm(container, { withTtd: true });
  fireEvent.click(screen.getByRole("button", { name: "Ajukan Berkas" }));

  await waitFor(() => assert.equal(onSaved.mock.callCount(), 1));

  const calls = postCalls(fetchMock);
  assert.equal(calls.length, 1);
  const init = calls[0]?.arguments[1] as RequestInit;
  const body = JSON.parse(String(init.body)) as {
    uploadId: string;
    originalPdf: { pathname: string };
    penyusun: Array<{ urutan: number; ttdPathname: string }>;
    validasi: unknown[];
  };

  assert.equal(body.penyusun.length, 1);
  assert.equal(body.penyusun[0]?.urutan, 1);
  assert.equal(typeof body.penyusun[0]?.ttdPathname, "string");
  assert.match(body.penyusun[0]!.ttdPathname, /\/penyusun\/1\//);
  assert.match(body.originalPdf.pathname, /\/original\//);
  assert.equal(body.validasi.length, 2);
  assert.equal(
    body.penyusun[0]!.ttdPathname,
    uploadMock.mock.calls[1]?.arguments[0],
  );
});
