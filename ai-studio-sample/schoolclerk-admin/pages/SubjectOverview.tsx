import React, { useState } from 'react';
import { 
    ArrowLeft, Calculator, BarChart3, Clock, 
    FileText, Plus, List, Settings, ChevronRight as ChevronRightIcon,
    FlaskConical, Timer, CalendarClock, MoreVertical
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { NewAssessmentModal } from '../components/NewAssessmentModal';

interface SubjectOverviewProps {
    onBack: () => void;
    onNavigateToAssessment: () => void;
}

export const SubjectOverview: React.FC<SubjectOverviewProps> = ({ onBack, onNavigateToAssessment }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="animate-in fade-in duration-500 flex flex-col h-full bg-background">
            {/* Header */}
            <header className="flex-none bg-card border-b border-border px-8 py-6 z-30">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <button onClick={onBack} className="hover:text-primary transition-colors flex items-center gap-1">
                                <ArrowLeft className="h-4 w-4" />
                                Year 10 - Science A
                            </button>
                            <span>/</span>
                            <span>Subjects</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Calculator className="h-7 w-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">Mathematics</h1>
                                <p className="text-sm text-muted-foreground">Code: MTH-101</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <label className="text-xs font-medium text-muted-foreground mb-1">Current Session</label>
                            <div className="relative">
                                <select className="appearance-none bg-background border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block w-40 p-2.5 pr-8 shadow-sm cursor-pointer font-medium outline-none">
                                    <option selected>Term 2, 2024</option>
                                    <option>Term 1, 2024</option>
                                    <option>Term 3, 2023</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-border mx-2"></div>
                        <button onClick={onBack} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors">
                            <MoreVertical className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-border pt-6">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border-2 border-background shadow-sm">AJ</div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Teacher</span>
                                <span className="text-sm font-semibold text-foreground">Alex Johnson</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-border"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Class</span>
                            <span className="text-sm font-semibold text-foreground">Year 10 - Science A</span>
                        </div>
                        <div className="w-px h-8 bg-border"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Students</span>
                            <div className="flex -space-x-2 mt-0.5">
                                <img alt="Student" className="h-6 w-6 rounded-full border-2 border-background object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk9PdDvL-RTwBjYzWAUhmvg5pt2ep5yC66g-69sqjcB0IHTi3Asw3KGg40Jtpkj9HSf-KfZogZQFhhEUwH3Y1BEHfJX9seKFJ5Yka5-s9bjck-SBG-CE5eCBMeZit2TvHt_22juK9jf3uByNscTnuCOQ7fB3gDcsL7J8zUv58oyVH_ssR0J9-qSooOA3WvaA755kZd6l7W-KrOnV0SxZBvH3ZXziRhYfxuSs_jvk3oxA4-pXMuhf8W2o3h0gnMLMi3Lllor8SOKs8"/>
                                <img alt="Student" className="h-6 w-6 rounded-full border-2 border-background object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAv-Qjr4I7qJfw2EVqunp2Nq5RwT-Kmzbz5N3SbIzoQ9CarXg-vxTdqJ2VvJfaGdVOBveb9pCZGyHq9NHtEZ6DuZrIVY1Q2OKXOkKvZ8lZOw8COytuVbaaU34W2PnzfjBlSAAxS3Uh5ZUEtSwbxbgdYJ_HLzjHtPG4Q7mt-wsqYO5i-ZfYmxdmu0z7sNZ7kXqX0Iq5osqUBZcFtrGStoIdp6iBT4MDRzxSMNKFLcMOK94bB18GO10-a0UOpa619IKuyyhXjjSx8Pg"/>
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">+30</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 scroll-smooth bg-muted/10">
                {/* KPI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="p-4 flex items-center gap-4 border-border shadow-sm">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Class Average</p>
                            <p className="text-2xl font-bold text-foreground">78.4%</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 border-border shadow-sm">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pending Grading</p>
                            <p className="text-2xl font-bold text-foreground">12</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 border-border shadow-sm">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Assessments</p>
                            <p className="text-2xl font-bold text-foreground">8</p>
                        </div>
                    </Card>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Assessments</h2>
                        <p className="text-sm text-muted-foreground">Manage quizzes, exams, and practicals for this term.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2 bg-background hover:bg-muted shadow-sm">
                            <List className="h-[18px] w-[18px]" />
                            View List
                        </Button>
                        <Button className="gap-2 shadow-md hover:bg-primary/90" onClick={() => setIsModalOpen(true)}>
                            <Plus className="h-[18px] w-[18px]" />
                            Add New Assessment
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CA Column */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="text-muted-foreground h-5 w-5" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Continuous Assessment (CA)</h3>
                        </div>
                        <Card className="overflow-hidden border-border shadow-sm bg-card">
                            <div 
                                onClick={onNavigateToAssessment}
                                className="p-4 border-b border-border flex items-center justify-between group hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm">Algebra Quiz 1</p>
                                        <p className="text-xs text-muted-foreground">Due: Oct 12 • 20 Points</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="success" className="font-medium">Graded</Badge>
                                    <ChevronRightIcon className="text-muted-foreground h-[18px] w-[18px]" />
                                </div>
                            </div>
                            <div className="p-4 border-b border-border flex items-center justify-between group hover:bg-muted/30 transition-colors cursor-pointer">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm">Homework: Linear Equations</p>
                                        <p className="text-xs text-muted-foreground">Due: Oct 15 • 10 Points</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="success" className="font-medium">Graded</Badge>
                                    <ChevronRightIcon className="text-muted-foreground h-[18px] w-[18px]" />
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors cursor-pointer">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm">Pop Quiz: Geometry</p>
                                        <p className="text-xs text-muted-foreground">Due: Nov 05 • 15 Points</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="default" className="font-medium">Active</Badge>
                                    <ChevronRightIcon className="text-muted-foreground h-[18px] w-[18px]" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Practical Column */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-1">
                            <FlaskConical className="text-muted-foreground h-5 w-5" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Practical & Tests</h3>
                        </div>
                        <Card className="overflow-hidden border-border shadow-sm bg-card">
                            <div className="p-4 border-b border-border flex items-center justify-between group hover:bg-muted/30 transition-colors cursor-pointer">
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                                        <FlaskConical className="h-[18px] w-[18px]" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm">Lab Experiment 2: Forces</p>
                                        <p className="text-xs text-muted-foreground">Scheduled: Nov 01 • Physics Lab A</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="neutral">Upcoming</Badge>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors cursor-pointer">
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                                        <Timer className="h-[18px] w-[18px]" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground text-sm">Termly Test 1</p>
                                        <p className="text-xs text-muted-foreground">Date: Oct 28 • 50 Points</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="success">Graded</Badge>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Exams */}
                    <div className="col-span-1 lg:col-span-2 flex flex-col gap-4 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                            <CalendarClock className="text-muted-foreground h-5 w-5" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Exams</h3>
                        </div>
                        <Card className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-border shadow-sm bg-card">
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                                    <CalendarClock className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">End of Term Examination</h4>
                                    <p className="text-sm text-muted-foreground mt-1">Weight: 60% of Total Grade • Comprehensive syllabus coverage.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Date</p>
                                    <p className="font-medium text-foreground">Dec 10, 2024</p>
                                </div>
                                <Button variant="outline" className="w-full sm:w-auto gap-2 bg-background hover:bg-muted">
                                    <Settings className="h-[18px] w-[18px]" />
                                    Configure
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            <NewAssessmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};