// 解説記事（/guides）の本文。
//
// なぜJSXではなくデータで持つのか:
// このアプリは固定ページを pages/*.jsx（React）と scripts/prerender.js（静的HTML）の
// 2箇所で組み立てる構造になっている。本文をJSXに直書きすると静的HTML側に出ず、
// JSを実行しないクローラからは読み物が無いサイトに見える。
// （2026-08-14にAdSenseから「有用性の低いコンテンツ」で不承認になった直接の原因）
//
// なぜ数値を {{変数}} にするのか:
// ロッカーのデータは6時間ごとに自動更新される。本文に「21駅」と直書きすると
// 次の更新で嘘になる。src/lockerStats.js の guideVars() が実データから計算した値を
// 差し込むので、記事は常に現在のデータと一致する。
//
// ブロックの型:
//   { type: "h2",   text: {ja, en} }
//   { type: "p",    text: {ja, en} }
//   { type: "ul",   items: [{ja, en}, ...] }
//   { type: "qa",   q: {ja, en}, a: {ja, en} }
//   { type: "sizeTable" }            サイズ・内寸・料金・駅数の表（データから生成）
//   { type: "stationList", size }    指定サイズを置いている駅のリンク一覧（データから生成）

export const GUIDES = [
  // ---------------------------------------------------------------- 1
  {
    slug: "locker-size",
    title: {
      ja: "コインロッカーのサイズの選び方｜スーツケースは入る？",
      en: "Which coin locker size do you need? Suitcase sizes explained",
    },
    heading: {
      ja: "コインロッカーのサイズの選び方",
      en: "Which coin locker size do you need?",
    },
    description: {
      ja: "駅のコインロッカーはSS・S・M・L・LWの5種類。内寸と、機内持込サイズ／預入サイズのスーツケースが入るかどうかを実データの料金つきで整理しました。",
      en: "Station lockers in Japan come in five sizes. Here are the internal dimensions, which suitcase fits in which, and what each size actually costs.",
    },
    blocks: [
      {
        type: "p",
        text: {
          ja: "駅のコインロッカーは事業者が違ってもサイズ区分がほぼ共通で、小さい方からSS・S・M・L・LWの5種類です。掲載中の{{lockerCount}}箇所を集計すると、どのサイズがどれだけ設置されているかがはっきり分かります。",
          en: "Station lockers in Japan use much the same size classes regardless of operator: SS, S, M, L and LW, smallest first. Aggregating the {{lockerCount}} locations listed here shows how common each one actually is.",
        },
      },
      { type: "sizeTable" },
      {
        type: "h2",
        text: { ja: "スーツケースはどのサイズに入るか", en: "Which size fits your suitcase" },
      },
      {
        type: "p",
        text: {
          ja: "スーツケースは縦置きで入れるため、効いてくるのは高さです。Lサイズの内寸は高さ86cmで、これは航空会社が預入手荷物として扱う3辺合計158cm級のスーツケースがぎりぎり収まる高さにあたります。",
          en: "A suitcase goes in upright, so height is what matters. The L size is 86cm tall inside, which is just enough for the check-in sized cases that airlines cap at 158cm total.",
        },
      },
      {
        type: "ul",
        items: [
          {
            ja: "機内持込サイズ（高さ55cm前後・容量40L以下）はMサイズ（高さ50cm）だと入らないことが多く、Lサイズが確実です。",
            en: "Cabin-sized cases (around 55cm tall, up to 40L) often do not fit the M size, which is 50cm inside. Go for L.",
          },
          {
            ja: "預入サイズ（高さ70cm前後・容量70〜90L）はLサイズに収まります。それより大きい場合はLWを探すことになります。",
            en: "Check-in sized cases (around 70cm tall, 70-90L) fit in L. Anything larger means looking for LW.",
          },
          {
            ja: "SSサイズは奥行き15cmしかなく、書類やカメラ、折りたたみ傘といった薄い荷物向けです。バックパックは入りません。",
            en: "SS is only 15cm deep — documents, a camera, a folding umbrella. A backpack will not go in.",
          },
        ],
      },
      {
        type: "h2",
        text: { ja: "迷ったら1つ上のサイズにする", en: "When in doubt, size up" },
      },
      {
        type: "p",
        text: {
          ja: "ぎりぎりのサイズを選ぶと、扉が閉まらず入れ直すことになります。SからMは{{priceS}}円と{{priceM}}円で差は{{sizeUpDiff}}円しかありません。荷物を測って悩む時間を考えると、1つ上を選んだ方が結果的に得です。",
          en: "Picking the tightest size that might work often ends with the door not closing and starting over. S and M cost {{priceS}} yen and {{priceM}} yen — a difference of {{sizeUpDiff}} yen. Sizing up costs less than the time spent measuring.",
        },
      },
      {
        type: "qa",
        q: { ja: "Q. 表示されている個数は空いている数ですか？", en: "Q. Is the number shown how many are free?" },
        a: {
          ja: "A. いいえ。設置されている個数です。空き状況はリアルタイムに変わるため当サイトでは扱っていません。現地でご確認ください。",
          en: "A. No — it is how many are installed. Availability changes minute to minute and is not tracked here. Check on site.",
        },
      },
    ],
  },

  // ---------------------------------------------------------------- 2
  {
    slug: "large-lockers",
    title: {
      ja: "特大コインロッカー（LW）がある駅一覧｜大型スーツケース・楽器向け",
      en: "Stations with extra-large (LW) coin lockers in Japan",
    },
    heading: { ja: "特大コインロッカー（LW）がある駅", en: "Stations with extra-large (LW) lockers" },
    description: {
      ja: "Lサイズにも入らない大型スーツケース・楽器・スキー板向けのLWサイズは、掲載{{stationCount}}駅のうち{{stationsLW}}駅にしかありません。設置駅を個数の多い順に一覧にしました。",
      en: "LW lockers take what will not fit in an L — oversized cases, instruments, skis. Only {{stationsLW}} of the {{stationCount}} stations listed have them. Here they are, largest first.",
    },
    blocks: [
      {
        type: "p",
        text: {
          ja: "LWはLサイズよりさらに大きい区分で、大型スーツケース・楽器のハードケース・スキー板・ベビーカーなどを想定した枠です。掲載中の{{stationCount}}駅のうち設置が確認できているのは{{stationsLW}}駅、合計{{lockersLW}}箇所しかありません。",
          en: "LW is the class above L, sized for oversized suitcases, instrument cases, skis and pushchairs. Of the {{stationCount}} stations listed here, only {{stationsLW}} have one — {{lockersLW}} locations in total.",
        },
      },
      {
        type: "p",
        text: {
          ja: "数が少ないぶん、行き当たりばったりで探すと見つかりません。料金は{{minPriceLW}}円から{{maxPriceLW}}円と幅があり、他のサイズより高めです。",
          en: "Because there are so few, finding one by wandering does not work. Prices run from {{minPriceLW}} to {{maxPriceLW}} yen, higher than the other sizes.",
        },
      },
      { type: "stationList", size: "LW" },
      {
        type: "h2",
        text: { ja: "LWが見つからないときは", en: "If there is no LW nearby" },
      },
      {
        type: "p",
        text: {
          ja: "上の一覧に目的の駅が無い場合、駅のロッカーにこだわらず手荷物預かり所を探した方が早いことがあります。詳しくは「ロッカーが満杯・見つからないときの代替手段」をご覧ください。",
          en: "If your station is not on the list, a staffed luggage storage counter is often faster than hunting for a locker. See \"What to do when the lockers are full\".",
        },
      },
    ],
  },

  // ---------------------------------------------------------------- 3
  {
    slug: "inside-or-outside-gate",
    title: {
      ja: "改札内と改札外のコインロッカーの違い｜どちらを使うべきか",
      en: "Inside vs outside the ticket gate: which locker to use",
    },
    heading: { ja: "改札内と改札外、どちらのロッカーを使うべきか", en: "Inside or outside the ticket gate?" },
    description: {
      ja: "駅のコインロッカーは改札内と改札外で使い勝手が大きく変わります。乗り換え・観光・出口が分からないときの選び方を、実際の設置数の内訳とあわせて整理しました。",
      en: "Lockers inside the gates and outside them are useful in completely different situations. Here is how to choose, with the actual split between the two.",
    },
    blocks: [
      {
        type: "p",
        text: {
          ja: "同じ駅のロッカーでも、改札の内側にあるか外側にあるかで使い勝手が変わります。当サイトで改札の内外が判別できる{{gateKnown}}箇所の内訳は、改札内が{{gateInside}}箇所、改札外が{{gateOutside}}箇所です。改札外の方が多いのが実情です。",
          en: "Two lockers in the same station behave differently depending on which side of the gates they sit. Of the {{gateKnown}} locations here where this is known, {{gateInside}} are inside the gates and {{gateOutside}} outside. Outside is the more common case.",
        },
      },
      { type: "h2", text: { ja: "改札内が向いている場合", en: "When inside the gates wins" } },
      {
        type: "ul",
        items: [
          {
            ja: "乗り換えの待ち時間に荷物を置きたいとき。改札を出ないので運賃が余分にかかりません。",
            en: "Killing time between trains. You never leave the paid area, so there is no extra fare.",
          },
          {
            ja: "同じ駅に戻ってきて、そのまま電車に乗る予定のとき。",
            en: "You will come back to the same station and get straight on a train.",
          },
          {
            ja: "駅が広く、どの出口に出ればいいか分からないとき。改札内なら出口を決めずに預けられます。",
            en: "The station is large and you do not know which exit you want yet.",
          },
        ],
      },
      { type: "h2", text: { ja: "改札外が向いている場合", en: "When outside the gates wins" } },
      {
        type: "ul",
        items: [
          {
            ja: "駅の周辺を観光してから荷物を取りに戻るとき。改札内だと入場券か初乗り運賃が必要になります。",
            en: "You are going out to look around and will come back for the bag. An inside locker would cost you a platform ticket or a minimum fare.",
          },
          {
            ja: "別の交通機関（バス・別会社の路線）に乗り換えるとき。",
            en: "You are switching to a bus or a different operator's line.",
          },
          {
            ja: "荷物を取りに来る人と待ち合わせるとき。改札外なら切符を買わずに合流できます。",
            en: "Someone else is collecting the bag. Outside the gates they do not need a ticket.",
          },
        ],
      },
      { type: "h2", text: { ja: "見落としやすい注意点", en: "The thing people get caught by" } },
      {
        type: "p",
        text: {
          ja: "改札内のロッカーに預けたまま改札を出ると、取りに戻るのに再度の入場が必要になります。特に大きな駅では、改札内でも別の改札口からは行けない場所があります。当サイトの各ロッカーには「改札内 メトロポリタン口」のように改札の内外と目印を載せているので、預ける前に確認してください。",
          en: "Leave a bag in an inside locker, walk out through the gates, and you will have to pay to get back in. In big stations some inside lockers cannot even be reached from every gate. Each entry here records which side it is on and a landmark — check before you commit.",
        },
      },
    ],
  },

  // ---------------------------------------------------------------- 4
  {
    slug: "price",
    title: {
      ja: "コインロッカーの料金相場｜サイズ別の実際の価格",
      en: "What coin lockers cost in Japan, by size",
    },
    heading: { ja: "コインロッカーの料金相場", en: "What coin lockers actually cost" },
    description: {
      ja: "掲載中の{{lockerCount}}箇所の実データから、SS・S・M・L・LWそれぞれの最も多い料金と価格帯を集計しました。支払い方法と延長料金の考え方もあわせて解説します。",
      en: "The most common price and the full range for each size, taken from the {{lockerCount}} locations listed here — plus how payment and overnight charges work.",
    },
    blocks: [
      {
        type: "p",
        text: {
          ja: "コインロッカーの料金はサイズと事業者で決まります。掲載中の{{lockerCount}}箇所を集計した結果が以下です。料金は100円単位の離散値なので、平均ではなく最も多く使われている金額を代表値としています。",
          en: "Price depends on size and operator. Below is the aggregate over the {{lockerCount}} locations listed here. Prices come in 100-yen steps, so the figure shown is the most common one rather than an average.",
        },
      },
      { type: "sizeTable" },
      {
        type: "p",
        text: {
          ja: "1日単位の料金なので、朝入れて夜出す場合も、10分で出す場合も同じです。短時間なら小さいサイズを選ぶ、という判断は成り立ちますが、荷物が入らなければ意味がありません。",
          en: "The price is per day, so ten minutes costs the same as twelve hours. Choosing a smaller size for a short stop only helps if the bag actually fits.",
        },
      },
      { type: "h2", text: { ja: "支払い方法", en: "Paying" } },
      {
        type: "p",
        text: {
          ja: "現在の駅のコインロッカーは、交通系ICカード（Suica・PASMO等）に対応したものが主流です。ICカードで支払った場合、荷物を取り出すときも同じカードが鍵の代わりになるため、カードを無くさないよう注意してください。現金は100円硬貨のみのものが多く、両替機が近くにあるとは限りません。",
          en: "Most station lockers now take IC cards (Suica, PASMO and the like). Pay with one and the card itself becomes the key, so do not lose it. Cash-operated units usually want 100-yen coins only, and there is not always a change machine nearby.",
        },
      },
      { type: "h2", text: { ja: "延長料金と保管期限", en: "Overnight charges and time limits" } },
      {
        type: "p",
        text: {
          ja: "日付をまたぐと追加料金がかかります。多くの事業者では3日程度が保管期限で、それを超えると荷物は駅係員に回収され、引き取りに保管料と本人確認が必要になります。当サイトでは延長料金までは掲載していないため、長時間預ける場合は現地の表示をご確認ください。",
          en: "Cross midnight and you pay for another day. Most operators keep the limit at around three days; past that, staff remove the contents and you need ID and a storage fee to get them back. Extension rates are not listed here — read the panel on the locker if you are leaving something a while.",
        },
      },
    ],
  },

  // ---------------------------------------------------------------- 5
  {
    slug: "when-full",
    title: {
      ja: "コインロッカーが満杯・見つからないときの代替手段",
      en: "What to do when every coin locker is full",
    },
    heading: { ja: "ロッカーが満杯・見つからないときは", en: "When the lockers are all full" },
    description: {
      ja: "大きな駅やイベント時はコインロッカーが埋まります。手荷物預かり所、隣の駅、駅ビルなど、埋まっていたときに取れる手を順番に整理しました。",
      en: "At big stations and on event days the lockers fill up. Here are the fallbacks, in the order worth trying.",
    },
    blocks: [
      {
        type: "p",
        text: {
          ja: "連休・イベント・大きな駅の朝は、ロッカーがまとめて埋まります。当サイトが掲載しているのは設置個数であって空き状況ではないため、行ってみたら全部使用中ということは起こります。そのときに取れる手を、効果が高い順に挙げます。",
          en: "Long weekends, event days, big stations in the morning — the lockers go all at once. This site lists how many are installed, not how many are free, so arriving to find them all in use does happen. Here is what to try, best first.",
        },
      },
      { type: "h2", text: { ja: "1. 同じ駅の別の場所を見る", en: "1. Try elsewhere in the same station" } },
      {
        type: "p",
        text: {
          ja: "大きな駅ほどロッカーは分散しています。改札前の目立つ場所から埋まるので、少し離れた出口や地下通路の設置場所が残っていることがよくあります。当サイトの駅ページには設置場所が全て並んでいるので、目立たない場所を狙ってください。",
          en: "The bigger the station, the more scattered the lockers. The ones by the gates go first, so a bank down a side exit or in an underground passage is often still open. The station pages here list every location — aim for the inconspicuous ones.",
        },
      },
      { type: "h2", text: { ja: "2. 手荷物預かり所を使う", en: "2. Use a staffed luggage counter" } },
      {
        type: "p",
        text: {
          ja: "主要駅には有人の手荷物預かり所があります。ロッカーより割高ですが、サイズの制限が緩く、スーツケースが確実に預けられます。当日中の引き取りが基本です。",
          en: "Major stations have staffed baggage rooms. They cost more than a locker but take almost any size, which matters for a large suitcase. Same-day collection is the norm.",
        },
      },
      { type: "h2", text: { ja: "3. 隣の駅まで移動する", en: "3. Go one station over" } },
      {
        type: "p",
        text: {
          ja: "観光地の最寄り駅は埋まりやすい一方、1つ隣の駅は空いていることがあります。乗車時間が数分なら、探し回るより早いことが多いです。",
          en: "The station next to a tourist spot fills up; the one after it often does not. If it is a few minutes on the train, that usually beats searching.",
        },
      },
      { type: "h2", text: { ja: "4. 駅ビル・商業施設のロッカーを見る", en: "4. Check the station building" } },
      {
        type: "p",
        text: {
          ja: "駅直結の商業施設にもロッカーがあります。駅の構内図には載らないことが多く、その分埋まりにくい傾向があります。",
          en: "Shopping complexes attached to stations have their own lockers. They rarely appear on station maps, which is exactly why they are still free.",
        },
      },
    ],
  },

  // ---------------------------------------------------------------- 6
  {
    slug: "before-you-store",
    title: {
      ja: "コインロッカーに預ける前に確認すること｜保管期限・預けられない物",
      en: "Before you use a coin locker: limits and what you cannot store",
    },
    heading: { ja: "預ける前に確認すること", en: "Before you put anything in" },
    description: {
      ja: "保管期限、預けられない物、取り忘れたときの流れ、営業時間の落とし穴まで、コインロッカーを使う前に知っておくと困らないことをまとめました。",
      en: "Time limits, prohibited items, what happens if you forget, and the opening-hours trap. The things worth knowing before you shut the door.",
    },
    blocks: [
      { type: "h2", text: { ja: "営業時間を先に見る", en: "Check the hours first" } },
      {
        type: "p",
        text: {
          ja: "営業時間が判明している{{hoursKnown}}箇所のうち{{allDayPercent}}%は「初電～終電」で、駅が開いている間は出し入れできます。時間が限られているものは{{hoursLimited}}箇所で、特に改札内や駅ビル内の設置場所は施設の閉館時間に合わせて取り出せなくなります。残る{{hoursUnknown}}箇所は営業時間が公開されておらず、当サイトでも確認できていません。夜に取りに戻る予定なら、預ける前に現地で営業時間を確認してください。",
          en: "Of the {{hoursKnown}} locations where the hours are known, {{allDayPercent}}% run from first train to last, so they are usable whenever the station is open. Another {{hoursLimited}} close earlier — lockers inside the gates or in a station building follow that building's closing time. For the remaining {{hoursUnknown}}, the operator does not publish hours and we have not been able to confirm them. If you are coming back at night, check the hours on site before you leave anything.",
        },
      },
      { type: "h2", text: { ja: "預けられない物", en: "What you cannot leave" } },
      {
        type: "ul",
        items: [
          {
            ja: "生き物、生鮮食品、腐敗しやすい物",
            en: "Animals, fresh food, anything that will spoil",
          },
          {
            ja: "危険物（可燃物・引火性のある液体・スプレー缶など）",
            en: "Hazardous items — flammables, pressurised cans, volatile liquids",
          },
          {
            ja: "現金・貴重品。ロッカーの約款では紛失時の補償が限定されているのが一般的です。",
            en: "Cash and valuables. Locker terms typically cap or exclude compensation for loss.",
          },
          {
            ja: "臭いの強い物。次に使う人の荷物に移ります。",
            en: "Strong-smelling items — the smell transfers to whoever uses it next",
          },
        ],
      },
      { type: "h2", text: { ja: "取り忘れたときどうなるか", en: "If you forget to collect" } },
      {
        type: "p",
        text: {
          ja: "保管期限を過ぎると、駅係員が荷物を取り出して保管します。引き取りには身分証と超過分の料金が必要です。保管期間を過ぎたものは遺失物として警察に届けられます。旅程の都合で取りに戻れなくなりそうなときは、早めに駅へ連絡してください。",
          en: "Past the limit, staff empty the locker and hold the contents. You need ID and the overdue fee to collect. After their holding period it goes to the police as lost property. If your plans change and you cannot get back, call the station early.",
        },
      },
      { type: "h2", text: { ja: "ICカードで払ったときの注意", en: "If you paid with an IC card" } },
      {
        type: "p",
        text: {
          ja: "交通系ICカードで支払うと、そのカード自体が鍵になります。別のカードでは開きません。複数枚を使い分けている場合、どのカードで払ったか覚えておいてください。",
          en: "Pay with an IC card and that card is the key. No other card will open it. If you carry several, remember which one you used.",
        },
      },
    ],
  },
];

export function guideBySlug(slug) {
  return GUIDES.find((g) => g.slug === slug);
}
