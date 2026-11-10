'use client';

import React from 'react';
import { PrefetchLink } from '@/components/ui/PrefetchLink';
import { Page, PageDescription, PageHeader, PageTitle } from '@/components/ui/page';
import { formatDateFull } from '@/lib/date-formatter';
import { Container } from '@/components/ui/container';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Send, TrendingUp, AlertCircle, CheckCircle2, MoreHorizontal, ArrowUpRight, Users, FileText, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '@/components/ui/lazy-charts';
import { Campaign, CampaignStatus } from '../../../types';
import { DashboardStats } from '../../../services/dashboardService';

interface DashboardViewProps {
  stats: DashboardStats;
  recentCampaigns: Campaign[];
  isLoading: boolean;
}

/**
 * Mapeia CampaignStatus enum para status do StatusBadge
 */
const getCampaignBadgeStatus = (status: CampaignStatus) => {
  const map: Record<CampaignStatus, 'completed' | 'sending' | 'failed' | 'draft' | 'paused' | 'scheduled' | 'default'> = {
    [CampaignStatus.COMPLETED]: 'completed',
    [CampaignStatus.SENDING]: 'sending',
    [CampaignStatus.FAILED]: 'failed',
    [CampaignStatus.DRAFT]: 'draft',
    [CampaignStatus.PAUSED]: 'paused',
    [CampaignStatus.SCHEDULED]: 'scheduled',
    [CampaignStatus.CANCELLED]: 'default',
  };
  return map[status] || 'default';
};

