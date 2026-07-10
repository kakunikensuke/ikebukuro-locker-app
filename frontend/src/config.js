// 本番公開時はVITE_SITE_URL環境変数で実際のドメインに差し替える
export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://example.com";
