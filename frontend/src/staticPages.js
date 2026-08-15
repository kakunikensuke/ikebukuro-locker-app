// 駅・ロッカーのデータに依存しない固定ページ（プライバシーポリシー等）の定義。
// プリレンダ（scripts/prerender.js）とクライアント双方から読むため、
// config.js とは分けている（config.js は import.meta.env を使うのでNodeから読めない）。
import { langPrefix } from "./stations.js";

// お問い合わせフォームの送信先（FormSubmit）。メールアドレスのエイリアスで、
// 生のアドレスはHTMLに出ない。japan-proxy-cost・駅前スコアと同じ送信先を共用し、
// 件名（_subject）で発信元アプリを見分ける。
// ここを空文字にするとお問い合わせ欄ごと出さない（動かないフォームは置かない方針）。
//
// ⚠ 有効化はドメイン単位（2026-08-15に実測）。エイリアス文字列はメールアドレス単位で
// 共通だが、フォームを置くURLごとに1回「ACTIVATE FORM」を押す必要がある。
// 押すまでの送信はメールにならず、有効化依頼が届くだけで無言で失敗する。
// 新しいドメイン（本番・プレビュー等）に載せたら、必ず1通送って有効化を済ませること。
export const CONTACT_FORM_ENDPOINT = "https://formsubmit.co/21c6f56659051072bab367d0af9fb0bc";

// JSから送るときのエンドポイント。素のPOSTだと _next が効かず、FormSubmitの英語の
// 完了ページに飛ばされてサイトを離れてしまう（2026-08-15に駅前スコアが本番で確認）。
// こちらへfetchして、成功をレスポンス本文で確かめてからサイト内で遷移する
export const CONTACT_FORM_AJAX_ENDPOINT = CONTACT_FORM_ENDPOINT.replace(
  "formsubmit.co/",
  "formsubmit.co/ajax/"
);

// 受信メールの件名。3アプリが同じ受信箱に届くので、ここだけが発信元の手がかりになる。
// 他のアプリと同じ文字列にしないこと
export const CONTACT_SUBJECT = "池袋ロッカーアプリ — お問い合わせ";

// 運営者の表記。本名ではなく屋号のみを出す方針（2026-08-14、ユーザー判断）。
// 物販をしないため特定商取引法の表示義務の対象外で、AdSenseも本名までは要求していない。
export const OPERATOR_NAME = "kakuni-lab";

export function pathForPrivacy(lang) {
  return `${langPrefix(lang)}/privacy`;
}

// 送信後の飛び先（FormSubmitの_next）。存在しないと送信後に404になるので必ず出力すること
export function pathForContactReceived(lang) {
  return `${langPrefix(lang)}/contact-received`;
}

// 解説記事。"guides"は静的セグメントなので:stationSlugより優先してマッチする
// （同名の駅slugが無いことは確認済み）
export function pathForGuideList(lang) {
  return `${langPrefix(lang)}/guides`;
}

export function pathForGuide(lang, slug) {
  return `${langPrefix(lang)}/guides/${slug}`;
}

export function hasContactForm() {
  return CONTACT_FORM_ENDPOINT.length > 0;
}

// フォームの選択肢。React側とプリレンダ側で同じ順・同じvalueにするため配列で持つ。
// valueは受信メールにそのまま載るので日本語のままでよい（英語ページからの送信も同じ値にして、
// 受信側で見比べられるようにしている）
export const CONTACT_TOPICS = ["ロッカー情報の誤り", "駅の追加リクエスト", "削除依頼", "その他"];

/**
 * フォームの項目定義。**ここが唯一の定義**で、React（components/ContactForm.jsx）と
 * プリレンダ（scripts/prerender.js）が両方ここから `<form>` を組む。
 * 以前は同じHTMLを2箇所に書いていたが、それでは必ずズレるため集約した
 * （駅前スコアで同じ問題に当たっている）。
 *
 * name属性は日本語のままでよい。受信メールの項目名になるだけで、
 * 英語ページからの送信も同じnameにしておくと受信側で見比べやすい。
 */
export const CONTACT_FORM_FIELDS = [
  { kind: "select", name: "種類", labelKey: "privacyPage.formTopic", required: true, options: CONTACT_TOPICS },
  { kind: "url", name: "該当ページ", labelKey: "privacyPage.formPage" },
  { kind: "textarea", name: "内容", labelKey: "privacyPage.formDetails", required: true, rows: 6 },
  { kind: "url", name: "参照元", labelKey: "privacyPage.formSource", noteKey: "privacyPage.formSourceNote" },
  { kind: "email", name: "email", labelKey: "privacyPage.formEmail", noteKey: "privacyPage.formEmailNote" },
];

// FormSubmitに渡す制御用の隠し項目。_nextは言語ごとに変える（英語ページから送って
// 日本語のお礼ページに飛ぶのは不親切なため）。
// JSが動く場合は_nextは使われないが、静的HTMLのまま素のPOSTになる経路のために残す
export function contactFormHidden(lang, siteUrl) {
  return [
    { name: "_subject", value: CONTACT_SUBJECT },
    { name: "_captcha", value: "false" },
    { name: "_template", value: "table" },
    { name: "_next", value: `${siteUrl}${pathForContactReceived(lang)}` },
  ];
}
