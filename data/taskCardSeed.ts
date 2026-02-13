// ============================================================
// Task Card Seed Data - Generated from タスクカード整理_20260213.xlsx
// 充填済み47件 = enabled:true / 未充填110件 = enabled:false
// Generated: 2026-02-14
// ============================================================

import type { TaskCard, TaskCategory, StarRequirement } from '@/core/types';

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'cat-01', name: '①ネタ仕込み' },
  { id: 'cat-02', name: '②軍艦仕込み' },
  { id: 'cat-03', name: '③押し寿司プレップ' },
  { id: 'cat-04', name: '④ロールプレップ' },
  { id: 'cat-05', name: '⑤揚げ仕込み' },
  { id: 'cat-06', name: '⑥汁・サイド仕込み' },
  { id: 'cat-07', name: '⑦キッチン仕込み' },
  { id: 'cat-08', name: '⑧開店準備' },
  { id: 'cat-09', name: '⑨ピーク対応' },
  { id: 'cat-10', name: '⑩閉店作業' },
  { id: 'cat-11', name: '⑪管理業務（店長）' },
  { id: 'cat-12', name: '⑫洗い場' },
];

export const TASK_CARDS: TaskCard[] = [
  // === ①ネタ仕込み (21 filled) ===
  { id: 'tc-001', categoryId: 'cat-01', name: 'ばちまぐろ', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 4.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 20, enabled: true, notes: '①柵どり 1k＝1分 ②ネタカット 1P＝4分' },
  { id: 'tc-002', categoryId: 'cat-01', name: 'ビンとろ', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 4.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 20, enabled: true, notes: '①柵どり 1k＝1分 ②ネタカット 1P＝4分' },
  { id: 'tc-003', categoryId: 'cat-01', name: '赤身', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 4.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 20, enabled: true, notes: '①柵どり 1k＝1分 ②ネタカット 1P＝4分' },
  { id: 'tc-004', categoryId: 'cat-01', name: '中トロ', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 4.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 20, enabled: true, notes: '①柵どり 1k＝1分 ②ネタカット 1P＝4分' },
  { id: 'tc-005', categoryId: 'cat-01', name: '大トロ', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 4.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 20, enabled: true, notes: '①柵どり 1k＝1分 ②ネタカット 1P＝4分' },
  { id: 'tc-006', categoryId: 'cat-01', name: '真鯛', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: true, notes: '①1フィレ＝30秒 ②ネタカット 1P＝3分' },
  { id: 'tc-007', categoryId: 'cat-01', name: '平目', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: true, notes: '①1フィレ＝30秒 ②ネタカット 1P＝3分' },
  { id: 'tc-008', categoryId: 'cat-01', name: '生サーモン', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: true, notes: '①柵どり 1枚＝3分 ②ネタカット 1P＝3分' },
  { id: 'tc-009', categoryId: 'cat-01', name: '炙りサーモン', role: 'prep', starRequirement: 3 as StarRequirement, standardMinutes: 5.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 40, enabled: true, notes: '①柵どり 1P＝1分 ②ネタカット 1P＝5分' },
  { id: 'tc-010', categoryId: 'cat-01', name: 'さわら', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: true, notes: '①柵どり 1本＝30秒 ②ネタカット 1P＝3分' },
  { id: 'tc-011', categoryId: 'cat-01', name: '穴子', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: true, notes: '①ネタカット 1P＝3分' },
  { id: 'tc-012', categoryId: 'cat-01', name: 'うなぎ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: true, notes: '①ネタカット 1P＝3分' },
  { id: 'tc-013', categoryId: 'cat-01', name: '白いか', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 5.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 25, enabled: true, notes: '①下処理 1P＝1分 ②ネタカット 1P＝5分' },
  { id: 'tc-014', categoryId: 'cat-01', name: '平貝', role: 'prep', starRequirement: 3 as StarRequirement, standardMinutes: 2.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: true, notes: '①下処理 塩水洗い15分 浸透圧30分 ②ネタカット 1P＝2分' },
  { id: 'tc-015', categoryId: 'cat-01', name: 'つぶ貝', role: 'prep', starRequirement: 3 as StarRequirement, standardMinutes: 0.5, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: true, notes: '①塩揉み30秒 浸透圧30分 ②ネタ詰め 1P＝30秒' },
  { id: 'tc-016', categoryId: 'cat-01', name: '牛', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 5.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 25, enabled: true, notes: '①ネタカット 1P＝5分' },
  { id: 'tc-017', categoryId: 'cat-01', name: '金目鯛', role: 'prep', starRequirement: 3 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 25, enabled: true, notes: '①卸し 1本＝5分 ②ネタカット 1P＝3分' },
  { id: 'tc-018', categoryId: 'cat-01', name: '鯛昆布〆', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: true, notes: '①ネタカット 1P＝3分' },
  { id: 'tc-019', categoryId: 'cat-01', name: '平目昆布〆', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0.5, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, notes: '①ネタ詰め 1P＝30秒' },
  { id: 'tc-020', categoryId: 'cat-01', name: '海老昆布〆', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 1.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, notes: '①ネタ詰め 1P＝1分' },
  { id: 'tc-021', categoryId: 'cat-01', name: '鯖卸し', role: 'prep', starRequirement: 3 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 25, enabled: true, notes: '①卸し 1本＝1分 ②塩45分 酢締め計60分 ③ネタカット 1P＝3分' },
  // === ②軍艦仕込み (1 filled) ===
  { id: 'tc-022', categoryId: 'cat-02', name: 'うなぎ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 3.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: true, notes: '①ネタカット 1P＝3分' },
  // === ⑧開店準備 (6 filled) ===
  { id: 'tc-023', categoryId: 'cat-08', name: 'テーブルセッティング', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 2.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, notes: 'テーブル拭き・箸セット・醤油補充 / 全卓数分' },
  { id: 'tc-024', categoryId: 'cat-08', name: 'レーン清掃・動作確認', role: 'floor', starRequirement: 2 as StarRequirement, standardMinutes: 15.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: 'コンベアレーンの清掃と動作テスト' },
  { id: 'tc-025', categoryId: 'cat-08', name: 'POP・メニュー設置', role: 'floor', starRequirement: 2 as StarRequirement, standardMinutes: 10.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: '季節メニューPOP、メニューブック配置' },
  { id: 'tc-026', categoryId: 'cat-08', name: '箸・調味料補充', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 1.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, notes: '各卓の箸、ガリ、醤油、わさび補充' },
  { id: 'tc-027', categoryId: 'cat-08', name: 'タッチパネル起動確認', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 0.5, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, notes: '全卓のオーダー端末起動・接続確認' },
  { id: 'tc-028', categoryId: 'cat-08', name: 'ドリンクステーション準備', role: 'floor', starRequirement: 2 as StarRequirement, standardMinutes: 10.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: 'ドリンク用氷・グラス・サーバー準備' },
  // === ⑨ピーク対応 (5 filled, isPeak: true) ===
  { id: 'tc-029', categoryId: 'cat-09', name: 'オーダーテイク', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 1.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, isPeak: true, notes: 'タッチパネル補助・口頭注文対応' },
  { id: 'tc-030', categoryId: 'cat-09', name: '配膳', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 0.5, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, isPeak: true, notes: 'レーン or 手渡し配膳' },
  { id: 'tc-031', categoryId: 'cat-09', name: 'バッシング', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 2.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, isPeak: true, notes: '食器下げ・テーブルリセット / 退店ごと' },
  { id: 'tc-032', categoryId: 'cat-09', name: '会計対応', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 2.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, isPeak: true, notes: 'レジ精算・クレジット/QR対応' },
  { id: 'tc-033', categoryId: 'cat-09', name: 'ウェイティング案内', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 1.0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, isPeak: true, notes: '入口での待ち客管理・案内' },
  // === ⑩閉店作業 (9 filled) ===
  { id: 'tc-034', categoryId: 'cat-10', name: 'レーン停止・清掃', role: 'floor', starRequirement: 2 as StarRequirement, standardMinutes: 20.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: 'コンベア停止、レーン・カバー清掃' },
  { id: 'tc-035', categoryId: 'cat-10', name: 'フロア清掃', role: 'floor', starRequirement: 2 as StarRequirement, standardMinutes: 15.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: '床掃除・モップがけ' },
  { id: 'tc-036', categoryId: 'cat-10', name: 'テーブル片付け・消毒', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 1.5, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: true, notes: '全卓の清掃・消毒・翌日準備' },
  { id: 'tc-037', categoryId: 'cat-10', name: '洗い場最終', role: 'kitchen', starRequirement: 2 as StarRequirement, standardMinutes: 30.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: '残食器洗浄・食洗機清掃' },
  { id: 'tc-038', categoryId: 'cat-10', name: 'ネタケース清掃・冷蔵', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 15.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: '残ネタのラップ・冷蔵庫格納' },
  { id: 'tc-039', categoryId: 'cat-10', name: 'キッチン清掃', role: 'kitchen', starRequirement: 2 as StarRequirement, standardMinutes: 20.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: 'コンロ・フライヤー・作業台清掃' },
  { id: 'tc-040', categoryId: 'cat-10', name: 'ゴミ出し・分別', role: 'floor', starRequirement: 2 as StarRequirement, standardMinutes: 10.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: 'ゴミの分別・集積所への搬出' },
  { id: 'tc-041', categoryId: 'cat-10', name: '売上締め・レジ精算', role: 'unknown', starRequirement: 2 as StarRequirement, standardMinutes: 10.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: 'POS締め処理・現金突合' },
  { id: 'tc-042', categoryId: 'cat-10', name: '翌日仕込みメモ確認', role: 'unknown', starRequirement: 2 as StarRequirement, standardMinutes: 5.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 25, enabled: true, notes: '翌日の予測出数に対する仕込み不足確認' },
  // === ⑪管理業務（店長）(5 filled) ===
  { id: 'tc-043', categoryId: 'cat-11', name: 'シフト確認・調整', role: 'unknown', starRequirement: 2 as StarRequirement, standardMinutes: 10.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: '当日シフトの最終確認・欠員対応' },
  { id: 'tc-044', categoryId: 'cat-11', name: '朝礼・申し送り', role: 'unknown', starRequirement: 2 as StarRequirement, standardMinutes: 10.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: '前日の振り返り・当日の重点共有' },
  { id: 'tc-045', categoryId: 'cat-11', name: '発注確認・承認', role: 'unknown', starRequirement: 2 as StarRequirement, standardMinutes: 15.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: true, notes: '自動発注のレビュー・手動修正' },
  { id: 'tc-046', categoryId: 'cat-11', name: '日次レビュー', role: 'unknown', starRequirement: 3 as StarRequirement, standardMinutes: 15.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 80, enabled: true, notes: '売上・人件費率・タスク完了率の確認 / All OS上で実施' },
  { id: 'tc-047', categoryId: 'cat-11', name: '週次レビュー', role: 'unknown', starRequirement: 3 as StarRequirement, standardMinutes: 30.0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 80, enabled: true, notes: '週間パフォーマンス分析・次週計画 / 週1回' },
];
