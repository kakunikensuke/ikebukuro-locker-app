import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { pathForPrefectureList } from "../stations";
import {
  CONTACT_FORM_ENDPOINT,
  CONTACT_SUBJECT,
  CONTACT_TOPICS,
  OPERATOR_NAME,
  hasContactForm,
  pathForContactReceived,
  pathForPrivacy,
} from "../staticPages";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";

const GOOGLE_AD_SETTINGS_URL = "https://adssettings.google.com/";

export default function PrivacyPage() {
  const lang = useLang();
  const t = useT();

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("privacyPage.titleTag")}</title>
        <meta name="description" content={t("privacyPage.description")} />
        <meta property="og:title" content={t("privacyPage.ogTitle")} />
        <meta property="og:description" content={t("privacyPage.description")} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`${SITE_URL}${pathForPrivacy(lang)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForPrivacy("ja")}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForPrivacy("en")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForPrivacy("ja")}`} />
      </Helmet>

      <header className="app-header">
        <h1>
          <Link to={pathForPrefectureList(lang)} className="app-title-link">
            {t("app.title")}
          </Link>
        </h1>
        <div className="header-controls">
          <LangSwitcher />
        </div>
      </header>

      <main className="app-main legal-page">
        <h2>{t("privacyPage.ogTitle")}</h2>
        <p className="legal-updated">{t("privacyPage.updated")}</p>

        <h3>{t("privacyPage.operatorHeading")}</h3>
        <p>{t("privacyPage.operatorBody", { operator: OPERATOR_NAME })}</p>

        <h3>{t("privacyPage.analyticsHeading")}</h3>
        <p>{t("privacyPage.analyticsBody")}</p>

        <h3>{t("privacyPage.adsHeading")}</h3>
        <p>
          {t("privacyPage.adsBody")}{" "}
          <a href={GOOGLE_AD_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
            {t("privacyPage.adsSettingsLink")}
          </a>
        </p>

        <h3>{t("privacyPage.collectHeading")}</h3>
        <ul>
          <li>{t("privacyPage.collectNoPersonal")}</li>
          <li>{t("privacyPage.collectSubmit")}</li>
        </ul>

        <h3>{t("privacyPage.accuracyHeading")}</h3>
        <ul>
          <li>{t("privacyPage.accuracySource")}</li>
          <li>{t("privacyPage.accuracyQuantity")}</li>
          <li>{t("privacyPage.accuracyLiability")}</li>
        </ul>

        <h3>{t("privacyPage.sourcesHeading")}</h3>
        <ul>
          <li>{t("privacyPage.sourcesLocker")}</li>
          <li>{t("privacyPage.sourcesStation")}</li>
          <li>{t("privacyPage.sourcesMap")}</li>
        </ul>

        <h3>{t("privacyPage.contactHeading")}</h3>
        {/* 送信先が未設定のうちは「準備中」と正直に出す。
            動かないフォームを置くより、状態を書いておく方が誠実で審査上も安全。
            なおこのフォームは scripts/prerender.js の privacyPage() にも同じ内容がある。
            片方だけ直すと静的HTMLと画面の中身がズレるので必ず両方を直すこと */}
        {hasContactForm() ? (
          <>
            <p>{t("privacyPage.contactBody")}</p>
            <form className="contact-form" action={CONTACT_FORM_ENDPOINT} method="POST">
              <input type="hidden" name="_subject" value={CONTACT_SUBJECT} />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_next" value={`${SITE_URL}${pathForContactReceived(lang)}`} />
              {/* ボット除け。人間には見えない欄で、埋まっていたら送信を捨てる */}
              <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

              <label>
                <span>
                  {t("privacyPage.formTopic")} <em>（{t("privacyPage.formRequired")}）</em>
                </span>
                <select name="種類" required defaultValue={CONTACT_TOPICS[0]}>
                  {CONTACT_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {t(`privacyPage.formTopic_${topic}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t("privacyPage.formPage")}</span>
                <input type="url" name="該当ページ" placeholder={`${SITE_URL}${pathForPrefectureList(lang)}`} />
              </label>

              <label>
                <span>
                  {t("privacyPage.formDetails")} <em>（{t("privacyPage.formRequired")}）</em>
                </span>
                <textarea name="内容" rows="6" required />
              </label>

              <label>
                <span>{t("privacyPage.formSource")}</span>
                <input type="url" name="参照元" />
              </label>
              <p className="contact-form-note">{t("privacyPage.formSourceNote")}</p>

              <label>
                <span>{t("privacyPage.formEmail")}</span>
                <input type="email" name="email" />
              </label>
              <p className="contact-form-note">{t("privacyPage.formEmailNote")}</p>

              <button type="submit">{t("privacyPage.formSubmit")}</button>
            </form>
          </>
        ) : (
          <p>{t("privacyPage.contactPending")}</p>
        )}
      </main>
    </div>
  );
}
