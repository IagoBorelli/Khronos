// @ts-nocheck
import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Bell, Plus, Calendar as CalendarIcon, Clock, Edit2, Trash2, X, Save, CheckCircle2, Circle } from 'lucide-react';

const typeColors = {
  trabalho: 'bg-primary/20 text-primary border-primary/30',
  pessoal: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  saude: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
};

const getInitialData = () => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  return [
    { id: 'evt-1', date: todayStr, title: 'Reunião de Alinhamento', time: '10:00', type: 'trabalho', completed: false },
  ];
};

export default function AgendaTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const storedEvents = await window.api.getData('agenda-events');
        setEvents(storedEvents || getInitialData());
      } catch (error) { setEvents(getInitialData()); }
    };
    loadEvents();
  }, []);

  const saveEventsToDB = async (newEvents) => {
    setEvents(newEvents);
    try { await window.api.setData('agenda-events', newEvents); } catch (error) { }
  };

  const toggleEventStatus = (eventId) => {
    const newEvents = events.map(e => e.id === eventId ? { ...e, completed: !e.completed } : e);
    saveEventsToDB(newEvents);
  };

  const openCreateModal = () => { setEditingEvent({ id: `evt-${Date.now()}`, title: '', date: format(selectedDate, 'yyyy-MM-dd'), time: '12:00', type: 'trabalho', completed: false }); setIsModalOpen(true); };
  const openEditModal = (evt) => { setEditingEvent({ ...evt }); setIsModalOpen(true); };
  const saveEventDetails = () => {
    if (!editingEvent.title.trim()) return;
    const exists = events.some(e => e.id === editingEvent.id);
    const newEvents = exists ? events.map(e => e.id === editingEvent.id ? editingEvent : e) : [...events, editingEvent];
    saveEventsToDB(newEvents);
    setIsModalOpen(false);
  };
  const deleteEvent = (eventId) => saveEventsToDB(events.filter(e => e.id !== eventId));

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const testNotification = (title, time) => new window.Notification('Khronos', { body: `${time} - ${title}` });

  if (!events) return <div className="p-8 text-textMuted">Carregando agenda...</div>;

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const rows = []; let days = []; let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayString = format(cloneDay, 'yyyy-MM-dd');
        const dayEvents = events.filter(e => e.date === dayString);

        days.push(
          <div key={dayString} onClick={() => setSelectedDate(cloneDay)} className={`min-h-[80px] p-2 border border-slate-700/30 transition-all cursor-pointer flex flex-col gap-1 ${!isSameMonth(cloneDay, monthStart) ? 'bg-background/50 text-slate-600' : 'bg-surface hover:bg-slate-700/30'} ${isSameDay(cloneDay, selectedDate) ? 'border-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,1)]' : ''} ${isSameDay(cloneDay, new Date()) ? 'bg-primary/5' : ''}`}>
            <div className="flex justify-between items-start">
              <span className={`text-sm font-medium ${isSameDay(cloneDay, new Date()) ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-textBase'}`}>{format(cloneDay, 'd')}</span>
              {dayEvents.length > 0 && <div className="flex gap-1">{dayEvents.slice(0, 3).map((e, idx) => (<div key={idx} className={`w-1.5 h-1.5 rounded-full ${e.completed ? 'bg-emerald-500' : 'bg-primary'}`}></div>))}</div>}
            </div>
            <div className="mt-1 flex flex-col gap-1 overflow-hidden">
              {dayEvents.slice(0, 2).map(evt => (<div key={evt.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${evt.completed ? 'opacity-50 line-through' : ''} ${typeColors[evt.type]}`}>{evt.time} - {evt.title}</div>))}
              {dayEvents.length > 2 && <div className="text-[10px] text-textMuted pl-1">+{dayEvents.length - 2} mais</div>}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>); days = [];
    }
    return <div className="border border-slate-700/50 rounded-xl overflow-hidden bg-surface">{rows}</div>;
  };

  const selectedDayString = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayEvents = events.filter(e => e.date === selectedDayString).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="h-full flex p-8 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex-1 flex flex-col min-w-0">
        <div><h1 className="text-3xl font-bold text-textBase">Agenda</h1><p className="text-textMuted mt-2 mb-6">Programe suas entregas, reuniões e ative lembretes.</p></div>
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-textBase capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2><div className="flex gap-2"><button onClick={prevMonth} className="p-2 rounded-lg bg-surface border border-slate-700/50 hover:bg-slate-700/50 text-textMuted hover:text-textBase"><ChevronLeft size={20} /></button><button onClick={nextMonth} className="p-2 rounded-lg bg-surface border border-slate-700/50 hover:bg-slate-700/50 text-textMuted hover:text-textBase"><ChevronRight size={20} /></button></div></div>
          <div className="grid grid-cols-7 mb-2">{Array.from({ length: 7 }).map((_, i) => (<div key={i} className="text-center font-semibold text-textMuted text-sm py-2">{format(addDays(startOfWeek(currentMonth, { weekStartsOn: 0 }), i), 'EEE', { locale: ptBR }).substring(0, 3)}</div>))}</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">{renderCells()}</div>
        </div>
      </div>

      <div className="w-80 flex flex-col bg-surface border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-700/50"><div className="p-3 bg-primary/10 text-primary rounded-xl"><CalendarIcon size={24} /></div><div><h3 className="text-lg font-bold text-textBase">{format(selectedDate, 'dd', { locale: ptBR })} de {format(selectedDate, 'MMMM', { locale: ptBR })}</h3><p className="text-sm text-textMuted capitalize">{format(selectedDate, 'EEEE', { locale: ptBR })}</p></div></div>
        <div className="flex justify-between items-center mb-4"><h4 className="font-semibold text-textBase">Eventos do dia</h4><button onClick={openCreateModal} className="text-xs bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Plus size={14} /> Novo</button></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 flex flex-col gap-3">
          {selectedDayEvents.length === 0 ? (<div className="text-center text-textMuted py-10 text-sm">Nenhum compromisso marcado.</div>) : (
            selectedDayEvents.map(evt => (
              <div key={evt.id} className={`p-3 rounded-xl border ${typeColors[evt.type]} bg-opacity-10 group relative transition-all ${evt.completed ? 'opacity-60 grayscale' : ''}`}>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface/80 p-1 rounded-md backdrop-blur-sm">
                  <button onClick={() => openEditModal(evt)} className="p-1 text-slate-400 hover:text-primary"><Edit2 size={12} /></button>
                  <button onClick={() => deleteEvent(evt.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleEventStatus(evt.id)} className="mt-0.5 text-textMuted hover:text-emerald-500 transition-colors">
                    {evt.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
                  </button>
                  <div className="flex-1">
                    <h5 className={`font-bold text-sm mb-1 pr-12 ${evt.completed ? 'line-through text-slate-400' : ''}`}>{evt.title}</h5>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs opacity-80"><Clock size={12} /> {evt.time}</div>
                      {!evt.completed && <button onClick={() => testNotification(evt.title, evt.time)} className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity"><Bell size={12} /> Notificar</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/30"><h3 className="text-lg font-bold text-textBase">{events.some(e => e.id === editingEvent.id) ? 'Editar Compromisso' : 'Novo Compromisso'}</h3><button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-red-400 p-1 rounded-md hover:bg-red-400/10"><X size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-textMuted mb-1">Título</label><input type="text" value={editingEvent.title} onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase outline-none focus:border-primary" autoFocus /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-textMuted mb-1">Data</label><input type="date" value={editingEvent.date} onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase outline-none focus:border-primary [color-scheme:dark]" /></div>
                <div><label className="block text-sm font-medium text-textMuted mb-1">Horário</label><input type="time" value={editingEvent.time} onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })} className="w-full bg-background border border-slate-700 rounded-xl p-3 text-textBase outline-none focus:border-primary [color-scheme:dark]" /></div>
              </div>
              <div><label className="block text-sm font-medium text-textMuted mb-2">Categoria</label><div className="flex gap-2">{[{ value: 'trabalho', label: 'Trabalho', color: 'primary' }, { value: 'pessoal', label: 'Pessoal', color: 'amber-500' }, { value: 'saude', label: 'Saúde', color: 'emerald-500' }].map((cat) => (<label key={cat.value} className={`flex-1 cursor-pointer border rounded-xl p-2.5 text-center transition-all ${editingEvent.type === cat.value ? `border-${cat.color} bg-${cat.color}/10 text-${cat.color === 'primary' ? 'primary' : cat.color.replace('500', '400')}` : 'border-slate-700 bg-background text-textMuted hover:bg-slate-800'}`}><input type="radio" name="type" value={cat.value} checked={editingEvent.type === cat.value} onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value })} className="hidden" /><span className="capitalize font-medium text-sm">{cat.label}</span></label>))}</div></div>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/30 flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-textBase hover:bg-slate-700">Cancelar</button><button onClick={saveEventDetails} disabled={!editingEvent.title.trim()} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium disabled:opacity-50"><Save size={16} className="inline mr-2" />Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}