export function friendlyError(raw: string): string {
  const msg = (raw || '').trim();
  if (!msg) return '稍后再试';

  const lower = msg.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    return '网络不太稳定，稍后再试';
  }
  if (lower.includes('unauthorized') || lower.includes('401') || msg.includes('登录已过期')) {
    return '登录已过期，请重新登录';
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout')) {
    return '响应有点慢，稍后再试';
  }
  if (lower.includes('too many') || lower.includes('rate limit') || lower.includes('429')) {
    return '请求有点频繁，稍后再试';
  }
  if (lower.includes('upload failed') || lower.includes('request failed')) {
    return '稍后再试';
  }
  if (lower.includes('stream failed') || lower.includes('llm_error')) {
    return 'AI 暂时忙不过来，稍后再试';
  }
  // 已是中文短句则保留；过长英文技术栈压缩
  if (/[\u4e00-\u9fff]/.test(msg) && msg.length <= 80) return msg;
  if (msg.length > 120 || /^[A-Za-z0-9_:[\]{}()"'\s./-]+$/.test(msg)) {
    return '稍后再试';
  }
  return msg;
}
