import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BookOpen,
  Utensils,
  BarChart2,
  Loader2,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { SaleRecord, PurchaseRecord, PastoralExpense } from '../types';

function recordToDate(ts: unknown): Date | null {
  if (ts == null) return null;
  const t = ts as { toDate?: () => Date };
  if (typeof t.toDate === 'function') return t.toDate();
  return null;
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function saleDayKey(s: SaleRecord): string | null {
  const d = recordToDate(s.timestamp);
  if (d) return localDayKey(d);
  return null;
}

function purchaseDayKey(p: PurchaseRecord): string | null {
  const d = recordToDate(p.timestamp);
  if (d) return localDayKey(d);
  if (typeof p.date === 'string' && p.date.length >= 10) return p.date.slice(0, 10);
  return null;
}

export default function ReportsView() {
  const [viewType, setViewType] = useState<'daily' | 'monthly' | 'global'>('daily');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    // Default to current month: YYYY-MM
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [pastoralExpenses, setPastoralExpenses] = useState<PastoralExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [globalPickDay, setGlobalPickDay] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setFirestoreError(prev => prev ?? 'La conexión tardó demasiado. Puede ser un problema temporal.');
    }, 20000);

    const now = new Date();
    let startOfPeriod: Date | null = null;
    let endOfPeriod: Date | null = null;

    if (viewType === 'daily') {
      startOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (viewType === 'monthly') {
      const [year, month] = selectedMonth.split('-').map(Number);
      startOfPeriod = new Date(year, month - 1, 1);
      endOfPeriod = new Date(year, month, 0, 23, 59, 59, 999);
    }

    let salesQuery = query(collection(db, 'sales'));
    let purchasesQuery = query(collection(db, 'purchases'));

    if (viewType !== 'global' && startOfPeriod) {
      let fbStart = Timestamp.fromDate(startOfPeriod);
      if (endOfPeriod) {
        let fbEnd = Timestamp.fromDate(endOfPeriod);
        salesQuery = query(collection(db, 'sales'), where('timestamp', '>=', fbStart), where('timestamp', '<=', fbEnd));
        purchasesQuery = query(collection(db, 'purchases'), where('timestamp', '>=', fbStart), where('timestamp', '<=', fbEnd));
      } else {
        salesQuery = query(collection(db, 'sales'), where('timestamp', '>=', fbStart));
        purchasesQuery = query(collection(db, 'purchases'), where('timestamp', '>=', fbStart));
      }
    }

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
  }, [viewType, selectedMonth, retryCount]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'pastoral_expenses'),
      (snapshot) => {
        setPastoralExpenses(snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as PastoralExpense)));
      },
      (err) => {
        console.error('Firestore pastoral_expenses:', err);
      }
    );
    return () => unsub();
  }, [retryCount]);

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const totalPastoral = pastoralExpenses.reduce((sum, p) => sum + p.amount, 0);
  const netUtilityBeforePastoral = totalSales - totalPurchases;
  const netUtility =
    viewType === 'global' ? netUtilityBeforePastoral - totalPastoral : netUtilityBeforePastoral;

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

  const globalMonthRows = useMemo(() => {
    if (viewType !== 'global') return [];
    const map = new Map<string, { ventas: number; gastos: number; pastoral: number }>();
    for (const s of sales) {
      const dk = saleDayKey(s);
      if (!dk) continue;
      const mk = dk.slice(0, 7);
      const row = map.get(mk) ?? { ventas: 0, gastos: 0, pastoral: 0 };
      row.ventas += s.total;
      map.set(mk, row);
    }
    for (const p of purchases) {
      const dk = purchaseDayKey(p);
      if (!dk) continue;
      const mk = dk.slice(0, 7);
      const row = map.get(mk) ?? { ventas: 0, gastos: 0, pastoral: 0 };
      row.gastos += p.totalCost;
      map.set(mk, row);
    }
    for (const pe of pastoralExpenses) {
      const dk = typeof pe.date === 'string' && pe.date.length >= 7 ? pe.date.slice(0, 10) : null;
      if (!dk) continue;
      const mk = dk.slice(0, 7);
      const row = map.get(mk) ?? { ventas: 0, gastos: 0, pastoral: 0 };
      row.pastoral += pe.amount;
      map.set(mk, row);
    }
    return [...map.entries()]
      .map(([monthKey, v]) => ({
        monthKey,
        ventas: v.ventas,
        gastos: v.gastos,
        pastoral: v.pastoral,
        utilidad: v.ventas - v.gastos - v.pastoral,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [viewType, sales, purchases, pastoralExpenses]);

  const globalDayStats = useMemo(() => {
    if (viewType !== 'global' || !globalPickDay) return null;
    let ventas = 0;
    let gastos = 0;
    let pastoral = 0;
    for (const s of sales) {
      if (saleDayKey(s) === globalPickDay) ventas += s.total;
    }
    for (const p of purchases) {
      if (purchaseDayKey(p) === globalPickDay) gastos += p.totalCost;
    }
    for (const pe of pastoralExpenses) {
      if (pe.date === globalPickDay) pastoral += pe.amount;
    }
    return { ventas, gastos, pastoral, utilidad: ventas - gastos - pastoral };
  }, [viewType, globalPickDay, sales, purchases, pastoralExpenses]);

  const selectedMonthLabel =
    viewType === 'monthly'
      ? (() => {
          const [y, m] = selectedMonth.split('-').map(Number);
          return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        })()
      : '';

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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-2">
        <p className="text-xs font-bold text-primary uppercase tracking-widest">Tienda Escolar San José</p>
      </div>

      {/* View Toggle */}
      <div className="flex flex-col py-4 gap-3">
        <div className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary/10 p-1.5 border border-primary/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setViewType('daily')}
            className={`flex flex-1 min-w-max px-3 items-center justify-center rounded-lg h-full text-[13px] md:text-sm font-bold transition-all ${viewType === 'daily' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
              }`}
          >
            Diaria
          </button>
          <button
            onClick={() => setViewType('monthly')}
            className={`flex flex-1 min-w-max px-3 items-center justify-center rounded-lg h-full text-[13px] md:text-sm font-bold transition-all ${viewType === 'monthly' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
              }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setViewType('global')}
            className={`flex flex-1 min-w-max px-3 items-center justify-center rounded-lg h-full text-[13px] md:text-sm font-bold transition-all ${viewType === 'global' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
              }`}
          >
            Global
          </button>
        </div>

        {viewType === 'monthly' && (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-700">Mes a consultar:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary text-sm font-medium"
              />
            </div>
            <p className="text-xs text-slate-500 capitalize">Mostrando: {selectedMonthLabel}</p>
          </div>
        )}

        {viewType === 'global' && (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Calendar size={18} className="text-primary shrink-0" />
              <span className="text-sm font-bold">Consultar un día concreto</span>
            </div>
            <p className="text-xs text-slate-600">
              Elija la fecha para ver ventas, gastos y utilidad solo de ese día (sobre el historial completo cargado).
            </p>
            <input
              type="date"
              value={globalPickDay}
              onChange={(e) => setGlobalPickDay(e.target.value)}
              className="max-w-xs px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary text-sm font-medium"
            />
            {globalDayStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                <div className="rounded-lg bg-white border border-slate-100 p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Ventas del día</p>
                  <p className="text-lg font-extrabold text-slate-900">
                    ${globalDayStats.ventas.toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-slate-100 p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Gastos insumos</p>
                  <p className="text-lg font-extrabold text-slate-900">
                    ${globalDayStats.gastos.toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-slate-100 p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Pastoral día</p>
                  <p className="text-lg font-extrabold text-slate-900">
                    ${globalDayStats.pastoral.toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-slate-100 p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Utilidad del día</p>
                  <p
                    className={`text-lg font-extrabold ${globalDayStats.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ${globalDayStats.utilidad.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="flex flex-col gap-4 md:gap-5 max-w-4xl">
        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
          <div className="flex flex-1 min-w-[140px] flex-col gap-2 rounded-xl p-5 bg-white border border-primary/5 shadow-sm">
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
          <div className="flex flex-1 min-w-[140px] flex-col gap-2 rounded-xl p-5 bg-white border border-primary/5 shadow-sm">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-orange-400" />
              <p className="text-slate-500 text-sm font-medium">Gastos (insumos)</p>
            </div>
            <p className="text-slate-900 tracking-tight text-xl font-extrabold">${totalPurchases.toLocaleString('es-CO')}</p>
            <div className="flex items-center gap-1">
              <TrendingDown size={14} className="text-red-500" />
              <p className="text-red-500 text-xs font-bold">Compras tienda</p>
            </div>
          </div>
          {viewType === 'global' && (
            <div className="flex flex-1 min-w-[140px] flex-col gap-2 rounded-xl p-5 bg-white border border-violet-200/80 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingDown size={18} className="text-violet-600" />
                <p className="text-slate-500 text-sm font-medium">Gastos pastoral</p>
              </div>
              <p className="text-slate-900 tracking-tight text-xl font-extrabold">
                ${totalPastoral.toLocaleString('es-CO')}
              </p>
              <p className="text-violet-600 text-xs font-bold">Pestaña Pastoral</p>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 rounded-xl p-6 bg-primary shadow-lg shadow-primary/20">
          <div className="flex justify-between items-center">
            <p className="text-slate-900 text-sm font-bold uppercase tracking-wider opacity-80">
              {viewType === 'global' ? 'Utilidad neta (tras pastoral)' : 'Utilidad Neta'}
            </p>
            <BarChart2 size={20} className="text-slate-900" />
          </div>
          {viewType === 'global' && (
            <p className="text-slate-800/90 text-xs font-medium">
              Utilidad tienda (ventas − insumos): ${netUtilityBeforePastoral.toLocaleString('es-CO')} · Pastoral: −$
              {totalPastoral.toLocaleString('es-CO')}
            </p>
          )}
          <div className="flex items-end gap-3">
            <p className="text-slate-900 tracking-tight text-3xl font-black">${netUtility.toLocaleString('es-CO')}</p>
            <p className="text-slate-900 text-sm font-bold mb-1 bg-white/30 px-2 py-0.5 rounded-full">
              {netUtility >= 0 ? '+' : '-'}{Math.abs(netUtility).toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {viewType === 'global' && globalMonthRows.length > 0 && (
        <div className="mt-6 max-w-4xl">
          <h3 className="text-slate-900 text-lg font-bold mb-3">Consolidado por mes</h3>
          <div className="bg-white rounded-xl border border-primary/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500 text-xs font-bold uppercase tracking-wide">
                    <th className="px-4 py-3">Mes</th>
                    <th className="px-4 py-3 text-right">Ventas</th>
                    <th className="px-4 py-3 text-right">Insumos</th>
                    <th className="px-4 py-3 text-right">Pastoral</th>
                    <th className="px-4 py-3 text-right">Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {globalMonthRows.map((row) => {
                    const [y, m] = row.monthKey.split('-').map(Number);
                    const label = new Date(y, m - 1, 1).toLocaleDateString('es-CO', {
                      month: 'long',
                      year: 'numeric',
                    });
                    return (
                      <tr key={row.monthKey} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800 capitalize">{label}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          ${row.ventas.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          ${row.gastos.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-violet-800">
                          ${row.pastoral.toLocaleString('es-CO')}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold ${row.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          ${row.utilidad.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewType === 'global' && globalMonthRows.length === 0 && !loading && (
        <p className="mt-4 text-sm text-slate-500 max-w-4xl">
          No hay datos con fecha suficiente para armar el consolidado mensual. Las ventas usan la hora del registro; las
          compras antiguas sin fecha pueden no aparecer.
        </p>
      )}

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
