import { useState, useEffect } from 'react'
import { LayoutDashboard, KanbanSquare, CalendarDays, Settings, Hourglass } from 'lucide-react'
import HomeTab from './components/HomeTab'
import KanbanTab from './components/KanbanTab'
import AgendaTab from './components/AgendaTab'
import SettingsTab from './components/SettingsTab'

function App() {
  const [activeTab, setActiveTab] = useState('home')

  // --- LÓGICA DO MENU OCULTO (TRAY) ---
  // Esse useEffect é quem escuta os cliques lá do ícone da barra de tarefas
  useEffect(() => {
    if (window.api && window.api.onNavigate) {
      window.api.onNavigate((tabName) => {
        console.log("Abrindo a aba via Tray:", tabName);
        setActiveTab(tabName);
      });
    }
  }, []);
  // ------------------------------------

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeTab />
      case 'tarefas': return <KanbanTab />
      case 'agenda': return <AgendaTab />
      case 'settings': return <SettingsTab />
      default: return <HomeTab />
    }
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'tarefas', label: 'Tarefas', icon: KanbanSquare },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  ]

  return (
    <div className="flex h-screen w-full bg-background font-sans">
      {/* Menu Lateral */}
      <aside className="w-64 bg-surface border-r border-slate-700/50 flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shadow-inner shadow-primary/20">
              <Hourglass size={20} strokeWidth={2.5} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-wide text-textBase">Khronos</h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/10 text-primary shadow-sm' 
                      : 'text-textMuted hover:bg-slate-700/30 hover:text-textBase'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-primary' : 'opacity-70'} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* User / Settings Footer da Sidebar */}
        <div className="p-6 border-t border-slate-700/50">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2 transition-colors rounded-lg ${
              activeTab === 'settings' 
                ? 'bg-primary/10 text-primary' 
                : 'text-textMuted hover:text-textBase hover:bg-slate-700/30'
            }`}
          >
            <Settings size={20} className={activeTab === 'settings' ? 'text-primary' : ''} />
            <span className="font-medium">Configurações</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 overflow-y-auto">
        {/* Barra de título invisível para arrastar a janela (opcional, caso queira frameless window) */}
        <div className="h-8 w-full app-region-drag"></div>
        {renderContent()}
      </main>
    </div>
  )
}

export default App