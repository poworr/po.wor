// Paragraphs for the Japanese Writing Practice page (N2 and up, about 400字).
// Each paragraph also gives the Practice tab its question and keywords.
//
// To add a new one: copy one { ... } block, paste it at the end of the list
// (with a comma between blocks), give it a new id, and change the text.
// Paragraph breaks in text_ja are written as \n.
//
// source / source_url: where the paragraph came from. They show as a credit
// under the paragraph. Leave them as "" for paragraphs you wrote yourself.

const SAMPLES = [
  {
    id: "remote-work",
    level: "N2",
    title: "在宅勤務について",
    question_ja: "在宅勤務の長所と短所を挙げたうえで、今後どのような働き方が望ましいか、あなたの考えを400字程度で述べなさい。",
    keywords: [
      { ja: "一方で", reading: "いっぽうで" },
      { ja: "〜に応じて", reading: "〜におうじて" },
      { ja: "〜ではなく", reading: "〜ではなく" },
      { ja: "〜こそ", reading: "〜こそ" },
      { ja: "〜べきではないだろうか", reading: "〜べきではないだろうか" }
    ],
    text_ja: "近年、在宅勤務を取り入れる企業が増えている。通勤の時間がなくなったことで、その分の時間を家族と過ごしたり、自分の勉強に充てたりできるようになったという人も多い。また、静かな環境で作業に集中できるため、仕事の効率が上がったという声もある。\n一方で、在宅勤務には課題も少なくない。同僚と顔を合わせる機会が減り、ちょっとした相談がしにくくなったと感じる人がいる。さらに、仕事と私生活の境目があいまいになり、つい夜遅くまで働いてしまうという問題も指摘されている。\n私は、在宅勤務か出社かのどちらか一方を選ぶのではなく、仕事の内容に応じて使い分けることが望ましいと考える。一人で集中する作業は自宅で行い、話し合いが必要な日は職場に集まればよい。働き方の選択肢が増えた今こそ、場所にとらわれず、どうすれば成果を上げられるかを一人一人が考えるべきではないだろうか。",
    why_good: [
      "長所、短所、自分の意見の順に段落が分かれていて、意見文の基本の構成になっている。",
      "「また」「一方で」「さらに」などの接続詞で、話の流れが分かりやすい。",
      "「〜ではなく、〜」で、自分の立場をはっきり示している。",
      "「〜べきではないだろうか」という問いかけで、読み手に考えさせる形で締めくくっている。"
    ],
    source: "",
    source_url: ""
  }
];
