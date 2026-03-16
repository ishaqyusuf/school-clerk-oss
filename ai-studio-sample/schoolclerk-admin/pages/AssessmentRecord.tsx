import React, { useState } from 'react';
import { 
    X, FileSignature, PieChart, Settings, Search, Upload, Lock, 
    ArrowLeft, Filter, Columns 
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { NewAssessmentModal } from '../components/NewAssessmentModal';
import { AssessmentConfigPanel } from '../components/AssessmentConfigPanel';
import { AssessmentAnalysisTab } from '../components/AssessmentAnalysisTab';

interface AssessmentRecordProps {
    onBack: () => void;
}

export const AssessmentRecord: React.FC<AssessmentRecordProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('Score Entry');
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    return (
        <div className="animate-in fade-in duration-500 flex flex-col h-full bg-background">
            {/* Header */}
            <header className="flex-none bg-card border-b border-border px-6 py-4 z-30">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <button onClick={onBack} className="text-muted-foreground hover:text-primary transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-lg font-medium text-muted-foreground">Mathematics</span>
                                <span className="text-muted-foreground font-light text-xl">/</span>
                                <div className="relative group">
                                    <select className="appearance-none bg-transparent text-2xl font-bold text-foreground pr-9 border-none focus:ring-0 cursor-pointer py-0 pl-0 hover:text-primary transition-colors focus:outline-none">
                                        <option selected value="midterm">Mid-Term Assessment</option>
                                        <option value="ca1">CA 1: Algebra Quiz</option>
                                        <option value="ca2">CA 2: Geometry Project</option>
                                        <option value="final">Final Examination</option>
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-foreground group-hover:text-primary transition-colors">
                                        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>
                            <Badge variant="default" className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">Term 2, 2024</Badge>
                            <Badge variant="success" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">Published</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm flex items-center gap-2 pl-7">
                            Year 10 - Science A
                            <span className="mx-1 text-border">|</span>
                            Max Score: 100
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Students</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-foreground">32</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-border"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Class Avg</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-foreground">72.4</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-border"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pass Rate</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">88%</span>
                            </div>
                        </div>
                    </div>
                    {activeTab === 'Analysis' ? (
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2 bg-background">
                                <Upload className="h-[18px] w-[18px] rotate-180" />
                                Export Report
                            </Button>
                            <Button className="gap-2 bg-primary text-white hover:bg-blue-600">
                                <PieChart className="h-[18px] w-[18px]" />
                                Share Results
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2 bg-background">
                                <Upload className="h-[18px] w-[18px]" />
                                Import CSV
                            </Button>
                            <Button className="gap-2 bg-primary text-white hover:bg-blue-600">
                                <Lock className="h-[18px] w-[18px]" />
                                Save & Lock Scores
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <nav className="flex-none bg-card border-b border-border px-6 sticky top-0 z-20">
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    {['Score Entry', 'Analysis', 'Configuration'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`group flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-all ${
                                activeTab === tab 
                                    ? 'border-primary text-primary font-semibold' 
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            }`}
                        >
                            {tab === 'Score Entry' && <FileSignature className={`h-[18px] w-[18px] ${activeTab === tab ? 'fill-current' : ''}`} />}
                            {tab === 'Analysis' && <PieChart className="h-[18px] w-[18px]" />}
                            {tab === 'Configuration' && <Settings className="h-[18px] w-[18px]" />}
                            {tab}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'Score Entry' && (
                    <div className="absolute inset-0 overflow-y-auto p-6 scroll-smooth bg-muted/10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3 w-full max-w-2xl">
                                <div className="relative w-full max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                                    <input 
                                        className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
                                        placeholder="Search student..." 
                                        type="text"
                                    />
                                </div>
                                <div className="h-8 w-px bg-border hidden sm:block"></div>
                                <Button variant="outline" size="sm" className="gap-2 bg-background">
                                    <Filter className="h-[18px] w-[18px] text-muted-foreground" />
                                    Filters
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2 bg-background">
                                    <Columns className="h-[18px] w-[18px] text-muted-foreground" />
                                    Columns
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-orange-50 dark:bg-orange-900/10 px-3 py-1.5 rounded-full border border-orange-100 dark:border-orange-800/30">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                <span className="font-medium text-orange-700 dark:text-orange-400">Unsaved changes</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-foreground border-r border-border w-12 text-center">#</th>
                                            <th className="px-4 py-3 font-semibold text-foreground border-r border-border min-w-[200px]">Student Name</th>
                                            <th className="px-4 py-3 font-semibold text-foreground border-r border-border w-28 text-center bg-blue-50/50 dark:bg-blue-900/10">
                                                Test 1<br/><span className="text-[10px] font-normal text-muted-foreground">(20)</span>
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-foreground border-r border-border w-28 text-center bg-blue-50/50 dark:bg-blue-900/10">
                                                Test 2<br/><span className="text-[10px] font-normal text-muted-foreground">(20)</span>
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-foreground border-r border-border w-28 text-center bg-purple-50/50 dark:bg-purple-900/10">
                                                Exam<br/><span className="text-[10px] font-normal text-muted-foreground">(60)</span>
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-foreground border-r border-border w-24 text-center">
                                                Total<br/><span className="text-[10px] font-normal text-muted-foreground">(100)</span>
                                            </th>
                                            <th className="px-4 py-3 font-semibold text-foreground border-r border-border w-24 text-center">%</th>
                                            <th className="px-4 py-3 font-semibold text-foreground w-20 text-center">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[
                                            { name: 'Alice Walker', id: '2024001', scores: [18, 16, 52], grade: 'A', gColor: 'emerald' },
                                            { name: 'Ben Thompson', id: '2024002', scores: [14, 12, 45], grade: 'B', gColor: 'blue', error: true },
                                            { name: 'Charlie Davis', id: '2024003', scores: [19, 19, 58], grade: 'A+', gColor: 'emerald' },
                                            { name: 'Dana Evans', id: '2024004', scores: [8, 10, 30], grade: 'D', gColor: 'red', edit: true },
                                        ].map((student, i) => (
                                            <tr key={i} className="group hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 text-center text-muted-foreground border-r border-border">{i + 1}</td>
                                                <td className="px-4 py-3 border-r border-border">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                                                        <div>
                                                            <p className="font-medium text-foreground">{student.name}</p>
                                                            <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {student.scores.map((score, idx) => (
                                                    <td key={idx} className={`p-0 border-r border-border hover:bg-background transition-colors relative ${student.error && idx === 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                                        <input 
                                                            className={`w-full h-full py-3 px-2 text-center bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-primary text-foreground font-medium placeholder-muted-foreground focus:bg-background ${student.error && idx === 0 ? 'text-red-600 font-bold ring-2 ring-inset ring-red-500 focus:ring-red-600' : ''}`}
                                                            type="number" 
                                                            defaultValue={student.error && idx === 0 ? 22 : score} 
                                                            max={idx === 2 ? 60 : 20}
                                                        />
                                                        {student.error && idx === 0 && (
                                                            <div className="absolute right-1 top-1 text-red-500 text-[10px] bg-card px-1 rounded shadow-sm border border-red-200 pointer-events-none">Error</div>
                                                        )}
                                                        {student.edit && idx === 0 && (
                                                            <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full ring-2 ring-white dark:ring-background" title="Recent edit"></div>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-center font-bold text-foreground border-r border-border bg-muted/20">
                                                    {student.error ? 79 : student.scores.reduce((a, b) => a + b, 0)}
                                                </td>
                                                <td className="px-4 py-3 text-center text-muted-foreground border-r border-border bg-muted/20">
                                                    {student.error ? 79 : student.scores.reduce((a, b) => a + b, 0)}%
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center justify-center h-6 w-8 rounded bg-${student.gColor}-100 text-${student.gColor}-700 text-xs font-bold dark:bg-${student.gColor}-900/30 dark:text-${student.gColor}-400`}>
                                                        {student.grade}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-muted/50 border-t border-border">
                                        <tr>
                                            <td className="px-4 py-3" colSpan={2}>
                                                <span className="text-xs font-medium text-muted-foreground uppercase">Average Scores</span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground border-r border-border">14.3</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground border-r border-border">14.0</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground border-r border-border">45.5</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground border-r border-border">73.8</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground border-r border-border">73.8%</td>
                                            <td className="px-4 py-3"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Analysis' && (
                    <AssessmentAnalysisTab />
                )}

                {activeTab === 'Configuration' && (
                    <AssessmentConfigPanel />
                )}
            </div>

            <NewAssessmentModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
        </div>
    );
};