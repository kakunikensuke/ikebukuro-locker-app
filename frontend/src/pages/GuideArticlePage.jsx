import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers } from "../api";
import { guideBySlug, GUIDES } from "../content/guides";
import { fill, guideData, readEmbeddedGuideData } from "../guideRender";
import { pathForGuide, pathForGuideList } from "../staticPages";
import { pathForPrefectureList } from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";
import GuideBlocks from "../components/GuideBlocks.jsx";
import NotFound from "./NotFound.jsx";

/**
 * 解説記事の本体（/guides/:guideSlug）。
 * 本文は content/guides.js、数値は実データから計算する（lockerStats.js）。
 * データ取得前は本文を出さない。中途半端に「{{lockerCount}}箇所」のまま出すより、
 * 読み込み中と表示した方が読み手に誠実なため
 */
export default function GuideArticlePage() {
  const { guideSlug } = useParams();
  const lang = useLang();
  const t = useT();
  const guide = guideBySlug(guideSlug);
  // 初期値はプリレンダがHTMLに埋め込んだ集計値。APIを待たずに正しい数字で描け、
  // バックエンドが落ちていてもそのまま読める
  const [data, setData] = useState(() => readEmbeddedGuideData());

  useEffect(() => {
    if (!guide) return;
    fetchLockers({})
      // guideData は プリレンダ側と同じ t(lang, key) 形式で呼ぶ想定なので、
      // クライアントの t(key) をその形に合わせて渡す
      .then((result) => setData(guideData(result.results ?? [], lang, (_l, key) => t(key), guide.blocks)))
      // 取得できなければ埋め込み値のまま。0件として描くと「0円」「0駅」という
      // 誤った数字を出すことになるので、失敗時は上書きしない
      .catch(() => {});
    // tはレンダーごとに新しい関数になるため依存に入れない（無限ループになる）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide, lang]);

  if (!guide) {
    // :guideSlugは任意の文字列にマッチするため、未知のスラッグはここでNotFoundにする
    return <NotFound />;
  }

  const description = data ? fill(guide.description[lang], data.vars) : guide.heading[lang];
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="app-container">
      <Helmet>
        <title>{guide.title[lang]}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={guide.heading[lang]} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`${SITE_URL}${pathForGuide(lang, guide.slug)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForGuide("ja", guide.slug)}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForGuide("en", guide.slug)}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForGuide("ja", guide.slug)}`} />
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

      <main className="app-main guide-page">
        <Link className="back-to-areas" to={pathForGuideList(lang)}>
          {t("guidesPage.backToList")}
        </Link>
        <h2>{guide.heading[lang]}</h2>

        {data ? (
          <GuideBlocks blocks={guide.blocks} data={data} />
        ) : (
          <p className="empty-message">{t("guidesPage.loading")}</p>
        )}

        <h3>{t("guidesPage.otherGuides")}</h3>
        <ul>
          {others.map((g) => (
            <li key={g.slug}>
              <Link to={pathForGuide(lang, g.slug)}>{g.heading[lang]}</Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
