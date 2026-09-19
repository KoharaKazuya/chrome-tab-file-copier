export type UrlPatternTestResult =
  | { kind: "INVALID_PATTERN"; message: string }
  | { kind: "NO_MATCH" }
  | { kind: "MISSING_CAPTURE" }
  | { kind: "EMPTY_CAPTURE" }
  | { kind: "MATCHED"; key: string };

/** URL に正規表現を適用し、第 1 キャプチャをコピー対象名として評価する。 */
export function testUrlPattern(
  pattern: string,
  url: string,
): UrlPatternTestResult {
  let expression: RegExp;

  try {
    expression = new RegExp(pattern);
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { kind: "INVALID_PATTERN", message };
  }

  const match = expression.exec(url);
  if (!match) {
    return { kind: "NO_MATCH" };
  }
  if (match[1] === undefined) {
    return { kind: "MISSING_CAPTURE" };
  }
  if (!match[1]) {
    return { kind: "EMPTY_CAPTURE" };
  }

  return { kind: "MATCHED", key: match[1] };
}
