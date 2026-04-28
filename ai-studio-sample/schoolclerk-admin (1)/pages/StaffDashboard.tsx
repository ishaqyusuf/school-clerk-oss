
import React, { useState } from 'react';
import { 
    LayoutDashboard, Calendar, Clock, GraduationCap, CheckCircle, 
    Settings, Search, Bell, Menu, ChevronRight, Users,
    Banknote, ChevronDown, Activity, List, PlusCircle, FilePlus, X,
    Receipt, School, Wallet, BookOpen, MessageSquare, ClipboardList,
    TrendingUp, Star, Award
} from 'lucide-react';
import { Button } from '../components/ui';
import { Badge } from '../components/ui/badge';

export const StaffDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Staff Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <img 
                            src="https://picsum.photos/seed/sarah/100/100" 
                            alt="Sarah Johnson"
                            className="h-full w-full rounded-2xl object-cover"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Welcome back, Sarah!</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Badge variant="default" className="bg-primary/5 text-primary border-primary/10">Grade 10A Teacher</Badge>
                            <span className="text-xs">•</span>
                            <span className="text-xs">Mathematics Specialist</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2 h-10">
                        <Calendar size={18} />
                        My Schedule
                    </Button>
                    <Button className="gap-2 h-10 shadow-lg shadow-primary/20">
                        <PlusCircle size={18} />
                        Record Attendance
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Assigned Students', value: '32', icon: <Users className="text-blue-500" />, trend: '+2 this week' },
                    { label: 'Avg. Attendance', value: '94%', icon: <CheckCircle className="text-emerald-500" />, trend: 'Stable' },
                    { label: 'Pending Grades', value: '12', icon: <ClipboardList className="text-amber-500" />, trend: 'Due in 2 days' },
                    { label: 'Class Performance', value: 'B+', icon: <TrendingUp className="text-purple-500" />, trend: '+5% improvement' }
                ].map((stat, i) => (
                    <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors">
                                {stat.icon}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.trend}</span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: My Classes & Subjects */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <School size={18} className="text-primary" />
                                My Assigned Classes
                            </h3>
                            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                        </div>
                        <div className="divide-y divide-border">
                            {[
                                { name: 'Grade 10A', students: 32, subject: 'Mathematics', performance: '82%', nextClass: '10:30 AM' },
                                { name: 'Grade 11B', students: 28, subject: 'Further Maths', performance: '78%', nextClass: 'Tomorrow' }
                            ].map((cls, i) => (
                                <div key={i} className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                            {cls.name.split(' ')[1]}
                                        </div>
                                        <div>
                                            <p className="font-bold">{cls.name}</p>
                                            <p className="text-xs text-muted-foreground">{cls.students} Students • {cls.subject}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-emerald-500">{cls.performance}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Next: {cls.nextClass}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                        <h3 className="font-bold mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-primary" />
                            Recent Class Activity
                        </h3>
                        <div className="space-y-6">
                            {[
                                { user: 'Liam Wilson', action: 'submitted Mathematics Assignment', time: '10 mins ago', type: 'submission' },
                                { user: 'Sophia Chen', action: 'achieved 100% in Algebra Quiz', time: '2 hours ago', type: 'achievement' },
                                { user: 'System', action: 'Attendance report generated for 10A', time: '4 hours ago', type: 'system' }
                            ].map((activity, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    {i !== 2 && <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-border" />}
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                                        activity.type === 'submission' ? 'bg-blue-500/10 text-blue-500' :
                                        activity.type === 'achievement' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                        {activity.type === 'submission' ? <FilePlus size={14} /> :
                                         activity.type === 'achievement' ? <Star size={14} /> :
                                         <Settings size={14} />}
                                    </div>
                                    <div className="pb-2">
                                        <p className="text-sm">
                                            <span className="font-bold">{activity.user}</span> {activity.action}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Notifications & Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        <h3 className="font-bold text-primary mb-2">Teacher's Tip</h3>
                        <p className="text-sm text-primary/80 leading-relaxed">
                            "Encouraging students to explain their reasoning out loud can improve retention by up to 40%."
                        </p>
                        <Button variant="ghost" size="sm" className="mt-4 text-primary hover:bg-primary/10 p-0 h-auto font-bold text-xs">
                            Read More Tips <ChevronRight size={14} />
                        </Button>
                    </div>

                    <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Bell size={18} className="text-primary" />
                            Announcements
                        </h3>
                        <div className="space-y-4">
                            {[
                                { title: 'Staff Meeting', date: 'Mar 22, 2:00 PM', priority: 'High' },
                                { title: 'New Curriculum Update', date: 'Mar 25', priority: 'Medium' }
                            ].map((ann, i) => (
                                <div key={i} className="p-3 bg-muted/30 rounded-xl border border-border hover:border-primary/30 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-bold leading-tight">{ann.title}</p>
                                        <Badge variant="default" className="text-[8px] py-0 px-1 uppercase font-bold">{ann.priority}</Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{ann.date}</p>
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" className="w-full mt-4 text-xs">View All Announcements</Button>
                    </div>

                    <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <PlusCircle size={18} className="text-primary" />
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Add Grade', icon: <Award size={16} /> },
                                { label: 'Message Parent', icon: <MessageSquare size={16} /> },
                                { label: 'Upload Resource', icon: <BookOpen size={16} /> },
                                { label: 'Set Homework', icon: <ClipboardList size={16} /> }
                            ].map((action, i) => (
                                <button key={i} className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border hover:bg-primary/5 hover:border-primary/30 transition-all group">
                                    <div className="mb-2 text-muted-foreground group-hover:text-primary transition-colors">
                                        {action.icon}
                                    </div>
                                    <span className="text-[10px] font-bold text-center">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
