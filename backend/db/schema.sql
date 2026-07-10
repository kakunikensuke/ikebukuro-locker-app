-- 設計書 3.1 に対応するテーブル定義
-- 本デモではJSONファイルをDB代わりに使用していますが、
-- 本番運用時はこのスキーマでPostgreSQL(+PostGIS)等に移行してください。

CREATE TABLE data_sources (
    source_id       SERIAL PRIMARY KEY,
    site_name       VARCHAR(255) NOT NULL,
    site_url        VARCHAR(512) NOT NULL,
    last_scraped_at TIMESTAMP,
    scrape_status   VARCHAR(50)
);

CREATE TABLE locker_facilities (
    facility_id      SERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    address          VARCHAR(255),
    latitude         DECIMAL(9,6) NOT NULL,
    longitude        DECIMAL(9,6) NOT NULL,
    nearest_station  VARCHAR(100) NOT NULL,
    -- フェーズ7: 多言語化対応。frontend/src/stations.js の STATIONS[].slug と一致させる規約（日本語名に依存しない検索キー）
    station_slug     VARCHAR(50) NOT NULL,
    business_hours   VARCHAR(100),
    source_id        INTEGER REFERENCES data_sources(source_id),
    last_updated_at  TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE locker_sizes (
    size_id      SERIAL PRIMARY KEY,
    facility_id  INTEGER REFERENCES locker_facilities(facility_id),
    size_type    VARCHAR(1) CHECK (size_type IN ('S','M','L')),
    price        INTEGER NOT NULL,
    quantity     INTEGER NOT NULL,
    dimensions   VARCHAR(50)
);

-- フェーズ5: 駅での絞り込み検索を高速化。フェーズ7でslugベースの検索に変更したためstation_slugにインデックスを張る
CREATE INDEX idx_locker_facilities_station ON locker_facilities (station_slug);

-- 位置検索を高速化する場合(PostGIS導入時)
-- CREATE INDEX idx_locker_facilities_geo ON locker_facilities USING GIST (
--     ll_to_earth(latitude, longitude)
-- );
