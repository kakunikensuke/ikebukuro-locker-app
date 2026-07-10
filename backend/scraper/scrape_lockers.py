"""
フェーズ1: コインロッカー情報収集スクリプト（雛形）
フェーズ5: 対象エリアの拡大（池袋駅以外の主要駅へ）に伴い、複数駅を扱えるよう拡張

【重要】
このスクリプトは「収集の仕組み」を示すための雛形です。
実際に外部サイトから収集する場合は、以下を必ず確認・実装してください。
  1. 対象サイトの利用規約・robots.txt を確認し、許可される範囲でのみ取得する
  2. 可能であれば公式API・オープンデータを優先利用する
  3. アクセス頻度を抑える（過度なリクエストを送らない）
  4. 取得したデータの出典（サイト名・URL）を必ず保持し、詳細画面に表示する

このデモでは、実際のスクレイピングの代わりに
「対象駅周辺のサンプルデータ」を駅ごとに生成し、結果を表示します。
本番実装では fetch_from_source() の中身を
requests + BeautifulSoup 等を使った実装に置き換えてください。
"""

import json
import os
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "lockers.json")

# 対象エリア（フェーズ5: 池袋駅以外の主要駅へ拡大）
TARGET_STATIONS = ["池袋駅", "新宿駅", "渋谷駅"]

# フェーズ7: 多言語化対応。frontend/src/stations.js の STATIONS[].slug と一致させる規約
STATION_SLUGS = {"池袋駅": "ikebukuro", "新宿駅": "shinjuku", "渋谷駅": "shibuya"}

# 駅ごとのサンプルデータ（本番実装では fetch_from_source() 内で外部サイトから取得する）
STATION_SAMPLE_DATA = {
    "池袋駅": [
        {
            "name": "池袋駅 JR中央口 コインロッカー",
            "address": "東京都豊島区南池袋1丁目 池袋駅JR中央口付近",
            "latitude": 35.7301,
            "longitude": 139.7112,
            "business_hours": "終日利用可",
            "sizes": [
                {"size_type": "S", "price": 400, "quantity": 20, "dimensions": "34×34×57cm"},
                {"size_type": "M", "price": 500, "quantity": 12, "dimensions": "40×57×57cm"},
                {"size_type": "L", "price": 700, "quantity": 6, "dimensions": "40×57×115cm"},
            ],
        }
    ],
    "新宿駅": [
        {
            "name": "新宿駅 東口 コインロッカー",
            "address": "東京都新宿区新宿3丁目 新宿駅東口付近",
            "latitude": 35.6905,
            "longitude": 139.7005,
            "business_hours": "終日利用可",
            "sizes": [
                {"size_type": "S", "price": 400, "quantity": 25, "dimensions": "34×34×57cm"},
                {"size_type": "M", "price": 500, "quantity": 14, "dimensions": "40×57×57cm"},
                {"size_type": "L", "price": 700, "quantity": 8, "dimensions": "40×57×115cm"},
            ],
        }
    ],
    "渋谷駅": [
        {
            "name": "渋谷駅 ハチ公口 コインロッカー",
            "address": "東京都渋谷区道玄坂1丁目 渋谷駅ハチ公口付近",
            "latitude": 35.6580,
            "longitude": 139.7016,
            "business_hours": "終日利用可",
            "sizes": [
                {"size_type": "S", "price": 400, "quantity": 16, "dimensions": "34×34×57cm"},
                {"size_type": "M", "price": 500, "quantity": 10, "dimensions": "40×57×57cm"},
                {"size_type": "L", "price": 700, "quantity": 4, "dimensions": "40×57×115cm"},
            ],
        }
    ],
}


def fetch_from_source(station: str, source_name: str, source_url: str) -> list:
    """
    本来はここで対象サイトにHTTPリクエストを送り、HTMLを解析して
    指定駅周辺のロッカー施設情報のリストを返す。

    例（実装イメージ、実際に有効なコードではありません）:
        import requests
        from bs4 import BeautifulSoup

        res = requests.get(source_url, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")
        # ... サイトのHTML構造に応じてパース ...

    このデモでは駅ごとのサンプルデータをそのまま返す。
    """
    return STATION_SAMPLE_DATA.get(station, [])


def normalize(raw_facility: dict, facility_id: int, station: str, source_name: str, source_url: str) -> dict:
    """収集した生データを設計書のデータ構造に整形する"""
    now = datetime.now(JST).isoformat()
    return {
        "facility_id": facility_id,
        "name": raw_facility["name"],
        "address": raw_facility["address"],
        "latitude": raw_facility["latitude"],
        "longitude": raw_facility["longitude"],
        "nearest_station": station,
        "station_slug": STATION_SLUGS.get(station),
        "business_hours": raw_facility.get("business_hours", "不明"),
        "source": {"site_name": source_name, "site_url": source_url},
        "last_updated_at": now,
        "sizes": raw_facility["sizes"],
    }


def run():
    sources = [
        {"site_name": "サンプル情報サイトA", "site_url": "https://example.com/locker-a"},
    ]

    collected = []
    next_id = 1
    for station in TARGET_STATIONS:
        for src in sources:
            raw_list = fetch_from_source(station, src["site_name"], src["site_url"])
            for raw in raw_list:
                collected.append(
                    normalize(raw, next_id, station, src["site_name"], src["site_url"])
                )
                next_id += 1

    # 既存のサンプルデータ(backend/data/lockers.json)を上書きしないよう、
    # デモではファイルには書き込まず、収集結果を表示するだけにする。
    print(f"[{', '.join(TARGET_STATIONS)}] 計{len(collected)}件のロッカー情報を収集しました。")
    print(json.dumps(collected, ensure_ascii=False, indent=2))
    print(f"\n※本番実装ではこの結果を {OUTPUT_PATH} または DBに保存してください。")


if __name__ == "__main__":
    run()
