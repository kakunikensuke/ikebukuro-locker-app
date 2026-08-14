// 駅・ロッカーのデータに依存しない固定ページ（プライバシーポリシー等）の定義。
// プリレンダ（scripts/prerender.js）とクライアント双方から読むため、
// config.js とは分けている（config.js は import.meta.env を使うのでNodeから読めない）。
import { langPrefix } from "./stations.js";

// お問い合わせ先のGoogleフォーム。駅前スコア（eki-facility-app）と同じフォームを共用する。
// 差し替えるときはここだけ直せば、ポリシーページ・プリレンダの双方に反映される。
// 末尾の ?usp=publish-editor 等は編集者向けの付随パラメータなので付けないこと。
// 短縮URL（forms.gle/...）ではなくこの形式を使うのは、リダイレクトを挟まず
// ドメインがそのまま見えるため（連絡先の信頼性が問われる場面で有利）。
export const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSetahrVFYNfl0WBCeZhbpyJV4wj8hXt7Uoq-JsGzfNfQCFC9A/viewform";

// 運営者の表記。本名ではなく屋号のみを出す方針（2026-08-14、ユーザー判断）。
// 物販をしないため特定商取引法の表示義務の対象外で、AdSenseも本名までは要求していない。
export const OPERATOR_NAME = "kakuni-lab";

export function pathForPrivacy(lang) {
  return `${langPrefix(lang)}/privacy`;
}

export function hasContactForm() {
  return CONTACT_FORM_URL.length > 0;
}
