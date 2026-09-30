import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers } from "../api";
import { pathForPrefectureList, pathForStation, prefectureName, slugToName } from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";
import { groupByPrefecture, parseInputDims, pathForLuggageList } from "../luggageSearch.js";
import { luggagePageContent, luggagePresets, luggageResult } from "../luggagePageContent.js";

/**
 * 荷物の大きさから探す（/luggage）。
 *
 * 寸法を入れて調べる道具（画面のみ）と、荷物ごとの比較・違いが出る駅・都道府県の表
 * （静的HTMLと共通。luggagePageContent.js が唯一の実装）。
 * 荷物の種類ごとにページを分けない理由は luggageSearch.js の冒頭を参照
 */
export default function LuggagePage() {
  const lang = useLang();
  const t = useT();
  const [lockers, setLockers] = useState([]);
  const presets = useMemo(() => luggagePresets(t), [t]);
  const carryon = presets.find((p) => p.id === "carryon");
  const [inputs, setInputs] = useState(carryon.dims.map(String));
  const [dims, setDims] = useState(carryon.dims);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    fetchLockers({})
      .then((data) => setLockers(data.results ?? []))
      .catch(() => setLockers([]));
  }, []);

  const content = useMemo(() => (lockers.length ? luggagePageContent(lockers, lang, t) : null), [lockers, lang, t]);
  const result = useMemo(() => (lockers.length ? luggageResult(lockers, dims, lang, t) : null), [lockers, dims, lang, t]);
  const groups = useMemo(() => (result ? groupByPrefecture(result.stations) : []), [result]);

  const submit = (e) => {
    e.preventDefault();
    const parsed = parseInputDims(inputs);
    if (!parsed) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDims(parsed);
  };

  const choosePreset = (p) => {
    setInputs(p.dims.map(String));
    setInvalid(false);
    setDims(p.dims);
  };

  const description = t("luggagePage.description", { stations: content?.allStations ?? 427 });
  const dimLabels = [t("luggagePage.dimA"), t("luggagePage.dimB"), t("luggagePage.dimC")];

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("luggagePage.titleTag")}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={t("luggagePage.titleTag")} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForLuggageList(lang)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForLuggageList("ja")}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForLuggageList("en")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForLuggageList("ja")}`} />
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

      <main className="app-main luggage-page">
        <h2 className="page-heading">{t("luggagePage.heading")}</h2>
        <p className="page-lead">{t("luggagePage.lead")}</p>

        <section className="luggage-tool">
          <h3>{t("luggagePage.toolHeading")}</h3>
          <p className="luggage-preset-label">{t("luggagePage.presetLabel")}</p>
          <div className="luggage-presets">
            {presets.map((p) => {
              const active = p.dims.join() === dims.join();
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`luggage-preset${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => choosePreset(p)}
                >
                  <strong>{p.label}</strong>
                  <span>{p.dims.join("×")}cm</span>
                </button>
              );
            })}
          </div>

          <form className="luggage-form" onSubmit={submit}>
            {dimLabels.map((label, i) => (
              <label key={label}>
                <span>{label}</span>
                <input
                  inputMode="decimal"
                  value={inputs[i]}
                  onChange={(e) => {
                    const next = [...inputs];
                    next[i] = e.target.value;
                    setInputs(next);
                  }}
                />
              </label>
            ))}
            <button type="submit">{t("luggagePage.submit")}</button>
          </form>
          {invalid && <p className="error-message">{t("luggagePage.resultInvalid")}</p>}

          {result && (
            <div className="luggage-result" aria-live="polite">
              <p className="luggage-result-summary">{result.summary}</p>
              {result.cheapest && <p>{result.cheapest}</p>}
              {result.unknown && <p className="luggage-result-note">{result.unknown}</p>}
              {/* 都道府県ごとの一覧は閉じて出す。東京だけで100駅を超え、開くと下の比較表が埋もれるため */}
              {groups.map((g) => (
                <details key={g.prefecture}>
                  <summary>
                    {t("luggagePage.resultPrefSummary", {
                      prefecture: prefectureName(g.prefecture, lang),
                      count: g.stations.length,
                    })}
                  </summary>
                  <ul>
                    {g.stations.map((s) => (
                      <li key={s.slug}>
                        <Link to={pathForStation(lang, s.slug)}>{slugToName(s.slug, lang)}</Link>
                        <span>{t("luggagePage.resultStationItem", { units: s.units, price: s.minPrice })}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </section>

        {content && <LuggageReading content={content} />}
      </main>
    </div>
  );
}

// 読み物部分。prerender.js の luggagePage と同じ並び・同じ文言
function LuggageReading({ content }) {
  const { compare, carryonOnly, noSuitcase, pref, rules } = content;
  return (
    <>
      <section>
        <h3>{compare.heading}</h3>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead>
              <tr>
                {compare.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compare.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (i === 0 ? <th key={i}>{cell}</th> : <td key={i}>{cell}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{compare.note}</p>
      </section>

      <section>
        <h3>{carryonOnly.heading}</h3>
        <p>{carryonOnly.lead}</p>
        <ul>
          {carryonOnly.items.map((x) => (
            <li key={x.href}>
              <Link to={x.href}>{x.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>{noSuitcase.heading}</h3>
        <p>{noSuitcase.lead}</p>
        <ul>
          {noSuitcase.items.map((x) => (
            <li key={x.href}>
              <Link to={x.href}>{x.label}</Link>
            </li>
          ))}
        </ul>
        <p>{noSuitcase.note}</p>
      </section>

      <section>
        <h3>{pref.heading}</h3>
        <p>{pref.lead}</p>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead>
              <tr>
                {pref.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pref.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (i === 0 ? <th key={i}>{cell}</th> : <td key={i}>{cell}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>{rules.heading}</h3>
        <ul>
          {rules.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
