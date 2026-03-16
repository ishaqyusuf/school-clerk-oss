
import React, { useState } from 'react';
import { 
    ChevronRight, MoreVertical, UserPlus, Users, 
    UserCheck, AlertTriangle, Search, Filter, 
    Eye, Edit2, ChevronLeft, TrendingUp, Info,
    LayoutGrid, List, MoreHorizontal
} from 'lucide-react';
import { MOCK_STUDENTS } from '../constants';

interface StudentsListProps {
    onNavigate: (page: string) => void;
}

export const StudentsList: React.FC<StudentsListProps> = ({ onNavigate }) => {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    return (
        <div className="animate-in fade-in duration-500 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Student Management</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Academic Period: 2023/2024 - 2nd Term</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700">
                        <MoreVertical className="w-5 h-5" />
                        Bulk Actions
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-blue-200 dark:shadow-none">
                        <UserPlus className="w-5 h-5" />
                        Enroll New Student
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-card p-5 rounded-xl border border-slate-200 dark:border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
                        <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">1,284</p>
                    <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> +12% from last session
                    </p>
                </div>
                
                <div className="bg-white dark:bg-card p-5 rounded-xl border border-slate-200 dark:border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active this Term</span>
                        <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                            <UserCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">1,240</p>
                    <p className="text-xs text-slate-400 mt-1">96.5% registration rate</p>
                </div>

                <div className="bg-white dark:bg-card p-5 rounded-xl border border-slate-200 dark:border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Admissions</span>
                        <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                            <UserPlus className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">42</p>
                    <p className="text-xs text-slate-400 mt-1">This academic period</p>
                </div>

                <div className="bg-white dark:bg-card p-5 rounded-xl border border-slate-200 dark:border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students at Risk</span>
                        <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">18</p>
                    <p className="text-xs text-red-500 font-medium mt-1">Performance/Attendance alert</p>
                </div>
            </div>

            {/* Filters and Content */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl shadow-sm">
                {/* Filters */}
                <div className="p-4 border-b border-slate-200 dark:border-border flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:max-w-xs">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Search className="w-5 h-5" />
                        </span>
                        <input 
                            type="text" 
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                            placeholder="Search by name or admission no..." 
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 min-w-[120px]">
                            <select className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                                <option>All Classes</option>
                                <option>Grade 5A</option>
                                <option>Grade 5B</option>
                                <option>Grade 4C</option>
                            </select>
                        </div>
                        <div className="relative flex-1 min-w-[120px]">
                            <select className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                                <option>Gender</option>
                                <option>Male</option>
                                <option>Female</option>
                            </select>
                        </div>
                        <div className="relative flex-1 min-w-[140px]">
                            <select className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                                <option>Status</option>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                        </div>
                        
                        <div className="h-9 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                        {/* View Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                title="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {viewMode === 'list' ? (
                        /* Table View */
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-border">
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 w-4">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Student Name</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Admission No.</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Class</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Payment Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {MOCK_STUDENTS.map((student) => (
                                        <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" onClick={() => onNavigate('student-overview')}>
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        className="h-10 w-10 rounded-full bg-slate-200 bg-cover bg-center border border-slate-100" 
                                                        style={{ backgroundImage: `url('${student.image}')` }}
                                                    ></div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{student.name}</p>
                                                        <p className="text-xs text-slate-500">{student.gender}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{student.admissionNo}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{student.grade}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                    student.status === 'Active' 
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' 
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                    student.paymentStatus === 'Paid'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                        : student.paymentStatus === 'Partial'
                                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                                                }`}>
                                                    {student.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); onNavigate('student-overview'); }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" onClick={(e) => e.stopPropagation()}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Grid View */
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-300">
                            {MOCK_STUDENTS.map((student) => (
                                <div key={student.id} className="group bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center text-center relative hover:shadow-md hover:border-primary/30 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer" onClick={() => onNavigate('student-overview')}>
                                    {/* Action Menu */}
                                    <button className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>

                                    {/* Avatar */}
                                    <div 
                                        className="h-20 w-20 rounded-full bg-slate-200 bg-cover bg-center border-4 border-white dark:border-slate-800 shadow-sm mb-3" 
                                        style={{ backgroundImage: `url('${student.image}')` }}
                                    ></div>
                                    
                                    {/* Info */}
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-0.5">{student.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mb-4">{student.admissionNo}</p>
                                    
                                    {/* Status Badges */}
                                    <div className="flex gap-2 mb-6">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            student.status === 'Active' 
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' 
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                        }`}>
                                            {student.status}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            student.paymentStatus === 'Paid'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                : student.paymentStatus === 'Partial'
                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                                        }`}>
                                            {student.paymentStatus}
                                        </span>
                                    </div>

                                    {/* Footer */}
                                    <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Class</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{student.grade}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
                                                onClick={(e) => { e.stopPropagation(); onNavigate('student-overview'); }}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-border flex items-center justify-between">
                    <p className="text-xs text-slate-500">Showing 1 to 4 of 1,284 students</p>
                    <div className="flex items-center gap-2">
                        <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50" disabled>
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1">
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-medium">1</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">2</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">3</button>
                            <span className="text-slate-400 px-1 text-xs">...</span>
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">128</button>
                        </div>
                        <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                <Info className="text-blue-600 dark:text-blue-400 shrink-0 w-6 h-6" />
                <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Data Scoping</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        You are currently viewing student records for the <strong>2nd Term of the 2023/2024 Session</strong>. All academic performance and payment statuses shown are specific to this term. To view historical data, use the term selector in your profile settings.
                    </p>
                </div>
            </div>
        </div>
    );
};
