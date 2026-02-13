'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import type { TaskCard, TaskCategory, TaskRole, StarRequirement, QuantityMode } from '@/core/types';
import { Plus, Pencil, Trash2, Star, Clock, Zap, FileWarning, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const TASK_ROLES: { value: TaskRole; label: string }[] = [
  { value: 'kitchen', label: 'キッチン' },
  { value: 'floor', label: 'フロア' },
  { value: 'cashier', label: 'キャッシャー' },
  { value: 'prep', label: '仕込み' },
  { value: 'runner', label: 'ランナー' },
  { value: 'unknown', label: 'その他' },
];

const STAR_LEVELS: { value: StarRequirement; label: string }[] = [
  { value: 1, label: '1 (新人可)' },
  { value: 2, label: '2 (中級)' },
  { value: 3, label: '3 (熟練)' },
];

const QUANTITY_MODES: { value: QuantityMode; label: string }[] = [
  { value: 'fixed', label: '固定' },
  { value: 'byForecast', label: '予測連動' },
  { value: 'byOrders', label: '出数連動' },
];

// --- Fill Rate Progress Bar ---

function FillRateBar({ taskCards }: { taskCards: TaskCard[] }) {
  const total = taskCards.length;
  const filled = taskCards.filter((t) => t.enabled).length;
  const rate = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                充填率
              </span>
              <span className="text-sm text-muted-foreground">
                {filled} / {total} 件 ({rate}%)
              </span>
            </div>
            <Progress value={rate} className="h-3" />
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
              充填済み {filled}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              未充填 {total - filled}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Task Card Row ---

function TaskCardRow({
  task,
  categoryName,
  roleLabel,
  onEdit,
  onDelete,
  onToggle,
}: {
  task: TaskCard;
  categoryName: string;
  roleLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const isDisabled = !task.enabled;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4 transition-colors',
        isDisabled
          ? 'border-dashed border-muted-foreground/20 bg-muted/40'
          : 'border-border bg-card',
      )}
    >
      {/* Top row: name + badges + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'font-medium',
              isDisabled && 'text-muted-foreground',
            )}
          >
            {task.name}
          </span>
          {isDisabled && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-xs">
              <FileWarning className="mr-1 h-3 w-3" />
              要入力
            </Badge>
          )}
          {task.isPeak && (
            <Badge variant="destructive" className="text-xs">
              Peak
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={task.enabled}
            onCheckedChange={onToggle}
            aria-label={`Toggle ${task.name}`}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit {task.name}</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
            <span className="sr-only">Delete {task.name}</span>
          </Button>
        </div>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="font-normal text-xs">
          {categoryName}
        </Badge>
        <Badge variant="outline" className="font-normal text-xs">
          {roleLabel}
        </Badge>
        <span className="flex items-center gap-0.5">
          {[1, 2, 3].map((i) => (
            <Star
              key={i}
              className={cn(
                'h-3 w-3',
                i <= task.starRequirement
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/20',
              )}
            />
          ))}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {task.standardMinutes}分
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-amber-500" />
          {task.xpReward}XP
        </span>
        <span>
          {QUANTITY_MODES.find((q) => q.value === task.quantityMode)?.label ?? task.quantityMode}
        </span>
      </div>

      {/* Notes */}
      {task.notes && (
        <p className={cn('text-xs leading-relaxed', isDisabled ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
          {task.notes}
        </p>
      )}
    </div>
  );
}

// --- Edit Dialog ---

function TaskCardDialog({
  open,
  onOpenChange,
  taskCard,
  categories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskCard: TaskCard | null;
  categories: TaskCategory[];
  onSave: (taskCard: TaskCard) => void;
}) {
  const { t } = useI18n();
  const isEdit = !!taskCard;

  const [name, setName] = useState(taskCard?.name ?? '');
  const [categoryId, setCategoryId] = useState(taskCard?.categoryId ?? categories[0]?.id ?? '');
  const [role, setRole] = useState<TaskRole>(taskCard?.role ?? 'kitchen');
  const [starRequirement, setStarRequirement] = useState<StarRequirement>(taskCard?.starRequirement ?? 1);
  const [standardMinutes, setStandardMinutes] = useState(taskCard?.standardMinutes ?? 15);
  const [xpReward, setXpReward] = useState(taskCard?.xpReward ?? 20);
  const [enabled, setEnabled] = useState(taskCard?.enabled ?? true);
  const [notes, setNotes] = useState(taskCard?.notes ?? '');

  const handleSave = () => {
    const newTaskCard: TaskCard = {
      id: taskCard?.id ?? `task-${Date.now()}`,
      categoryId,
      name,
      role,
      starRequirement,
      standardMinutes,
      quantityMode: taskCard?.quantityMode ?? 'fixed',
      baseQuantity: taskCard?.baseQuantity ?? 1,
      coefficient: taskCard?.coefficient ?? 1,
      qualityCheck: taskCard?.qualityCheck ?? 'none',
      xpReward,
      enabled,
      notes: notes || undefined,
    };
    onSave(newTaskCard);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('taskCatalog.editTemplate') : t('taskCatalog.newTemplate')}
          </DialogTitle>
          <DialogDescription>
            {t('taskCatalog.templateDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('taskCatalog.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('taskCatalog.namePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t('taskCatalog.category')}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('taskCatalog.role')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TaskRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t('taskCatalog.requiredStars')}</Label>
              <Select
                value={String(starRequirement)}
                onValueChange={(v) => setStarRequirement(Number(v) as StarRequirement)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAR_LEVELS.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('taskCatalog.expectedMinutes')}</Label>
              <Input
                type="number"
                value={standardMinutes}
                onChange={(e) => setStandardMinutes(Number(e.target.value))}
                min={0}
                step={0.5}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t('taskCatalog.reward')} (XP)</Label>
              <Input
                type="number"
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <Label>{t('taskCatalog.enabled')}</Label>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>工程メモ</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="工程手順のメモ..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? t('common.save') : t('common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---

export default function TaskCatalogPage() {
  const { t } = useI18n();
  const params = useParams();
  const storeId = params.storeId as string;
  const { state, actions } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskCard | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const categories: TaskCategory[] = state.taskCategories ?? [];
  const taskCards: TaskCard[] = state.taskCards ?? [];

  // Get category name by id
  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? categoryId;

  // Get role label
  const getRoleLabel = (role: TaskRole) =>
    TASK_ROLES.find((r) => r.value === role)?.label ?? role;

  // Category-level task counts for tab labels
  const categoryTaskCounts = useMemo(() => {
    const counts: Record<string, { total: number; filled: number }> = {};
    for (const cat of categories) {
      const catTasks = taskCards.filter((tc) => tc.categoryId === cat.id);
      counts[cat.id] = {
        total: catTasks.length,
        filled: catTasks.filter((tc) => tc.enabled).length,
      };
    }
    return counts;
  }, [categories, taskCards]);

  // Filter task cards by active tab (category), role, and search
  const filteredTasks = useMemo(() => {
    return taskCards.filter((task) => {
      if (activeTab !== 'all' && task.categoryId !== activeTab) return false;
      if (filterRole !== 'all' && task.role !== filterRole) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = task.name.toLowerCase().includes(q);
        const matchesNotes = (task.notes ?? '').toLowerCase().includes(q);
        if (!matchesName && !matchesNotes) return false;
      }
      return true;
    });
  }, [taskCards, activeTab, filterRole, searchQuery]);

  const handleNewTemplate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEditTemplate = (task: TaskCard) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleSaveTemplate = (task: TaskCard) => {
    if (editingTask) {
      actions.updateTaskCard(task);
    } else {
      actions.addTaskCard(task);
    }
  };

  const handleDeleteTemplate = (taskId: string) => {
    if (confirm(t('taskCatalog.confirmDelete'))) {
      actions.deleteTaskCard(taskId);
    }
  };

  const handleToggleEnabled = (task: TaskCard) => {
    actions.updateTaskCard({ ...task, enabled: !task.enabled });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title={t('taskCatalog.title')}
          subtitle={t('taskCatalog.description')}
        />
        <Button onClick={handleNewTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('taskCatalog.newTemplate')}
        </Button>
      </div>

      {/* Fill Rate Progress */}
      <FillRateBar taskCards={taskCards} />

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="タスク名・メモで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                {t('taskCatalog.role')}:
              </Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {TASK_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredTasks.length} 件表示
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs + Card List */}
      {taskCards.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground space-y-4">
              <p className="text-lg">{t('taskCatalog.noTemplates')}</p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    actions.seedDemoData();
                  }}
                >
                  {t('taskCatalog.loadDemo')}
                </Button>
                <span className="text-sm">{t('common.or')}</span>
                <Button onClick={handleNewTemplate}>
                  {t('taskCatalog.createFirst')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="all" className="text-xs">
                全カテゴリ ({taskCards.length})
              </TabsTrigger>
              {categories.map((cat) => {
                const counts = categoryTaskCounts[cat.id];
                if (!counts || counts.total === 0) return null;
                return (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs whitespace-nowrap">
                    {cat.name} ({counts.filled}/{counts.total})
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Shared content area for all tabs */}
          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {activeTab === 'all'
                    ? `全カテゴリ - ${filteredTasks.length} 件`
                    : `${getCategoryName(activeTab)} - ${filteredTasks.length} 件`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTasks.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">
                    該当するタスクカードがありません
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {filteredTasks.map((task) => (
                      <TaskCardRow
                        key={task.id}
                        task={task}
                        categoryName={getCategoryName(task.categoryId)}
                        roleLabel={getRoleLabel(task.role)}
                        onEdit={() => handleEditTemplate(task)}
                        onDelete={() => handleDeleteTemplate(task.id)}
                        onToggle={() => handleToggleEnabled(task)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog */}
      <TaskCardDialog
        key={editingTask?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        taskCard={editingTask}
        categories={categories}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
