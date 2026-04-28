import React from 'react';
import { 
    TrendingUp, TrendingDown, Wallet, AlertCircle, MoreVertical, 
    ArrowUpRight, ArrowDownRight, School, Shirt, BookOpen, 
    Users, Settings, UserPlus
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

interface AccountStreamsProps {
    onViewStatement: (streamId: string) => void;
    onRecordPayment: () => void;
    onOpenTransfer: () => void;
}

export const AccountStreams: React.FC<AccountStreamsProps> = ({ onViewStatement, onRecordPayment, onOpenTransfer }) => {
    const streams = [
        {
            id: 'school-fees',
            title: 'School Fees',
            type: 'revenue',
            amount: 84200,
            target: 125000,
            collected: 'collected',
            icon: School,
            color: 'text-primary',
            bg: 'bg-primary/10',
            barColor: 'bg-primary'
        },
        {
            id: 'uniforms',
            title: 'Uniform Sales',
            type: 'revenue',
            amount: 12450,
            target: 25000,
            collected: 'collected',
            icon: Shirt,
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/20',
            barColor: 'bg-purple-600'
        },
        {
            id: 'books',
            title: 'Books & Resources',
            type: 'revenue',
            amount: 8300,
            target: 15000,
            collected: 'collected',
            icon: BookOpen,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100 dark:bg-indigo-900/20',
            barColor: 'bg-indigo-600'
        },
        {
            id: 'salary',
            title: 'Staff Salary',
            type: 'expense',
            amount: 32000,
            target: 45000, // Budget
            collected: 'paid this term',
            icon: Users,
            color: 'text-rose-600',
            bg: 'bg-rose-100 dark:bg-rose-900/20',
            barColor: 'bg-rose-600',
            status: 'Payroll Pending Approval'
        },
        {
            id: 'operations',
            title: 'Services & Operations',
            type: 'expense',
            amount: 13000,
            target: 20000,
            collected: 'utilized',
            icon: Settings,
            color: 'text-orange-600',
            bg: 'bg-orange-100 dark:bg-orange-900/20',
            barColor: 'bg-orange-600'
        },
        {
            id: 'enrollment',
            title: 'Enrollment Fee',
            type: 'revenue',
            amount: 5600,
            target: 10000,
            collected: 'collected',
            icon: UserPlus,
            color: 'text-teal-600',
            bg: 'bg-teal-100 dark:bg-teal-900/20',
            barColor: 'bg-teal-600'
        }
    ];

    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Account Streams</h1>
                    <p className="text-muted-foreground mt-2">Manage financial streams and transaction records for the current term.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm">
                        <select className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer py-2 pl-3 pr-2 text-foreground outline-none">
                            <option>2023/2024 Session</option>
                            <option>2022/2023 Session</option>
                        </select>
                        <div className="w-[1px] h-5 bg-border mx-1"></div>
                        <select className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer py-2 pl-2 pr-3 text-foreground outline-none">
                            <option>First Term</option>
                            <option>Second Term</option>
                            <option>Third Term</option>
                        </select>
                    </div>
                    <Button variant="default" className="gap-2 shadow-sm" onClick={onOpenTransfer}>
                        <ArrowUpRight className="h-4 w-4" />
                        Internal Transfer
                    </Button>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <Badge variant="success">+12% vs last term</Badge>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground">Total Inflow</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1">$125,000</h3>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400">
                            <TrendingDown className="h-5 w-5" />
                        </div>
                        <Badge variant="success" className="bg-green-100 text-green-700">-5% vs last term</Badge>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground">Total Outflow</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1">$45,000</h3>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <Badge variant="success">+8% vs last term</Badge>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground">Net Position</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1">$80,000</h3>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <Badge variant="warning">+2% vs last term</Badge>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground">Outstanding Fees</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1">$12,500</h3>
                    </div>
                </Card>
            </div>

            {/* Active Streams */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Active Account Streams</h2>
                    <button className="text-sm font-medium text-primary hover:underline">View All Streams</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {streams.map((stream) => (
                        <Card key={stream.id} className="p-5 flex flex-col hover:shadow-md transition-shadow group cursor-pointer" onClick={() => onViewStatement(stream.id)}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${stream.bg} ${stream.color}`}>
                                    <stream.icon className="h-5 w-5" />
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    stream.type === 'revenue' 
                                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                }`}>
                                    {stream.type}
                                </span>
                            </div>
                            
                            <h3 className="text-base font-bold">{stream.title}</h3>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-2xl font-bold">${stream.amount.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground">{stream.collected}</span>
                            </div>

                            <div className="mt-4 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className={`${stream.barColor} h-1.5 rounded-full transition-all duration-500`} 
                                    style={{ width: `${(stream.amount / stream.target) * 100}%` }}
                                ></div>
                            </div>

                            {stream.status && (
                                <div className="mt-4 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 py-1 px-2 rounded w-fit">
                                    <AlertCircle className="h-3 w-3" />
                                    {stream.status}
                                </div>
                            )}

                            <div className="flex gap-2 mt-5 pt-4 border-t border-border">
                                <Button 
                                    variant={stream.type === 'revenue' ? 'default' : 'secondary'} 
                                    size="sm" 
                                    className="flex-1 text-xs font-bold"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if(stream.id === 'school-fees') onRecordPayment();
                                    }}
                                >
                                    {stream.type === 'revenue' ? 'New Transaction' : 'Manage Expense'}
                                </Button>
                                <Button variant="outline" size="sm" className="text-xs font-bold" onClick={(e) => {
                                    e.stopPropagation();
                                    onViewStatement(stream.id);
                                }}>
                                    Statement
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};