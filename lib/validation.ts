import { z } from "zod";
import { parseRepoUrl } from "./repo-url";

export const analyzeRequestSchema = z.object({
  mode: z.enum(["github", "demo"]).default("github"),
  repoUrl: z.string().trim().max(300).optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export type ValidatedAnalyzeRequest =
  | { ok: true; mode: "demo"; repoUrl: null }
  | { ok: true; mode: "github"; repoUrl: string }
  | { ok: false; message: string };

export function validateAnalyzeRequest(input: unknown): ValidatedAnalyzeRequest {
  const parsed = analyzeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid request. Provide a repository URL or choose demo mode.",
    };
  }

  if (parsed.data.mode === "demo") {
    return { ok: true, mode: "demo", repoUrl: null };
  }

  const repoUrl = parsed.data.repoUrl?.trim();
  if (!repoUrl) {
    return { ok: false, message: "Enter a GitHub repository URL." };
  }
  if (!parseRepoUrl(repoUrl)) {
    return {
      ok: false,
      message:
        "Enter a valid GitHub repository URL, for example https://github.com/owner/repo.",
    };
  }

  return { ok: true, mode: "github", repoUrl };
}
