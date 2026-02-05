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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStore } from '@/state/store';
import { useI18n } from '@/i18n/I18nProvider';
import type { TaskCard, TaskCategory, TaskRole, StarRequirement } from '@/core/types';
import { Plus, Pencil, Trash2, Star, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const TASK_ROLES: { value: TaskRole; label: string }[] = [
  { value: 'kitchen', label: 'キッチン' },
  { value: 'floor', label: 'フロア' },
  { value: 'cashier', label: 'キャッシャー' },
  { value: 'prep', label: '仕込み' },
  { value: 'runner', label: 'ランナー' },
];

const STAR_LEVELS: { value: StarRequirement; label: string }[] = [
  { value: 1, label: '1 (新人可)' },
  { value: 2, label: '2 (中級)' },
  { value: 3, label: '3 (熟練)' },
];

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

  const handleSave = () => {
    const newTaskCard: TaskCard = {
      id: taskCard?.id ?? `task-${Date.now()}`,
      categoryId,
      name,
      role,
      starRequirement,
      standardMinutes,
      quantityMode: 'fixed',
      baseQuantity: 1,
      coefficient: 1,
      qualityCheck: 'none',
      xpReward,
      enabled,
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
                min={1}
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

export default function TaskCatalogPage() {
  const { t } = useI18n();
  const params = useParams();
  const storeId = params.storeId as string;
  const { state, actions } = useStore();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskCard | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const categories = state.taskCategories ?? [];
  const taskCards = state.taskCards ?? [];

  // Filter task cards
  const filteredTasks = useMemo(() => {
    return taskCards.filter((task) => {
      if (filterCategory !== 'all' && task.categoryId !== filterCategory) return false;
      if (filterRole !== 'all' && task.role !== filterRole) return false;
      return true;
    });
  }, [taskCards, filterCategory, filterRole]);

  // Get category name by id
  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name ?? categoryId;
  };

  // Get role label
  const getRoleLabel = (role: TaskRole) => {
    return TASK_ROLES.find((r) => r.value === role)?.label ?? role;
  };

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
    <div className="space-y-6">
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

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">{t('taskCatalog.category')}:</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">{t('taskCatalog.role')}:</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[150px]">
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
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredTasks.length} {t('taskCatalog.templates')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('taskCatalog.templates')}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('taskCatalog.noTemplates')}</p>
              <Button variant="link" onClick={handleNewTemplate}>
                {t('taskCatalog.createFirst')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('taskCatalog.name')}</TableHead>
                  <TableHead>{t('taskCatalog.category')}</TableHead>
                  <TableHead>{t('taskCatalog.role')}</TableHead>
                  <TableHead className="text-center">{t('taskCatalog.requiredStars')}</TableHead>
                  <TableHead className="text-center">{t('taskCatalog.expectedMinutes')}</TableHead>
                  <TableHead className="text-center">XP</TableHead>
                  <TableHead className="text-center">{t('taskCatalog.enabled')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id} className={cn(!task.enabled && 'opacity-50')}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(task.categoryId)}</Badge>
                    </TableCell>
                    <TableCell>{getRoleLabel(task.role)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-4 w-4',
                              i <= task.starRequirement
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {task.standardMinutes}{t('common.minutes')}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {task.xpReward}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => handleToggleEnabled(task)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTemplate(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <TaskCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        taskCard={editingTask}
        categories={categories}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
