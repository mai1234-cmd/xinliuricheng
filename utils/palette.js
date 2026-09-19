// 分类色板：颜色只编码分类，禁止用于日期/状态/优先级。
const CATEGORY_PALETTE = [
  { id: '', name: '不分类', icon: '🗂', color: '#9AA0A6', rgba: 'rgba(154,160,166,.12)', light: '#F5F6F6', light16: '#EFF0F1', dark: '#A3A8AD', darkBg: '#3B3C41' },
  { id: 'work', name: '工作', icon: '💼', color: '#2563EB', rgba: 'rgba(37,99,235,.12)', light: '#E9EFFD', light16: '#DCE6FC', dark: '#6991E8', darkBg: '#2E374E' },
  { id: 'study', name: '学习', icon: '📚', color: '#8B5CF6', rgba: 'rgba(139,92,246,.12)', light: '#F3EFFE', light16: '#ECE5FE', dark: '#8E64ED', darkBg: '#372D4F' },
  { id: 'sport', name: '运动', icon: '🏃', color: '#EF4444', rgba: 'rgba(239,68,68,.12)', light: '#FDECEC', light16: '#FCE1E1', dark: '#E96868', darkBg: '#4B2E31' },
  { id: 'life', name: '生活', icon: '🏠', color: '#FACC15', rgba: 'rgba(250,204,21,.12)', light: '#FEFAE8', light16: '#FEF7DA', dark: '#F1D45F', darkBg: '#4C462F' },
  { id: 'rest', name: '休息', icon: '😴', color: '#38BDF8', rgba: 'rgba(56,189,248,.12)', light: '#EBF8FE', light16: '#DFF4FE', dark: '#61C4EF', darkBg: '#2D434F' },
  { id: 'chore', name: '家务', icon: '🧹', color: '#A1774F', rgba: 'rgba(161,119,79,.12)', light: '#F6F1ED', light16: '#F0E9E3', dark: '#C2A88E', darkBg: '#423C3A' },
  { id: 'health', name: '健康', icon: '💊', color: '#22C55E', rgba: 'rgba(34,197,94,.12)', light: '#E9F9EF', light16: '#DCF6E5', dark: '#72DE9A', darkBg: '#30483C' },
  { id: 'fun', name: '娱乐', icon: '🎮', color: '#EC4899', rgba: 'rgba(236,72,153,.12)', light: '#FDEDF5', light16: '#FCE2EF', dark: '#E66AA8', darkBg: '#4A2F3F' },
  { id: 'social', name: '社交', icon: '👥', color: '#FB923C', rgba: 'rgba(251,146,60,.12)', light: '#FFF4EC', light16: '#FEEEE0', dark: '#F2A15F', darkBg: '#4D3B2F' },
  { id: 'travel', name: '出行', icon: '🚗', color: '#14B8A6', rgba: 'rgba(20,184,166,.12)', light: '#E8F8F6', light16: '#D9F4F1', dark: '#6BE6D8', darkBg: '#2F4A4A' },
  { id: 'other', name: '其他（待归类）', icon: '⭐', color: '#6B7280', rgba: 'rgba(107,114,128,.12)', light: '#F0F1F2', light16: '#E7E8EB', dark: '#A1A6AF', darkBg: '#3B3C41' }
];

function catById(id) {
  return CATEGORY_PALETTE.find((c) => c.id === id) || CATEGORY_PALETTE[0];
}

module.exports = { CATEGORY_PALETTE, catById };
