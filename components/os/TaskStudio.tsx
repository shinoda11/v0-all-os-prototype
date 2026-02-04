'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Copy,
  Trash2,
  FolderOpen,
  FileText,
  Star,
  Clock,
  Zap,
} from 'lucide-react';
import type { TaskCard, TaskCategory, TaskRole, StarRequirement, QuantityMode, QualityCheck } from '@/core/types';

// Initial sample data - 20 tasks across different categories
const INITIAL_CATEGORIES: TaskCategory[] = [
  { id: 'cat-1', name: '仕込み' },
  { id: 'cat-1-1', name: '魚の仕込み', parentId: 'cat-1' },
  { id: 'cat-1-2', name: '野菜の仕込み', parentId: 'cat-1' },
  { id: 'cat-1-3', name: 'ソース・タレ', parentId: 'cat-1' },
  { id: 'cat-2', name: 'フロア' },
  { id: 'cat-2-1', name: '開店準備', parentId: 'cat-2' },
  { id: 'cat-2-2', name: '接客', parentId: 'cat-2' },
  { id: 'cat-3', name: 'ピーク対応' },
  { id: 'cat-3-1', name: 'ランチピーク', parentId: 'cat-3' },
  { id: 'cat-3-2', name: 'ディナーピーク', parentId: 'cat-3' },
];

const INITIAL_TASKS: TaskCard[] = [
  // 仕込み - 魚
  { id: 'task-1', categoryId: 'cat-1-1', name: '炙りサーモン握り仕込み', role: 'kitchen', starRequirement: 2, standardMinutes: 30, quantityMode: 'byForecast', baseQuantity: 20, coefficient: 1.2, qualityCheck: 'photo', xpReward: 50, enabled: true },
  { id: 'task-2', categoryId: 'cat-1-1', name: 'マグロ柵切り', role: 'kitchen', starRequirement: 3, standardMinutes: 45, quantityMode: 'byForecast', baseQuantity: 15, coefficient: 1.0, qualityCheck: 'ai', xpReward: 80, enabled: true },
  { id: 'task-3', categoryId: 'cat-1-1', name: 'イカ下処理', role: 'prep', starRequirement: 2, standardMinutes: 25, quantityMode: 'byForecast', baseQuantity: 10, coefficient: 1.1, qualityCheck: 'photo', xpReward: 40, enabled: true },
  { id: 'task-4', categoryId: 'cat-1-1', name: 'エビ背わた取り', role: 'prep', starRequirement: 1, standardMinutes: 20, quantityMode: 'byForecast', baseQuantity: 30, coefficient: 1.0, qualityCheck: 'none', xpReward: 25, enabled: true },
  // 仕込み - 野菜
  { id: 'task-5', categoryId: 'cat-1-2', name: 'ネギ小口切り', role: 'prep', starRequirement: 1, standardMinutes: 15, quantityMode: 'fixed', baseQuantity: 5, coefficient: 1.0, qualityCheck: 'none', xpReward: 15, enabled: true },
  { id: 'task-6', categoryId: 'cat-1-2', name: '大葉洗浄・水切り', role: 'prep', starRequirement: 1, standardMinutes: 10, quantityMode: 'byForecast', baseQuantity: 100, coefficient: 0.8, qualityCheck: 'none', xpReward: 10, enabled: true },
  { id: 'task-7', categoryId: 'cat-1-2', name: 'ガリ盛り付け準備', role: 'prep', starRequirement: 1, standardMinutes: 10, quantityMode: 'fixed', baseQuantity: 50, coefficient: 1.0, qualityCheck: 'none', xpReward: 10, enabled: true },
  // 仕込み - ソース
  { id: 'task-8', categoryId: 'cat-1-3', name: '特製タレ仕込み', role: 'kitchen', starRequirement: 3, standardMinutes: 40, quantityMode: 'fixed', baseQuantity: 2, coefficient: 1.0, qualityCheck: 'ai', xpReward: 70, enabled: true },
  { id: 'task-9', categoryId: 'cat-1-3', name: 'ポン酢調合', role: 'kitchen', starRequirement: 2, standardMinutes: 15, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 20, enabled: true },
  // フロア - 開店準備
  { id: 'task-10', categoryId: 'cat-2-1', name: 'テーブルセッティング', role: 'floor', starRequirement: 1, standardMinutes: 20, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'photo', xpReward: 20, enabled: true },
  { id: 'task-11', categoryId: 'cat-2-1', name: '箸・調味料補充', role: 'floor', starRequirement: 1, standardMinutes: 15, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 15, enabled: true },
  { id: 'task-12', categoryId: 'cat-2-1', name: 'メニュー確認・POP設置', role: 'floor', starRequirement: 1, standardMinutes: 10, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 10, enabled: true },
  // フロア - 接客
  { id: 'task-13', categoryId: 'cat-2-2', name: 'オーダーテイク', role: 'floor', starRequirement: 2, standardMinutes: 5, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 5, enabled: true },
  { id: 'task-14', categoryId: 'cat-2-2', name: '配膳', role: 'runner', starRequirement: 1, standardMinutes: 3, quantityMode: 'byOrders', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 3, enabled: true },
  // ピーク対応 - ランチ
  { id: 'task-15', categoryId: 'cat-3-1', name: 'ランチセット追加仕込み', role: 'kitchen', starRequirement: 2, standardMinutes: 20, quantityMode: 'byForecast', baseQuantity: 10, coefficient: 1.5, qualityCheck: 'none', xpReward: 30, enabled: true },
  { id: 'task-16', categoryId: 'cat-3-1', name: 'レジ応援', role: 'cashier', starRequirement: 2, standardMinutes: 60, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 40, enabled: true },
  { id: 'task-17', categoryId: 'cat-3-1', name: 'バッシング強化', role: 'floor', starRequirement: 1, standardMinutes: 30, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 25, enabled: true },
  // ピーク対応 - ディナー
  { id: 'task-18', categoryId: 'cat-3-2', name: '刺身盛り合わせ仕込み', role: 'kitchen', starRequirement: 3, standardMinutes: 35, quantityMode: 'byForecast', baseQuantity: 8, coefficient: 1.3, qualityCheck: 'photo', xpReward: 60, enabled: true },
  { id: 'task-19', categoryId: 'cat-3-2', name: 'ドリンク準備強化', role: 'floor', starRequirement: 1, standardMinutes: 15, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'none', xpReward: 15, enabled: true },
  { id: 'task-20', categoryId: 'cat-3-2', name: '予約席セッティング', role: 'floor', starRequirement: 2, standardMinutes: 10, quantityMode: 'fixed', baseQuantity: 1, coefficient: 1.0, qualityCheck: 'photo', xpReward: 15, enabled: true },
];

