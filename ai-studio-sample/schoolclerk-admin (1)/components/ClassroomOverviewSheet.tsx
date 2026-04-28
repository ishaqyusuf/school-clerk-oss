import React, { useState } from 'react';
import { 
    X, TrendingUp, MoreHorizontal, FileText, Edit2, Users, 
    Calendar, BookOpen, Banknote, BarChart3, Search, Filter, 
    Download, Calculator, FlaskConical, Palette, Monitor, ArrowRight,
    CheckCircle2, XCircle, ChevronLeft, ChevronRight, Save, Clock
} from 'lucide-react';
import { Button, Badge } from './ui';

interface ClassroomOverviewSheetProps {
    isOpen: boolean;
    onClose: () => void;
    classroom: any;
    onNavigateToSubject: () => void;
}

export const ClassroomOverviewSheet: React.FC<ClassroomOverviewSheetProps> = ({ isOpen, onClose, classroom, onNavigateToSubject }) => {
    const [activeTab, setActiveTab] = useState('attendance'); // Default to attendance for this view

    if (!isOpen || !classroom) return null;

    const subjects = [
        { code: 'MTH-101', name: 'Mathematics', teacher: 'Alex Johnson', initials: 'AJ', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', icon: Calculator, schedule: ['Mon', 'Wed', 'Fri'], students: 30 },
        { code: 'PHY-201', name: 'Physics', teacher: 'Bob Jones', initials: 'BJ', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', icon: FlaskConical, schedule: ['Tue', 'Thu'], students: 28 },
        { code: 'ART-102', name: 'Art & Design', teacher: 'Sarah Miller', initials: 'SM', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400', icon: Palette, schedule: ['Fri'], students: 15 },
        { code: 'CS-301', name: 'Computer Science', teacher: 'Tom Wright', initials: 'TW', color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400', icon: Monitor, schedule: ['Mon', 'Wed'], students: 25 },
    ];

    const attendanceStudents = [
        { id: 'ST-001', name: 'Alice Smith', initials: 'AS', status: 'P', color: 'blue' },
        { id: 'ST-002', name: 'Bob Jones', initials: 'BJ', status: 'P', color: 'slate', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk9PdDvL-RTwBjYzWAUhmvg5pt2ep5yC66g-69sqjcB0IHTi3Asw3KGg40Jtpkj9HSf-KfZogZQFhhEUwH3Y1BEHfJX9seKFJ5Yka5-s9bjck-SBG-CE5eCBMeZit2TvHt_22juK9jf3uByNscTnuCOQ7fB3gDcsL7J8zUv58oyVH_ssR0J9-qSooOA3WvaA755kZd6l7W-KrOnV0SxZBvH3ZXziRhYfxuSs_jvk3oxA4-pXMuhf8W2o3h0gnMLMi3Lllor8SOKs8' },
        { id: 'ST-003', name: 'Charlie Day', initials: 'CD', status: 'A', color: 'purple', reason: 'Medical' },
        { id: 'ST-004', name: 'Diana Prince', initials: 'DP', status: 'L', color: 'amber', reason: 'Bus delay', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAv-Qjr4I7qJfw2EVqunp2Nq5RwT-Kmzbz5N3SbIzoQ9CarXg-vxTdqJ2VvJfaGdVOBveb9pCZGyHq9NHtEZ6DuZrIVY1Q2OKXOkKvZ8lZOw8COytuVbaaU34W2PnzfjBlSAAxS3Uh5ZUEtSwbxbgdYJ_HLzjHtPG4Q7mt-wsqYO5i-ZfYmxdmu0z7sNZ7kXqX0Iq5osqUBZcFtrGStoIdp6iBT4MDRzxSMNKFLcMOK94bB18GO10-a0UOpa619IKuyyhXjjSx8Pg' },
        { id: 'ST-005', name: 'Evan Wright', initials: 'EW', status: 'P', color: 'orange' },
    ];

    return (
        <div 
            className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="w-full lg:w-[60%] xl:w-[50%] h-full bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-border"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Header Section */}
                <header className="flex-none bg-card border-b border-border px-6 py-4 z-30">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">{classroom.name}</h1>
                                <Badge variant="default" className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                    {classroom.term}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Form Teacher: {classroom.teacher?.name || 'Unassigned'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Stats */}
                        <div className="flex gap-6">
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Students</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-foreground">{classroom.students}</span>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-border"></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attendance</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">95%</span>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center">
                                        <TrendingUp className="h-3 w-3" /> 2%
                                    </span>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-border"></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Class Avg</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-foreground">78%</span>
                                </div>
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                                <FileText className="h-4 w-4" />
                                Report
                            </Button>
                            <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                <Edit2 className="h-4 w-4" />
                                Edit Class
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* 2. Tabs Navigation */}
                <nav className="flex-none bg-card border-b border-border px-6 sticky top-0 z-20">
                    <div className="flex gap-6 overflow-x-auto no-scrollbar">
                        {['Students', 'Attendance', 'Subjects', 'Payments', 'Performance'].map((tab) => {
                            const isActive = activeTab === tab.toLowerCase();
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                    className={`group flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-all ${
                                        isActive 
                                            ? 'border-primary text-primary font-semibold' 
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                    }`}
                                >
                                    {tab === 'Students' && <Users className={`h-[18px] w-[18px] ${isActive ? 'fill-current' : ''}`} />}
                                    {tab === 'Attendance' && <Calendar className={`h-[18px] w-[18px] ${isActive ? 'fill-current' : ''}`} />}
                                    {tab === 'Subjects' && <BookOpen className={`h-[18px] w-[18px] ${isActive ? 'fill-current' : ''}`} />}
                                    {tab === 'Payments' && <Banknote className="h-[18px] w-[18px]" />}
                                    {tab === 'Performance' && <BarChart3 className="h-[18px] w-[18px]" />}
                                    {tab}
                                </button>
                            )
                        })}
                    </div>
                </nav>

                {/* 3. Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-muted/10">
                    
                    {activeTab === 'subjects' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                                    <input 
                                        className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow" 
                                        placeholder="Search subjects..." 
                                        type="text"
                                    />
                                </div>
                                <Button className="gap-2">
                                    <PlusIcon className="h-4 w-4" />
                                    Add Subject
                                </Button>
                            </div>

                            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-foreground">Subject Name</th>
                                            <th className="px-6 py-4 font-semibold text-foreground">Teacher</th>
                                            <th className="px-6 py-4 font-semibold text-foreground">Schedule</th>
                                            <th className="px-6 py-4 font-semibold text-foreground">Students</th>
                                            <th className="px-6 py-4 font-semibold text-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {subjects.map((subject, idx) => (
                                            <tr key={idx} className="group hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-lg ${subject.color} flex items-center justify-center`}>
                                                            <subject.icon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground">{subject.name}</p>
                                                            <p className="text-xs text-muted-foreground">Code: {subject.code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                                                            {subject.initials}
                                                        </div>
                                                        <span className="text-foreground font-medium">{subject.teacher}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {subject.schedule.map(day => (
                                                            <span key={day} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                                                                {day}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex -space-x-2">
                                                        <div className="h-7 w-7 rounded-full bg-slate-200 border-2 border-background"></div>
                                                        <div className="h-7 w-7 rounded-full bg-slate-300 border-2 border-background"></div>
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                                                            +{subject.students}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={onNavigateToSubject}
                                                        className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-all hover:text-primary"
                                                    >
                                                        View Overview
                                                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                                <div className="relative w-full sm:w-72">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="text-muted-foreground h-5 w-5" />
                                    </div>
                                    <input className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Search students by name or ID..." type="text"/>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="gap-2">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                    <Button variant="outline" className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Export
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-foreground">Student Name</th>
                                            <th className="px-6 py-4 font-semibold text-muted-foreground">ID</th>
                                            <th className="px-6 py-4 font-semibold text-muted-foreground">Parent Contact</th>
                                            <th className="px-6 py-4 font-semibold text-muted-foreground">Attendance</th>
                                            <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Status</th>
                                            <th className="px-6 py-4 font-semibold text-muted-foreground w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <tr key={i} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs">AS</div>
                                                        <div>
                                                            <p className="font-medium text-foreground">Alice Smith</p>
                                                            <p className="text-xs text-muted-foreground">Female • 14 yrs</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground font-mono text-xs">ST-00{i}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-foreground text-sm">Mrs. Smith</span>
                                                        <span className="text-muted-foreground text-xs">555-010{i}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                                            <div className="h-full bg-green-500 rounded-full" style={{ width: '98%' }}></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-muted-foreground">98%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Badge variant="success">Active</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-primary/30 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total School Days</p>
                                            <h3 className="text-3xl font-bold text-foreground mt-1">45</h3>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Term 2, 2024</p>
                                </div>
                                
                                <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Average Present</p>
                                            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">95.2%</h3>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center">
                                        <TrendingUp className="h-3.5 w-3.5 mr-1" /> +1.2% this week
                                    </p>
                                </div>

                                <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-red-500/30 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Average Absent</p>
                                            <h3 className="text-3xl font-bold text-red-500 dark:text-red-400 mt-1">4.8%</h3>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400">
                                            <XCircle className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                                        <TrendingUp className="h-3.5 w-3.5 mr-1 transform rotate-180" /> -0.5% vs last week
                                    </p>
                                </div>
                            </div>

                            {/* Date & Actions Toolbar */}
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 -mx-2 px-2">
                                <div className="flex items-center shadow-sm rounded-lg">
                                    <button className="h-10 w-10 flex items-center justify-center rounded-l-lg border border-r-0 border-border bg-card hover:bg-muted text-muted-foreground transition-colors">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <div className="h-10 px-5 flex items-center border border-border bg-card text-sm font-semibold text-foreground min-w-[180px] justify-center cursor-pointer hover:bg-muted group">
                                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                                        Today, Jan 24
                                    </div>
                                    <button className="h-10 w-10 flex items-center justify-center rounded-r-lg border border-l-0 border-border bg-card hover:bg-muted text-muted-foreground transition-colors">
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 mr-2 bg-card p-1 pr-3 rounded-lg border border-border shadow-sm">
                                        <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-2 mr-1">Mark All</span>
                                        <button className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 transition-colors">Present</button>
                                        <button className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors">Holiday</button>
                                    </div>
                                    <Button className="gap-2">
                                        <Save className="h-4 w-4" />
                                        Save Changes
                                    </Button>
                                </div>
                            </div>

                            {/* Attendance Table */}
                            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-foreground w-1/3">Student Name</th>
                                            <th className="px-6 py-4 font-semibold text-muted-foreground text-center w-1/3">Attendance Status</th>
                                            <th className="px-6 py-4 font-semibold text-muted-foreground w-1/3">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {attendanceStudents.map((student) => (
                                            <tr key={student.id} className={`hover:bg-muted/30 transition-colors ${
                                                student.status === 'A' ? 'bg-red-50/30 dark:bg-red-900/5' : 
                                                student.status === 'L' ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''
                                            }`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {student.image ? (
                                                            <div className="h-9 w-9 rounded-full bg-cover bg-center border border-border" style={{ backgroundImage: `url('${student.image}')` }}></div>
                                                        ) : (
                                                            <div className={`h-9 w-9 rounded-full bg-${student.color}-100 dark:bg-${student.color}-900/40 text-${student.color}-600 dark:text-${student.color}-300 flex items-center justify-center font-bold text-xs`}>
                                                                {student.initials}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-foreground">{student.name}</p>
                                                            <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <div className="inline-flex p-1 bg-muted/50 rounded-lg border border-border">
                                                            <button className={`w-9 h-8 rounded-md text-xs font-medium transition-all ${student.status === 'P' ? 'bg-background shadow-sm text-emerald-600 ring-1 ring-black/5 font-bold' : 'text-muted-foreground hover:bg-background/50'}`}>P</button>
                                                            <button className={`w-9 h-8 rounded-md text-xs font-medium transition-all ${student.status === 'A' ? 'bg-red-500 text-white shadow-sm font-bold' : 'text-muted-foreground hover:bg-background/50'}`}>A</button>
                                                            <button className={`w-9 h-8 rounded-md text-xs font-medium transition-all ${student.status === 'L' ? 'bg-amber-400 text-white shadow-sm font-bold' : 'text-muted-foreground hover:bg-background/50'}`}>L</button>
                                                            <button className={`w-9 h-8 rounded-md text-xs font-medium transition-all ${student.status === 'E' ? 'bg-background shadow-sm text-foreground ring-1 ring-black/5 font-bold' : 'text-muted-foreground hover:bg-background/50'}`}>E</button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input 
                                                        className="w-full bg-transparent border-0 border-b border-border focus:border-primary focus:ring-0 text-sm px-0 py-1 placeholder:text-muted-foreground/50 text-foreground transition-colors" 
                                                        placeholder="Add optional note..." 
                                                        type="text"
                                                        defaultValue={student.reason || ''}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Placeholder for other tabs */}
                    {(activeTab === 'payments' || activeTab === 'performance') && (
                        <div className="mt-8 mb-4 border-t border-border pt-6 animate-in fade-in">
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 p-4 border border-blue-100 dark:border-blue-900/30 flex gap-4 items-start">
                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Term Setup Required</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                         Some performance metrics for this class are pending from the previous term. Please review the Subject configuration.
                                     </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper Icon
const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);