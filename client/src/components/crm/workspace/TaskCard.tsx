import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Edit, FileText, Zap } from 'lucide-react';

interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate: string;
  createdAt: string;
  isAiGenerated: boolean;
  culturalContext?: string;
}

interface TaskCardProps {
  task: WorkspaceTask;
  onEdit: (task: WorkspaceTask) => void;
  onReport: () => void;
}

export function TaskCard({ task, onEdit, onReport }: TaskCardProps) {
  const priorityColors = {
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  const statusColors = {
    PENDING: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'بالا';
      case 'MEDIUM': return 'متوسط';
      case 'LOW': return 'پایین';
      default: return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'در انتظار';
      case 'IN_PROGRESS': return 'در حال انجام';
      case 'COMPLETED': return 'تکمیل شده';
      case 'CANCELLED': return 'لغو شده';
      default: return status;
    }
  };

  return (
    <Card className="bg-black/40 border-gray-700 hover:bg-black/60 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <span>{task.title}</span>
            {task.isAiGenerated && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                <Zap className="w-3 h-3 ml-1" />
                AI
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={`text-xs ${priorityColors[task.priority]}`}>
              {getPriorityText(task.priority)}
            </Badge>
            <Badge className={`text-xs ${statusColors[task.status]}`}>
              {getStatusText(task.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm leading-relaxed">
          {task.description}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <User className="w-4 h-4" />
            <span>مسئول: {task.assignedTo}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>مهلت: {new Date(task.dueDate).toLocaleDateString('fa-IR')}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>ایجاد: {new Date(task.createdAt).toLocaleDateString('fa-IR')}</span>
          </div>
        </div>

        {task.culturalContext && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-300 text-xs">
              <strong>زمینه فرهنگی:</strong> {task.culturalContext}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onEdit(task)}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Edit className="w-4 h-4 ml-1" />
            ویرایش
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={onReport}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <FileText className="w-4 h-4 ml-1" />
            گزارش
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}