// Role display names
const ROLE_LABELS: Record<TaskRole, string> = {
  kitchen: '厨房',
  floor: 'ホール',
  cashier: 'レジ',
  prep: '仕込み',
  runner: 'ランナー',
  unknown: '未設定',
};

const ROLE_COLORS: Record<TaskRole, string> = {
  kitchen: 'bg-orange-100 text-orange-800 border-orange-200',
  floor: 'bg-blue-100 text-blue-800 border-blue-200',
  cashier: 'bg-green-100 text-green-800 border-green-200',
  prep: 'bg-purple-100 text-purple-800 border-purple-200',
  runner: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  unknown: 'bg-gray-100 text-gray-800 border-gray-200',
};

const QUANTITY_MODE_LABELS: Record<QuantityMode, string> = {
  fixed: '固定',
  byForecast: '予測連動',
  byOrders: '注文連動',
};

const QUALITY_CHECK_LABELS: Record<QualityCheck, string> = {
  none: 'なし',
  photo: '写真',
  ai: 'AI',
};

interface CategoryTreeItemProps {
  category: TaskCategory;
  categories: TaskCategory[];
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
  level: number;
}

function CategoryTreeItem({ category, categories, selectedCategoryId, onSelect, level }: CategoryTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = categories.filter((c) => c.parentId === category.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        onClick={() => onSelect(category.id)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
          selectedCategoryId === category.id
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-background/50 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <FolderOpen className="h-4 w-4 shrink-0" />
        <span className="truncate">{category.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskCardItemProps {
  task: TaskCard;
  category?: TaskCategory;
  onEdit: (task: TaskCard) => void;
  onDuplicate: (task: TaskCard) => void;
  onToggleEnabled: (task: TaskCard) => void;
}

function TaskCardItem({ task, category, onEdit, onDuplicate, onToggleEnabled }: TaskCardItemProps) {
  return (
    <Card 
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        !task.enabled && 'opacity-50'
      )}
      onClick={() => onEdit(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <h4 className="font-medium truncate">{task.name}</h4>
            </div>
            {category && (
              <p className="text-xs text-muted-foreground mb-2 truncate">
                {category.name}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn('text-xs', ROLE_COLORS[task.role])}>
                {ROLE_LABELS[task.role]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Star className="h-3 w-3 mr-0.5 text-yellow-500" />
                {task.starRequirement}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-0.5" />
                {task.standardMinutes}分
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-0.5 text-purple-500" />
                {task.xpReward}XP
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Checkbox
              checked={task.enabled}
              onCheckedChange={() => onToggleEnabled(task)}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(task);
              }}
              className="p-1 hover:bg-muted rounded"
              title="複製"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskStudio() {
  const { state, actions } = useStore();
  const { t } = useI18n();

  // Initialize with sample data if empty
  const [categories, setCategories] = useState<TaskCategory[]>(() => {
    return state.taskCategories?.length ? state.taskCategories : INITIAL_CATEGORIES;
  });
  
  const [tasks, setTasks] = useState<TaskCard[]>(() => {
    return state.taskCards?.length ? state.taskCards : INITIAL_TASKS;
  });

  // UI State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TaskRole | 'all'>('all');
  const [starFilter, setStarFilter] = useState<StarRequirement | 'all'>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editingTask, setEditingTask] = useState<TaskCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get root categories
  const rootCategories = categories.filter((c) => !c.parentId);

  // Get category name by ID
  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  // Get all descendant category IDs
  const getDescendantCategoryIds = (categoryId: string): string[] => {
    const children = categories.filter((c) => c.parentId === categoryId);
    return [categoryId, ...children.flatMap((c) => getDescendantCategoryIds(c.id))];
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by category
    if (selectedCategoryId) {
      const categoryIds = getDescendantCategoryIds(selectedCategoryId);
      result = result.filter((task) => categoryIds.includes(task.categoryId));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((task) => 
        task.name.toLowerCase().includes(query) ||
        getCategoryById(task.categoryId)?.name.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter((task) => task.role === roleFilter);
    }

    // Filter by star
    if (starFilter !== 'all') {
      result = result.filter((task) => task.starRequirement === starFilter);
    }

    // Filter by enabled
    if (enabledFilter === 'enabled') {
      result = result.filter((task) => task.enabled);
    } else if (enabledFilter === 'disabled') {
      result = result.filter((task) => !task.enabled);
    }

    return result;
  }, [tasks, selectedCategoryId, searchQuery, roleFilter, starFilter, enabledFilter, categories]);

  // Handlers
  const handleEditTask = (task: TaskCard) => {
    setEditingTask({ ...task });
    setIsDrawerOpen(true);
  };

  const handleCreateTask = () => {
    const newTask: TaskCard = {
      id: `task-${Date.now()}`,
      categoryId: selectedCategoryId || rootCategories[0]?.id || '',
      name: '新規タスク',
      role: 'unknown',
      starRequirement: 1,
      standardMinutes: 15,
      quantityMode: 'fixed',
      baseQuantity: 1,
      coefficient: 1.0,
      qualityCheck: 'none',
      xpReward: 10,
      enabled: true,
    };
    setEditingTask(newTask);
    setIsDrawerOpen(true);
  };

  const handleDuplicateTask = (task: TaskCard) => {
    const duplicated: TaskCard = {
      ...task,
      id: `task-${Date.now()}`,
      name: `${task.name} (コピー)`,
    };
    setTasks([...tasks, duplicated]);
    actions.addTaskCard(duplicated);
  };

  const handleToggleEnabled = (task: TaskCard) => {
    const updated = { ...task, enabled: !task.enabled };
    setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    actions.updateTaskCard(updated);
  };

  const handleSaveTask = () => {
    if (!editingTask) return;
    
    const exists = tasks.find((t) => t.id === editingTask.id);
    if (exists) {
      setTasks(tasks.map((t) => (t.id === editingTask.id ? editingTask : t)));
      actions.updateTaskCard(editingTask);
    } else {
      setTasks([...tasks, editingTask]);
      actions.addTaskCard(editingTask);
    }
    setIsDrawerOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    setTasks(tasks.filter((t) => t.id !== editingTask.id));
    actions.deleteTaskCard(editingTask.id);
    setIsDrawerOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="flex min-h-[600px] h-full">
      {/* Left: Category Tree */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">{t('taskStudio.categories')}</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors mb-1',
              selectedCategoryId === null
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <FolderOpen className="h-4 w-4" />
            {t('taskStudio.allTasks')}
          </button>
          {rootCategories.map((category) => (
            <CategoryTreeItem
              key={category.id}
              category={category}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              level={0}
            />
          ))}
        </div>
      </div>

      {/* Right: Task List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header & Filters */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('taskStudio.taskList')}</h2>
            <Button onClick={handleCreateTask}>
              <Plus className="h-4 w-4 mr-2" />
              {t('taskStudio.addTask')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('taskStudio.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as TaskRole | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('taskStudio.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={starFilter === 'all' ? 'all' : String(starFilter)} onValueChange={(v) => setStarFilter(v === 'all' ? 'all' : Number(v) as StarRequirement)}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={t('taskStudio.star')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={enabledFilter} onValueChange={(v) => setEnabledFilter(v as 'all' | 'enabled' | 'disabled')}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={t('taskStudio.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="enabled">{t('taskStudio.enabled')}</SelectItem>
                <SelectItem value="disabled">{t('taskStudio.disabled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm text-muted-foreground mb-3">
            {filteredTasks.length} {t('taskStudio.tasksCount')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTasks.map((task) => (
              <TaskCardItem
                key={task.id}
                task={task}
                category={getCategoryById(task.categoryId)}
                onEdit={handleEditTask}
                onDuplicate={handleDuplicateTask}
                onToggleEnabled={handleToggleEnabled}
              />
            ))}
          </div>
          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t('taskStudio.noTasks')}
            </div>
          )}
        </div>
      </div>

      {/* Edit Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingTask && tasks.find((t) => t.id === editingTask.id)
                ? t('taskStudio.editTask')
                : t('taskStudio.addTask')}
            </SheetTitle>
            <SheetDescription>
              {t('taskStudio.editDescription')}
            </SheetDescription>
          </SheetHeader>

          {editingTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('taskStudio.taskName')}</Label>
                <Input
                  value={editingTask.name}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('taskStudio.category')}</Label>
                <Select
                  value={editingTask.categoryId}
                  onValueChange={(v) => setEditingTask({ ...editingTask, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.parentId ? '  ' : ''}{cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('taskStudio.role')}</Label>
                  <Select
                    value={editingTask.role}
                    onValueChange={(v) => setEditingTask({ ...editingTask, role: v as TaskRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('taskStudio.starRequirement')}</Label>
                  <Select
                    value={String(editingTask.starRequirement)}
                    onValueChange={(v) => setEditingTask({ ...editingTask, starRequirement: Number(v) as StarRequirement })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('taskStudio.standardMinutes')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingTask.standardMinutes}
                    onChange={(e) => setEditingTask({ ...editingTask, standardMinutes: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('taskStudio.xpReward')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingTask.xpReward}
                    onChange={(e) => setEditingTask({ ...editingTask, xpReward: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('taskStudio.quantityMode')}</Label>
                <Select
                  value={editingTask.quantityMode}
                  onValueChange={(v) => setEditingTask({ ...editingTask, quantityMode: v as QuantityMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUANTITY_MODE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('taskStudio.baseQuantity')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingTask.baseQuantity}
                    onChange={(e) => setEditingTask({ ...editingTask, baseQuantity: Number(e.target.value) })}
                  />
                </div>

                {editingTask.quantityMode !== 'fixed' && (
                  <div className="space-y-2">
                    <Label>{t('taskStudio.coefficient')}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editingTask.coefficient}
                      onChange={(e) => setEditingTask({ ...editingTask, coefficient: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('taskStudio.qualityCheck')}</Label>
                <Select
                  value={editingTask.qualityCheck}
                  onValueChange={(v) => setEditingTask({ ...editingTask, qualityCheck: v as QualityCheck })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUALITY_CHECK_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('taskStudio.notes')}</Label>
                <Textarea
                  value={editingTask.notes || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                  placeholder={t('taskStudio.notesPlaceholder')}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <Label>{t('taskStudio.enabled')}</Label>
                <Checkbox
                  checked={editingTask.enabled}
                  onCheckedChange={(checked) => setEditingTask({ ...editingTask, enabled: !!checked })}
                />
              </div>
            </div>
          )}

          <SheetFooter className="flex gap-2 pt-4">
            {editingTask && tasks.find((t) => t.id === editingTask.id) && (
              <Button variant="destructive" onClick={handleDeleteTask} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveTask}>
              {t('common.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
