// @ts-nocheck
import { useState, useEffect } from 'react';
import { Settings, Bell, Database, Download, Upload, Info, CheckCircle2, AlertTriangle, Moon, Sun } from 'lucide-react';

export default function SettingsTab() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [notificationStatus, setNotificationStatus] = useState('');

  // Carrega o tema salvo
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await window.api.getData('app-theme');
      if (savedTheme === 'light') {
        setTheme('light');
        document.documentElement.classList.add('light-theme');
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await window.api.setData('app-theme', newTheme);
    
    if (newTheme === 'light') document.documentElement.classList.add('light-theme');
    else document.documentElement.classList.remove('light-theme');
  };

  const handleExportData = async () => {
    try {
      const kanbanData = await window.api.getData('kanban-data');
      const agendaEvents = await window.api.getData('agenda-events');
      const backup = { app: 'Khronos', version: '1.0.0', date: new Date().toISOString(), data: { kanban: kanbanData, agenda: agendaEvents } };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `khronos_backup_${new Date().getTime()}.json`);
      document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
      showTempStatus('Backup realizado com sucesso!');
    } catch (error) { showTempStatus('Erro ao exportar dados.'); }
  };

  const handleImportData = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) return;
        const json = JSON.parse(e.target.result as string);
        if (json.app !== 'TaskPulse' && json.app !== 'Khronos' || !json.data) throw new Error('Arquivo de backup inválido.');
        if (json.data.kanban) await window.api.setData('kanban-data', json.data.kanban);
        if (json.data.agenda) await window.api.setData('agenda-events', json.data.agenda);
        alert("Dados restaurados com sucesso! O aplicativo será recarregado.");
        window.location.reload(); 
      } catch (error: any) { alert("Erro ao ler o arquivo: " + error.message); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleClearData = async () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODAS as suas tarefas e compromissos. Deseja continuar?")) {
      await window.api.setData('kanban-data', null);
      await window.api.setData('agenda-events', null);
      alert("Todos os dados foram apagados.");
      window.location.reload();
    }
  };

  const showTempStatus = (msg) => { setNotificationStatus(msg); setTimeout(() => setNotificationStatus(''), 3000); };

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textBase flex items-center gap-3"><Settings size={32} className="text-primary" /> Configurações</h1>
        <p className="text-textMuted mt-2">Personalize sua experiência e gerencie seus dados locais.</p>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="bg-surface p-6 rounded-2xl border border-slate-700/50">
          <h2 className="text-xl font-semibold text-textBase mb-4 flex items-center gap-2"><Bell size={20} className="text-amber-500" /> Preferências do Sistema</h2>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-slate-700/50">
              <div><h3 className="font-medium text-textBase">Notificações Desktop</h3><p className="text-sm text-textMuted mt-1">Permitir alertas de compromissos e tarefas.</p></div>
              <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-primary' : 'bg-slate-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-slate-700/50">
              <div><h3 className="font-medium text-textBase">Tema do Aplicativo</h3><p className="text-sm text-textMuted mt-1">Alterne entre o modo Claro e Escuro.</p></div>
              <button onClick={toggleTheme} className="flex items-center gap-2 bg-surface border border-slate-600 px-4 py-2 rounded-lg text-textBase hover:bg-slate-700 transition-colors">
                {theme === 'dark' ? <><Sun size={16} className="text-amber-400"/> Modo Claro</> : <><Moon size={16} className="text-blue-400"/> Modo Escuro</>}
              </button>
            </div>
          </div>
        </div>

        {/* --- DADOS E BACKUP (Igual ao Anterior) --- */}
        <div className="bg-surface p-6 rounded-2xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold text-textBase flex items-center gap-2"><Database size={20} className="text-emerald-500" /> Banco de Dados Local</h2>{notificationStatus && (<span className="text-sm text-emerald-400 flex items-center gap-1 animate-in fade-in"><CheckCircle2 size={16} /> {notificationStatus}</span>)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleExportData} className="flex items-start gap-4 p-4 bg-background rounded-xl border border-slate-700/50 hover:border-primary/50 text-left group"><div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform"><Download size={24} /></div><div><h3 className="font-bold text-textBase mb-1">Exportar Backup</h3><p className="text-xs text-textMuted">Salva um arquivo .json com todas as tarefas e agenda no seu computador.</p></div></button>
            <label className="flex items-start gap-4 p-4 bg-background rounded-xl border border-slate-700/50 hover:border-emerald-500/50 text-left group cursor-pointer"><div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform"><Upload size={24} /></div><div><h3 className="font-bold text-textBase mb-1">Restaurar Backup</h3><p className="text-xs text-textMuted">Carrega um arquivo .json para recuperar seus dados anteriores.</p></div><input type="file" accept=".json" onChange={handleImportData} className="hidden" /></label>
          </div>
          <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><AlertTriangle size={20} className="text-red-500" /><div><h3 className="font-bold text-textBase">Apagar Tudo (Factory Reset)</h3><p className="text-xs text-textMuted">Isso removerá permanentemente todos os dados do aplicativo.</p></div></div><button onClick={handleClearData} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-sm font-bold transition-all">Limpar Dados</button></div></div>
        </div>
        
        <div className="bg-surface p-6 rounded-2xl border border-slate-700/50"><h2 className="text-xl font-semibold text-textBase mb-4 flex items-center gap-2"><Info size={20} className="text-blue-400" /> Sobre o Khronos</h2><div className="text-sm text-textMuted space-y-2"><p><strong>Versão:</strong> 1.0.0 (Build Electron)</p><p><strong>Desenvolvedor:</strong> Iago Borelli</p><p className="mt-4 pt-4 border-t border-slate-700/50">Aplicativo desktop focado em alta performance para gerenciamento de tarefas (Kanban) e organização de agenda pessoal e profissional.</p></div></div>
      </div>
    </div>
  );
}