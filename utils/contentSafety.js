// 基础敏感内容本地拦截（词表以码点存储，避免明文；完整合规请接微信内容安全接口）。
const GROUPS = [
  { id: 'gambling', codes: [[36172,21338],[36172,22330],[19979,27880],[21338,24425]] },
  { id: 'drugs', codes: [[27602,21697],[21560,27602],[20912,27602],[22823,40635]] },
  { id: 'fraud', codes: [[35784,39575],[27927,38065],[21047,21333],[20195,24320,21457,31080]] },
  { id: 'violence', codes: [[26538,25903],[28856,24377],[29190,28856,29289],[33258,26432],[26432,20154]] },
];

function decode(codes) {
  return String.fromCharCode.apply(null, codes);
}

function checkText() {
  const texts = Array.prototype.slice.call(arguments).map(function (v) { return String(v || ''); });
  const all = texts.join(String.fromCharCode(10));
  for (let i = 0; i < GROUPS.length; i += 1) {
    const g = GROUPS[i];
    for (let j = 0; j < g.codes.length; j += 1) {
      if (all.indexOf(decode(g.codes[j])) >= 0) return true;
    }
  }
  return false;
}

module.exports = { checkText };
