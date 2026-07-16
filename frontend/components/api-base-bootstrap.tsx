/** 把服务端运行时的 API 地址注入到 window，避免 Next 构建期绑死域名 */
export function ApiBaseBootstrap({ apiBase }: { apiBase: string }) {
  const normalized = normalizeApiBase(apiBase);
  const code = `window.__PETPAL_API_BASE__=${JSON.stringify(normalized)};`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function normalizeApiBase(raw: string) {
  const s = (raw || '').trim();
  if (!s) return 'http://localhost:4001';
  if (s.startsWith('http://') || s.startsWith('https://')) return s.replace(/\/$/, '');
  return `https://${s.replace(/\/$/, '')}`;
}
