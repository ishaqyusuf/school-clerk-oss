import React, { useState } from 'react';
import { 
    Home, ChevronRight, Edit, CalendarDays, BookOpen, 
    Banknote, Activity, CheckCircle2, XCircle, Clock, 
    TrendingUp, Info, IdCard, GraduationCap, Download,
    Search, Library, BarChart3, Award, History, Filter, 
    MoreVertical, Calculator, Book, FlaskConical, Atom, 
    Globe, ArrowRight, TrendingDown, Trophy, Star, User,
    Receipt, Wallet, AlertTriangle, Plus, Printer, 
    Shirt, Dumbbell, ScrollText, Check
} from 'lucide-react';
import { RecordPaymentSheet } from '../components/RecordPaymentSheet';
import { SubjectBreakdownSheet } from '../components/SubjectBreakdownSheet';

interface StudentOverviewProps {
    onBack: () => void;
}

export const StudentOverview: React.FC<StudentOverviewProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('fees');
    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
    const [isSubjectSheetOpen, setIsSubjectSheetOpen] = useState(false);

    return (
        <div className="animate-in fade-in duration-500 font-sans max-w-[1200px] mx-auto">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex mb-6">
                <ol className="inline-flex items-center space-x-1 md:space-x-2">
                    <li className="inline-flex items-center">
                        <button onClick={() => onBack()} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400 transition-colors">
                            <Home className="w-[18px] h-[18px] mr-1" />
                            Home
                        </button>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="text-slate-400 w-[18px] h-[18px]" />
                            <button onClick={() => onBack()} className="ml-1 text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400 md:ml-2 transition-colors">Students</button>
                        </div>
                    </li>
                    <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="text-slate-400 w-[18px] h-[18px]" />
                            <span className="ml-1 text-sm font-medium text-slate-900 dark:text-white md:ml-2">Student Overview</span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Profile Header Card */}
            <section className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    {/* Student Identity */}
                    <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center w-full md:w-auto">
                        <div className="relative">
                            <div 
                                className="h-24 w-24 rounded-full bg-slate-100 bg-cover bg-center border-4 border-background shadow-inner" 
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuASXSsEsMhK7MW65nHmlkU9H93KJCLQi-JoqKDAJgO7DkEH5sA0JLDIMNkGBrM4bMqdw_kTM6uNRhmSr7-kSx_VRhLwP92O4B1XVtvXDgLPGhrVAQH_sGSKr_iFTpHEZUU1YicOKOI0_waiauo0vY7biI2FSCzYsKe9gbgP6k-j_qm7eo_KejNeZJiVTGn_Ojp9BWGzuWKoqWkmyKbzP9imD4wM7H_O3_g0Xc4iJZL8KHLuuErbUWhkfAM-KWfDhmjnDVfbd0lXprk')" }}
                            ></div>
                            <span className="absolute bottom-1 right-1 h-5 w-5 bg-green-500 border-2 border-background rounded-full" title="Online"></span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-2xl font-bold text-foreground tracking-tight">Michael Adewale</h2>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                    Active
                                </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <IdCard className="w-4 h-4" />
                                    SC-2023-001
                                </span>
                                <span className="hidden sm:inline text-border">•</span>
                                <span className="flex items-center gap-1">
                                    <GraduationCap className="w-4 h-4" />
                                    Grade 5A
                                </span>
                                <span className="hidden sm:inline text-border">•</span>
                                <span>Male</span>
                            </div>
                        </div>
                    </div>
                    {/* Global Controls */}
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-stretch sm:items-center">
                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm">
                            <Download className="w-4 h-4" />
                            Report Card
                        </button>
                        <button className="text-foreground bg-secondary hover:bg-secondary/80 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none transition-colors flex items-center justify-center gap-2">
                            <Edit className="w-[18px] h-[18px]" />
                            Edit
                        </button>
                    </div>
                </div>
            </section>

            {/* Tabs Navigation */}
            <div className="border-b border-border mb-6">
                <nav aria-label="Tabs" className="flex space-x-8 overflow-x-auto scrollbar-hide">
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <CalendarDays className="w-5 h-5" />
                        Attendance
                    </button>
                    <button 
                        onClick={() => setActiveTab('subjects')}
                        className={`${activeTab === 'subjects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <BookOpen className="w-5 h-5" />
                        Subjects
                    </button>
                    <button 
                        onClick={() => setActiveTab('fees')}
                        className={`${activeTab === 'fees' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <Banknote className="w-5 h-5" />
                        Payments
                    </button>
                    <button 
                        onClick={() => setActiveTab('performance')}
                        className={`${activeTab === 'performance' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                    >
                        <Activity className="w-5 h-5" />
                        Performance
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            
            {/* --- ATTENDANCE TAB --- */}
            {activeTab === 'attendance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Attendance Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Present Card */}
                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                                <p className="text-3xl font-bold text-foreground mt-1">96%</p>
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                                    <TrendingUp className="w-[14px] h-[14px]" />
                                    +2% from last term
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        </div>
                        {/* Absent Card */}
                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Days Absent</p>
                                <p className="text-3xl font-bold text-foreground mt-1">2</p>
                                <p className="text-xs text-muted-foreground mt-2">Total school days: 54</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                                <XCircle className="w-6 h-6" />
                            </div>
                        </div>
                        {/* Late Card */}
                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Days Late</p>
                                <p className="text-3xl font-bold text-foreground mt-1">1</p>
                                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1 font-medium">
                                    Needs improvement
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Detailed Table */}
                        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                                <button className="text-sm text-primary font-medium hover:underline">View All</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-muted-foreground">
                                    <thead className="text-xs text-foreground uppercase bg-secondary/50">
                                        <tr>
                                            <th className="px-6 py-3" scope="col">Date</th>
                                            <th className="px-6 py-3" scope="col">Day</th>
                                            <th className="px-6 py-3" scope="col">Status</th>
                                            <th className="px-6 py-3" scope="col">Clock In</th>
                                            <th className="px-6 py-3" scope="col">Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        <tr className="bg-card hover:bg-secondary/20 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">Oct 24, 2023</td>
                                            <td className="px-6 py-4">Tuesday</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium px-2.5 py-0.5 rounded border border-green-200 dark:border-green-800">Present</span>
                                            </td>
                                            <td className="px-6 py-4">07:45 AM</td>
                                            <td className="px-6 py-4 text-muted-foreground/60">-</td>
                                        </tr>
                                        <tr className="bg-card hover:bg-secondary/20 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">Oct 23, 2023</td>
                                            <td className="px-6 py-4">Monday</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium px-2.5 py-0.5 rounded border border-orange-200 dark:border-orange-800">Late</span>
                                            </td>
                                            <td className="px-6 py-4">08:15 AM</td>
                                            <td className="px-6 py-4 text-foreground/80">Bus delay</td>
                                        </tr>
                                        <tr className="bg-card hover:bg-secondary/20 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">Oct 20, 2023</td>
                                            <td className="px-6 py-4">Friday</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium px-2.5 py-0.5 rounded border border-green-200 dark:border-green-800">Present</span>
                                            </td>
                                            <td className="px-6 py-4">07:50 AM</td>
                                            <td className="px-6 py-4 text-muted-foreground/60">-</td>
                                        </tr>
                                        <tr className="bg-card hover:bg-secondary/20 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">Oct 19, 2023</td>
                                            <td className="px-6 py-4">Thursday</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium px-2.5 py-0.5 rounded border border-red-200 dark:border-red-800">Absent</span>
                                            </td>
                                            <td className="px-6 py-4">-</td>
                                            <td className="px-6 py-4 text-foreground/80">Sick leave</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Heatmap / Summary Visualization */}
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Overview</h3>
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">October 2023</span>
                                    <div className="flex gap-2 text-xs">
                                        <span className="flex items-center gap-1 text-muted-foreground"><div className="h-2 w-2 rounded-full bg-green-500"></div> Present</span>
                                        <span className="flex items-center gap-1 text-muted-foreground"><div className="h-2 w-2 rounded-full bg-red-400"></div> Absent</span>
                                    </div>
                                </div>
                                {/* Abstract Calendar Visual */}
                                <div className="grid grid-cols-7 gap-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="text-center text-xs text-muted-foreground py-1">{d}</div>
                                    ))}
                                    {/* Calendar Days (Mock) */}
                                    <div className="aspect-square rounded-md bg-secondary/50"></div>
                                    <div className="aspect-square rounded-md bg-secondary/50"></div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">1</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">2</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">3</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">4</div>
                                    <div className="aspect-square rounded-md bg-secondary text-muted-foreground flex items-center justify-center text-xs">5</div>
                                    <div className="aspect-square rounded-md bg-secondary text-muted-foreground flex items-center justify-center text-xs">6</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">7</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">8</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">9</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">10</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">11</div>
                                    <div className="aspect-square rounded-md bg-secondary text-muted-foreground flex items-center justify-center text-xs">12</div>
                                    <div className="aspect-square rounded-md bg-secondary text-muted-foreground flex items-center justify-center text-xs">13</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">14</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">15</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">16</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">17</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">18</div>
                                    <div className="aspect-square rounded-md bg-secondary text-muted-foreground flex items-center justify-center text-xs">19</div>
                                    <div className="aspect-square rounded-md bg-secondary text-muted-foreground flex items-center justify-center text-xs">20</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">21</div>
                                    <div className="aspect-square rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-medium">22</div>
                                    <div className="aspect-square rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-700 dark:text-orange-400 text-xs font-medium ring-1 ring-orange-200 dark:ring-orange-800">23</div>
                                    <div className="aspect-square rounded-md bg-green-500 text-white shadow-lg shadow-green-200/50 flex items-center justify-center text-xs font-bold">24</div>
                                    <div className="aspect-square rounded-md bg-secondary/50"></div>
                                    <div className="aspect-square rounded-md bg-secondary/50"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contextual Tip */}
                    <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                        <Info className="text-blue-600 dark:text-blue-400 shrink-0 h-6 w-6" />
                        <div>
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Term Note</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                Attendance data is automatically synchronized from the classroom register. If you notice a discrepancy, please contact the class teacher via the Teachers tab.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUBJECTS TAB --- */}
            {activeTab === 'subjects' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Controls & Filters */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <label className="absolute -top-2 left-3 bg-card px-1 text-xs font-medium text-primary">Academic Session</label>
                                <select className="w-full h-11 px-3 py-2 bg-transparent border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                    <option>2023 / 2024</option>
                                    <option>2022 / 2023</option>
                                </select>
                            </div>
                            <div className="relative w-full md:w-48">
                                <label className="absolute -top-2 left-3 bg-card px-1 text-xs font-medium text-primary">Term</label>
                                <select className="w-full h-11 px-3 py-2 bg-transparent border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                    <option>First Term</option>
                                    <option selected>Second Term</option>
                                    <option>Third Term</option>
                                </select>
                            </div>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-[18px] h-[18px]" />
                            <input 
                                className="w-full h-10 pl-10 pr-4 bg-muted/30 border-none rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground" 
                                placeholder="Search subjects..." 
                                type="text"
                            />
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-start justify-between">
                            <div>
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Total Subjects</p>
                                <p className="text-foreground text-2xl font-bold">12</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-primary">
                                <Library className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-start justify-between">
                            <div>
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Average Score</p>
                                <p className="text-foreground text-2xl font-bold">78.5%</p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg text-emerald-600">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-start justify-between">
                            <div>
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">GPA (Current)</p>
                                <p className="text-foreground text-2xl font-bold">3.8</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-purple-600">
                                <Award className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-start justify-between">
                            <div>
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Performance</p>
                                <p className="text-emerald-600 text-2xl font-bold flex items-center gap-1">
                                    <TrendingUp className="w-5 h-5" />
                                    +4.2%
                                </p>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-orange-600">
                                <History className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Subjects Table */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
                            <h2 className="text-foreground text-lg font-bold">Subject Performance</h2>
                            <div className="flex items-center gap-2">
                                <button className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors">
                                    <Filter className="w-5 h-5" />
                                </button>
                                <button className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-secondary/30">
                                        <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/4">Subject</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teacher</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">CA (40)</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Exam (60)</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Total (100)</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Grade</th>
                                        <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {/* Row 1 */}
                                    <tr className="group hover:bg-secondary/20 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary">
                                                    <Calculator className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-foreground font-medium text-sm">Mathematics</p>
                                                    <p className="text-muted-foreground text-xs">MTH101</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-muted-foreground">Mr. Johnson</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">35</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">55</td>
                                        <td className="py-4 px-6 text-center text-sm font-bold text-foreground">90</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold">A</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button 
                                                onClick={() => setIsSubjectSheetOpen(true)}
                                                className="text-primary hover:text-blue-700 dark:hover:text-blue-400 text-sm font-medium flex items-center justify-end gap-1 ml-auto"
                                            >
                                                Breakdown
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Row 2 */}
                                    <tr className="group hover:bg-secondary/20 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                                    <Book className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-foreground font-medium text-sm">English Language</p>
                                                    <p className="text-muted-foreground text-xs">ENG102</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-muted-foreground">Ms. Doe</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">28</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">45</td>
                                        <td className="py-4 px-6 text-center text-sm font-bold text-foreground">73</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold">B</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-primary hover:text-blue-700 dark:hover:text-blue-400 text-sm font-medium flex items-center justify-end gap-1 ml-auto">
                                                Breakdown
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Row 3 */}
                                    <tr className="group hover:bg-secondary/20 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                                    <FlaskConical className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-foreground font-medium text-sm">Physics</p>
                                                    <p className="text-muted-foreground text-xs">PHY101</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-muted-foreground">Mr. Smith</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">30</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">50</td>
                                        <td className="py-4 px-6 text-center text-sm font-bold text-foreground">80</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold">A</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-primary hover:text-blue-700 dark:hover:text-blue-400 text-sm font-medium flex items-center justify-end gap-1 ml-auto">
                                                Breakdown
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Row 4 */}
                                    <tr className="group hover:bg-secondary/20 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                                                    <Atom className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-foreground font-medium text-sm">Chemistry</p>
                                                    <p className="text-muted-foreground text-xs">CHM101</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-muted-foreground">Mrs. Davis</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">22</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">38</td>
                                        <td className="py-4 px-6 text-center text-sm font-bold text-foreground">60</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-bold">C</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-primary hover:text-blue-700 dark:hover:text-blue-400 text-sm font-medium flex items-center justify-end gap-1 ml-auto">
                                                Breakdown
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Row 5 */}
                                    <tr className="group hover:bg-secondary/20 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                                                    <Globe className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-foreground font-medium text-sm">Geography</p>
                                                    <p className="text-muted-foreground text-xs">GEO104</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-muted-foreground">Mr. Allen</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">32</td>
                                        <td className="py-4 px-6 text-center text-sm font-medium text-foreground">48</td>
                                        <td className="py-4 px-6 text-center text-sm font-bold text-foreground">80</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold">A</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-primary hover:text-blue-700 dark:hover:text-blue-400 text-sm font-medium flex items-center justify-end gap-1 ml-auto">
                                                Breakdown
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-border flex justify-center bg-card">
                            <button className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors">Load more subjects</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PERFORMANCE TAB --- */}
            {activeTab === 'performance' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Term Selector & Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="relative w-full sm:w-72">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <select className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-card text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none shadow-sm">
                                <option>2023/2024 - 2nd Term</option>
                                <option>2023/2024 - 1st Term</option>
                                <option>2022/2023 - 3rd Term</option>
                            </select>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Last updated: <span className="font-medium text-foreground">April 12, 2024</span>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Average Score */}
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                                <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 p-1 rounded text-xs font-bold flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    +2.4%
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-foreground">78.5%</p>
                            <p className="text-xs text-muted-foreground mt-1">vs 76.1% last term</p>
                        </div>
                        
                        {/* Class Position */}
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Class Position</p>
                                <Trophy className="text-muted-foreground w-5 h-5" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <p className="text-3xl font-bold text-foreground">4th</p>
                                <p className="text-sm text-muted-foreground">/ 32</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Top 15% of class</p>
                        </div>

                        {/* Grade Points */}
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Grade Points</p>
                                <Star className="text-muted-foreground w-5 h-5" />
                            </div>
                            <p className="text-3xl font-bold text-foreground">342</p>
                            <p className="text-xs text-muted-foreground mt-1">Out of 400 possible</p>
                        </div>

                         {/* Attendance */}
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                                <div className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 p-1 rounded text-xs font-bold flex items-center gap-1">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    -2 days
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-foreground">92%</p>
                            <p className="text-xs text-muted-foreground mt-1">54/58 days present</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Detailed Results Table */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30">
                                    <h2 className="text-base font-bold text-foreground">Subject Results</h2>
                                    <button className="text-sm text-primary hover:underline font-medium">View All History</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-secondary/50">
                                                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</th>
                                                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">C.A (40)</th>
                                                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Exam (60)</th>
                                                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Total</th>
                                                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Grade</th>
                                                <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remark</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm text-foreground">
                                            {/* Row 1 */}
                                            <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                                                <td className="py-4 px-6 font-medium">Mathematics</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">35</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">52</td>
                                                <td className="py-4 px-6 text-center font-bold">87</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs">A</span>
                                                </td>
                                                <td className="py-4 px-6 text-muted-foreground">Excellent work</td>
                                            </tr>
                                            {/* Row 2 */}
                                            <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                                                <td className="py-4 px-6 font-medium">English Language</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">32</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">48</td>
                                                <td className="py-4 px-6 text-center font-bold">80</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs">A</span>
                                                </td>
                                                <td className="py-4 px-6 text-muted-foreground">Great improvement</td>
                                            </tr>
                                            {/* Row 3 */}
                                            <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                                                <td className="py-4 px-6 font-medium">Physics</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">28</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">42</td>
                                                <td className="py-4 px-6 text-center font-bold">70</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-xs">B</span>
                                                </td>
                                                <td className="py-4 px-6 text-muted-foreground">Good effort</td>
                                            </tr>
                                            {/* Row 4 */}
                                            <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                                                <td className="py-4 px-6 font-medium">Chemistry</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">30</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">35</td>
                                                <td className="py-4 px-6 text-center font-bold">65</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-xs">B</span>
                                                </td>
                                                <td className="py-4 px-6 text-muted-foreground">Can do better</td>
                                            </tr>
                                            {/* Row 5 */}
                                            <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                                                <td className="py-4 px-6 font-medium">Biology</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">25</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">28</td>
                                                <td className="py-4 px-6 text-center font-bold">53</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold text-xs">C</span>
                                                </td>
                                                <td className="py-4 px-6 text-muted-foreground">Average performance</td>
                                            </tr>
                                            {/* Row 6 */}
                                            <tr className="hover:bg-secondary/20 transition-colors">
                                                <td className="py-4 px-6 font-medium">Civic Education</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">38</td>
                                                <td className="py-4 px-6 text-center text-muted-foreground">55</td>
                                                <td className="py-4 px-6 text-center font-bold">93</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs">A*</span>
                                                </td>
                                                <td className="py-4 px-6 text-muted-foreground">Outstanding</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Trend & Comments */}
                        <div className="flex flex-col gap-6">
                            {/* Performance Trend Chart */}
                            <div className="bg-card rounded-xl border border-border shadow-sm p-5 h-80 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-base font-bold text-foreground">Performance Trend</h3>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                                            <span className="text-xs text-muted-foreground">Avg</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                            <span className="text-xs text-muted-foreground">Class</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Bar Chart Logic */}
                                <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                                     {/* Bar Group 1 */}
                                    <div className="flex flex-col items-center gap-2 group cursor-pointer w-full">
                                        <div className="relative flex items-end justify-center w-full h-40 gap-1">
                                            <div className="w-3 bg-slate-200 dark:bg-slate-700 rounded-t-sm h-[60%] group-hover:bg-slate-300 transition-all" title="Class Avg: 60%"></div>
                                            <div className="w-3 bg-primary/40 rounded-t-sm h-[65%] group-hover:bg-primary/60 transition-all" title="Student Avg: 65%"></div>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-medium">Term 1</span>
                                    </div>
                                    {/* Bar Group 2 */}
                                    <div className="flex flex-col items-center gap-2 group cursor-pointer w-full">
                                        <div className="relative flex items-end justify-center w-full h-40 gap-1">
                                            <div className="w-3 bg-slate-200 dark:bg-slate-700 rounded-t-sm h-[62%] group-hover:bg-slate-300 transition-all" title="Class Avg: 62%"></div>
                                            <div className="w-3 bg-primary/60 rounded-t-sm h-[72%] group-hover:bg-primary/80 transition-all" title="Student Avg: 72%"></div>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-medium">Term 2</span>
                                    </div>
                                    {/* Bar Group 3 */}
                                    <div className="flex flex-col items-center gap-2 group cursor-pointer w-full">
                                        <div className="relative flex items-end justify-center w-full h-40 gap-1">
                                            <div className="w-3 bg-slate-200 dark:bg-slate-700 rounded-t-sm h-[65%] group-hover:bg-slate-300 transition-all" title="Class Avg: 65%"></div>
                                            <div className="w-3 bg-primary rounded-t-sm h-[78%] group-hover:bg-primary/90 transition-all shadow-[0_0_15px_-3px_rgba(19,127,236,0.5)]" title="Student Avg: 78.5%"></div>
                                        </div>
                                        <span className="text-xs text-foreground font-bold">Current</span>
                                    </div>
                                </div>
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-muted-foreground">Student is consistently performing above class average.</p>
                                </div>
                            </div>

                            {/* Remarks Card */}
                            <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4">
                                <h3 className="text-base font-bold text-foreground">Term Remarks</h3>
                                <div className="flex gap-4">
                                    <div className="flex-none mt-1">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                            <User className="text-muted-foreground w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-bold text-foreground">Class Teacher</p>
                                        <p className="text-sm text-muted-foreground italic">"John has shown remarkable improvement this term, especially in mathematics. He is a diligent student."</p>
                                    </div>
                                </div>
                                <div className="border-t border-border"></div>
                                <div className="flex gap-4">
                                    <div className="flex-none mt-1">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <GraduationCap className="text-primary w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-bold text-foreground">Principal's Verdict</p>
                                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Promoted to SS3</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- PAYMENTS TAB --- */}
            {activeTab === 'fees' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Header & Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Overview</h1>
                            <p className="text-muted-foreground text-sm md:text-base font-normal">Payment records for <span className="font-medium text-foreground">Michael Adewale</span> - Grade 5A</p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-lg h-10 px-4 bg-card border border-border text-foreground text-sm font-bold tracking-wide hover:bg-secondary transition-colors">
                                <ScrollText className="w-[18px] h-[18px]" />
                                Statement
                            </button>
                            <button 
                                onClick={() => setIsPaymentSheetOpen(true)}
                                className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-primary-foreground text-sm font-bold tracking-wide shadow-sm hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="w-[18px] h-[18px]" />
                                Record Payment
                            </button>
                        </div>
                    </div>

                    {/* Term Selector & Filters */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card rounded-xl p-1">
                        <div className="relative w-full sm:w-64">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <select className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer appearance-none">
                                <option value="current">2023/2024 - Term 2 (Current)</option>
                                <option value="prev1">2023/2024 - Term 1</option>
                                <option value="prev2">2022/2023 - Term 3</option>
                            </select>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-semibold border border-amber-200 dark:border-amber-800 flex items-center gap-1 w-full sm:w-auto justify-center">
                                <AlertTriangle className="w-4 h-4" />
                                Arrears from Term 1: $120.00
                            </span>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Invoiced */}
                        <div className="flex flex-col p-5 bg-card rounded-xl border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <p className="text-muted-foreground text-sm font-medium">Total Invoiced</p>
                            </div>
                            <p className="text-foreground text-2xl font-bold">$3,450.00</p>
                            <p className="text-xs text-muted-foreground mt-1">Includes tuition & store items</p>
                        </div>
                        {/* Total Paid */}
                        <div className="flex flex-col p-5 bg-card rounded-xl border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <p className="text-muted-foreground text-sm font-medium">Total Paid</p>
                            </div>
                            <p className="text-foreground text-2xl font-bold">$2,000.00</p>
                            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '58%' }}></div>
                            </div>
                        </div>
                        {/* Outstanding */}
                        <div className="flex flex-col p-5 bg-card rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <p className="text-muted-foreground text-sm font-medium">Outstanding Balance</p>
                            </div>
                            <p className="text-red-600 dark:text-red-400 text-2xl font-bold">$1,450.00</p>
                            <p className="text-xs text-red-500 mt-1 font-medium">Due by Feb 28, 2024</p>
                        </div>
                    </div>

                    {/* Breakdown Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Fees Structure */}
                        <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-secondary/30">
                                <h3 className="text-foreground text-base font-bold">Fee Structure</h3>
                                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">Mandatory</span>
                            </div>
                            <div className="p-5 flex flex-col gap-5">
                                {/* Fee Item */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-foreground font-medium">Tuition Fee</span>
                                        <span className="text-foreground font-bold">$2,500.00</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                                            <div className="bg-primary h-full rounded-full" style={{ width: '60%' }}></div>
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">$1,500 Paid</span>
                                    </div>
                                </div>
                                {/* Fee Item */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-foreground font-medium">Development Levy</span>
                                        <span className="text-foreground font-bold">$500.00</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                                            <div className="bg-green-500 h-full rounded-full" style={{ width: '100%' }}></div>
                                        </div>
                                        <span className="text-xs text-green-600 font-medium whitespace-nowrap">Paid</span>
                                    </div>
                                </div>
                                {/* Fee Item */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-foreground font-medium">PTA Fee</span>
                                        <span className="text-foreground font-bold">$100.00</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                                            <div className="bg-slate-300 dark:bg-slate-600 h-full rounded-full" style={{ width: '0%' }}></div>
                                        </div>
                                        <span className="text-xs text-red-500 font-medium whitespace-nowrap">Unpaid</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Store Purchases */}
                        <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-secondary/30">
                                <h3 className="text-foreground text-base font-bold">Store & Ancillary</h3>
                                <button className="text-xs font-medium text-primary hover:underline">Add Item</button>
                            </div>
                            <div className="flex flex-col divide-y divide-border">
                                {/* Store Item */}
                                <div className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-secondary rounded text-muted-foreground">
                                            <Shirt className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">School Blazer (Size M)</p>
                                            <p className="text-xs text-muted-foreground">Uniforms • Qty: 1</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-foreground">$150.00</p>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Unpaid</span>
                                    </div>
                                </div>
                                {/* Store Item */}
                                <div className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-secondary rounded text-muted-foreground">
                                            <Book className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Science Workbook Y10</p>
                                            <p className="text-xs text-muted-foreground">Books • Qty: 2</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-foreground">$80.00</p>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</span>
                                    </div>
                                </div>
                                {/* Store Item */}
                                <div className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-secondary rounded text-muted-foreground">
                                            <Dumbbell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Sports Kit Fee</p>
                                            <p className="text-xs text-muted-foreground">Sports • Qty: 1</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-foreground">$120.00</p>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Partial</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                            <h3 className="text-foreground text-lg font-bold">Transaction History</h3>
                            <div className="flex gap-2">
                                <button className="p-2 rounded hover:bg-secondary text-muted-foreground">
                                    <Filter className="w-5 h-5" />
                                </button>
                                <button className="p-2 rounded hover:bg-secondary text-muted-foreground">
                                    <Printer className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium" scope="col">Date</th>
                                        <th className="px-6 py-3 font-medium" scope="col">Ref ID</th>
                                        <th className="px-6 py-3 font-medium" scope="col">Description</th>
                                        <th className="px-6 py-3 font-medium" scope="col">Method</th>
                                        <th className="px-6 py-3 font-medium" scope="col">Amount</th>
                                        <th className="px-6 py-3 font-medium" scope="col">Status</th>
                                        <th className="px-6 py-3 font-medium text-right" scope="col">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <tr className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-foreground">Nov 12, 2023</td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#TXN-8839</td>
                                        <td className="px-6 py-4 text-foreground">Tuition Payment (Part 1)</td>
                                        <td className="px-6 py-4 text-muted-foreground">Bank Transfer</td>
                                        <td className="px-6 py-4 font-bold text-foreground">$1,500.00</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
                                                Successful
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-primary hover:underline text-sm font-medium">Receipt</button>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-foreground">Nov 10, 2023</td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#TXN-8812</td>
                                        <td className="px-6 py-4 text-foreground">Development Levy</td>
                                        <td className="px-6 py-4 text-muted-foreground">Cash</td>
                                        <td className="px-6 py-4 font-bold text-foreground">$500.00</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
                                                Successful
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-primary hover:underline text-sm font-medium">Receipt</button>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-foreground">Nov 05, 2023</td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#TXN-8799</td>
                                        <td className="px-6 py-4 text-foreground">Science Workbook Purchase</td>
                                        <td className="px-6 py-4 text-muted-foreground">POS Card</td>
                                        <td className="px-6 py-4 font-bold text-foreground">$80.00</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400 animate-pulse"></span>
                                                Pending
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-primary hover:underline text-sm font-medium">Check Status</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-center">
                            <button className="text-sm text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors">
                                View All Transactions
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Side Sheets */}
            <RecordPaymentSheet 
                isOpen={isPaymentSheetOpen} 
                onClose={() => setIsPaymentSheetOpen(false)} 
            />
            
            <SubjectBreakdownSheet 
                isOpen={isSubjectSheetOpen} 
                onClose={() => setIsSubjectSheetOpen(false)} 
            />
        </div>
    );
};
