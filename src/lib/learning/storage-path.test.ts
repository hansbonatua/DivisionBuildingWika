import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEARNING_ATTACHMENT_MAX_BYTES,
  LEARNING_ATTACHMENT_PREFIX,
  LEARNING_THUMBNAIL_MAX_BYTES,
  LEARNING_THUMBNAIL_PREFIX,
  buildLearningAttachmentPathname,
  buildLearningThumbnailPathname,
  isLearningAttachmentMimeTypeAllowed,
  isValidLearningAttachmentPathname,
  isValidLearningThumbnailPathname,
  normalizeExternalUrl,
} from "@/lib/learning/storage-path";

describe("learning storage policy", () => {
  it("keeps thumbnails in the public namespace and attachments in the private one", () => {
    const thumbnail = buildLearningThumbnailPathname("Poster Sesi.PNG");
    const attachment = buildLearningAttachmentPathname("Materi Sesi.pdf");

    assert.ok(thumbnail);
    assert.ok(attachment);
    assert.ok(thumbnail.startsWith(LEARNING_THUMBNAIL_PREFIX));
    assert.ok(attachment.startsWith(LEARNING_ATTACHMENT_PREFIX));

    assert.equal(isValidLearningThumbnailPathname(thumbnail), true);
    assert.equal(isValidLearningAttachmentPathname(attachment), true);

    // A thumbnail path is never a valid attachment path and vice versa.
    assert.equal(isValidLearningAttachmentPathname(thumbnail), false);
    assert.equal(isValidLearningThumbnailPathname(attachment), false);
  });

  it("rejects unsupported formats and tampered segments", () => {
    assert.equal(buildLearningThumbnailPathname("poster.svg"), null);
    assert.equal(buildLearningAttachmentPathname("script.exe"), null);
    assert.equal(
      isValidLearningAttachmentPathname(
        "regulation/00000000-0000-4000-8000-000000000000/file.pdf",
      ),
      false,
    );
    assert.equal(
      isValidLearningAttachmentPathname(
        "learning/../../etc/passwd.pdf",
      ),
      false,
    );
    assert.equal(
      isValidLearningThumbnailPathname(
        "cms/learning/00000000-0000-4000-8000-000000000000/poster.pdf",
      ),
      false,
    );
  });

  it("pins the documented size limits", () => {
    assert.equal(LEARNING_THUMBNAIL_MAX_BYTES, 5 * 1024 * 1024);
    assert.equal(LEARNING_ATTACHMENT_MAX_BYTES, 20 * 1024 * 1024);
  });

  it("validates attachment MIME per extension", () => {
    assert.equal(
      isLearningAttachmentMimeTypeAllowed(".pdf", "application/pdf"),
      true,
    );
    assert.equal(
      isLearningAttachmentMimeTypeAllowed(".pdf", "application/zip"),
      false,
    );
    assert.equal(
      isLearningAttachmentMimeTypeAllowed(".doc", "application/octet-stream"),
      true,
    );
    assert.equal(
      isLearningAttachmentMimeTypeAllowed(
        ".pptx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ),
      true,
    );
  });

  it("accepts only http(s) external links", () => {
    assert.equal(
      normalizeExternalUrl("https://pendaftaran.wika.co.id/training"),
      "https://pendaftaran.wika.co.id/training",
    );
    assert.equal(normalizeExternalUrl("javascript:alert(1)"), null);
    assert.equal(normalizeExternalUrl("ftp://files.example.com/a.pdf"), null);
    assert.equal(normalizeExternalUrl("https://example.com/a b"), null);
  });
});
