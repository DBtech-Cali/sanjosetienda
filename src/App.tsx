import { useState } from 'react';
import Layout from './components/Layout';
import POSView from './views/POSView';
import InventoryView from './views/InventoryView';
import ReportsView from './views/ReportsView';
import PricesView from './views/PricesView';
import SalesView from './views/SalesView';

type Tab = 'caja' | 'inventario' | 'reportes' | 'ventas' | 'ajustes';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('caja');

  const renderView = () => {
    switch (activeTab) {
      case 'caja':
        return <POSView />;
      case 'inventario':
        return <InventoryView />;
      case 'reportes':
        return <ReportsView />;
      case 'ventas':
        return <SalesView />;
      case 'ajustes':
        return <PricesView />;
      default:
        return <POSView />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'caja': return 'Tienda San José';
      case 'inventario': return 'San José';
      case 'reportes': return 'Reporte de Utilidades';
      case 'ventas': return 'Registro de Ventas';
      case 'ajustes': return 'Gestión de Precios';
      default: return 'Tienda San José';
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={(tab) => setActiveTab(tab as Tab)} 
      title={getTitle()}
      showAddButton={activeTab === 'inventario'}
    >
      {renderView()}
    </Layout>
  );
}
