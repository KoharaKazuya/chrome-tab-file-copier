/** Chrome Extension から Native Host へ送るコピー要求。 */
export type CopyFilesRequest = {
  type: "COPY_FILES";
  sourceRoot: string;
  destination: string;
  keys: string[];
};

/** Native Host が受け付ける要求。 */
export type NativeRequest = CopyFilesRequest;

/** コピー前の検証で検出した問題。 */
export type PrecheckIssue = {
  type: string;
  key?: string;
  path?: string;
};

/** 全ファイルをコピーできた場合の応答。 */
export type CopySucceededResponse = {
  success: true;
  copiedFiles: string[];
};

/** コピー開始前の検証に失敗した場合の応答。 */
export type PrecheckFailedResponse = {
  success: false;
  error: "PRECHECK_FAILED";
  issues: PrecheckIssue[];
};

/** コピー途中で失敗した場合の応答。 */
export type CopyFailedResponse = {
  success: false;
  error: "COPY_FAILED";
  failedFile: string;
  copiedFiles: string[];
};

/** Native Host から Extension へ返す応答。 */
export type NativeResponse =
  CopySucceededResponse | PrecheckFailedResponse | CopyFailedResponse;
