import React from 'react';
import { 
  Store, 
  Package, 
  BarChart3, 
  Receipt,
  Settings, 
  User,
  Plus,
  HeartHandshake
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  title: string;
  showAddButton?: boolean;
}

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab, 
  title,
  showAddButton = false
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex flex-col min-h-screen max-w-md md:max-w-3xl lg:max-w-5xl mx-auto bg-background-light relative px-0 md:px-4">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-primary/10 bg-white/80 px-4 md:px-6 py-3 md:py-4 backdrop-blur-md">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-slate-900">
              <Store size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          </div>
          <button className="flex size-10 md:size-11 items-center justify-center rounded-full hover:bg-primary/10 transition-colors text-slate-500">
            <User size={24} />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-32 md:pb-24">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200/50 bg-white/90 px-1 pb-8 pt-2 backdrop-blur-xl max-w-md md:max-w-3xl lg:max-w-5xl mx-auto md:rounded-t-2xl md:border-x md:shadow-lg overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('caja')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'caja' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Store size={22} fill={activeTab === 'caja' ? 'currentColor' : 'none'} />
            <p className="text-[9px] font-bold uppercase tracking-tight">Caja</p>
          </button>
          
          <button 
            onClick={() => setActiveTab('inventario')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'inventario' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Package size={22} fill={activeTab === 'inventario' ? 'currentColor' : 'none'} />
            <p className="text-[9px] font-bold uppercase tracking-tight">Inventario</p>
          </button>

          {showAddButton && (
            <div className="relative -top-6 px-2">
              <button className="bg-primary size-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center text-slate-900 border-4 border-background-light">
                <Plus size={32} strokeWidth={3} />
              </button>
            </div>
          )}

          <button 
            onClick={() => setActiveTab('reportes')}
            className={`flex flex-1 min-w-[3.5rem] flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'reportes' ? 'text-primary' : 'text-slate-400'}`}
          >
            <BarChart3 size={22} fill={activeTab === 'reportes' ? 'currentColor' : 'none'} />
            <p className="text-[9px] font-bold uppercase tracking-tight">Reportes</p>
          </button>

          <button 
            onClick={() => setActiveTab('pastoral')}
            className={`flex flex-1 min-w-[3.5rem] flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'pastoral' ? 'text-primary' : 'text-slate-400'}`}
          >
            <HeartHandshake size={22} fill={activeTab === 'pastoral' ? 'currentColor' : 'none'} />
            <p className="text-[9px] font-bold uppercase tracking-tight">Pastoral</p>
          </button>

          <button 
            onClick={() => setActiveTab('ventas')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'ventas' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Receipt size={22} fill={activeTab === 'ventas' ? 'currentColor' : 'none'} />
            <p className="text-[9px] font-bold uppercase tracking-tight">Ventas</p>
          </button>

          <button 
            onClick={() => setActiveTab('ajustes')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'ajustes' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Settings size={22} fill={activeTab === 'ajustes' ? 'currentColor' : 'none'} />
            <p className="text-[9px] font-bold uppercase tracking-tight">Ajustes</p>
          </button>
        </nav>
      </div>
    </div>
  );
}
