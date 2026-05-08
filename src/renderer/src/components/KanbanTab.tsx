// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, Edit2, GripVertical, X, Save, CheckSquare, Calendar, Tag as TagIcon, AlignLeft } from 'lucide-react';

const defaultData = {
  tasks: {},
  columns: {
    'col-1': { id: 'col-1', title: 'A Fazer', taskIds: [] },
    'col-2': { id: 'col-2', title: 'Em Andamento', taskIds: [] },
    'col-3': { id: 'col-3', title: 'Concluído', taskIds: [] },
  },
  columnOrder: ['col-1', 'col-2', 'col-3'],
};

const priorityColors = {
  alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  media: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  baixa: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const availableTagColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#64748B'];

const getNewTaskTemplate = (id) => ({
  id, title: '', description: '', priority: 'baixa', dueDate: '',
  tag: { name: '', color: availableTagColors[0] }, subtasks: []
});

export default function KanbanTab() {
  const [data, setData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Estado para nova coluna
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedData = await window.api.getData('kanban-data');
        setData(storedData || defaultData);
      } catch (error) { setData(defaultData); }
    };
    loadData();
  }, []);

  const saveToDatabase = async (newData) => {
    setData(newData);
    try { await window.api.setData('kanban-data', newData); } catch (error) { }
  };

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (type === 'column') {
      const newColumnOrder = Array.from(data.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);
      saveToDatabase({ ...data, columnOrder: newColumnOrder });
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      saveToDatabase({ ...data, columns: { ...data.columns, [startColumn.id]: { ...startColumn, taskIds: newTaskIds } } });
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);

    saveToDatabase({
      ...data,
      columns: { ...data.columns, [startColumn.id]: { ...startColumn, taskIds: startTaskIds }, [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds } },
    });
  };

  // --- GERENCIAMENTO DE COLUNAS ---
  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;
    const newColId = `col-${Date.now()}`;
    const newColumn = { id: newColId, title: newColumnTitle, taskIds: [] };
    saveToDatabase({
      ...data,
      columns: { ...data.columns, [newColId]: newColumn },
      columnOrder: [...data.columnOrder, newColId]
    });
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const deleteColumn = (colId) => {
    if (data.columns[colId].taskIds.length > 0) {
      alert("Você só pode excluir colunas vazias. Mova ou exclua as tarefas primeiro.");
      return;
    }
    const newColumns = { ...data.columns };
    delete newColumns[colId];
    saveToDatabase({
      ...data,
      columns: newColumns,
      columnOrder: data.columnOrder.filter(id => id !== colId)
    });
  };

  // --- GERENCIAMENTO DE TAREFAS ---
  const addTask = (columnId) => {
    const newTaskId = `task-${Date.now()}`;
    const newTask = getNewTaskTemplate(newTaskId);
    saveToDatabase({
      ...data,
      tasks: { ...data.tasks, [newTaskId]: newTask },
      columns: { ...data.columns, [columnId]: { ...data.columns[columnId], taskIds: [...data.columns[columnId].taskIds, newTaskId] } }
    });
    openModal(newTask);
  };

  const deleteTask = (taskId, columnId) => {
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];
    saveToDatabase({
      ...data,
      tasks: newTasks,
      columns: { ...data.columns, [columnId]: { ...data.columns[columnId], taskIds: data.columns[columnId].taskIds.filter(id => id !== taskId) } }
    });
  };

  const openModal = (task) => { setEditingTask({ ...getNewTaskTemplate(task.id), ...task }); setNewSubtaskText(''); setIsModalOpen(true); };
  const saveTaskDetails = () => { saveToDatabase({ ...data, tasks: { ...data.tasks, [editingTask.id]: editingTask } }); setIsModalOpen(false); };
  const handleAddSubtask = () => { if (newSubtaskText.trim()) { setEditingTask({ ...editingTask, subtasks: [...editingTask.subtasks, { id: `sub-${Date.now()}`, text: newSubtaskText, completed: false }] }); setNewSubtaskText(''); } };
  const toggleSubtask = (subId) => { setEditingTask({ ...editingTask, subtasks: editingTask.subtasks.map(sub => sub.id === subId ? { ...sub, completed: !sub.completed } : sub) }); };
  const removeSubtask = (subId) => { setEditingTask({ ...editingTask, subtasks: editingTask.subtasks.filter(sub => sub.id !== subId) }); };

  if (!data) return <div className="p-8 text-textMuted">Carregando dados...</div>;

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="mb-6 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-textBase">Quadro de Tarefas</h1>
          <p className="text-textMuted mt-2">Organize suas atividades em um fluxo totalmente personalizável.</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="all-columns" direction="horizontal" type="column">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-6 h-full items-start">
                {data.columnOrder.map((columnId, index) => {
                  const column = data.columns[columnId];
                  const tasks = column.taskIds.map(taskId => data.tasks[taskId]);

                  return (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="bg-surface/50 border border-slate-700/50 rounded-2xl w-[340px] flex-shrink-0 flex flex-col max-h-full">

                          <div className="p-4 flex justify-between items-center border-b border-slate-700/50 group">
                            <h2 {...provided.dragHandleProps} className="font-semibold text-textBase flex items-center gap-2 cursor-grab">
                              {column.title}
                              <span className="bg-slate-700 text-textMuted text-xs py-0.5 px-2 rounded-full">{tasks.length}</span>
                            </h2>
                            <div className="flex items-center gap-1">
                              <button onClick={() => deleteColumn(column.id)} className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={16} />
                              </button>
                              <button onClick={() => addTask(column.id)} className="p-1 text-textMuted hover:text-primary hover:bg-primary/10 rounded-md transition-colors">
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>

                          <Droppable droppableId={column.id} type="task">
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto p-4 custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-slate-800/50' : ''}`}>
                                {tasks.map((task, index) => {
                                  const safeTask = { ...getNewTaskTemplate(task.id), ...task };
                                  const completedSubtasks = safeTask.subtasks.filter(s => s.completed).length;
                                  return (
                                    <Draggable key={safeTask.id} draggableId={safeTask.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} className={`bg-surface border border-slate-600 rounded-xl p-4 mb-3 group shadow-sm transition-all ${snapshot.isDragging ? 'shadow-2xl shadow-black/80 border-primary rotate-2 scale-105 z-50' : 'hover:border-slate-400'}`}>
                                          <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-2 items-center flex-1">
                                              <div {...provided.dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab"><GripVertical size={16} /></div>
                                              {safeTask.tag?.name && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase text-white" style={{ backgroundColor: safeTask.tag.color }}>{safeTask.tag.name}</span>}
                                            </div>
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                              <button onClick={() => openModal(safeTask)} className="p-1 text-textMuted hover:text-primary"><Edit2 size={14} /></button>
                                              <button onClick={() => deleteTask(safeTask.id, column.id)} className="p-1 text-textMuted hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                          </div>
                                          <h3 className="text-textBase font-semibold mb-2 leading-tight break-words">{safeTask.title || 'Sem título'}</h3>
                                          <div className="flex flex-wrap gap-3 mt-3 text-xs text-textMuted font-medium">
                                            {safeTask.dueDate && <div className="flex items-center gap-1"><Calendar size={12} /><span>{new Date(safeTask.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></div>}
                                            {safeTask.subtasks.length > 0 && <div className="flex items-center gap-1"><CheckSquare size={12} /><span>{completedSubtasks}/{safeTask.subtasks.length}</span></div>}
                                          </div>
                                          <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase border ${priorityColors[safeTask.priority]}`}>{safeTask.priority}</span>
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
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}

                {/* BOTÃO NOVA COLUNA */}
                <div className="w-[340px] flex-shrink-0">
                  {isAddingColumn ? (
                    <div className="bg-surface/50 border border-slate-700/50 rounded-2xl p-4">
                      <input
                        type="text" autoFocus value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)}
                        placeholder="Nome do Painel" className="w-full bg-background border border-slate-700 rounded-lg p-2 text-sm text-textBase mb-3 outline-none focus:border-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddColumn} className="flex-1 bg-primary text-white text-sm font-bold py-2 rounded-lg">Criar</button>
                        <button onClick={() => setIsAddingColumn(false)} className="px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"><X size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setIsAddingColumn(true)} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-700/50 text-slate-500 hover:text-textBase hover:border-slate-500 hover:bg-surface/30 transition-all font-semibold">
                      <Plus size={20} /> Novo Painel
                    </button>
                  )}
                </div>

              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* --- MODAL DA TAREFA AQUI (Permanece igual ao anterior) --- */}
      {isModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-slate-600 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/50 shrink-0">
              <h3 className="text-xl font-bold text-textBase">Detalhes da Tarefa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div><label className="block text-sm font-medium text-textMuted mb-1">Título</label><input type="text" value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase text-lg font-semibold focus:border-primary transition-all outline-none" placeholder="Nome da tarefa..." /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-textMuted mb-1 flex items-center gap-2"><Calendar size={14} /> Data de Entrega</label><input type="date" value={editingTask.dueDate} onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase focus:border-primary transition-all [color-scheme:dark] outline-none" /></div>
                <div><label className="block text-sm font-medium text-textMuted mb-2">Prioridade</label><div className="flex gap-2">{['baixa', 'media', 'alta'].map((prio) => (<label key={prio} className={`flex-1 cursor-pointer border rounded-xl p-2.5 text-center transition-all ${editingTask.priority === prio ? `border-${prio === 'alta' ? 'red' : prio === 'media' ? 'amber' : 'emerald'}-500 bg-${prio === 'alta' ? 'red' : prio === 'media' ? 'amber' : 'emerald'}-500/10 text-${prio === 'alta' ? 'red' : prio === 'media' ? 'amber' : 'emerald'}-400` : 'border-slate-700 bg-background text-textMuted hover:bg-slate-800'}`}><input type="radio" name="priority" value={prio} checked={editingTask.priority === prio} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })} className="hidden" /><span className="capitalize font-semibold text-sm">{prio}</span></label>))}</div></div>
              </div>
              <div className="bg-background/50 p-4 rounded-xl border border-slate-700/50"><label className="block text-sm font-medium text-textMuted mb-3 flex items-center gap-2"><TagIcon size={14} /> Classificação (Tag)</label><div className="flex gap-4 items-center"><input type="text" value={editingTask.tag.name} onChange={(e) => setEditingTask({ ...editingTask, tag: { ...editingTask.tag, name: e.target.value } })} placeholder="Nome da tag (Ex: Frontend)" className="flex-1 bg-surface border border-slate-700 rounded-lg p-2.5 text-sm text-textBase focus:border-primary outline-none" /><div className="flex gap-2">{availableTagColors.map(color => (<button key={color} onClick={() => setEditingTask({ ...editingTask, tag: { ...editingTask.tag, color } })} className={`w-8 h-8 rounded-full border-2 transition-transform ${editingTask.tag.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: color }} />))}</div></div></div>
              <div><label className="block text-sm font-medium text-textMuted mb-1 flex items-center gap-2"><AlignLeft size={14} /> Descrição Detalhada</label><textarea value={editingTask.description} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase focus:border-primary transition-all resize-none custom-scrollbar outline-none" rows={3} placeholder="Descreva os requisitos ou anotações desta tarefa..." /></div>
              <div><label className="block text-sm font-medium text-textMuted mb-2 flex items-center gap-2"><CheckSquare size={14} /> Lista de Tarefas (Checklist)</label><div className="flex gap-2 mb-3"><input type="text" value={newSubtaskText} onChange={(e) => setNewSubtaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()} placeholder="Adicionar um item..." className="flex-1 bg-background border border-slate-700 rounded-lg p-2.5 text-sm text-textBase focus:border-primary outline-none" /><button onClick={handleAddSubtask} className="bg-surface border border-slate-700 hover:bg-slate-700 text-textBase px-4 rounded-lg font-medium">Adicionar</button></div><div className="space-y-2">{editingTask.subtasks.map((sub) => (<div key={sub.id} className="flex items-center justify-between bg-surface border border-slate-700/50 p-2.5 rounded-lg group"><label className="flex items-center gap-3 cursor-pointer flex-1"><input type="checkbox" checked={sub.completed} onChange={() => toggleSubtask(sub.id)} className="w-4 h-4 rounded border-slate-600 text-primary bg-background" /><span className={`text-sm flex-1 ${sub.completed ? 'line-through text-textMuted' : 'text-textBase'}`}>{sub.text}</span></label><button onClick={() => removeSubtask(sub.id)} className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button></div>))}</div></div>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/50 flex justify-end gap-3 shrink-0"><button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-textBase hover:bg-slate-700 transition-colors">Cancelar</button><button onClick={saveTaskDetails} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/25"><Save size={18} /> Salvar Alterações</button></div>
          </div>
        </div>
      )}
    </div>
  );
}