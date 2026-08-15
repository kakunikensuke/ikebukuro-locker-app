import React from "react";
import { Link } from "react-router-dom";
import { fill } from "../guideRender";
import { pathForStation, slugToName } from "../stations";
import { useLang, useT } from "../i18n/LangContext.js";

/**
 * content/guides.js のブロック配列を描く。
 * scripts/prerender.js の guideBlocksHtml() と同じ内容を出すこと。
 * 片方だけ直すと、静的HTMLと画面の中身がズレる。
 *
 * 集計値（data）は自前で計算せず受け取る。プリレンダがHTMLに埋め込んだ値をそのまま
 * 使えるようにして、バックエンドAPIが落ちていても正しい数字が出るようにするため
 */
export default function GuideBlocks({ blocks, data }) {
  const lang = useLang();
  const t = useT();
  const { vars, sizeRows, stationRows } = data;

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return <h3 key={i}>{fill(block.text[lang], vars)}</h3>;
          case "p":
            return <p key={i}>{fill(block.text[lang], vars)}</p>;
          case "ul":
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{fill(item[lang], vars)}</li>
                ))}
              </ul>
            );
          case "qa":
            return (
              <p key={i}>
                <strong>{fill(block.q[lang], vars)}</strong>
                <br />
                {fill(block.a[lang], vars)}
              </p>
            );
          case "sizeTable":
            return (
              <div className="guide-table-wrap" key={i}>
                <table className="guide-table">
                  <thead>
                    <tr>
                      <th>{t("guidesPage.tableSize")}</th>
                      <th>{t("guidesPage.tableDimensions")}</th>
                      <th>{t("guidesPage.tablePrice")}</th>
                      <th>{t("guidesPage.tableStations")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeRows.map((row) => (
                      <tr key={row.sizeType}>
                        <th scope="row">{row.name}</th>
                        <td>{row.dimensions || "—"}</td>
                        <td>
                          {row.minPrice === row.maxPrice
                            ? t("guidesPage.tablePriceOne", { price: row.minPrice })
                            : t("guidesPage.tablePriceRange", { min: row.minPrice, max: row.maxPrice })}
                        </td>
                        <td>{t("guidesPage.tableStationCount", { count: row.stationCount })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "stationList":
            return (
              <ul className="guide-station-list" key={i}>
                {(stationRows[block.size] ?? []).map((row) => (
                  <li key={row.slug}>
                    <Link to={pathForStation(lang, row.slug)}>{slugToName(row.slug, lang)}</Link>{" "}
                    <span className="guide-station-qty">
                      {t("guidesPage.stationQuantity", { count: row.quantity })}
                    </span>
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
