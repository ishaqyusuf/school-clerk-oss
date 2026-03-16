import React from 'react';
import { BarChart3, TrendingUp, Trophy, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card } from './ui';

export const AssessmentAnalysisTab = () => {
    // Mock Data
    const distribution = [
        { label: '0-59', count: 2, height: '15%', color: 'bg-blue-100 dark:bg-blue-900/20' },
        { label: '60-69', count: 4, height: '30%', color: 'bg-blue-200 dark:bg-blue-900/30' },
        { label: '70-79', count: 9, height: '65%', color: 'bg-blue-400 dark:bg-blue-800/50' },
        { label: '80-89', count: 12, height: '85%', color: 'bg-primary' },
        { label: '90-100', count: 6, height: '45%', color: 'bg-blue-500 dark:bg-blue-600' },
    ];

    const topPerformers = [
        { rank: 1, name: 'Charlie Davis', id: '2024003', score: 96, grade: 'A+', initials: 'CD', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' },
        { rank: 2, name: 'Alice Walker', id: '2024001', score: 86, grade: 'A', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk9PdDvL-RTwBjYzWAUhmvg5pt2ep5yC66g-69sqjcB0IHTi3Asw3KGg40Jtpkj9HSf-KfZogZQFhhEUwH3Y1BEHfJX9seKFJ5Yka5-s9bjck-SBG-CE5eCBMeZit2TvHt_22juK9jf3uByNscTnuCOQ7fB3gDcsL7J8zUv58oyVH_ssR0J9-qSooOA3WvaA755kZd6l7W-KrOnV0SxZBvH3ZXziRhYfxuSs_jvk3oxA4-pXMuhf8W2o3h0gnMLMi3Lllor8SOKs8' },
        { rank: 3, name: 'Ethan Foster', id: '2024005', score: 77, grade: 'B+', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAv-Qjr4I7qJfw2EVqunp2Nq5RwT-Kmzbz5N3SbIzoQ9CarXg-vxTdqJ2VvJfaGdVOBveb9pCZGyHq9NHtEZ6DuZrIVY1Q2OKXOkKvZ8lZOw8COytuVbaaU34W2PnzfjBlSAAxS3Uh5ZUEtSwbxbgdYJ_HLzjHtPG4Q7mt-wsqYO5i-ZfYmxdmu0z7sNZ7kXqX0Iq5osqUBZcFtrGStoIdp6iBT4MDRzxSMNKFLcMOK94bB18GO10-a0UOpa619IKuyyhXjjSx8Pg' },
        { rank: 4, name: 'Sarah Miller', id: '2024012', score: 75, grade: 'B', initials: 'SM', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
        { rank: 5, name: 'Ben Thompson', id: '2024002', score: 71, grade: 'B', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAv-Qjr4I7qJfw2EVqunp2Nq5RwT-Kmzbz5N3SbIzoQ9CarXg-vxTdqJ2VvJfaGdVOBveb9pCZGyHq9NHtEZ6DuZrIVY1Q2OKXOkKvZ8lZOw8COytuVbaaU34W2PnzfjBlSAAxS3Uh5ZUEtSwbxbgdYJ_HLzjHtPG4Q7mt-wsqYO5i-ZfYmxdmu0z7sNZ7kXqX0Iq5osqUBZcFtrGStoIdp6iBT4MDRzxSMNKFLcMOK94bB18GO10-a0UOpa619IKuyyhXjjSx8Pg' },
    ];

    const bottomPerformers = [
        { rank: 28, name: 'Fiona Green', id: '2024006', score: 65, grade: 'C', initials: 'FG', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
        { rank: 29, name: 'John Long', id: '2024021', score: 58, grade: 'C-', initials: 'JL', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
        { rank: 30, name: 'Kate Bell', id: '2024018', score: 52, grade: 'D', initials: 'KB', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400' },
        { rank: 31, name: 'Dana Evans', id: '2024004', score: 48, grade: 'D', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAv-Qjr4I7qJfw2EVqunp2Nq5RwT-Kmzbz5N3SbIzoQ9CarXg-vxTdqJ2VvJfaGdVOBveb9pCZGyHq9NHtEZ6DuZrIVY1Q2OKXOkKvZ8lZOw8COytuVbaaU34W2PnzfjBlSAAxS3Uh5ZUEtSwbxbgdYJ_HLzjHtPG4Q7mt-wsqYO5i-ZfYmxdmu0z7sNZ7kXqX0Iq5osqUBZcFtrGStoIdp6iBT4MDRzxSMNKFLcMOK94bB18GO10-a0UOpa619IKuyyhXjjSx8Pg' },
        { rank: 32, name: 'Tom Parker', id: '2024032', score: 35, grade: 'F', initials: 'TP', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
    ];

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-300 overflow-y-auto p-6 scroll-smooth bg-muted/10">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 p-6 flex flex-col justify-between border-border shadow-sm">
                        <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                            <BarChart3 className="text-primary h-5 w-5" />
                            Score Distribution
                        </h3>
                        <div className="flex items-end gap-2 h-48 w-full group">
                            {distribution.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                    <div 
                                        className={`w-full rounded-t-sm relative hover:opacity-80 transition-opacity ${item.color} shadow-sm`} 
                                        style={{ height: item.height }}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                            {item.count}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="bg-primary text-primary-foreground p-6 shadow-lg shadow-primary/20 flex flex-col justify-between border-none">
                        <div>
                            <h3 className="text-sm font-medium opacity-90 mb-4">Statistical Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-primary-foreground/10 pb-2">
                                    <span className="text-xs opacity-80 uppercase tracking-wider">Median Score</span>
                                    <span className="text-2xl font-bold">76.5</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-primary-foreground/10 pb-2">
                                    <span className="text-xs opacity-80 uppercase tracking-wider">Std Deviation</span>
                                    <span className="text-2xl font-bold">8.42</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-primary-foreground/10 pb-2">
                                    <span className="text-xs opacity-80 uppercase tracking-wider">Reliability</span>
                                    <span className="text-lg font-semibold text-emerald-300">High (0.88)</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] leading-relaxed opacity-70 mt-4 italic">
                            Stats calculated based on 32 active student records for this assessment.
                        </p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="overflow-hidden border-border shadow-sm">
                        <div className="px-4 py-3 border-b border-border bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                                <Trophy className="h-4 w-4" />
                                Top 5 Performers
                            </h3>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full uppercase">Excelling</span>
                        </div>
                        <div className="divide-y divide-border">
                            {topPerformers.map((student) => (
                                <div key={student.rank} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-bold text-muted-foreground w-4">{student.rank}</div>
                                        {student.img ? (
                                            <img alt={student.name} className="h-8 w-8 rounded-full object-cover border border-border" src={student.img} />
                                        ) : (
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${student.color}`}>
                                                {student.initials}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-foreground leading-none">{student.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">ID: {student.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-foreground">{student.score}</span>
                                        <span className="text-[10px] text-emerald-600 font-bold ml-1">{student.grade}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="overflow-hidden border-border shadow-sm">
                        <div className="px-4 py-3 border-b border-border bg-red-50/50 dark:bg-red-900/10 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Bottom 5 Performers
                            </h3>
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full uppercase">Needs Support</span>
                        </div>
                        <div className="divide-y divide-border">
                            {bottomPerformers.map((student) => (
                                <div key={student.rank} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-bold text-muted-foreground w-4">{student.rank}</div>
                                        {student.img ? (
                                            <img alt={student.name} className="h-8 w-8 rounded-full object-cover border border-border" src={student.img} />
                                        ) : (
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${student.color}`}>
                                                {student.initials}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-foreground leading-none">{student.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">ID: {student.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-foreground">{student.score}</span>
                                        <span className={`text-[10px] font-bold ml-1 ${student.grade === 'F' ? 'text-red-600' : 'text-orange-600'}`}>{student.grade}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
                        <Lightbulb className="text-blue-600 dark:text-blue-400 h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Automated Insight</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                            Most students struggled with the "Geometry Project" (CA 2), where the median score was 15% lower than the midterm average. Consider a review session focused on spatial reasoning before the final exam.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};