import React from 'react';
import Link from 'next/link';
import { Brain, Calendar, Clock, ChevronRight } from 'lucide-react';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { useAuth } from '@/contexts/AuthContext';

export interface OrderCompact {
  id: string;
  number: string;
  customer_name?: string;
  product_name?: string;
  delivery_date: string;
  total: number;
  status: string;
  payment_status: 'SINAL_PENDENTE' | 'SINAL_PAGO' | 'QUITADO' | 'CONTA_CORRENTE';
  has_ai_suggestion?: boolean;
}

interface OrderCardProps {
  order: OrderCompact;
  viewMode?: 'kanban' | 'calendar';
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, viewMode = 'kanban' }) => {
  const { profile } = useAuth();
  
  const statusColors: Record<string, string> = {
    'NOVO': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'ACEITO': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    'PREPARANDO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'PRONTO': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    'SAIU_ENTREGA': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'ENTREGUE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
    'CANCELADO': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
  };

  const getStatusColor = (status: string) => statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateObj = new Date(order.delivery_date);
  
  return (
    <Link 
      href={`/dashboard/orders/${order.id}`}
      className={`block bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 overflow-hidden ${viewMode === 'calendar' ? 'p-2' : 'p-3'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-900 dark:text-white">#{order.number}</span>
          {order.has_ai_suggestion && (
            <span title="Sugestão da IA pendente">
              <Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            </span>
          )}
        </div>
        
        {viewMode === 'kanban' && (
          <span className="text-[11px] font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            {formatCurrency(order.total)}
          </span>
        )}
      </div>

      <div className="mb-2">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1" title={order.customer_name}>
          {order.customer_name}
        </p>
        {viewMode === 'kanban' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
            {order.product_name || 'N/A'}
          </p>
        )}
      </div>

      {viewMode === 'kanban' && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <Calendar className="w-3.5 h-3.5" />
          <span>{dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
          <Clock className="w-3.5 h-3.5 ml-1" />
          <span>{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50">
         {(profile?.role === 'ADMIN' || profile?.role === 'GERENTE') && viewMode === 'kanban' ? (
           <div className="scale-90 origin-left">
             <PaymentStatusBadge status={order.payment_status} showLabel={false} />
           </div>
         ) : <div />}
         
         <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
           {order.status}
         </div>
      </div>
    </Link>
  );
};
