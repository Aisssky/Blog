// 本地类型声明：仓库离线环境无法安装 @types/js-yaml。
// js-yaml 在 Worker 中仅用于 frontmatter 的 dump/load，签名足够简单，这里放宽类型。
declare module 'js-yaml' {
  export function dump(input: unknown, opts?: Record<string, unknown>): string;
  export function load(input: string, opts?: Record<string, unknown>): unknown;
  export function safeLoad(input: string, opts?: Record<string, unknown>): unknown;
  export function safeDump(input: unknown, opts?: Record<string, unknown>): string;
  const _default: { dump: typeof dump; load: typeof load; safeLoad: typeof safeLoad; safeDump: typeof safeDump };
  export default _default;
}