const getCampaignLabel = (status: CampaignStatus) => {
  const labels: Record<CampaignStatus, string> = {
    [CampaignStatus.COMPLETED]: 'Concluído',
    [CampaignStatus.SENDING]: 'Enviando',
    [CampaignStatus.FAILED]: 'Falhou',
    [CampaignStatus.DRAFT]: 'Rascunho',
    [CampaignStatus.PAUSED]: 'Pausado',
    [CampaignStatus.SCHEDULED]: 'Agendado',
    [CampaignStatus.CANCELLED]: 'Cancelada',
  };
  return labels[status];
};

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, recentCampaigns, isLoading }) => {
  const [range, setRange] = React.useState<'7D' | '15D' | '30D'>('7D');
  const [isMounted, setIsMounted] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rangeSize = range === '7D' ? 7 : range === '15D' ? 15 : 30;
  const chartData = stats.chartData || [];
  const overview = stats.overview;
  const number = (value: number) => value.toLocaleString('pt-BR');
  const historyDate = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  React.useEffect(() => {
    // Aguarda o browser calcular as dimensões do container antes de renderizar o chart
    // Isso evita o warning "width(-1) height(-1)" do Recharts
    // Usa setTimeout para garantir que o layout foi calculado após o primeiro paint
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        setIsMounted(true);
      } else {
        // Fallback: renderiza mesmo assim após 500ms
        setTimeout(() => setIsMounted(true), 500);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Dashboard</PageTitle>
          <PageDescription>Visão operacional e histórico de mensagens</PageDescription>
        </div>
      </PageHeader>

      <section aria-labelledby="operational-title" className="space-y-3">
        <h2 id="operational-title" className="text-lg font-semibold">Visão operacional</h2>
        {overview ? (
          <>
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Contatos" value={number(overview.contacts)} icon={Users} layout="compact" />
              <div className="space-y-2">
                <StatCard title="Templates" value={number(overview.templates.total)} icon={FileText} layout="compact" />
                <p className="text-xs text-[var(--ds-text-muted)]">Aprovados: {number(overview.templates.approved)} | Rascunhos: {number(overview.templates.drafts)}</p>
              </div>
              <div className="space-y-2">
                <StatCard title="Campanhas" value={number(overview.campaigns.total)} icon={Send} layout="compact" />
                <p className="text-xs text-[var(--ds-text-muted)]">Concluídas: {number(overview.campaigns.completed)} | Ativas: {number(overview.campaigns.active)}</p>
              </div>
              <div className="space-y-2">
                <StatCard title="Mensagens do Inbox" value={number(overview.inbox.messages)} icon={MessageSquare} layout="compact" />
                <p className="text-xs text-[var(--ds-text-muted)]">{number(overview.inbox.conversations)} conversas registradas</p>
              </div>
            </div>
            <Container variant="glass" padding="md" className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">Histórico disponível</h3>
                <p className="text-xs text-[var(--ds-text-muted)]">
                  {overview.inbox.firstMessageAt && overview.inbox.lastMessageAt
                    ? `${historyDate(overview.inbox.firstMessageAt)} a ${historyDate(overview.inbox.lastMessageAt)} (UTC)`
                    : 'Sem mensagens registradas'}
                </p>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  ['Saída', overview.inbox.outbound], ['Entrada', overview.inbox.inbound],
                  ['Entregues', overview.inbox.delivered], ['Lidas', overview.inbox.read],
                  ['Pendentes', overview.inbox.pending], ['Falhas', overview.inbox.failed],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-[var(--ds-text-muted)]">{label}</dt>
                    <dd className="text-lg font-semibold">{number(value as number)}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-[var(--ds-text-muted)]">
                O histórico do Inbox não representa disparos de campanhas. Templates e campanhas mostram apenas registros deste app.
              </p>
            </Container>
          </>
        ) : (
          <Container variant="glass" padding="md">
            <p role="status" className="text-sm text-[var(--ds-text-muted)]">{isLoading ? 'Carregando resumo operacional...' : 'Resumo operacional indisponível.'}</p>
          </Container>
        )}
      </section>

      <h2 className="text-lg font-semibold">Indicadores de campanhas</h2>

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Enviadas por campanhas"
          value={stats.sent24h}
          icon={Send}
          color="blue"
          loading={isLoading}
          layout="compact-mobile"
        />
        <StatCard
          title="Taxa de Entrega"
          value={stats.deliveryRate}
          icon={CheckCircle2}
          color="emerald"
          loading={isLoading}
          layout="compact-mobile"
        />
        <StatCard
          title="Campanhas Ativas"
          value={stats.activeCampaigns}
          icon={TrendingUp}
          color="purple"
          loading={isLoading}
          layout="compact-mobile"
        />
        <StatCard
          title="Falhas no Envio"
          value={stats.failedMessages}
          icon={AlertCircle}
          color="red"
          loading={isLoading}
          layout="compact-mobile"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
        {/* Chart Section */}
        <Container variant="glass" padding="md" className="min-w-0 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
            <h3 className="text-sm lg:text-heading-4 font-semibold text-[var(--ds-text-primary)]" id="chart-title">Volume de campanhas</h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período do gráfico">
              {[
                { key: '7D', label: 'Últimos 7 dias' },
                { key: '15D', label: 'Últimos 15 dias' },
                { key: '30D', label: 'Últimos 30 dias' }
              ].map((t) => (
                <button 
                  key={t.key} 
                  aria-label={t.label}
                  aria-pressed={t.key === range}
                  onClick={() => setRange(t.key as '7D' | '15D' | '30D')}
                  className={`min-h-11 sm:min-h-8 cursor-pointer text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${t.key === range ? 'bg-accent text-accent-foreground' : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text-secondary)]'}`}
                >
                  {t.key}
                </button>
              ))}
            </div>
          </div>
          <figure 
            role="figure" 
            aria-labelledby="chart-title"
            aria-describedby="chart-description"
          >
            <div ref={containerRef} className="h-48 w-full min-w-0 lg:h-64">
              {isMounted && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={chartData.slice(-rangeSize)} aria-hidden="true">
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.22}/>
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#71717a', fontSize: 12}} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#71717a', fontSize: 12}} 
                />
                <Tooltip
                  contentStyle={{backgroundColor: '#101113', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff'}}
                  itemStyle={{color: 'var(--chart-1)'}}
                  labelStyle={{color: '#a1a1aa'}}
                  formatter={(value) => [value, 'Enviadas']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSent)" 
                />
              </AreaChart>
            </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-xl bg-[var(--ds-bg-hover)]" aria-hidden="true" />
              )}
          </div>
          <p id="chart-description" className="sr-only">
            Gráfico de área mostrando o volume de mensagens enviadas ao longo do tempo. 
            Os dados são atualizados automaticamente.
          </p>
        </figure>
        </Container>

        {/* Recent Activity */}
        <Container variant="glass" padding="none" className="flex flex-col overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-[var(--ds-border-default)] flex justify-between items-center">
            <h3 className="text-sm lg:text-heading-4 font-semibold text-[var(--ds-text-primary)]">Campanhas Recentes</h3>
            <button 
              aria-label="Mais opções"
              className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] transition-colors"
            >
              <MoreHorizontal size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-[var(--ds-bg-elevated)]">
            {recentCampaigns.length === 0 ? (
              <div className="p-8 text-center text-[var(--ds-text-muted)]">
                Nenhuma campanha registrada no app.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Campanha</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                  {recentCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-[var(--ds-bg-hover)] transition-all duration-200 group cursor-pointer hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                      <td className="px-4 py-3 lg:px-6 lg:py-5">
                        <p className="font-medium text-sm text-[var(--ds-text-primary)] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200 truncate max-w-[160px] lg:max-w-none">{campaign.name}</p>
                        <p className="text-[var(--ds-text-muted)] text-xs mt-1 font-mono">{formatDateFull(campaign.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 lg:px-6 lg:py-5 text-right">
                        <StatusBadge status={getCampaignBadgeStatus(campaign.status)} size="sm">
                          {getCampaignLabel(campaign.status)}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-4 border-t border-[var(--ds-border-default)] text-center">
            <PrefetchLink href="/campaigns" className="text-label-sm hover:text-[var(--ds-text-primary)] transition-colors flex items-center justify-center gap-2">
              Ver Todas <ArrowUpRight size={14} />
            </PrefetchLink>
          </div>
        </Container>
      </div>
    </Page>
  );
};
