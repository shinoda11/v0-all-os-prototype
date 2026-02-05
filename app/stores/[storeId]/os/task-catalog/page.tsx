'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import type { TaskCard, TaskCategory, TaskRole, StarRequirement } from '@/core/types';
import { Plus, Pencil, Trash2, Star, Clock, Users, Package } from 'lucide-react';

// Default empty task card
const createEmptyTaskCard = (categoryId: string): Omit<TaskCard, 'id'> => ({
  categoryId,
  name: '',
  role: 'kitchen',
  starRequirement: 1,
  standardMinutes: 15,
  quantityMode: 'fixed',
  baseQuantity: 1,
  coefficient: 1,
  qualityCheck: 'none',
  xpReward: 20,
  enabled: true,
});

// Role display names
const ROLE_NAMES: Record<TaskRole, string> = {
  kitchen: 'キッチン',
  floor: 'フロア',
  cashier: 'レジ',
  prep: '仕込み',
  runner: 'デリバリー',
  unknown: 'その他',
};

// Star rating component
function StarRating({ level, onChange }: { level: StarRequirement; onChange?: (level: StarRequirement) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i as StarRequirement)}
          disabled={!onChange}
          className={cn(
            'transition-colors',
            onChange && 'hover:text-amber-500 cursor-pointer'
          )}
        >
          <Star
            className={cn(
              'h-4 w-4',
              i <= level ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function TaskCatalogPage() {
  const { t } = useI18n();
  const { state, actions } = useStore();
  
  const taskCards = state.taskCards ?? [];
  const taskCategories = state.taskCategories ?? [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskCard | null>(null);
  const [formData, setFormData] = useState<Omit<TaskCard, 'id'>>(createEmptyTaskCard(taskCategories[0]?.id ?? ''));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  
  // Filter tasks
  const filteredTasks = taskCards.filter(task => {
    if (filterCategory !== 'all' && task.categoryId !== filterCategory) return false;
    if (filterRole !== 'all' && task.role !== filterRole) return false;
    return true;
  });

  // Group tasks by category
  const tasksByCategory = filteredTasks.reduce((acc, task) => {
    const catId = task.categoryId;
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(task);
    return acc;
  }, {} as Record<string, TaskCard[]>);

  const getCategoryName = (categoryId: string) => {
    return taskCategories.find(c => c.id === categoryId)?.name ?? categoryId;
  };

  const handleOpenNew = () => {
    setEditingTask(null);
    setFormData(createEmptyTaskCard(taskCategories[0]?.id ?? 'cat-prep'));
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (task: TaskCard) => {
    setEditingTask(task);
    setFormData({ ...task });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    
    if (editingTask) {
      actions.updateTaskCard({ ...formData, id: editingTask.id });
    } else {
      const newTask: TaskCard = {
        ...formData,
        id: `task-${Date.now()}`,
      };
      actions.addTaskCard(newTask);
    }
    
    setIsDialogOpen(false);
    setEditingTask(null);
  };

  const handleDelete = (taskId: string) => {
    if (confirm(t('taskCatalog.confirmDelete'))) {
      actions.deleteTaskCard(taskId);
    }
  };

  const handleToggleEnabled = (task: TaskCard) => {
    actions.updateTaskCard({ ...task, enabled: !task.enabled });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('taskCatalog.title')}</h1>
          <p className="text-muted-foreground">{t('taskCatalog.description')}</p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('taskCatalog.newTemplate')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">{t('taskCatalog.category')}:</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {taskCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">{t('taskCatalog.role')}:</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {Object.entries(ROLE_NAMES).map(([role, name]) => (
                    <SelectItem key={role} value={role}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredTasks.length} / {taskCards.length} {t('taskCatalog.templates')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('taskCatalog.templates')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('taskCatalog.noTemplates')}
              <div className="mt-2">
                <Button variant="outline" onClick={handleOpenNew} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('taskCatalog.createFirst')}
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">{t('taskCatalog.enabled')}</TableHead>
                  <TableHead>{t('taskCatalog.name')}</TableHead>
                  <TableHead>{t('taskCatalog.category')}</TableHead>
                  <TableHead>{t('taskCatalog.role')}</TableHead>
                  <TableHead className="text-center">{t('taskCatalog.requiredStars')}</TableHead>
                  <TableHead className="text-right">{t('taskCatalog.expectedMinutes')}</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map(task => (
                  <TableRow key={task.id} className={cn(!task.enabled && 'opacity-50')}>
                    <TableCell>
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => handleToggleEnabled(task)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(task.categoryId)}</Badge>
                    </TableCell>
                    <TableCell>{ROLE_NAMES[task.role]}</TableCell>
                    <TableCell className="text-center">
                      <StarRating level={task.starRequirement} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{task.standardMinutes}m</TableCell>
                    <TableCell className="text-right tabular-nums">{task.xpReward}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="h-4 w-4" />
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

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? t('taskCatalog.editTemplate') : t('taskCatalog.newTemplate')}
            </DialogTitle>
            <DialogDescription>
              {t('taskCatalog.templateDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('taskCatalog.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('taskCatalog.namePlaceholder')}
              />
            </div>
            
            {/* Category */}
            <div className="space-y-2">
              <Label>{t('taskCatalog.category')}</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Role */}
            <div className="space-y-2">
              <Label>{t('taskCatalog.role')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as TaskRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_NAMES).map(([role, name]) => (
                    <SelectItem key={role} value={role}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Required Stars */}
            <div className="space-y-2">
              <Label>{t('taskCatalog.requiredStars')}</Label>
              <div className="flex items-center gap-2">
                <StarRating
                  level={formData.starRequirement}
                  onChange={(level) => setFormData({ ...formData, starRequirement: level })}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.starRequirement === 1 && t('taskCatalog.starLevel1')}
                  {formData.starRequirement === 2 && t('taskCatalog.starLevel2')}
                  {formData.starRequirement === 3 && t('taskCatalog.starLevel3')}
                </span>
              </div>
            </div>
            
            {/* Expected Minutes */}
            <div className="space-y-2">
              <Label htmlFor="minutes">{t('taskCatalog.expectedMinutes')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="minutes"
                  type="number"
                  min={1}
                  max={480}
                  value={formData.standardMinutes}
                  onChange={(e) => setFormData({ ...formData, standardMinutes: parseInt(e.target.value) || 15 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{t('common.minutes')}</span>
              </div>
            </div>
            
            {/* XP Reward */}
            <div className="space-y-2">
              <Label htmlFor="xp">XP {t('taskCatalog.reward')}</Label>
              <Input
                id="xp"
                type="number"
                min={0}
                max={1000}
                value={formData.xpReward}
                onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
            
            {/* Enabled */}
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">{t('taskCatalog.enabled')}</Label>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingTask ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
