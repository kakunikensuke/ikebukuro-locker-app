import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { STATIONS, pathForStation } from "../stations";
import { useLang, useT } from "../i18n/LangContext.js";

export default function NotFound() {
  const lang = useLang();
  const t = useT();

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("notFound.title")}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <p className="empty-message">
        {t("notFound.message")}
        <br />
        <Link to={pathForStation(lang, STATIONS[0].slug)}>{t("notFound.backHome")}</Link>
      </p>
    </div>
  );
}
