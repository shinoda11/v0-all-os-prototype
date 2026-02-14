// ============================================================
// Task Card Seed Data - Generated from タスクカード整理_20260213.xlsx
// 充填済み47件 = enabled:true / 未充填110件 = enabled:false
// Generated: 2026-02-14
// ============================================================

import type { TaskCard, TaskCategory, BoxTemplate, StarRequirement } from '@/core/types';

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

  // ============================================================
  // 未充填プレースホルダー (enabled: false, standardMinutes: 0)
  // 110件: tc-048 ~ tc-157
  // ============================================================

  // === ①ネタ仕込み 残り11件 ===
  { id: 'tc-048', categoryId: 'cat-01', name: 'カンパチ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-049', categoryId: 'cat-01', name: '熟成サーモン', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-050', categoryId: 'cat-01', name: '炙りたこ', role: 'prep', starRequirement: 3 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-051', categoryId: 'cat-01', name: '生たこ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-052', categoryId: 'cat-01', name: '炙りいさき', role: 'prep', starRequirement: 3 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 15, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-053', categoryId: 'cat-01', name: 'サーモン押し', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-054', categoryId: 'cat-01', name: '真鯵', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-055', categoryId: 'cat-01', name: 'ズワイ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-056', categoryId: 'cat-01', name: '野沢菜', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-057', categoryId: 'cat-01', name: 'いかの柚子胡椒', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-058', categoryId: 'cat-01', name: 'たこわさ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ②軍艦仕込み 残り13件 ===
  { id: 'tc-059', categoryId: 'cat-02', name: 'いくら', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-060', categoryId: 'cat-02', name: '塩水うに', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-061', categoryId: 'cat-02', name: 'ツナサラダ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-062', categoryId: 'cat-02', name: 'かに味噌', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-063', categoryId: 'cat-02', name: 'ネギとろ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-064', categoryId: 'cat-02', name: '納豆チューブ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-065', categoryId: 'cat-02', name: 'とびっこ', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-066', categoryId: 'cat-02', name: 'かっぱ芯(ロール+巻き)', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-067', categoryId: 'cat-02', name: 'かっぱ芯(うなきゅう)', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-068', categoryId: 'cat-02', name: 'アボカド', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-069', categoryId: 'cat-02', name: 'いかそうめん', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-070', categoryId: 'cat-02', name: '海鮮納豆', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-071', categoryId: 'cat-02', name: 'いなり', role: 'prep', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ③押し寿司プレップ 5件 ===
  { id: 'tc-072', categoryId: 'cat-03', name: 'サーモン押し鮨', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-073', categoryId: 'cat-03', name: '海老押し鮨', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-074', categoryId: 'cat-03', name: '鯖押し鮨', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-075', categoryId: 'cat-03', name: 'まぐろ押し鮨', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-076', categoryId: 'cat-03', name: 'シャリ玉', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ④ロールプレップ 4件 ===
  { id: 'tc-077', categoryId: 'cat-04', name: '鯖棒すし', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-078', categoryId: 'cat-04', name: 'カリフォルニアロール', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-079', categoryId: 'cat-04', name: 'Aburi生海老', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-080', categoryId: 'cat-04', name: '玉子握り', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ⑤揚げ仕込み 5件 ===
  { id: 'tc-081', categoryId: 'cat-05', name: '牡蠣オリーブ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-082', categoryId: 'cat-05', name: 'とり天', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-083', categoryId: 'cat-05', name: '海老天', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-084', categoryId: 'cat-05', name: 'アジフライ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-085', categoryId: 'cat-05', name: 'コロッケ', role: 'kitchen', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ⑥汁・サイド仕込み 12件 ===
  { id: 'tc-086', categoryId: 'cat-06', name: 'あおさ汁', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-087', categoryId: 'cat-06', name: 'しじみ汁', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-088', categoryId: 'cat-06', name: 'かに汁', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-089', categoryId: 'cat-06', name: '茶碗蒸し', role: 'kitchen', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-090', categoryId: 'cat-06', name: 'だし巻き卵', role: 'kitchen', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-091', categoryId: 'cat-06', name: '枝豆', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-092', categoryId: 'cat-06', name: '冷奴', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-093', categoryId: 'cat-06', name: 'サラダ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-094', categoryId: 'cat-06', name: 'ポテトフライ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-095', categoryId: 'cat-06', name: '漬物盛り合わせ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-096', categoryId: 'cat-06', name: '唐揚げ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-097', categoryId: 'cat-06', name: 'たこ焼き', role: 'kitchen', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ⑦キッチン仕込み 53件 (tc-098 ~ tc-150) ===
  { id: 'tc-098', categoryId: 'cat-07', name: 'さば押し用ガリ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-099', categoryId: 'cat-07', name: 'バッテラ付け込み', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-100', categoryId: 'cat-07', name: 'ガリ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-101', categoryId: 'cat-07', name: 'シャリ酢', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-102', categoryId: 'cat-07', name: 'シャリ炊き', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-103', categoryId: 'cat-07', name: '酢飯合わせ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-104', categoryId: 'cat-07', name: '味噌汁仕込み', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-105', categoryId: 'cat-07', name: '出汁取り', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-106', categoryId: 'cat-07', name: '天つゆ仕込み', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-107', categoryId: 'cat-07', name: 'ポン酢仕込み', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-108', categoryId: 'cat-07', name: '甘ダレ仕込み', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-109', categoryId: 'cat-07', name: '煮切り醤油', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-110', categoryId: 'cat-07', name: '漬け醤油', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-111', categoryId: 'cat-07', name: '柚子胡椒', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-112', categoryId: 'cat-07', name: 'わさび用意', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-113', categoryId: 'cat-07', name: '醤油差し補充', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-114', categoryId: 'cat-07', name: 'レモン・すだちカット', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-115', categoryId: 'cat-07', name: '大葉洗い', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-116', categoryId: 'cat-07', name: 'ネギ小口切り', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-117', categoryId: 'cat-07', name: '玉ねぎスライス', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-118', categoryId: 'cat-07', name: 'みょうがカット', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-119', categoryId: 'cat-07', name: '生姜おろし', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-120', categoryId: 'cat-07', name: 'にんにくおろし', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-121', categoryId: 'cat-07', name: '天ぷら衣仕込み', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-122', categoryId: 'cat-07', name: 'パン粉準備', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-123', categoryId: 'cat-07', name: 'フライ油交換', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-124', categoryId: 'cat-07', name: 'コンロ火力チェック', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-125', categoryId: 'cat-07', name: '冷蔵庫温度チェック', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-126', categoryId: 'cat-07', name: '冷凍庫温度チェック', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-127', categoryId: 'cat-07', name: '食材検品', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-128', categoryId: 'cat-07', name: '納品受け入れ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-129', categoryId: 'cat-07', name: '食材ストック整理', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-130', categoryId: 'cat-07', name: '消費期限チェック', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-131', categoryId: 'cat-07', name: 'FIFO整理', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '先入先出の徹底 / 要入力: 標準時間未設定' },
  { id: 'tc-132', categoryId: 'cat-07', name: '包丁研ぎ', role: 'kitchen', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-133', categoryId: 'cat-07', name: 'まな板消毒', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-134', categoryId: 'cat-07', name: 'ふきん煮沸', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-135', categoryId: 'cat-07', name: '手袋・使い捨て備品補充', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-136', categoryId: 'cat-07', name: 'ラップ・アルミホイル補充', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-137', categoryId: 'cat-07', name: '容器・パック補充', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-138', categoryId: 'cat-07', name: '洗剤・除菌剤補充', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-139', categoryId: 'cat-07', name: 'グリストラップ清掃', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-140', categoryId: 'cat-07', name: '排水口清掃', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-141', categoryId: 'cat-07', name: '換気扇フィルター清掃', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-142', categoryId: 'cat-07', name: '製氷機清掃', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-143', categoryId: 'cat-07', name: '氷補充', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-144', categoryId: 'cat-07', name: '湯煎器セット', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-145', categoryId: 'cat-07', name: 'バーナーガス補充', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-146', categoryId: 'cat-07', name: 'スチコン予熱', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-147', categoryId: 'cat-07', name: '真空パック作業', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-148', categoryId: 'cat-07', name: 'ラベル印刷・貼付', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-149', categoryId: 'cat-07', name: '仕込み量記録', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-150', categoryId: 'cat-07', name: '残量チェック・発注メモ', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ⑨ピーク対応 残り3件 ===
  { id: 'tc-151', categoryId: 'cat-09', name: '急ぎ握り対応', role: 'prep', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, isPeak: true, notes: '要入力: 標準時間未設定' },
  { id: 'tc-152', categoryId: 'cat-09', name: 'テイクアウト包装', role: 'floor', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, isPeak: true, notes: '要入力: 標準時間未設定' },
  { id: 'tc-153', categoryId: 'cat-09', name: 'クレーム初期対応', role: 'floor', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 10, enabled: false, isPeak: true, notes: '要入力: 標準時間未設定' },

  // === ⑪管理業務 残り2件 ===
  { id: 'tc-154', categoryId: 'cat-11', name: '食材ロス集計', role: 'unknown', starRequirement: 2 as StarRequirement, standardMinutes: 0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 30, enabled: false, notes: '要入力: 標準時間未設定' },
  { id: 'tc-155', categoryId: 'cat-11', name: 'スタッフ面談', role: 'unknown', starRequirement: 3 as StarRequirement, standardMinutes: 0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 50, enabled: false, notes: '要入力: 標準時間未設定' },

  // === ⑫洗い場 2件 ===
  { id: 'tc-156', categoryId: 'cat-12', name: '食器洗浄', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '食洗機投入・手洗い / 常時稼働 / 要入力: 標準時間未設定' },
  { id: 'tc-157', categoryId: 'cat-12', name: '調理器具洗浄', role: 'kitchen', starRequirement: 1 as StarRequirement, standardMinutes: 0, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1, qualityCheck: 'none', xpReward: 5, enabled: false, notes: '鍋・バット・包丁等の洗浄 / 要入力: 標準時間未設定' },
];

// ============================================================
// Box Templates - Group task cards into deployable boxes
// ============================================================

export const BOX_TEMPLATES: BoxTemplate[] = [
  {
    id: 'box-01',
    name: '開店準備',
    timeBand: 'lunch',
    taskCardIds: ['tc-023', 'tc-024', 'tc-025', 'tc-026', 'tc-027', 'tc-028'],
    boxRule: { type: 'always' },
    enabled: true,
    description: 'テーブルセッティング〜ドリンクステーション準備',
  },
  {
    id: 'box-02',
    name: 'ネタ仕込み基本',
    timeBand: 'lunch',
    taskCardIds: ['tc-001', 'tc-002', 'tc-003', 'tc-004', 'tc-005', 'tc-006', 'tc-007', 'tc-008', 'tc-010', 'tc-011', 'tc-012'],
    boxRule: { type: 'always' },
    enabled: true,
    description: 'まぐろ・白身・サーモン等の基本ネタ仕込み',
  },
  {
    id: 'box-03',
    name: '高難度ネタ仕込み',
    timeBand: 'lunch',
    taskCardIds: ['tc-009', 'tc-013', 'tc-014', 'tc-015', 'tc-016', 'tc-017', 'tc-021'],
    boxRule: { type: 'salesRange', minSales: 150000 },
    enabled: true,
    description: '炙りサーモン・貝類・鯖卸し等（★3含む）',
  },
  {
    id: 'box-04',
    name: 'ピーク対応',
    timeBand: 'lunch',
    taskCardIds: ['tc-029', 'tc-030', 'tc-031', 'tc-032', 'tc-033'],
    boxRule: { type: 'always' },
    enabled: true,
    description: 'オーダーテイク〜ウェイティング案内',
  },
  {
    id: 'box-05',
    name: '閉店作業',
    timeBand: 'dinner',
    taskCardIds: ['tc-034', 'tc-035', 'tc-036', 'tc-037', 'tc-038', 'tc-039', 'tc-040', 'tc-041', 'tc-042'],
    boxRule: { type: 'always' },
    enabled: true,
    description: 'レーン停止〜翌日仕込みメモ確認',
  },
  {
    id: 'box-06',
    name: '管理業務',
    timeBand: 'lunch',
    taskCardIds: ['tc-043', 'tc-044', 'tc-045', 'tc-046'],
    boxRule: { type: 'always' },
    enabled: true,
    description: 'シフト確認・朝礼・発注確認・日次レビュー',
  },
];
