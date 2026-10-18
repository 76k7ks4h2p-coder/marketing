/// <reference types="vite/client" />

/** 単体 HTML 版（pnpm build:standalone）でだけ埋め込まれるデータ。通常版では undefined */
declare const __TCN_EMBEDDED_DATA__: import('./domain/assemble.ts').RawCampusFiles | undefined
