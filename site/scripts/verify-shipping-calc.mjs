// 海外発送の計算機の照合。料金は日本郵便の料金表を手で読んだ値、税は各国の決まりから手で計算した値。npm run build の前に走る
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
const R = process.cwd();
const { calculate } = await import(pathToFileURL(R + "/src/shipping-calc.mjs").href);
const data = JSON.parse(readFileSync(R + "/data/overseas-shipping.json", "utf8"));
let fail = 0;
const ok = (label, cond) => { console.log((cond ? "OK  " : "NG  ") + label); if (!cond) fail++; };
const base = { country: "US", weightG: 1000, valueJpy: 5000, kind: "gift", item: "other", lithium: false };
const get = (inp, id) => calculate(data, { ...base, ...inp }).rows.find((r) => r.id === id);
// 料金は日本郵便の料金表（記事で手で読んだ値）
ok("米1kg EMS 5,300", get({}, "ems").price === 5300);
ok("米1kg 航空小包 4,200", get({}, "parcel_air").price === 4200);
ok("米1kg エアパケット 3,090", get({}, "airpacket").price === 3090);
ok("米1kg 小形包装物 2,720", get({}, "small_packet").price === 2720);
ok("米1kg 船便 2,600", get({}, "parcel_sea").price === 2600);
ok("米5kg 船便 5,400", get({ weightG: 5000 }, "parcel_sea").price === 5400);
ok("米5kg 小形包装物は使えない", get({ weightG: 5000 }, "small_packet").available === false);
ok("米600g EMS 4,180", get({ weightG: 600 }, "ems").price === 4180);
ok("台湾1kg 小形包装物 1,250", get({ country: "TW" }, "small_packet").price === 1250);
// 税
ok("米5,000円の贈り物は税0", get({}, "ems").tax.lo === 0);
ok("米2万円の贈り物（その他）は12.5%以上=2,500＋α", get({ valueJpy: 20000 }, "ems").tax.lo === 2500 && get({ valueJpy: 20000 }, "ems").tax.open === true);
ok("米2万円の本は0", get({ valueJpy: 20000, item: "book" }, "ems").tax.lo === 0);
ok("米2万円の売った物は手続きの注意あり", calculate(data, { ...base, valueJpy: 20000, kind: "sale" }).notes.some((n) => n.includes("指定する郵便局")));
ok("英1万円2kg贈り物 EMS 税=(10000+6700)*0.2=3,340", get({ country: "GB", weightG: 2000, valueJpy: 10000 }, "ems").tax.lo === 3340);
ok("英5,000円の贈り物（約24ポンド）は税0", get({ country: "GB" }, "ems").tax.lo === 0);
ok("独5,000円の贈り物（約28ユーロ）は税0", get({ country: "DE", weightG: 500 }, "ems").tax.lo === 0);
ok("独5,000円の売った物 500g EMS=(5000+3150)*0.19+3ユーロ", get({ country: "DE", weightG: 500, kind: "sale" }, "ems").tax.lo === Math.round(8150 * 0.19 + 3 * data.fx.jpyPer.EUR));
ok("台湾8,000円は税0", get({ country: "TW", weightG: 3000, valueJpy: 8000 }, "parcel_sea").tax.lo === 0);
ok("加2万円の贈り物は60カナダドルを超えた分に5〜15%＋手数料", (() => { const t = get({ country: "CA", valueJpy: 20000 }, "ems").tax; const ex = (20000 / data.fx.jpyPer.CAD - 60) * data.fx.jpyPer.CAD; return t.lo === Math.round(ex * 0.05 + 9.95 * data.fx.jpyPer.CAD) && t.hi === Math.round(ex * 0.15 + 9.95 * data.fx.jpyPer.CAD); })());
ok("星5万円1kg EMSは送料込み400SGD超で9%", get({ country: "SG", valueJpy: 50000 }, "ems").tax.lo === Math.round((50000 + 3150) * 0.09));
ok("星3万円は400SGD以下で0", get({ country: "SG", valueJpy: 30000 }, "small_packet").tax.lo === 0);
ok("香港は0", get({ country: "HK", valueJpy: 500000 }, "ems").tax.lo === 0);
ok("豪10万円（約911豪ドル）は0", get({ country: "AU", valueJpy: 100000 }, "ems").tax.lo === 0);
ok("電池入りの独あては全部使えない", calculate(data, { ...base, country: "DE", lithium: true }).rows.every((r) => !r.available));
ok("電池入りの米あては使える", calculate(data, { ...base, lithium: true }).rows.some((r) => r.available));
// 補償
ok("EMS 10万円は＋200円", get({ valueJpy: 100000 }, "ems").cover.extraText.includes("200円"));
ok("小包3kgは11,160円まで", get({ weightG: 3000 }, "parcel_air").cover.text.startsWith("11,160円"));
ok("いちばん安いのは船便（米1kg 5,000円の贈り物）", calculate(data, base).cheapest.id === "parcel_sea");
console.log(fail ? `\n${fail}件ちがう` : "\nすべて一致");
process.exit(fail ? 1 : 0);
