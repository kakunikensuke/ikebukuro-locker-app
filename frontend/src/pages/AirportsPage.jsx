import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers } from "../api";
import { pathForPrefectureList } from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";
import { airportContent, pathForAirports } from "../homeContent.js";

/**
 * 空港駅のコインロッカー（/airports）。空港ごとに駅の要点を並べる。
 * 中身は scripts/prerender.js の airportsPage と同じ airportContent() から作る
 */
export default function AirportsPage() {
  const lang = useLang();
  const t = useT();
  const [lockers, setLockers] = useState([]);

  useEffect(() => {
    fetchLockers({})
      .then((data) => setLockers(data.results ?? []))
      .catch(() => setLockers([]));
  }, []);

  const content = useMemo(() => (lockers.length ? airportContent(lockers, lang, t) : null), [lockers, lang, t]);

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("airports.titleTag")}</title>
        <meta name="description" content={t("airports.description")} />
        <meta property="og:title" content={t("airports.titleTag")} />
        <meta property="og:description" content={t("airports.description")} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForAirports(lang)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForAirports("ja")}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForAirports("en")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForAirports("ja")}`} />
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

      <main className="app-main airports-page">
        <h2 className="page-heading">{t("airports.heading")}</h2>
        <p className="page-lead">{t("airports.lead")}</p>

        {content?.airports.map((a) => (
          <section key={a.id} className="airport">
            <h3>{a.heading}</h3>
            <p>{a.summary}</p>
            {a.stations.length > 0 && (
              <ul className="airport-stations">
                {a.stations.map((s) => (
                  <li key={s.href}>
                    <Link to={s.href}>{s.label}</Link>
                    <ul>
                      {s.facts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {content && (
          <section>
            <h3>{t("airports.tipsHeading")}</h3>
            {content.tips.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </section>
        )}

        <Link className="back-to-areas" to={pathForPrefectureList(lang)}>
          {t("prefecturePage.backToAreas")}
        </Link>
      </main>
    </div>
  );
}
