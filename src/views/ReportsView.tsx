import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  BookOpen,
  Utensils,
  BarChart2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { SaleRecord, PurchaseRecord } from '../types';

export default function ReportsView() {
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('daily');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setFirestoreError(prev => prev ?? 'La conexión tardó demasiado. Puede ser un problema temporal.');
    }, 20000);

    const now = new Date();
    let startOfPeriod: Date;
    if (viewType === 'daily') {
      startOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const salesQuery = query(
      collection(db, 'sales'),
      where('timestamp', '>=', Timestamp.fromDate(startOfPeriod))
    );
    const purchasesQuery = query(
      collection(db, 'purchases'),
      where('timestamp', '>=', Timestamp.fromDate(startOfPeriod))
    );

    const unsubSales = onSnapshot(
      salesQuery,
      (snapshot) => setSales(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SaleRecord))),
      (err) => {
        clearTimeout(timeoutId);
        console.error('Firestore sales:', err);
        setFirestoreError(err.message || 'Error al conectar con Firestore.');
      }
    );
    const unsubPurchases = onSnapshot(
      purchasesQuery,
      (snapshot) => {
        clearTimeout(timeoutId);
        setPurchases(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PurchaseRecord)));
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Firestore purchases:', err);
        setLoading(false);
        setFirestoreError(err.message || 'Error al conectar con Firestore.');
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubSales();
      unsubPurchases();
    };
  }, [viewType, retryCount]);

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const netUtility = totalSales - totalPurchases;

  // Category stats
  const categoryStats = sales.reduce((acc: any, sale) => {
    sale.items.forEach(item => {
      if (!acc[item.category]) acc[item.category] = { total: 0, count: 0 };
      acc[item.category].total += item.price * item.quantity;
      acc[item.category].count += item.quantity;
    });
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryStats)
    .sort(([, a]: any, [, b]: any) => b.total - a.total)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-sm text-slate-500">Cargando reportes...</p>
      </div>
    );
  }

  if (firestoreError) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <p className="font-medium">No se pudieron cargar los reportes</p>
        <p className="text-sm mt-1">{firestoreError}</p>
        <button
          type="button"
          onClick={() => { setFirestoreError(null); setLoading(true); setRetryCount(c => c + 1); }}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 rounded-lg font-medium text-amber-900 transition-colors"
        >
          <RefreshCw size={18} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-2">
        <p className="text-xs font-bold text-primary uppercase tracking-widest">Tienda Escolar San José</p>
      </div>

      {/* View Toggle */}
      <div className="flex py-4">
        <div className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary/10 p-1.5 border border-primary/10">
          <button 
            onClick={() => setViewType('daily')}
            className={`flex flex-1 items-center justify-center rounded-lg h-full text-sm font-bold transition-all ${
              viewType === 'daily' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
            }`}
          >
            Vista Diaria
          </button>
          <button 
            onClick={() => setViewType('monthly')}
            className={`flex flex-1 items-center justify-center rounded-lg h-full text-sm font-bold transition-all ${
              viewType === 'monthly' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
            }`}
          >
            Vista Mensual
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-4">
          <div className="flex flex-1 flex-col gap-2 rounded-xl p-5 bg-white border border-primary/5 shadow-sm">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-primary" />
              <p className="text-slate-500 text-sm font-medium">Ventas Totales</p>
            </div>
            <p className="text-slate-900 tracking-tight text-xl font-extrabold">${totalSales.toLocaleString('es-CO')}</p>
            <div className="flex items-center gap-1">
              <TrendingUp size={14} className="text-green-500" />
              <p className="text-green-500 text-xs font-bold">Actualizado</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-xl p-5 bg-white border border-primary/5 shadow-sm">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-orange-400" />
              <p className="text-slate-500 text-sm font-medium">Gastos</p>
            </div>
            <p className="text-slate-900 tracking-tight text-xl font-extrabold">${totalPurchases.toLocaleString('es-CO')}</p>
            <div className="flex items-center gap-1">
              <TrendingDown size={14} className="text-red-500" />
              <p className="text-red-500 text-xs font-bold">Insumos</p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-xl p-6 bg-primary shadow-lg shadow-primary/20">
          <div className="flex justify-between items-center">
            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-80">Utilidad Neta</p>
            <BarChart2 size={20} className="text-slate-900" />
          </div>
          <div className="flex items-end gap-3">
            <p className="text-slate-900 tracking-tight text-3xl font-black">${netUtility.toLocaleString('es-CO')}</p>
            <p className="text-slate-900 text-sm font-bold mb-1 bg-white/30 px-2 py-0.5 rounded-full">
              {netUtility >= 0 ? '+' : '-'}{Math.abs(netUtility).toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Placeholder (Simplified for real data) */}
      <div className="mt-6">
        <div className="bg-white rounded-xl p-5 border border-primary/5 shadow-sm">
          <h3 className="text-slate-900 text-base font-bold mb-4">Resumen de Periodo</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 bg-primary/20 rounded-t-lg relative" style={{ height: '100px' }}>
                <div className="absolute bottom-0 w-full bg-primary rounded-t-lg" style={{ height: `${(totalSales / (totalSales + totalPurchases || 1)) * 100}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ventas</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 bg-orange-400/20 rounded-t-lg relative" style={{ height: '100px' }}>
                <div className="absolute bottom-0 w-full bg-orange-400 rounded-t-lg" style={{ height: `${(totalPurchases / (totalSales + totalPurchases || 1)) * 100}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Gastos</span>
            </div>
            <div className="flex-1 pl-6">
              <p className="text-xs text-slate-500 mb-1">Balance General</p>
              <p className={`text-lg font-black ${netUtility >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${netUtility.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-slate-900 text-lg font-bold">Categorías Top</h3>
          <button className="text-primary text-sm font-bold">Ver todo</button>
        </div>
        <div className="space-y-3">
          {sortedCategories.length > 0 ? sortedCategories.map(([cat, stats]: any) => (
            <div key={cat} className="flex items-center justify-between p-4 bg-white rounded-xl border border-primary/5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {cat === 'Bebida' ? <BookOpen size={20} /> : <Utensils size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{cat}</p>
                  <p className="text-xs text-slate-500">{stats.count} productos vendidos</p>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-900">${stats.total.toLocaleString('es-CO')}</p>
            </div>
          )) : (
            <p className="text-center text-slate-400 py-4">No hay ventas registradas en este periodo.</p>
          )}
        </div>
      </div>
    </div>
  );
}
