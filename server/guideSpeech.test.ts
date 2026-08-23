import { describe, expect, it } from "vitest";
import { prepareGuideSpeech } from "./guideSpeech";
import { inferSpeechLanguage } from "../shared/speechLanguage";

describe("guide speech preparation", () => {
  it("uses the multilingual guide voice with the selected spoken language", () => {
    expect(prepareGuideSpeech("Hello there", "English").payload.language_code).toBe("en");
    expect(prepareGuideSpeech("नमस्ते", "हिन्दी").payload.language_code).toBe("hi");
    expect(prepareGuideSpeech("నమస్కారం", "తెలుగు").payload).not.toHaveProperty("language_code");
    expect(prepareGuideSpeech("Hello there", "English").payload.model_id).toBe("eleven_multilingual_v2");
  });

  it("cleans lightweight markdown before speech synthesis", () => {
    const result = prepareGuideSpeech("**Check** [this list](https://example.com)", "English");
    expect(result.payload.text).toBe("Check this list");
  });

  it("uses the script in the guide response to preserve Hindi and Telugu speech", () => {
    expect(inferSpeechLanguage("यह अगला कदम है", "English")).toBe("हिन्दी");
    expect(inferSpeechLanguage("ఇది తదుపరి దశ", "English")).toBe("తెలుగు");
    expect(inferSpeechLanguage("Here is a next step", "हिन्दी")).toBe("हिन्दी");
    expect(inferSpeechLanguage("Here is a next step", "తెలుగు")).toBe("తెలుగు");
  });
});
