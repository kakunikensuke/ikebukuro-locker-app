import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <div className="app-container">
      <Helmet>
        <title>ページが見つかりません｜コインロッカー検索</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <p className="empty-message">
        お探しのページが見つかりませんでした。
        <br />
        <Link to="/">トップに戻る</Link>
      </p>
    </div>
  );
}
