// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, Calendar as CalendarIcon, 
  ArrowRight, Tag as TagIcon 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Label
} from 'recharts';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- COMPONENTE DE KPI ---
const KPICard = ({ title, value, icon: Icon, colorClass, bgColorClass, subtitle }) => (
  <div className="bg-surface p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-between hover:border-slate-600 transition-colors">
    <div className="flex items-center gap-4 mb-2">
      <div className={`p-3 rounded-xl ${bgColorClass}`}>
        <Icon size={24} className={colorClass} />
      </div>
      <p className="text-textMuted text-sm font-medium">{title}</p>
    </div>
    <div className="flex items-baseline gap-2 mt-2">
      <h3 className="text-3xl font-bold text-textBase">{value}</h3>
      {subtitle && <span className="text-xs text-textMuted">{subtitle}</span>}
    </div>
  </div>
);

export default function HomeTab() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    kpis: { total: 0, completed: 0, pending: 0, overdue: 0, eventsToday: 0 },
    columnStats: [],
    priorityStats: [],
    upcomingTasks: [],
    todayEvents: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Busca os dados dos dois "bancos" (Kanban e Agenda)
        const rawKanban = await window.api.getData('kanban-data');
        const rawAgenda = await window.api.getData('agenda-events');

        const kanban = rawKanban || { tasks: {}, columns: {}, columnOrder: [] };
        const agenda = rawAgenda || [];

        const todayDate = new Date();
        const todayStr = format(todayDate, 'yyyy-MM-dd');
        const todayStart = startOfDay(todayDate);

        // Processando Kanban
        const tasksList = Object.values(kanban.tasks || {});
        const completedTaskIds = kanban.columns['completed']?.taskIds || [];
        
        let overdueCount = 0;
        let upcoming = [];

        tasksList.forEach(task => {
          const isCompleted = completedTaskIds.includes(task.id);
          
          if (task.dueDate && !isCompleted) {
            const dueDate = startOfDay(parseISO(task.dueDate));
            if (isBefore(dueDate, todayStart)) {
              overdueCount++;
            } else {
              upcoming.push(task);
            }
          }
        });

        // Ordena tarefas futuras pela data mais próxima
        upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Processando Gráficos do Kanban
        const colors = ['#64748B', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'];
        const columnStats = (kanban.columnOrder || []).map((colId, index) => ({
          name: kanban.columns[colId]?.title || colId,
          value: kanban.columns[colId]?.taskIds?.length || 0,
          color: colors[index % colors.length]
        })).filter(c => c.value > 0);

        const priorityStats = [
          { name: 'Baixa', tarefas: tasksList.filter(t => t.priority === 'baixa').length, fill: '#10B981' },
          { name: 'Média', tarefas: tasksList.filter(t => t.priority === 'media').length, fill: '#F59E0B' },
          { name: 'Alta', tarefas: tasksList.filter(t => t.priority === 'alta').length, fill: '#EF4444' },
        ];

        // Processando Agenda
        const eventsToday = agenda
          .filter(e => e.date === todayStr)
          .sort((a, b) => a.time.localeCompare(b.time));

        setDashboardData({
          kpis: {
            total: tasksList.length,
            completed: completedTaskIds.length,
            pending: tasksList.length - completedTaskIds.length,
            overdue: overdueCount,
            eventsToday: eventsToday.length
          },
          columnStats,
          priorityStats,
          upcomingTasks: upcoming.slice(0, 5), // Pega apenas as 5 próximas
          todayEvents: eventsToday
        });

      } catch (error) {
        console.error("Erro ao montar o dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 text-textMuted">Processando dados do Dashboard...</div>;

  const { kpis, columnStats, priorityStats, upcomingTasks, todayEvents } = dashboardData;
  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto custom-scrollbar">
      
      {/* --- CABEÇALHO --- */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-textBase">Resumo do Dia</h1>
          <p className="text-textMuted mt-2 capitalize">
            Hoje é {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}.
          </p>
        </div>
      </div>

      {/* --- GRID DE KPIs --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
        <KPICard 
          title="Taxa de Conclusão" 
          value={`${completionRate}%`}
          subtitle={`${kpis.completed} de ${kpis.total} tarefas`}
          icon={CheckCircle2} 
          colorClass="text-emerald-500"
          bgColorClass="bg-emerald-500/10"
        />
        <KPICard 
          title="Tarefas em Andamento" 
          value={kpis.pending} 
          icon={Clock} 
          colorClass="text-primary"
          bgColorClass="bg-primary/10"
        />
        <KPICard 
          title="Tarefas Atrasadas" 
          value={kpis.overdue} 
          icon={AlertCircle} 
          colorClass={kpis.overdue > 0 ? "text-red-500" : "text-textMuted"}
          bgColorClass={kpis.overdue > 0 ? "bg-red-500/10" : "bg-slate-700/30"}
        />
        <KPICard 
          title="Compromissos Hoje" 
          value={kpis.eventsToday} 
          icon={CalendarIcon} 
          colorClass="text-amber-500"
          bgColorClass="bg-amber-500/10"
        />
      </div>

      {/* --- ÁREA DO MEIO: GRÁFICOS E WIDGETS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* WIDGETS (COLUNA DA ESQUERDA) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Agenda de Hoje */}
          <div className="bg-surface p-6 rounded-2xl border border-slate-700/50 flex-1 flex flex-col min-h-[250px]">
            <h2 className="text-lg font-semibold text-textBase mb-4 flex items-center gap-2">
              <CalendarIcon size={18} className="text-amber-500"/> Agenda de Hoje
            </h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
              {todayEvents.length === 0 ? (
                <div className="text-center text-textMuted py-8 text-sm">Sem compromissos hoje.</div>
              ) : (
                todayEvents.map(evt => (
                  <div key={evt.id} className="flex gap-3 items-center p-3 bg-background rounded-xl border border-slate-700/50">
                    <span className="text-sm font-bold text-amber-500 w-12">{evt.time}</span>
                    <div className="w-px h-8 bg-slate-700"></div>
                    <span className="text-sm font-medium text-textBase truncate flex-1">{evt.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Próximas Entregas */}
          <div className="bg-surface p-6 rounded-2xl border border-slate-700/50 flex-1 flex flex-col min-h-[250px]">
            <h2 className="text-lg font-semibold text-textBase mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary"/> Próximos Prazos
            </h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
              {upcomingTasks.length === 0 ? (
                <div className="text-center text-textMuted py-8 text-sm">Nenhum prazo próximo definido.</div>
              ) : (
                upcomingTasks.map(task => (
                  <div key={task.id} className="p-3 bg-background rounded-xl border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-textBase truncate mb-1">{task.title || task.content}</h4>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-textMuted">
                        {format(parseISO(task.dueDate), "dd MMM", { locale: ptBR })}
                      </span>
                      {task.tag?.name && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase" style={{ backgroundColor: task.tag.color }}>
                          {task.tag.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* GRÁFICOS (COLUNAS DA DIREITA) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Gráfico de Barras - Prioridades */}
          <div className="bg-surface p-6 rounded-2xl border border-slate-700/50 h-[280px] flex flex-col shrink-0">
            <h2 className="text-lg font-semibold text-textBase mb-4">Volume por Prioridade</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#334155', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Bar dataKey="tarefas" radius={[0, 4, 4, 0]} barSize={32}>
                    {priorityStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Rosca - Distribuição do Quadro */}
          <div className="bg-surface p-6 rounded-2xl border border-slate-700/50 flex-1 flex flex-col min-h-[280px]">
            <h2 className="text-lg font-semibold text-textBase mb-2">Distribuição no Kanban</h2>
            {columnStats.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-textMuted text-sm">O quadro está vazio.</div>
            ) : (
              <div className="flex-1 min-h-0 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={columnStats}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {columnStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Label 
                        value={kpis.total} 
                        position="centerBottom" 
                        className="text-3xl font-bold fill-textBase"
                        dy={-10}
                      />
                      <Label 
                        value="Tarefas" 
                        position="centerTop" 
                        className="text-sm fill-textMuted"
                        dy={15}
                      />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#F8FAFC' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legenda Customizada ao lado do gráfico */}
                <div className="w-1/3 flex flex-col gap-3 pr-4 overflow-y-auto max-h-[200px] custom-scrollbar">
                  {columnStats.map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stat.color }}></div>
                      <span className="text-sm text-textMuted truncate flex-1">{stat.name}</span>
                      <span className="text-sm font-bold text-textBase">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}