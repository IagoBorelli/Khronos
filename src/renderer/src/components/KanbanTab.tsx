// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, Trash2, Edit2, GripVertical, X, Save, 
  CheckSquare, Calendar, Tag as TagIcon, AlignLeft
} from 'lucide-react';

// --- ESTRUTURAS DE DADOS E CORES ---
const defaultData = {
  tasks: {},
  columns: {
    'backlog': { id: 'backlog', title: 'Backlog', taskIds: [] },
    'planned': { id: 'planned', title: 'Planned', taskIds: [] },
    'in-progress': { id: 'in-progress', title: 'In Progress', taskIds: [] },
    'developed': { id: 'developed', title: 'Developed', taskIds: [] },
    'tested': { id: 'tested', title: 'Tested', taskIds: [] },
    'completed': { id: 'completed', title: 'Completed', taskIds: [] },
  },
  columnOrder: ['backlog', 'planned', 'in-progress', 'developed', 'tested', 'completed'],
};

const priorityColors = {
  alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  media: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  baixa: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const availableTagColors = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#64748B', // Slate
];

// Molde padrão para uma nova tarefa
const getNewTaskTemplate = (id) => ({
  id,
  title: 'Nova Tarefa',
  description: '',
  priority: 'baixa',
  dueDate: '',
  tag: { name: '', color: availableTagColors[0] },
  subtasks: [] // { id: string, text: string, completed: boolean }
});

