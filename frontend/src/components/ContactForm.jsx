import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CONTACT_FORM_AJAX_ENDPOINT,
  CONTACT_FORM_ENDPOINT,
  CONTACT_FORM_FIELDS,
  contactFormHidden,
  pathForContactReceived,
} from "../staticPages";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";

/**
 * お問い合わせフォーム。項目の定義は staticPages.js が持ち、
 * プリレンダ（scripts/prerender.js の contactFormHtml()）も同じ定義から組む。
 *
 * なぜJSで送るのか:
 * 素のPOSTだと送信後の戻り先を指定する _next が効かず、FormSubmitの英語の完了ページに
 * 飛ばされてサイトを離れてしまう（2026-08-15に駅前スコアが本番で確認。公式ドキュメントに
 * 制約の記載がなく原因は特定できていない）。AJAXエンドポイントへ送ってサイト内で遷移させる。
 *
 * action属性は残してある。プリレンダされた静的HTML（JSが動く前や、JSを実行しない
 * クローラが見る状態）では素のPOSTとして機能するため、JSが失敗しても送信手段は失われない。
 */
export default function ContactForm() {
  const lang = useLang();
  const t = useT();
  const navigate = useNavigate();
  const [state, setState] = useState("idle"); // idle | sending | error

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("sending");

    let response;
    try {
      response = await fetch(CONTACT_FORM_AJAX_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
    } catch {
      // fetch自体が届かなかった場合だけ素のPOSTに切り替える（拡張機能によるCORS遮断など）。
      // ここでページ遷移するので、この後の処理は走らない
      form.submit();
      return;
    }

    // ステータスだけ見てはいけない。FormSubmitは未有効化のドメインからの送信にも
    // HTTP 200を返し、本文で「有効化が必要」と伝えてくる。
    // 2026-08-15にこれで「メールは届いていないのに成功と判定する」状態になっていた
    const payload = await response.json().catch(() => null);
    if (!response.ok || String(payload?.success) !== "true") {
      setState("error");
      return;
    }
    navigate(pathForContactReceived(lang));
  }

  return (
    <form
      className="contact-form"
      action={CONTACT_FORM_ENDPOINT}
      method="POST"
      onSubmit={handleSubmit}
    >
      {contactFormHidden(lang, SITE_URL).map((h) => (
        <input key={h.name} type="hidden" name={h.name} value={h.value} />
      ))}
      {/* ボット除け。人間には見えない欄で、埋まっていたら送信を捨てる */}
      <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

      {CONTACT_FORM_FIELDS.map((field) => (
        <React.Fragment key={field.name}>
          <label>
            <span>
              {t(field.labelKey)}
              {field.required && <em>（{t("privacyPage.formRequired")}）</em>}
            </span>
            {field.kind === "select" ? (
              <select name={field.name} required={field.required} defaultValue={field.options[0]}>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {t(`privacyPage.formTopic_${option}`)}
                  </option>
                ))}
              </select>
            ) : field.kind === "textarea" ? (
              <textarea name={field.name} rows={field.rows} required={field.required} />
            ) : (
              <input type={field.kind} name={field.name} required={field.required} />
            )}
          </label>
          {field.noteKey && <p className="contact-form-note">{t(field.noteKey)}</p>}
        </React.Fragment>
      ))}

      {state === "error" && <p className="contact-form-error">{t("privacyPage.formError")}</p>}

      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? t("privacyPage.formSending") : t("privacyPage.formSubmit")}
      </button>
    </form>
  );
}
