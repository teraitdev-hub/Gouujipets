import React, { useState, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Building2,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  Zap,
  CheckCircle2,
  ArrowRight,
  Filter,
  Download,
  Copy,
  Check,
  Brain,
  ChevronRight,
  Lightbulb,
  X,
  Layers,
  Activity,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type ChartType = 'line' | 'bar' | 'pie';

export interface DataPoint {
  name: string;
  value: number;
  secondaryValue?: number;
  tertiaryValue?: number;
  category?: string;
  [key: string]: string | number | undefined;
}

export interface QueryReport {
  id: string;
  query: string;
  category: string;
  summary: string;
  insights: string[];
  recommendedAction: string;
  chartType: ChartType;
  data: DataPoint[];
  dataKeys: { key: string; name: string; color: string }[];
  timestamp: string;
  confidenceScore: number;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  period: string;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
  sparklineData: number[];
}

// ==========================================
// DUMMY DATASETS & PRESETS
// ==========================================

const METRIC_CARDS: MetricCardData[] = [
  {
    id: 'revenue',
    title: 'Total Revenue',
    value: '$184,920',
    change: '+14.8%',
    isPositive: true,
    period: 'vs. last month',
    icon: DollarSign,
    gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    accentColor: '#10b981',
    sparklineData: [45, 52, 58, 65, 62, 78, 85, 92],
  },
  {
    id: 'partners',
    title: 'Active Partners',
    value: '342',
    change: '+8.5%',
    isPositive: true,
    period: 'vs. last month',
    icon: Building2,
    gradient: 'from-purple-500/20 via-purple-500/10 to-transparent',
    accentColor: '#a855f7',
    sparklineData: [210, 230, 255, 270, 290, 310, 325, 342],
  },
  {
    id: 'bookings',
    title: 'Total Bookings',
    value: '4,890',
    change: '+18.4%',
    isPositive: true,
    period: 'vs. last month',
    icon: Calendar,
    gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
    accentColor: '#3b82f6',
    sparklineData: [2800, 3100, 3400, 3800, 4100, 4400, 4650, 4890],
  },
  {
    id: 'users',
    title: 'User Growth',
    value: '12,450',
    change: '+22.1%',
    isPositive: true,
    period: 'vs. last month',
    icon: Users,
    gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
    accentColor: '#f59e0b',
    sparklineData: [6200, 7100, 8000, 8900, 9900, 10800, 11600, 12450],
  },
];

const SUGGESTED_QUERIES = [
  'Show me revenue for this month',
  'What is the occupancy rate?',
  'Display active partners growth over the last 6 months',
  'Show booking distribution by service type',
  'What is our customer retention rate for Q2?',
  'Compare monthly bookings: Grooming vs Boarding vs Training',
];

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

// Preset report generator based on keywords
const getPresetReport = (userQuery: string): QueryReport => {
  const queryLower = userQuery.toLowerCase();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (queryLower.includes('revenue') || queryLower.includes('income') || queryLower.includes('financial') || queryLower.includes('money')) {
    return {
      id: 'report-revenue',
      query: userQuery,
      category: 'Financial Analytics',
      summary:
        'Total revenue for July 2026 reached **$184,920**, representing a **14.8% Month-over-Month increase**. Boarding operations accounted for 42% ($77,666) of gross earnings, with Grooming contributing 28% ($51,777) and Veterinary Care at 18% ($33,285).',
      insights: [
        'Weekend boarding revenue surged by +24% due to peak summer holiday bookings.',
        'Average revenue per partner facility climbed to $540/month (+8.2%).',
        'Recurring spa package subscriptions accounted for $22,400 in predictable ARR.',
      ],
      recommendedAction:
        'Expand premium weekend suite availability by 15% and launch targeted bundle discounts for weekday grooming slots.',
      chartType: 'line',
      data: [
        { name: 'Jan', value: 112000, secondaryValue: 45000, tertiaryValue: 32000 },
        { name: 'Feb', value: 124000, secondaryValue: 48000, tertiaryValue: 35000 },
        { name: 'Mar', value: 138000, secondaryValue: 53000, tertiaryValue: 39000 },
        { name: 'Apr', value: 149000, secondaryValue: 58000, tertiaryValue: 42000 },
        { name: 'May', value: 161000, secondaryValue: 64000, tertiaryValue: 46000 },
        { name: 'Jun', value: 172000, secondaryValue: 71000, tertiaryValue: 49000 },
        { name: 'Jul', value: 184920, secondaryValue: 77666, tertiaryValue: 51777 },
      ],
      dataKeys: [
        { key: 'value', name: 'Total Revenue ($)', color: '#8b5cf6' },
        { key: 'secondaryValue', name: 'Boarding ($)', color: '#3b82f6' },
        { key: 'tertiaryValue', name: 'Grooming ($)', color: '#10b981' },
      ],
      timestamp,
      confidenceScore: 98.4,
    };
  }

  if (queryLower.includes('occupancy') || queryLower.includes('capacity') || queryLower.includes('rate') || queryLower.includes('hotel')) {
    return {
      id: 'report-occupancy',
      query: userQuery,
      category: 'Facility Utilization',
      summary:
        'Average facility occupancy across all 342 partner locations is **86.4%**, up **6.2 percentage points** from last month. Urban luxury suites reached maximum capacity (98.2%) during Friday–Sunday peak windows.',
      insights: [
        'Urban centers maintain an average 92.1% occupancy rate vs 80.7% in suburban centers.',
        'Extended stay boarding (5+ nights) increased by 19% following new holiday promo campaigns.',
        'Mid-week (Tue-Thu) vacancy remains at 28%, representing a prime revenue optimization window.',
      ],
      recommendedAction:
        'Implement dynamic seasonal pricing algorithms for urban locations and introduce mid-week daycare perks to boost off-peak usage.',
      chartType: 'bar',
      data: [
        { name: 'Wk 1', value: 78, secondaryValue: 88, tertiaryValue: 68 },
        { name: 'Wk 2', value: 81, secondaryValue: 90, tertiaryValue: 72 },
        { name: 'Wk 3', value: 84, secondaryValue: 92, tertiaryValue: 76 },
        { name: 'Wk 4', value: 82, secondaryValue: 89, tertiaryValue: 75 },
        { name: 'Wk 5', value: 87, secondaryValue: 95, tertiaryValue: 79 },
        { name: 'Wk 6', value: 89, secondaryValue: 97, tertiaryValue: 81 },
        { name: 'Wk 7', value: 86, secondaryValue: 98, tertiaryValue: 80 },
      ],
      dataKeys: [
        { key: 'value', name: 'Overall Occupancy (%)', color: '#10b981' },
        { key: 'secondaryValue', name: 'Urban Facilities (%)', color: '#8b5cf6' },
        { key: 'tertiaryValue', name: 'Suburban Facilities (%)', color: '#f59e0b' },
      ],
      timestamp,
      confidenceScore: 96.8,
    };
  }

  if (queryLower.includes('partner') || queryLower.includes('vendor') || queryLower.includes('facility') || queryLower.includes('business')) {
    return {
      id: 'report-partners',
      query: userQuery,
      category: 'Partner Ecosystem',
      summary:
        'Active partner accounts reached **342 businesses** in July (+8.5% growth). Onboarding pipeline velocity improved by 22%, with an average time-to-first-booking reduced from 11 days to 4.2 days.',
      insights: [
        'Pet Grooming salons lead new onboarding (+32 locations in Q2).',
        'Partner retention rate stands at a high 94.2% over a 12-month trailing period.',
        'Top 15% super-partners generate 48% of total marketplace gross merchandise volume (GMV).',
      ],
      recommendedAction:
        'Launch the "Goujji Partner Tiering" loyalty program to incentivize mid-tier partners to list add-on services.',
      chartType: 'line',
      data: [
        { name: 'Feb', value: 230, secondaryValue: 180, tertiaryValue: 50 },
        { name: 'Mar', value: 255, secondaryValue: 200, tertiaryValue: 55 },
        { name: 'Apr', value: 270, secondaryValue: 215, tertiaryValue: 55 },
        { name: 'May', value: 290, secondaryValue: 230, tertiaryValue: 60 },
        { name: 'Jun', value: 315, secondaryValue: 250, tertiaryValue: 65 },
        { name: 'Jul', value: 342, secondaryValue: 272, tertiaryValue: 70 },
      ],
      dataKeys: [
        { key: 'value', name: 'Total Active Partners', color: '#a855f7' },
        { key: 'secondaryValue', name: 'Verified Facilities', color: '#3b82f6' },
        { key: 'tertiaryValue', name: 'Independent Specialists', color: '#ec4899' },
      ],
      timestamp,
      confidenceScore: 97.2,
    };
  }

  if (queryLower.includes('distribution') || queryLower.includes('service') || queryLower.includes('breakdown') || queryLower.includes('type')) {
    return {
      id: 'report-distribution',
      query: userQuery,
      category: 'Service Breakdown',
      summary:
        'Completed service bookings totaled **4,890 orders** in July. Pet Boarding holds the largest volume share at **38%** (1,858 bookings), followed closely by Grooming at **27%** (1,320 bookings).',
      insights: [
        'Integrated Boarding + Spa bundles grew 31% month-over-month.',
        'Pet Training saw a 22% spike following the launch of puppy behavior courses.',
        'Veterinary telehealth consultations represent the fastest growing emerging category (+45%).',
      ],
      recommendedAction:
        'Cross-sell grooming appointments to pet parents booking boarding stays longer than 3 nights.',
      chartType: 'pie',
      data: [
        { name: 'Boarding Suites', value: 1858 },
        { name: 'Grooming & Spa', value: 1320 },
        { name: 'Pet Training', value: 880 },
        { name: 'Vet & Health Care', value: 832 },
      ],
      dataKeys: [{ key: 'value', name: 'Bookings Volume', color: '#8b5cf6' }],
      timestamp,
      confidenceScore: 99.1,
    };
  }

  // Default Fallback Query Report
  return {
    id: `report-gen-${Date.now()}`,
    query: userQuery,
    category: 'Executive Insights',
    summary:
      `Analyzed AI data logs for **"${userQuery}"**. Across the platform, primary KPIs demonstrate stable trajectory with total revenue up **14.8%**, active partners at **342**, and customer satisfaction averaging **4.91 / 5.0**.`,
    insights: [
      'Platform user engagement is up +22.1% month-over-month.',
      'Automated AI scheduling response time averaged < 120ms with 99.4% resolution rate.',
      'Partner satisfaction score remains above 94% across all regions.',
    ],
    recommendedAction:
      'Continue monitoring core conversion funnels and leverage AI auto-replies for high-volume customer inquiries.',
    chartType: 'bar',
    data: [
      { name: 'Q1 W1', value: 3100, secondaryValue: 2400 },
      { name: 'Q1 W2', value: 3400, secondaryValue: 2600 },
      { name: 'Q2 W1', value: 3900, secondaryValue: 3100 },
      { name: 'Q2 W2', value: 4300, secondaryValue: 3500 },
      { name: 'Q3 W1', value: 4890, secondaryValue: 3950 },
    ],
    dataKeys: [
      { key: 'value', name: 'Total Activity', color: '#3b82f6' },
      { key: 'secondaryValue', name: 'Verified Completed', color: '#10b981' },
    ],
    timestamp,
    confidenceScore: 94.5,
  };
};

// Custom Tooltip component for recharts
const CustomRechartsTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-purple-500/30 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[160px] z-50">
        <p className="font-bold text-slate-200 border-b border-white/10 pb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-purple-400 font-mono">Goujji AI</span>
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-slate-400">{entry.name}:</span>
            </span>
            <span className="font-semibold font-mono text-white">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ==========================================
// MAIN COMPONENT: AdminAIPanel
// ==========================================

export const AdminAIPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReport, setActiveReport] = useState<QueryReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isPending, startTransition] = useTransition();

  // Load initial default report on mount
  React.useEffect(() => {
    const initialReport = getPresetReport('Show me revenue for this month');
    setActiveReport(initialReport);
    setSelectedChartType(initialReport.chartType);
  }, []);

  // Handle Query Submission
  const handleExecuteQuery = (queryToRun?: string) => {
    const finalQuery = (queryToRun || searchQuery).trim();
    if (!finalQuery) return;

    setIsLoading(true);
    setSearchQuery(finalQuery);

    // Simulate multi-step AI reasoning animation
    setLoadingStep('Parsing natural language intent...');
    
    setTimeout(() => {
      setLoadingStep('Querying cross-module pet business analytics...');
    }, 400);

    setTimeout(() => {
      setLoadingStep('Generating interactive visualizations & executive summary...');
    }, 800);

    setTimeout(() => {
      startTransition(() => {
        const report = getPresetReport(finalQuery);
        setActiveReport(report);
        setSelectedChartType(report.chartType);
        setIsLoading(false);
        setLoadingStep('');
      });
    }, 1300);
  };

  // Copy report summary to clipboard
  const handleCopySummary = () => {
    if (!activeReport) return;
    const textToCopy = `${activeReport.query}\n\nSummary:\n${activeReport.summary}\n\nRecommended Action:\n${activeReport.recommendedAction}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Refresh dashboard metrics
  const handleRefresh = () => {
    if (activeReport) {
      handleExecuteQuery(activeReport.query);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background Decorative Radial Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* ==========================================
            HEADER SECTION
           ========================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-purple-400 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Brain size={20} className="text-purple-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
                    Goujji AI Admin Panel
                  </h1>
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                    Phase 3 Intelligence
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Super Admin Natural Language Analytics & Executive Reporting Dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-white/10 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>AI Engine: <strong className="text-emerald-400 font-semibold">Active</strong></span>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={cn(isLoading && "animate-spin text-purple-400")} />
            </button>
          </div>
        </div>

        {/* ==========================================
            KEY METRICS CARDS TOP GRID
           ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {METRIC_CARDS.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl group hover:border-purple-500/40 transition-all"
              >
                {/* Gradient Accent Fill */}
                <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity", metric.gradient)} />

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                      {metric.title}
                    </span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md border border-white/10"
                      style={{ backgroundColor: `${metric.accentColor}18`, color: metric.accentColor }}
                    >
                      {React.createElement(metric.icon as any, { size: 18 })}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                      {metric.value}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border",
                        metric.isPositive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}
                    >
                      {metric.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>{metric.change}</span>
                    </div>
                  </div>

                  {/* Sparkline Visual */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {metric.period}
                    </span>
                    <div className="flex items-end gap-1 h-5">
                      {metric.sparklineData.map((val, i) => {
                        const heightPct = Math.max(20, Math.round((val / 100) * 100));
                        return (
                          <div
                            key={i}
                            className="w-1.5 rounded-t-sm transition-all"
                            style={{
                              height: `${heightPct}%`,
                              backgroundColor: metric.accentColor,
                              opacity: 0.3 + (i / metric.sparklineData.length) * 0.7,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ==========================================
            SEARCH BAR & SUGGESTED QUERY PILLS
           ========================================== */}
        <div className="bg-slate-900/70 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5">
          <div className="space-y-2">
            <label htmlFor="ai-search-input" className="block text-xs font-bold tracking-wider text-purple-300 uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-400" />
              Ask Goujji AI Anything About Platform Analytics
            </label>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteQuery();
              }}
              className="relative flex items-center group"
            >
              <div className="absolute left-4 text-purple-400 group-focus-within:text-purple-300 transition-colors">
                <Search size={20} />
              </div>

              <input
                id="ai-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. 'Show me revenue for this month', 'What is the occupancy rate?', 'Partner growth'..."
                className="w-full pl-12 pr-32 py-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 text-white placeholder-slate-500 text-sm md:text-base focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all font-medium shadow-inner"
              />

              <div className="absolute right-2 flex items-center gap-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Clear query"
                  >
                    <X size={16} />
                  </button>
                )}

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 flex items-center gap-2 border border-purple-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className="text-yellow-300" />
                  )}
                  <span>Query AI</span>
                </motion.button>
              </div>
            </form>
          </div>

          {/* Suggested Queries Pills */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Lightbulb size={13} className="text-amber-400" />
                Suggested Queries & Quick Analytics Prompts:
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((queryText, index) => {
                const isActive = searchQuery.toLowerCase() === queryText.toLowerCase();
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleExecuteQuery(queryText)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 shadow-sm",
                      isActive
                        ? "bg-purple-600/30 text-purple-200 border-purple-400/60 shadow-purple-500/20"
                        : "bg-slate-800/60 text-slate-300 hover:text-white border-white/10 hover:border-purple-500/40 hover:bg-slate-800"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>{queryText}</span>
                    <ChevronRight size={12} className="opacity-40" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==========================================
            AI REPORT CONTAINER & LOADING STATE
           ========================================== */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl py-16"
            >
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 blur-md opacity-60 animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-purple-400/40 flex items-center justify-center shadow-xl">
                  <Brain size={32} className="text-purple-400 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                  <span>Generating AI Report</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                  </span>
                </h3>
                <p className="text-xs text-purple-300/80 font-mono tracking-wide bg-purple-950/40 border border-purple-500/20 px-3 py-1.5 rounded-full inline-block">
                  {loadingStep || 'Processing data query...'}
                </p>
              </div>

              {/* Skeleton Placeholders */}
              <div className="max-w-xl mx-auto space-y-3 pt-4 opacity-50">
                <div className="h-4 bg-slate-800 rounded-full w-3/4 mx-auto animate-pulse" />
                <div className="h-4 bg-slate-800 rounded-full w-1/2 mx-auto animate-pulse" />
              </div>
            </motion.div>
          ) : activeReport ? (
            <motion.div
              key={activeReport.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* AI REPORT SUMMARY CARD */}
              <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg flex items-center gap-1">
                        <Flame size={12} className="text-amber-400" />
                        {activeReport.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Generated at {activeReport.timestamp} • Confidence: <strong className="text-emerald-400">{activeReport.confidenceScore}%</strong>
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white">
                      "{activeReport.query}"
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySummary}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      {copiedSummary ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedSummary ? 'Copied' : 'Copy Report'}</span>
                    </button>

                    {/* Chart Selector Pills */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setSelectedChartType('line')}
                        className={cn(
                          "p-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1",
                          selectedChartType === 'line'
                            ? "bg-purple-600 text-white shadow-md"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                        title="Line Chart View"
                      >
                        <LineChartIcon size={15} />
                      </button>
                      <button
                        onClick={() => setSelectedChartType('bar')}
                        className={cn(
                          "p-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1",
                          selectedChartType === 'bar'
                            ? "bg-purple-600 text-white shadow-md"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                        title="Bar Chart View"
                      >
                        <BarChart3 size={15} />
                      </button>
                      <button
                        onClick={() => setSelectedChartType('pie')}
                        className={cn(
                          "p-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1",
                          selectedChartType === 'pie'
                            ? "bg-purple-600 text-white shadow-md"
                            : "text-slate-400 hover:text-slate-200"
                        )}
                        title="Pie Chart View"
                      >
                        <PieChartIcon size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Executive Text Summary */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-slate-200 text-sm leading-relaxed font-normal">
                    <p className="flex items-start gap-2.5">
                      <Sparkles size={18} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>
                        {activeReport.summary.split('**').map((part, idx) =>
                          idx % 2 === 1 ? (
                            <strong key={idx} className="font-extrabold text-white bg-purple-500/20 px-1 py-0.5 rounded border border-purple-500/30">
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </span>
                    </p>
                  </div>

                  {/* Bulleted Insights & Recommended Action Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={14} className="text-purple-400" />
                        Key Analytical Insights
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {activeReport.insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2 bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/20">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={14} className="text-emerald-400" />
                        AI Strategic Recommendation
                      </h4>
                      <p className="text-xs text-emerald-200/90 leading-relaxed">
                        {activeReport.recommendedAction}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ==========================================
                    DYNAMIC RECHARTS VISUALIZATION
                   ========================================== */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 size={14} className="text-purple-400" />
                      Visual Representation ({selectedChartType.toUpperCase()} CHART)
                    </span>
                    <span className="text-[11px] text-slate-500">Auto-aggregated by Goujji AI</span>
                  </div>

                  <div className="w-full h-72 sm:h-80 md:h-96 pt-4 pr-2 pl-0 bg-slate-950/60 rounded-2xl border border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                      {selectedChartType === 'line' ? (
                        <LineChart data={activeReport.data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <Tooltip content={<CustomRechartsTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                          {activeReport.dataKeys.map((dk) => (
                            <Line
                              key={dk.key}
                              type="monotone"
                              dataKey={dk.key}
                              name={dk.name}
                              stroke={dk.color}
                              strokeWidth={3}
                              dot={{ r: 4, fill: dk.color, strokeWidth: 2, stroke: '#0f172a' }}
                              activeDot={{ r: 7, strokeWidth: 2 }}
                            />
                          ))}
                        </LineChart>
                      ) : selectedChartType === 'bar' ? (
                        <BarChart data={activeReport.data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                          <Tooltip content={<CustomRechartsTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                          {activeReport.dataKeys.map((dk) => (
                            <Bar
                              key={dk.key}
                              dataKey={dk.key}
                              name={dk.name}
                              fill={dk.color}
                              radius={[6, 6, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Tooltip content={<CustomRechartsTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Pie
                            data={activeReport.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent = 0 }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {activeReport.data.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer info badge */}
        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-slate-500 font-medium">
            Goujji AI Intelligence Suite • Phase 3 Super Admin Analytics • Real-time Data Synthesis
          </p>
        </div>

      </div>
    </div>
  );
};

export default AdminAIPanel;
