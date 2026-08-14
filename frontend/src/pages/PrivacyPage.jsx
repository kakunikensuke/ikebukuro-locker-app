import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { pathForPrefectureList } from "../stations";
import { CONTACT_FORM_URL, OPERATOR_NAME, hasContactForm, pathForPrivacy } from "../staticPages";
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
        {/* フォームURLが未設定のうちは「準備中」と正直に出す。
            リンク切れや押せないボタンを置くより、状態を書いておく方が誠実で審査上も安全 */}
        {hasContactForm() ? (
          <p>
            {t("privacyPage.contactBody")}{" "}
            <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
              {t("privacyPage.contactLink")}
            </a>
          </p>
        ) : (
          <p>{t("privacyPage.contactPending")}</p>
        )}
      </main>
    </div>
  );
}
