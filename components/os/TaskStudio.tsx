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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Play,
  Users,
  CalendarDays,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { TaskCard, TaskCategory, TaskRole, StarRequirement, QuantityMode, QualityCheck, TimeBand, DecisionEvent, BoxTemplate, BoxRule } from '@/core/types';
import { Package } from 'lucide-react';

// No hardcoded data - all task/category/box data comes from store (loaded via mock.ts / seedDemoData)

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

// Map TaskRole to roleId in the system
const ROLE_TO_ROLE_ID: Record<TaskRole, string> = {
  kitchen: 'role-kitchen',
  floor: 'role-floor',
  cashier: 'role-floor', // cashier uses floor role
  prep: 'role-kitchen', // prep uses kitchen role
  runner: 'role-floor', // runner uses floor role
  unknown: 'role-floor',
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

const TIME_BAND_LABELS: Record<TimeBand, string> = {
  all: '終日',
  lunch: 'ランチ (11-14時)',
  idle: 'アイドル (14-17時)',
  dinner: 'ディナー (17-22時)',
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
      <div
        onClick={() => onSelect(category.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(category.id); }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer',
          selectedCategoryId === category.id
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-background/50 rounded cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setIsExpanded(!isExpanded); } }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        ) : (
          <span className="w-5" />
        )}
        <FolderOpen className="h-4 w-4 shrink-0" />
        <span className="truncate">{category.name}</span>
      </div>
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

// Generated Quest Preview Card
interface GeneratedQuestProps {
  quest: {
    taskCard: TaskCard;
    quantity: number;
    timeBand: TimeBand;
    deadline: string;
    assignedStaffName?: string;
  };
  category?: TaskCategory;
}