export default function KanbanTab() {
  const [data, setData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para a tarefa sendo editada e para nova sub-tarefa temporária
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // --- PERSISTÊNCIA DE DADOS ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedData = await window.api.getData('kanban-data');
        setData(storedData || defaultData);
      } catch (error) {
        setData(defaultData);
      }
    };
    loadData();
  }, []);

  const saveToDatabase = async (newData) => {
    setData(newData);
    try {
      await window.api.setData('kanban-data', newData);
    } catch (error) {}
  };

  // --- LÓGICA DE DRAG AND DROP ---
  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      const newColumn = { ...startColumn, taskIds: newTaskIds };
      saveToDatabase({ ...data, columns: { ...data.columns, [newColumn.id]: newColumn } });
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);

    saveToDatabase({
      ...data,
      columns: { 
        ...data.columns, 
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds }, 
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds } 
      },
    });
  };

  // --- AÇÕES GERAIS ---
  const addTask = (columnId) => {
    const newTaskId = `task-${Date.now()}`;
    const newTask = getNewTaskTemplate(newTaskId);
    const column = data.columns[columnId];
    
    const newData = {
      ...data,
      tasks: { ...data.tasks, [newTaskId]: newTask },
      columns: { ...data.columns, [columnId]: { ...column, taskIds: [...column.taskIds, newTaskId] } }
    };
    
    saveToDatabase(newData);
    openModal(newTask);
  };

  const deleteTask = (taskId, columnId) => {
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];
    const column = data.columns[columnId];
    saveToDatabase({
      ...data,
      tasks: newTasks,
      columns: { ...data.columns, [columnId]: { ...column, taskIds: column.taskIds.filter(id => id !== taskId) } }
    });
  };

  // --- CONTROLES DO MODAL E SUBTAREFAS ---
  const openModal = (task) => {
    // Garante que campos antigos do banco não quebrem a nova estrutura
    setEditingTask({
      ...getNewTaskTemplate(task.id),
      ...task
    });
    setNewSubtaskText('');
    setIsModalOpen(true);
  };

  const saveTaskDetails = () => {
    saveToDatabase({
      ...data,
      tasks: { ...data.tasks, [editingTask.id]: editingTask }
    });
    setIsModalOpen(false);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setEditingTask({
      ...editingTask,
      subtasks: [...editingTask.subtasks, { id: `sub-${Date.now()}`, text: newSubtaskText, completed: false }]
    });
    setNewSubtaskText('');
  };

  const toggleSubtask = (subId) => {
    setEditingTask({
      ...editingTask,
      subtasks: editingTask.subtasks.map(sub => 
        sub.id === subId ? { ...sub, completed: !sub.completed } : sub
      )
    });
  };

  const removeSubtask = (subId) => {
    setEditingTask({
      ...editingTask,
      subtasks: editingTask.subtasks.filter(sub => sub.id !== subId)
    });
  };

  if (!data) return <div className="p-8 text-textMuted">Carregando dados...</div>;

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="mb-6 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-textBase">Quadro de Tarefas</h1>
          <p className="text-textMuted mt-2">Suas tarefas agora suportam checklists, datas e tags.</p>
        </div>
      </div>

      {/* --- KANBAN BOARD --- */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full items-start">
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId];
              const tasks = column.taskIds.map(taskId => data.tasks[taskId]);

              return (
                <div key={column.id} className="bg-surface/50 border border-slate-700/50 rounded-2xl w-[340px] flex-shrink-0 flex flex-col max-h-full">
                  <div className="p-4 flex justify-between items-center border-b border-slate-700/50">
                    <h2 className="font-semibold text-textBase flex items-center gap-2">
                      {column.title}
                      <span className="bg-slate-700 text-textMuted text-xs py-0.5 px-2 rounded-full">{tasks.length}</span>
                    </h2>
                    <button onClick={() => addTask(column.id)} className="p-1 text-textMuted hover:text-primary hover:bg-primary/10 rounded-md transition-colors">
                      <Plus size={18} />
                    </button>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto p-4 custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-slate-800/50' : ''}`}>
                        {tasks.map((task, index) => {
                          // Tratamento de segurança para dados antigos
                          const safeTask = { ...getNewTaskTemplate(task.id), ...task };
                          const completedSubtasks = safeTask.subtasks.filter(s => s.completed).length;
                          
                          return (
                            <Draggable key={safeTask.id} draggableId={safeTask.id} index={index}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} className={`bg-surface border border-slate-600 rounded-xl p-4 mb-3 group shadow-sm transition-all ${snapshot.isDragging ? 'shadow-2xl shadow-black/80 border-primary rotate-2 scale-105 z-50' : 'hover:border-slate-400'}`}>
                                  
                                  {/* Topo do Card: Tag e Ações */}
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-2 items-center flex-1">
                                      <div {...provided.dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing">
                                        <GripVertical size={16} />
                                      </div>
                                      {safeTask.tag?.name && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white" style={{ backgroundColor: safeTask.tag.color }}>
                                          {safeTask.tag.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                      <button onClick={() => openModal(safeTask)} className="p-1 text-textMuted hover:text-primary hover:bg-primary/10 rounded-md">
                                        <Edit2 size={14} />
                                      </button>
                                      <button onClick={() => deleteTask(safeTask.id, column.id)} className="p-1 text-textMuted hover:text-red-400 hover:bg-red-400/10 rounded-md">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Título */}
                                  <h3 className="text-textBase font-semibold mb-2 leading-tight break-words">
                                    {safeTask.title || safeTask.content /* Fallback */}
                                  </h3>
                                  
                                  {/* Informações Extras (Data, Checklist) */}
                                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-textMuted font-medium">
                                    {safeTask.dueDate && (
                                      <div className={`flex items-center gap-1 ${new Date(safeTask.dueDate) < new Date() ? 'text-red-400' : ''}`}>
                                        <Calendar size={12} />
                                        <span>{new Date(safeTask.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                      </div>
                                    )}
                                    {safeTask.subtasks.length > 0 && (
                                      <div className={`flex items-center gap-1 ${completedSubtasks === safeTask.subtasks.length ? 'text-emerald-400' : ''}`}>
                                        <CheckSquare size={12} />
                                        <span>{completedSubtasks}/{safeTask.subtasks.length}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Rodapé: Prioridade */}
                                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${priorityColors[safeTask.priority]}`}>
                                      {safeTask.priority}
                                    </span>
                                  </div>

                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* --- MODAL DE EDIÇÃO AVANÇADO --- */}
      {isModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-slate-600 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/50 shrink-0">
              <h3 className="text-xl font-bold text-textBase">Detalhes da Tarefa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10">
                <X size={24} />
              </button>
            </div>

            {/* Body Modal (Com Scroll) */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Título</label>
                <input 
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase text-lg font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Nome da tarefa..."
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data de Entrega */}
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1 flex items-center gap-2"><Calendar size={14}/> Data de Entrega</label>
                  <input 
                    type="date"
                    value={editingTask.dueDate}
                    onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                    className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase focus:outline-none focus:border-primary transition-all [color-scheme:dark]"
                  />
                </div>

                {/* Prioridade */}
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-2">Prioridade</label>
                  <div className="flex gap-2">
                    {['baixa', 'media', 'alta'].map((prio) => (
                      <label key={prio} className={`flex-1 cursor-pointer border rounded-xl p-2.5 text-center transition-all ${
                        editingTask.priority === prio 
                          ? `border-${prio === 'alta' ? 'red' : prio === 'media' ? 'amber' : 'emerald'}-500 bg-${prio === 'alta' ? 'red' : prio === 'media' ? 'amber' : 'emerald'}-500/10 text-${prio === 'alta' ? 'red' : prio === 'media' ? 'amber' : 'emerald'}-400` 
                          : 'border-slate-700 bg-background text-textMuted hover:bg-slate-800'
                      }`}>
                        <input 
                          type="radio" name="priority" value={prio}
                          checked={editingTask.priority === prio}
                          onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                          className="hidden"
                        />
                        <span className="capitalize font-semibold text-sm">{prio}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-background/50 p-4 rounded-xl border border-slate-700/50">
                <label className="block text-sm font-medium text-textMuted mb-3 flex items-center gap-2"><TagIcon size={14}/> Classificação (Tag)</label>
                <div className="flex gap-4 items-center">
                  <input 
                    type="text"
                    value={editingTask.tag.name}
                    onChange={(e) => setEditingTask({...editingTask, tag: { ...editingTask.tag, name: e.target.value }})}
                    placeholder="Nome da tag (Ex: Frontend)"
                    className="flex-1 bg-surface border border-slate-700 rounded-lg p-2.5 text-sm text-textBase focus:border-primary outline-none"
                  />
                  <div className="flex gap-2">
                    {availableTagColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditingTask({...editingTask, tag: { ...editingTask.tag, color }})}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${editingTask.tag.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                        title="Escolher cor"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1 flex items-center gap-2"><AlignLeft size={14}/> Descrição Detalhada</label>
                <textarea 
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase focus:outline-none focus:border-primary transition-all resize-none custom-scrollbar"
                  rows={3}
                  placeholder="Descreva os requisitos ou anotações desta tarefa..."
                />
              </div>

              {/* Sub-tarefas (Checklist) */}
              <div>
                <label className="block text-sm font-medium text-textMuted mb-2 flex items-center gap-2"><CheckSquare size={14}/> Lista de Tarefas (Checklist)</label>
                
                {/* Input de nova sub-tarefa */}
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Adicionar um item..."
                    className="flex-1 bg-background border border-slate-700 rounded-lg p-2.5 text-sm text-textBase focus:border-primary outline-none"
                  />
                  <button onClick={handleAddSubtask} className="bg-surface border border-slate-700 hover:bg-slate-700 text-textBase px-4 rounded-lg transition-colors font-medium">
                    Adicionar
                  </button>
                </div>

                {/* Lista */}
                <div className="space-y-2">
                  {editingTask.subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between bg-surface border border-slate-700/50 p-2.5 rounded-lg group">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input 
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => toggleSubtask(sub.id)}
                          className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary focus:ring-offset-background bg-background"
                        />
                        <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-textMuted' : 'text-textBase'}`}>
                          {sub.text}
                        </span>
                      </label>
                      <button onClick={() => removeSubtask(sub.id)} className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {editingTask.subtasks.length === 0 && (
                    <p className="text-xs text-textMuted italic text-center py-2">Nenhum item adicionado no checklist.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-textBase hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={saveTaskDetails} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40">
                <Save size={18} /> Salvar Alterações
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}