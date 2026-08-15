import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { pathForPrefectureList } from "../stations";
import { pathForContactReceived, pathForPrivacy } from "../staticPages";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";

/**
 * お問い合わせ送信後の到達ページ（FormSubmitの_nextの飛び先）。
 *
 * 「送信されました」の1行だけにしないこと。それでは有用性の低いページを自分から
 * 増やすことになる。受け取った内容をどう扱うか・返信の目安を書いて、
 * 送った側が次に何を期待していいか分かる状態にしている。
 */
export default function ContactReceivedPage() {
  const lang = useLang();
  const t = useT();

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("contactReceivedPage.titleTag")}</title>
        <meta name="description" content={t("contactReceivedPage.description")} />
        <meta property="og:title" content={t("contactReceivedPage.ogTitle")} />
        <meta property="og:description" content={t("contactReceivedPage.description")} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`${SITE_URL}${pathForContactReceived(lang)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForContactReceived("ja")}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForContactReceived("en")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForContactReceived("ja")}`} />
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
        <h2>{t("contactReceivedPage.ogTitle")}</h2>
        <p>{t("contactReceivedPage.lead")}</p>

        <h3>{t("contactReceivedPage.nextHeading")}</h3>
        <ul>
          <li>{t("contactReceivedPage.nextSource")}</li>
          <li>{t("contactReceivedPage.nextBatch")}</li>
          <li>{t("contactReceivedPage.nextReply")}</li>
          <li>{t("contactReceivedPage.nextRemoval")}</li>
        </ul>

        <p>
          <Link to={pathForPrefectureList(lang)}>{t("contactReceivedPage.backHome")}</Link>
          {" ／ "}
          <Link to={pathForPrivacy(lang)}>{t("contactReceivedPage.backPrivacy")}</Link>
        </p>
      </main>
    </div>
  );
}