function GeneratedQuestCard({ quest, category }: GeneratedQuestProps) {
  return (
    <Card className="border-primary/30">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{quest.taskCard.name}</h4>
            {category && (
              <p className="text-xs text-muted-foreground truncate">{category.name}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge variant="outline" className={cn('text-xs', ROLE_COLORS[quest.taskCard.role])}>
                {ROLE_LABELS[quest.taskCard.role]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                数量: {quest.quantity}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-0.5" />
                {quest.deadline}
              </Badge>
            </div>
          </div>
          <div className="text-right text-xs">
            {quest.assignedStaffName ? (
              <div className="flex items-center gap-1 text-primary">
                <Users className="h-3 w-3" />
                {quest.assignedStaffName}
              </div>
            ) : (
              <div className="text-muted-foreground">未割当</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskStudio() {
  const { state, actions } = useStore();
  const { t } = useI18n();

  // Data comes exclusively from store - no hardcoded fallback
  const [categories, setCategories] = useState<TaskCategory[]>(
    state.taskCategories ?? []
  );
  
  const [tasks, setTasks] = useState<TaskCard[]>(
    state.taskCards ?? []
  );

  const [boxTemplates, setBoxTemplates] = useState<BoxTemplate[]>(
    state.boxTemplates ?? []
  );

  const hasData = categories.length > 0 && tasks.length > 0;

  // Active tab
  const [activeTab, setActiveTab] = useState<'tasks' | 'boxes' | 'simulation'>('tasks');

  // Box editing state
  const [editingBox, setEditingBox] = useState<BoxTemplate | null>(null);
  const [isBoxDrawerOpen, setIsBoxDrawerOpen] = useState(false);

  // Task List UI State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TaskRole | 'all'>('all');
  const [starFilter, setStarFilter] = useState<StarRequirement | 'all'>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editingTask, setEditingTask] = useState<TaskCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Simulation State
  const [forecastSales, setForecastSales] = useState<Record<TimeBand, number>>({
    all: 0,
    lunch: 150000,
    idle: 50000,
    dinner: 250000,
  });
  const [orderCount, setOrderCount] = useState<Record<TimeBand, number>>({
    all: 0,
    lunch: 80,
    idle: 30,
    dinner: 120,
  });
  const [generatedQuests, setGeneratedQuests] = useState<Array<{
    taskCard: TaskCard;
    quantity: number;
    timeBand: TimeBand;
    deadline: string;
    assignedStaffId?: string;
    assignedStaffName?: string;
  }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

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

  // Task Handlers
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

  // Box Handlers
  const handleEditBox = (box: BoxTemplate) => {
    setEditingBox({ ...box });
    setIsBoxDrawerOpen(true);
  };

  const handleCreateBox = () => {
    const newBox: BoxTemplate = {
      id: `box-${Date.now()}`,
      name: '新規ボックス',
      timeBand: 'lunch',
      taskCardIds: [],
      boxRule: { type: 'always' },
      enabled: true,
      description: '',
    };
    setEditingBox(newBox);
    setIsBoxDrawerOpen(true);
  };

  const handleSaveBox = () => {
    if (!editingBox) return;
    
    const exists = boxTemplates.find((b) => b.id === editingBox.id);
    if (exists) {
      setBoxTemplates(boxTemplates.map((b) => (b.id === editingBox.id ? editingBox : b)));
      actions.updateBoxTemplate(editingBox);
    } else {
      setBoxTemplates([...boxTemplates, editingBox]);
      actions.addBoxTemplate(editingBox);
    }
    setIsBoxDrawerOpen(false);
    setEditingBox(null);
  };

  const handleDeleteBox = () => {
    if (!editingBox) return;
    setBoxTemplates(boxTemplates.filter((b) => b.id !== editingBox.id));
    actions.deleteBoxTemplate(editingBox.id);
    setIsBoxDrawerOpen(false);
    setEditingBox(null);
  };

  const handleToggleTaskInBox = (taskId: string) => {
    if (!editingBox) return;
    const taskIds = editingBox.taskCardIds.includes(taskId)
      ? editingBox.taskCardIds.filter((id) => id !== taskId)
      : [...editingBox.taskCardIds, taskId];
    setEditingBox({ ...editingBox, taskCardIds: taskIds });
  };

  // Calculate quantity based on mode
  const calculateQuantity = (task: TaskCard, timeBand: TimeBand): number => {
    switch (task.quantityMode) {
      case 'fixed':
        return task.baseQuantity;
      case 'byForecast':
        return Math.ceil(task.baseQuantity + task.coefficient * forecastSales[timeBand]);
      case 'byOrders':
        return Math.ceil(task.baseQuantity + task.coefficient * orderCount[timeBand]);
      default:
        return task.baseQuantity;
    }
  };

  // Get deadline based on time band
  const getDeadline = (timeBand: TimeBand): string => {
    switch (timeBand) {
      case 'lunch': return '11:00';
      case 'idle': return '14:00';
      case 'dinner': return '17:00';
      default: return '10:00';
    }
  };

  // Get time band for a task based on its category
  const getTimeBandForTask = (task: TaskCard): TimeBand => {
    const category = getCategoryById(task.categoryId);
    const parentCategory = category?.parentId ? getCategoryById(category.parentId) : null;
    const categoryName = category?.name || '';
    const parentName = parentCategory?.name || '';
    
    if (categoryName.includes('ランチ') || parentName.includes('ランチ')) return 'lunch';
    if (categoryName.includes('ディナー') || parentName.includes('ディナー')) return 'dinner';
    if (categoryName.includes('開店') || categoryName.includes('仕込み') || parentName.includes('仕込み')) return 'lunch';
    return 'lunch'; // Default to lunch for prep tasks
  };

  // Auto-assign staff based on role
  const assignStaff = (taskRole: TaskRole): { staffId?: string; staffName?: string } => {
    const storeStaff = state.staff.filter((s) => s.storeId === state.selectedStoreId);
    const roleId = ROLE_TO_ROLE_ID[taskRole];
    
    // Find staff with matching role and sufficient star level
    const matchingStaff = storeStaff.filter((s) => s.roleId === roleId);
    
    if (matchingStaff.length > 0) {
      // Simple round-robin assignment - in real implementation, consider workload
      const staff = matchingStaff[Math.floor(Math.random() * matchingStaff.length)];
      return { staffId: staff.id, staffName: staff.name };
    }
    
    return {}; // Unassigned
  };

  // Generate quests from enabled tasks
  const handleGenerateQuests = () => {
    setIsGenerating(true);
    setGenerationComplete(false);

    const enabledTasks = tasks.filter((t) => t.enabled);
    const quests: typeof generatedQuests = [];

    for (const task of enabledTasks) {
      const timeBand = getTimeBandForTask(task);
      const quantity = calculateQuantity(task, timeBand);
      const deadline = getDeadline(timeBand);
      const assignment = assignStaff(task.role);

      quests.push({
        taskCard: task,
        quantity,
        timeBand,
        deadline,
        ...assignment,
      });
    }

    setGeneratedQuests(quests);
    setIsGenerating(false);
  };

  // Deploy quests to Today Quests
  const handleDeployQuests = () => {
    const today = new Date().toISOString().split('T')[0];
    const baseTime = new Date();
    baseTime.setHours(9, 0, 0, 0);

    for (const quest of generatedQuests) {
      const proposalId = `quest-${quest.taskCard.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate deadline as ISO string
      const [hours, minutes] = quest.deadline.split(':').map(Number);
      const deadlineDate = new Date();
      deadlineDate.setHours(hours, minutes, 0, 0);

      const decisionEvent: DecisionEvent = {
        id: `decision-${proposalId}`,
        type: 'decision',
        storeId: state.selectedStoreId || 'store-shibuya',
        timestamp: new Date().toISOString(),
        timeBand: quest.timeBand,
        proposalId,
        action: 'approved',
        title: quest.taskCard.name,
        description: `${quest.taskCard.name} - 数量: ${quest.quantity}`,
        distributedToRoles: [ROLE_TO_ROLE_ID[quest.taskCard.role]],
        quantity: quest.quantity,
        deadline: deadlineDate.toISOString(),
        priority: quest.taskCard.starRequirement === 3 ? 'high' : quest.taskCard.starRequirement === 2 ? 'medium' : 'low',
        estimatedMinutes: quest.taskCard.standardMinutes,
        assigneeId: quest.assignedStaffId,
        assigneeName: quest.assignedStaffName,
        source: 'system',
      };

      actions.addEvent(decisionEvent);
    }

    setGenerationComplete(true);
  };

  // Summary stats for generated quests
  const questStats = useMemo(() => {
    const byRole: Record<string, number> = {};
    const byTimeBand: Record<string, number> = {};
    let assigned = 0;
    let unassigned = 0;

    for (const quest of generatedQuests) {
      byRole[quest.taskCard.role] = (byRole[quest.taskCard.role] || 0) + 1;
      byTimeBand[quest.timeBand] = (byTimeBand[quest.timeBand] || 0) + 1;
      if (quest.assignedStaffId) {
        assigned++;
      } else {
        unassigned++;
      }
    }

    return { byRole, byTimeBand, assigned, unassigned, total: generatedQuests.length };
  }, [generatedQuests]);

  // Empty state when no data is loaded
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">タスクカタログにデータがありません</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Task Catalog でタスクを登録するか、Cockpit からデモデータを読み込んでください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[600px] h-full">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tasks' | 'boxes' | 'simulation')} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-12">
            <TabsTrigger value="tasks" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('taskStudio.taskList')}
            </TabsTrigger>
            <TabsTrigger value="boxes" className="gap-2">
              <Package className="h-4 w-4" />
              {t('taskStudio.boxes')}
            </TabsTrigger>
            <TabsTrigger value="simulation" className="gap-2">
              <Play className="h-4 w-4" />
              {t('taskStudio.simulation')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="flex-1 flex m-0 data-[state=inactive]:hidden">
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
        </TabsContent>

        {/* Boxes Tab */}
        <TabsContent value="boxes" className="flex-1 m-0 p-4 overflow-y-auto data-[state=inactive]:hidden">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t('taskStudio.boxes')}</h2>
                <p className="text-sm text-muted-foreground">{t('taskStudio.boxesDescription')}</p>
              </div>
              <Button onClick={handleCreateBox}>
                <Plus className="h-4 w-4 mr-2" />
                {t('taskStudio.addBox')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boxTemplates.map((box) => {
                const boxTasks = tasks.filter((t) => box.taskCardIds.includes(t.id));
                return (
                  <Card 
                    key={box.id} 
                    className={cn('cursor-pointer hover:shadow-md transition-shadow', !box.enabled && 'opacity-50')}
                    onClick={() => handleEditBox(box)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {box.name}
                        </CardTitle>
                        <Badge variant="outline">{TIME_BAND_LABELS[box.timeBand]}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {box.description && (
                        <p className="text-xs text-muted-foreground">{box.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {boxTasks.length} {t('taskStudio.tasksCount')}
                        </Badge>
                        {box.boxRule.type === 'salesRange' && box.boxRule.minSales && (
                          <Badge variant="outline" className="text-xs">
                            {(box.boxRule.minSales / 10000).toFixed(0)}万円+
                          </Badge>
                        )}
                        {box.boxRule.type === 'always' && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {t('taskStudio.alwaysActive')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-2">
                        {boxTasks.slice(0, 3).map((task) => (
                          <span key={task.id} className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-24">
                            {task.name}
                          </span>
                        ))}
                        {boxTasks.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{boxTasks.length - 3}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Simulation Tab */}
        <TabsContent value="simulation" className="flex-1 m-0 p-4 overflow-y-auto data-[state=inactive]:hidden">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Forecast Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {t('taskStudio.forecastInput')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('taskStudio.forecastDescription')}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['lunch', 'idle', 'dinner'] as TimeBand[]).map((band) => (
                    <div key={band} className="space-y-3 p-4 border rounded-lg">
                      <Label className="font-medium">{TIME_BAND_LABELS[band]}</Label>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('taskStudio.forecastSales')}</Label>
                          <Input
                            type="number"
                            value={forecastSales[band]}
                            onChange={(e) => setForecastSales({ ...forecastSales, [band]: Number(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('taskStudio.orderCount')}</Label>
                          <Input
                            type="number"
                            value={orderCount[band]}
                            onChange={(e) => setOrderCount({ ...orderCount, [band]: Number(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleGenerateQuests} disabled={isGenerating} size="lg">
                    <Play className="h-4 w-4 mr-2" />
                    {t('taskStudio.generateQuests')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generated Quests Preview */}
            {generatedQuests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      {t('taskStudio.generatedQuests')} ({questStats.total})
                    </div>
                    {!generationComplete && (
                      <Button onClick={handleDeployQuests}>
                        <Play className="h-4 w-4 mr-2" />
                        {t('taskStudio.deployQuests')}
                      </Button>
                    )}
                    {generationComplete && (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('taskStudio.deployed')}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{questStats.total}</div>
                      <div className="text-xs text-muted-foreground">{t('taskStudio.totalQuests')}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">{questStats.assigned}</div>
                      <div className="text-xs text-muted-foreground">{t('taskStudio.assigned')}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold text-amber-600">{questStats.unassigned}</div>
                      <div className="text-xs text-muted-foreground">{t('taskStudio.unassigned')}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">{Object.keys(questStats.byRole).length}</div>
                      <div className="text-xs text-muted-foreground">{t('taskStudio.roles')}</div>
                    </div>
                  </div>

                  {/* Quest List by Time Band */}
                  {(['lunch', 'idle', 'dinner'] as TimeBand[]).map((band) => {
                    const bandQuests = generatedQuests.filter((q) => q.timeBand === band);
                    if (bandQuests.length === 0) return null;
                    
                    return (
                      <div key={band} className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {TIME_BAND_LABELS[band]} ({bandQuests.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {bandQuests.map((quest, i) => (
                            <GeneratedQuestCard
                              key={`${quest.taskCard.id}-${i}`}
                              quest={quest}
                              category={getCategoryById(quest.taskCard.categoryId)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Unassigned Warning */}
                  {questStats.unassigned > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">{t('taskStudio.unassignedWarning')}</p>
                        <p className="text-amber-700">{t('taskStudio.unassignedDescription')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

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
                      step={0.01}
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

      {/* Box Edit Drawer */}
      <Sheet open={isBoxDrawerOpen} onOpenChange={setIsBoxDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingBox && boxTemplates.find((b) => b.id === editingBox.id)
                ? t('taskStudio.editBox')
                : t('taskStudio.addBox')}
            </SheetTitle>
            <SheetDescription>{t('taskStudio.boxEditDescription')}</SheetDescription>
          </SheetHeader>

          {editingBox && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('taskStudio.boxName')}</Label>
                <Input
                  value={editingBox.name}
                  onChange={(e) => setEditingBox({ ...editingBox, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('taskStudio.timeBand')}</Label>
                <Select
                  value={editingBox.timeBand}
                  onValueChange={(v) => setEditingBox({ ...editingBox, timeBand: v as TimeBand })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['lunch', 'idle', 'dinner'] as TimeBand[]).map((band) => (
                      <SelectItem key={band} value={band}>{TIME_BAND_LABELS[band]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('taskStudio.boxRule')}</Label>
                <Select
                  value={editingBox.boxRule.type}
                  onValueChange={(v) => setEditingBox({ 
                    ...editingBox, 
                    boxRule: v === 'always' ? { type: 'always' } : { type: 'salesRange', minSales: 100000 }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">{t('taskStudio.alwaysActive')}</SelectItem>
                    <SelectItem value="salesRange">{t('taskStudio.salesRange')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingBox.boxRule.type === 'salesRange' && (
                <div className="space-y-2">
                  <Label>{t('taskStudio.minSales')}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={10000}
                    value={editingBox.boxRule.minSales || 0}
                    onChange={(e) => setEditingBox({ 
                      ...editingBox, 
                      boxRule: { ...editingBox.boxRule, minSales: Number(e.target.value) }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">{t('taskStudio.minSalesDescription')}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('taskStudio.boxDescription')}</Label>
                <Textarea
                  value={editingBox.description || ''}
                  onChange={(e) => setEditingBox({ ...editingBox, description: e.target.value })}
                  placeholder={t('taskStudio.boxDescriptionPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('taskStudio.selectTasks')}</Label>
                <p className="text-xs text-muted-foreground">{t('taskStudio.selectTasksDescription')}</p>
                <div className="border rounded-lg max-h-64 overflow-y-auto p-2 space-y-1">
                  {tasks.filter(t => t.enabled).map((task) => {
                    const isSelected = editingBox.taskCardIds.includes(task.id);
                    const category = getCategoryById(task.categoryId);
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTaskInBox(task.id)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                        )}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{task.name}</span>
                          {category && (
                            <span className="text-xs text-muted-foreground">{category.name}</span>
                          )}
                        </div>
                        <Badge variant="outline" className={cn('text-xs shrink-0', ROLE_COLORS[task.role])}>
                          {ROLE_LABELS[task.role]}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {editingBox.taskCardIds.length} {t('taskStudio.tasksSelected')}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label>{t('taskStudio.enabled')}</Label>
                <Checkbox
                  checked={editingBox.enabled}
                  onCheckedChange={(checked) => setEditingBox({ ...editingBox, enabled: !!checked })}
                />
              </div>
            </div>
          )}

          <SheetFooter className="flex gap-2 pt-4">
            {editingBox && boxTemplates.find((b) => b.id === editingBox.id) && (
              <Button variant="destructive" onClick={handleDeleteBox} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsBoxDrawerOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveBox}>
              {t('common.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
