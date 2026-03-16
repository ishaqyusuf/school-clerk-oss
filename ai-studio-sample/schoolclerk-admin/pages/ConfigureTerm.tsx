
import React from 'react';
import { 
    ArrowLeft, Calendar, Lock, Info, Save, ArrowRight, 
    Database, CheckCircle, AlertCircle, HelpCircle
} from 'lucide-react';
import { Button, Card, Input, Badge } from '../components/ui';

interface ConfigureTermProps {
    onBack: () => void;
    onNext: () => void;
}

export const ConfigureTerm: React.FC<ConfigureTermProps> = ({ onBack, onNext }) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-5xl mx-auto space-y-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button onClick={onBack} className="hover:text-primary transition-colors">Academic Management</button>
                <span>/</span>
                <span className="font-semibold text-foreground">Configure Next Term</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">Configure 3rd Term</h1>
                <p className="text-muted-foreground mt-2">Prepare the upcoming academic period for the 2023/2024 session.</p>
            </div>

            {/* Info Alert Box */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-6 flex flex-col md:flex-row gap-6">
                <div className="flex gap-4 flex-1">
                    <div className="h-10 w-10 shrink-0 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <Info className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">Current Term in Progress: 2nd Term</h3>
                        <p className="text-sm text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
                            The current term must be completed and closed before the 3rd Term can be officially activated. 
                            You can still configure the next term settings as a draft.
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-4 border border-blue-100 dark:border-blue-800 min-w-[160px]">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Term Countdown</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-900 dark:text-white">12</span>
                            <span className="text-sm text-blue-800 dark:text-blue-300">days remaining</span>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-4 border border-blue-100 dark:border-blue-800 min-w-[180px]">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Pending Tasks</p>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                <span className="h-6 w-6 rounded-full bg-green-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white">
                                    <CheckCircle className="h-3 w-3" />
                                </span>
                                <span className="h-6 w-6 rounded-full bg-yellow-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
                                    !
                                </span>
                                <span className="h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                                    3
                                </span>
                            </div>
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Grades pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Configuration Card */}
            <Card className="overflow-hidden border-border">
                <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
                    <h2 className="font-bold text-lg">Term Configuration</h2>
                    <Badge variant="neutral" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        Draft Mode
                    </Badge>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Term Start Date</label>
                            <div className="relative group">
                                <Input 
                                    type="date" 
                                    defaultValue="2024-05-06" 
                                    className="h-11 pl-4 pr-10 cursor-not-allowed opacity-75 bg-muted/50" 
                                    disabled
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">Students will be able to log in from this date.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Term End Date</label>
                            <div className="relative group">
                                <Input 
                                    type="date" 
                                    defaultValue="2024-07-26" 
                                    className="h-11 pl-4 pr-10 cursor-not-allowed opacity-75 bg-muted/50" 
                                    disabled
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">End of academic activities for this term.</p>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-semibold text-foreground">Term Objective/Notes</label>
                            <textarea 
                                className="w-full min-h-[100px] rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-75 resize-none"
                                placeholder="e.g. Focus on external examinations and final projects..."
                                disabled
                            ></textarea>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-4 flex items-center gap-3">
                        <Lock className="text-amber-600 dark:text-amber-500 h-5 w-5" />
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
                            Fields are locked while the current term is active. Configuration will unlock once 2nd Term is closed.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-border">
                        <button 
                            onClick={onBack}
                            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </button>
                        <div className="flex gap-3">
                            <Button variant="outline" className="bg-background">
                                Save as Draft
                            </Button>
                            <Button 
                                onClick={onNext}
                                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                            >
                                Next: Data Migration
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Footer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-foreground">
                        <Database className="text-primary h-5 w-5" />
                        Data Migration Preview
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        When you proceed to the next step, the system will automatically prepare to roll over the following data:
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <CheckCircle className="text-green-500 h-4 w-4" />
                            Student Enrollment Records
                        </li>
                        <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <CheckCircle className="text-green-500 h-4 w-4" />
                            Staff Course Allocations
                        </li>
                        <li className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <CheckCircle className="text-green-500 h-4 w-4" />
                            Timetable Templates
                        </li>
                    </ul>
                </Card>

                <Card className="p-6 flex flex-col justify-center items-center text-center">
                    <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center mb-3 text-foreground">
                        <HelpCircle className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold mb-1 text-foreground">Need assistance?</h4>
                    <p className="text-xs text-muted-foreground mb-4">Our support team can help you with the term transition process.</p>
                    <Button variant="secondary" className="w-full">
                        Contact Support
                    </Button>
                </Card>
            </div>
            
            {/* Spacer */}
            <div className="h-8"></div>
        </div>
    );
};
