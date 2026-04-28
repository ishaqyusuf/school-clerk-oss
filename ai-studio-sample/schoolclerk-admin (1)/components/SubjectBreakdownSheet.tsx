import React from 'react';
import { X, Printer, Share2, TrendingUp, BarChart3, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from './ui';

interface SubjectBreakdownSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SubjectBreakdownSheet: React.FC<SubjectBreakdownSheetProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="h-full w-full max-w-[700px] flex flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-none px-6 py-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Assessment Breakdown</h2>
                            <p className="text-sm text-muted-foreground">Mathematics (MTH101) • Second Term</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                            <Printer className="h-5 w-5" />
                        </button>
                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                            <Share2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                                A
                            </div>
                            <div>
                                <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-0.5">Overall Grade</p>
                                <h3 className="text-2xl font-bold">90 <span className="text-lg font-medium text-muted-foreground">/ 100</span></h3>
                            </div>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-muted-foreground text-xs font-medium mb-1">Class Average: 72%</p>
                            <p className="text-green-600 text-sm font-bold flex items-center gap-1 justify-end">
                                <TrendingUp className="h-4 w-4" /> Above average
                            </p>
                        </div>
                    </div>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="text-primary h-5 w-5" />
                                <h3 className="text-base font-bold">Continuous Assessment (40%)</h3>
                            </div>
                            <span className="text-sm font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-full">35 / 40</span>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden bg-card">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="py-3 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assessment Name</th>
                                        <th className="py-3 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                                        <th className="py-3 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Score</th>
                                        <th className="py-3 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Weighted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <tr className="hover:bg-muted/30">
                                        <td className="py-3 px-4">
                                            <p className="text-sm font-medium">First Test</p>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">Jan 15, 2024</td>
                                        <td className="py-3 px-4 text-sm text-right font-medium">18 <span className="text-xs text-muted-foreground">/ 20</span></td>
                                        <td className="py-3 px-4 text-sm text-right font-bold">9.0</td>
                                    </tr>
                                    <tr className="hover:bg-muted/30">
                                        <td className="py-3 px-4">
                                            <p className="text-sm font-medium">Mid-Term Project</p>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">Feb 02, 2024</td>
                                        <td className="py-3 px-4 text-sm text-right font-medium">25 <span className="text-xs text-muted-foreground">/ 30</span></td>
                                        <td className="py-3 px-4 text-sm text-right font-bold">8.3</td>
                                    </tr>
                                    <tr className="hover:bg-muted/30">
                                        <td className="py-3 px-4">
                                            <p className="text-sm font-medium">Second Test</p>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">Feb 20, 2024</td>
                                        <td className="py-3 px-4 text-sm text-right font-medium">19 <span className="text-xs text-muted-foreground">/ 20</span></td>
                                        <td className="py-3 px-4 text-sm text-right font-bold">9.5</td>
                                    </tr>
                                    <tr className="hover:bg-muted/30">
                                        <td className="py-3 px-4">
                                            <p className="text-sm font-medium">Assignment & Quizzes</p>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground">Ongoing</td>
                                        <td className="py-3 px-4 text-sm text-right font-medium">27 <span className="text-xs text-muted-foreground">/ 30</span></td>
                                        <td className="py-3 px-4 text-sm text-right font-bold">8.2</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/30">
                                        <td className="py-3 px-4 text-xs font-bold text-right uppercase" colSpan={3}>CA Total Contribution</td>
                                        <td className="py-3 px-4 text-sm font-black text-primary text-right">35.0</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="text-orange-500 h-5 w-5" />
                                <h3 className="text-base font-bold">Final Examination (60%)</h3>
                            </div>
                            <span className="text-sm font-bold text-orange-600 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">55 / 60</span>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
                                        <span className="text-2xl font-light">?</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Second Term Exam</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Taken on March 22, 2024</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Verified</span>
                                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Internal</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-xl border border-border min-w-[140px] text-center">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Final Exam Score</p>
                                    <div className="text-xl font-bold">92 <span className="text-sm font-medium text-muted-foreground">/ 100</span></div>
                                    <div className="mt-1 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: '92%' }}></div>
                                    </div>
                                    <p className="text-[10px] text-orange-600 font-bold mt-2">Contribution: 55.2 / 60</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-border pb-2">
                            <MessageSquare className="text-primary/70 h-5 w-5" />
                            <h3 className="text-base font-bold">Remarks</h3>
                        </div>
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-primary rounded-r-lg">
                            <p className="text-sm italic leading-relaxed">
                                "John has shown exceptional understanding of Euclidean Geometry and Algebra this term. His consistent performance in CA reflects his dedication. Keep up the momentum for the final term."
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">AJ</div>
                                <span className="text-xs font-bold">Mr. Johnson</span>
                                <span className="text-xs text-muted-foreground">Subject Teacher</span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t border-border bg-card flex items-center justify-between">
                    <button className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                        View Previous Terms
                    </button>
                    <Button className="font-bold shadow-lg shadow-blue-500/20">
                        Download Detailed Breakdown
                    </Button>
                </div>
            </div>
        </div>
    );
};