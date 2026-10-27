import type { Category, Language, Severity } from "../types";

export interface LineRule {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  languages?: Language[];
  pattern: RegExp;
  suggestion: string;
  fix?: string;
  skipComments?: boolean;
  skipIf?: (line: string) => boolean;
}

export interface FileRule {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  test: (content: string, lines: string[]) => boolean;
  line?: (content: string, lines: string[]) => number;
  snippet: (content: string, lines: string[]) => string;
  suggestion: string;
  fix?: string;
}

const ENV_REFERENCE = /process\.env|os\.environ|getenv|import\.meta\.env|Deno\.env/i;
const PLACEHOLDER =
  /example|placeholder|your[_-]|changeme|replace[_-]?me|dummy|sample|xxx|test[_-]?key|fake/i;

export const LINE_RULES: LineRule[] = [
  {
    id: "security.hardcoded-secret",
    title: "Possible hardcoded secret",
    description:
      "A credential-like value appears to be assigned directly in source code. Committed secrets should be treated as compromised.",
    severity: "critical",
    category: "security",
    pattern:
      /(?:api[_-]?key|apikey|secret|password|passwd|client[_-]?secret|access[_-]?token|auth[_-]?token)\s*[:=]\s*["'`][^"'`\s]{8,}["'`]/i,
    skipIf: (line) => ENV_REFERENCE.test(line) || PLACEHOLDER.test(line),
    suggestion:
      "Move the value into an environment variable or secret manager, then rotate the exposed credential.",
    fix: "const apiKey = process.env.API_KEY;",
  },
  {
    id: "security.token-pattern",
    title: "Credential token pattern detected",
    description:
      "The line contains a value shaped like a cloud or source-control access token.",
    severity: "critical",
    category: "security",
    pattern:
      /\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/,
    skipIf: (line) => ENV_REFERENCE.test(line) || PLACEHOLDER.test(line),
    suggestion:
      "Remove the token from the repository, rotate it with the provider, and load it from server-side environment variables.",
  },
  {
    id: "security.private-key",
    title: "Private key material detected",
    description:
      "A PEM private key header was found in a source file. Private keys must never be committed.",
    severity: "critical",
    category: "security",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    suggestion:
      "Delete the key from the repository and history, rotate it immediately, and store it in a secret manager.",
  },
  {
    id: "security.eval",
    title: "Use of eval()",
    description:
      "eval executes arbitrary code from a string and is a common injection and remote-code-execution risk.",
    severity: "high",
    category: "security",
    languages: ["TypeScript", "JavaScript", "Python"],
    pattern: /\beval\s*\(/,
    suggestion:
      "Replace eval with a purpose-built parser or an explicit allow-list of operations.",
    fix: "const parsed = JSON.parse(raw); // only when the input is JSON",
  },
  {
    id: "security.new-function",
    title: "Dynamic code construction",
    description:
      "new Function() compiles a string into executable code and carries the same risks as eval.",
    severity: "high",
    category: "security",
    languages: ["TypeScript", "JavaScript"],
    pattern: /\bnew\s+Function\s*\(/,
    suggestion:
      "Avoid dynamic code generation. Use a typed function map or a safe expression parser.",
  },
  {
    id: "security.dangerously-set-html",
    title: "Unsanitized HTML rendering",
    description:
      "dangerouslySetInnerHTML bypasses React's escaping and can introduce cross-site scripting.",
    severity: "medium",
    category: "security",
    languages: ["TypeScript", "JavaScript"],
    pattern: /\bdangerouslySetInnerHTML\b/,
    suggestion:
      "Sanitize untrusted HTML with a maintained library such as DOMPurify, or render text instead.",
    fix: "const safeHtml = DOMPurify.sanitize(user.bio);",
  },
  {
    id: "security.innerhtml",
    title: "Direct innerHTML assignment",
    description:
      "Assigning untrusted content to innerHTML can execute injected scripts.",
    severity: "medium",
    category: "security",
    languages: ["TypeScript", "JavaScript"],
    pattern: /\.innerHTML\s*=/,
    suggestion:
      "Use textContent for plain text, or sanitize the HTML before assigning it.",
  },
  {
    id: "security.document-write",
    title: "document.write() usage",
    description:
      "document.write can overwrite the page and is unsafe with untrusted input.",
    severity: "medium",
    category: "security",
    languages: ["TypeScript", "JavaScript"],
    pattern: /\bdocument\.write\s*\(/,
    suggestion: "Create DOM nodes with DOM APIs instead of writing raw HTML.",
  },
  {
    id: "security.shell-true",
    title: "Shell command with shell=True",
    description:
      "Passing shell=True to a subprocess can turn untrusted input into command injection.",
    severity: "high",
    category: "security",
    languages: ["Python"],
    pattern: /shell\s*=\s*True/,
    suggestion:
      "Pass an argument list and leave shell disabled. Validate and allow-list any user input.",
    fix: "subprocess.run([\"git\", \"status\"], check=True, shell=False)",
  },
  {
    id: "security.pickle",
    title: "Unsafe pickle deserialization",
    description:
      "pickle can execute arbitrary code while loading untrusted data.",
    severity: "high",
    category: "security",
    languages: ["Python"],
    pattern: /\bpickle\.loads?\s*\(/,
    suggestion:
      "Use JSON or another non-executable format for untrusted data, or verify a signature before unpickling.",
  },
  {
    id: "bug.debugger",
    title: "Debugger statement",
    description:
      "A debugger statement pauses execution when developer tools are open.",
    severity: "medium",
    category: "bug",
    languages: ["TypeScript", "JavaScript"],
    pattern: /\bdebugger\s*;?/,
    skipComments: true,
    suggestion: "Remove the debugger statement before shipping.",
  },
  {
    id: "bug.empty-catch",
    title: "Empty catch block",
    description:
      "Errors are silently swallowed, which hides failures and makes production debugging difficult.",
    severity: "medium",
    category: "bug",
    languages: ["TypeScript", "JavaScript"],
    pattern: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/,
    suggestion:
      "Handle the error, rethrow it with context, or log it through a structured logger.",
    fix: "catch (error) {\n  logger.error(\"Operation failed\", { error });\n}",
  },
  {
    id: "bug.bare-except",
    title: "Bare except clause",
    description:
      "A bare except catches every exception, including interrupts and system exits, and hides the real failure.",
    severity: "medium",
    category: "bug",
    languages: ["Python"],
    pattern: /^\s*except\s*:/,
    suggestion:
      "Catch a specific exception type and handle or re-raise it with context.",
    fix: "except Exception as error:\n    logger.exception(\"Operation failed\")",
  },
  {
    id: "maintainability.ts-ignore",
    title: "Type checking suppressed",
    description:
      "A TypeScript suppression comment hides a type error instead of resolving it.",
    severity: "low",
    category: "maintainability",
    languages: ["TypeScript"],
    pattern: /@ts-(?:ignore|expect-error|nocheck)\b/,
    suggestion:
      "Fix the underlying type error, or narrow the suppression to one line with a documented reason.",
  },
  {
    id: "maintainability.any",
    title: "Implicit any escape hatch",
    description:
      "The any type disables TypeScript's safety guarantees at this location.",
    severity: "low",
    category: "maintainability",
    languages: ["TypeScript"],
    pattern: /(?::\s*any\b|\bas\s+any\b)/,
    skipComments: true,
    suggestion:
      "Use a specific interface, a generic, or unknown plus a runtime check.",
    fix: "function parseUser(input: unknown): User { /* validate first */ }",
  },
  {
    id: "maintainability.todo",
    title: "Unresolved TODO / FIXME",
    description:
      "A deferred task is recorded in source code without an owner or tracking link.",
    severity: "info",
    category: "maintainability",
    pattern: /\b(?:TODO|FIXME|HACK)\b/,
    suggestion:
      "Link the item to an issue and include an owner or target date, or resolve it now.",
  },
  {
    id: "style.console",
    title: "Console logging in application code",
    description:
      "Direct console output is easy to leave in production and may leak sensitive values.",
    severity: "low",
    category: "style",
    languages: ["TypeScript", "JavaScript"],
    pattern: /\bconsole\.(?:log|debug|info)\s*\(/,
    skipComments: true,
    suggestion:
      "Use a structured logger with levels, or remove the statement before shipping.",
  },
  {
    id: "style.var",
    title: "Legacy var declaration",
    description:
      "var is function-scoped and hoisted, which can produce surprising behavior.",
    severity: "low",
    category: "style",
    languages: ["JavaScript"],
    pattern: /^\s*var\s+[A-Za-z_$]/,
    skipComments: true,
    suggestion: "Use const by default, or let when reassignment is required.",
  },
  {
    id: "style.print",
    title: "Print statement in Python",
    description:
      "print() writes directly to stdout and is usually not appropriate in library or service code.",
    severity: "low",
    category: "style",
    languages: ["Python"],
    pattern: /^\s*print\s*\(/,
    skipComments: true,
    suggestion:
      "Use the logging module so output can be filtered and routed appropriately.",
  },
  {
    id: "security.python-exec",
    title: "Use of exec()",
    description:
      "exec executes dynamically constructed Python code and is unsafe with untrusted input.",
    severity: "high",
    category: "security",
    languages: ["Python"],
    pattern: /\bexec\s*\(/,
    suggestion:
      "Avoid dynamic execution. Use an explicit mapping of allowed operations.",
  },
];

export const FILE_RULES: FileRule[] = [
  {
    id: "maintainability.large-file",
    title: "Large source file",
    description:
      "Large files are harder to review, test, and reason about, and often mix several responsibilities.",
    severity: "medium",
    category: "maintainability",
    test: (_content, lines) => lines.length > 500,
    line: () => 1,
    snippet: (_content, lines) => `File contains ${lines.length} lines.`,
    suggestion:
      "Split the file into focused modules with clear boundaries and add tests around each one.",
  },
  {
    id: "maintainability.high-complexity",
    title: "High branching density",
    description:
      "The file contains many conditional and loop constructs, which raises the cost of testing and changing it.",
    severity: "medium",
    category: "maintainability",
    test: (content, lines) => {
      if (lines.length < 80) return false;
      const matches = content.match(
        /\b(?:if|for|while|case|catch|switch)\b|&&|\|\||\?\?|\?\./g,
      );
      return (matches?.length ?? 0) > 45;
    },
    line: () => 1,
    snippet: (content) => {
      const matches = content.match(
        /\b(?:if|for|while|case|catch|switch)\b|&&|\|\||\?\?|\?\./g,
      );
      return `Approximately ${matches?.length ?? 0} branching constructs detected.`;
    },
    suggestion:
      "Extract cohesive branches into named functions, use early returns, and add tests for each path.",
  },
  {
    id: "style.long-line",
    title: "Very long line",
    description:
      "Long lines are difficult to read and review, especially on smaller screens and in diffs.",
    severity: "low",
    category: "style",
    test: (_content, lines) => lines.some((line) => line.length > 220),
    line: (_content, lines) =>
      Math.max(1, lines.findIndex((line) => line.length > 220) + 1),
    snippet: (_content, lines) => {
      const line = lines.find((value) => value.length > 220) ?? "";
      return line.trim().slice(0, 200);
    },
    suggestion:
      "Wrap the expression across multiple lines or extract part of it into a named variable.",
  },
];

export function isCommentLine(line: string, language: Language): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return true;
  }
  if (language === "Python" && trimmed.startsWith("#")) return true;
  return false;
}

export function lineNumberOf(content: string, index: number): number {
  return content.slice(0, Math.max(0, index)).split(/\r\n|\r|\n/).length;
}
