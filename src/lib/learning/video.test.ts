import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeVideoUrl } from "@/lib/learning/video";

describe("learning video url normalization", () => {
  it("normalizes every supported YouTube share shape to one embed URL", () => {
    const expected = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    const inputs = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=30",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ];

    for (const input of inputs) {
      const normalized = normalizeVideoUrl(input);
      assert.equal(normalized?.provider, "youtube", input);
      assert.equal(normalized?.videoId, "dQw4w9WgXcQ", input);
      assert.equal(normalized?.embedUrl, expected, input);
    }
  });

  it("normalizes Vimeo share and player URLs", () => {
    const expected = "https://player.vimeo.com/video/123456789";
    for (const input of [
      "https://vimeo.com/123456789",
      "https://www.vimeo.com/123456789",
      "https://player.vimeo.com/video/123456789",
    ]) {
      const normalized = normalizeVideoUrl(input);
      assert.equal(normalized?.provider, "vimeo", input);
      assert.equal(normalized?.embedUrl, expected, input);
    }
  });

  it("rejects non-https, foreign hosts and malformed ids", () => {
    const inputs = [
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://evil.example/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=tooShort",
      "https://www.youtube.com/playlist?list=PL1234567890",
      "https://vimeo.com/channels/staffpicks/123456789",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "not a url",
    ];

    for (const input of inputs) {
      assert.equal(normalizeVideoUrl(input), null, input);
    }
  });
});
