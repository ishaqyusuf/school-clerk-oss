import React, { useState } from 'react';
import { 
    Plus, Search, Filter, ArrowUpDown, MoreHorizontal, 
    UserPlus, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import { ClassroomOverviewSheet } from '../components/ClassroomOverviewSheet';

interface ClassroomsListProps {
    onNavigateToSubject: () => void;
}

export const ClassroomsList: React.FC<ClassroomsListProps> = ({ onNavigateToSubject }) => {
    const [selectedClassroom, setSelectedClassroom] = useState<any>(null);

    // Mock Data
    const classrooms = [
        {
            id: '5A',
            name: 'Grade 5A',
            section: 'Primary Section',
            teacher: { 
                name: 'Sarah Jenkins', 
                email: 'sarah.j@school.edu', 
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCq9WSZnPbKy9Yz3asdOfgm4iTXNy6cisXoX3ADxNfEgBX-udLwSoXclyBgChcIwHfFWXt-n9NQgZxqXdfGyz7waAVF0_vh1tIdaPI43GhcVTqYju9bn4YbSXdSE4O_5gQOS_UguflLvlW62HLyqyHCNLJqmyM2upuZJCAcyOdQe9dz3wkhroJfA-KKd28EX3e9a6L1Qi7Ce3Oh3jrmxLcStl166e4tHmLdptAJ8OQCuPmb-ytOG4b5_5lltmbj2c4NQi_o1jHuoxY' 
            },
            students: 28,
            capacity: 30,
            term: 'First Term 2023'
        },
        {
            id: 'JSS1G',
            name: 'JSS 1 Gold',
            section: 'Junior Secondary',
            teacher: { 
                name: 'David Okon', 
                email: 'david.o@school.edu', 
                initials: 'DO', 
                color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
            },
            students: 32,
            capacity: 40,
            term: 'First Term 2023'
        },
        {
            id: 'JSS2S',
            name: 'JSS 2 Silver',
            section: 'Junior Secondary',
            teacher: { 
                name: 'Michael Chen', 
                email: 'm.chen@school.edu', 
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8a3IxIGukPUZqmE-qd_vkhKOkxzckRIOLmnsjnUOiqgBLPShHRvrIGUC-CHJpoPrB-MKFDHSyDeREwTzK_5vkF8fzE-AYzDzXffXd-F8ioRzs42tAm2a2Cu0drIhpO6CeyevyMet6W5UnoGltbvdrbBpYu3lf44ShSNWkp9vQSWvF0jndmPQiE3tK4EnwaTx72eWsjR1-mkJUkMJkQ0KAVAYe9DH-7mTb0ZLxFDmIhyBcrILf4GPDfuAe2IKbBB-vtP1_gUm6ScY' 
            },
            students: 38,
            capacity: 40,
            term: 'First Term 2023'
        },
        {
            id: 'SSS1S',
            name: 'SSS 1 Science',
            section: 'Senior Secondary',
            teacher: { 
                name: 'Elena Andrews', 
                email: 'elena.a@school.edu', 
                initials: 'EA', 
                color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
            },
            students: 15,
            capacity: 35,
            term: 'First Term 2023'
        },
        {
            id: 'SSS1A',
            name: 'SSS 1 Art',
            section: 'Senior Secondary',
            teacher: null,
            students: 0,
            capacity: 35,
            term: 'Setup Pending'
        }
    ];

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Page Heading & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Classrooms</h1>
                    <p className="text-muted-foreground mt-1">Manage class capacities, assigned teachers, and term records.</p>
                </div>
                <Button className="gap-2 shadow-sm shadow-primary/20">
                    <Plus className="h-5 w-5" />
                    Add Classroom
                </Button>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="bg-card p-1 rounded-xl shadow-sm border border-border flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                    <input 
                        className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 rounded-lg" 
                        placeholder="Search by class name or teacher..." 
                        type="text"
                    />
                </div>
                <div className="flex items-center gap-2 p-1 border-t sm:border-t-0 sm:border-l border-border">
                    <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                    <div className="h-4 w-px bg-border"></div>
                    <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowUpDown className="h-4 w-4" />
                        Sort
                    </Button>
                </div>
            </div>

            {/* Data Table Card */}
            <Card className="overflow-hidden border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">Class Name</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">Class Teacher</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">Students / Capacity</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">Active Term</th>
                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-[10%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {classrooms.map((cls) => (
                                <tr 
                                    key={cls.id} 
                                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => setSelectedClassroom(cls)}
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{cls.name}</span>
                                            <span className="text-xs text-muted-foreground">{cls.section}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            {cls.teacher ? (
                                                <>
                                                    {cls.teacher.image ? (
                                                        <div className="h-9 w-9 rounded-full bg-cover bg-center ring-2 ring-background" style={{ backgroundImage: `url('${cls.teacher.image}')` }}></div>
                                                    ) : (
                                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-background ${cls.teacher.color}`}>
                                                            {cls.teacher.initials}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-foreground">{cls.teacher.name}</span>
                                                        <span className="text-xs text-muted-foreground">{cls.teacher.email}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-9 w-9 rounded-full border border-dashed border-muted-foreground/30 bg-transparent flex items-center justify-center text-muted-foreground">
                                                        <UserPlus className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1.5 max-w-[160px]">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm font-medium text-foreground">{cls.students}</span>
                                                <span className="text-xs text-muted-foreground">of {cls.capacity} seats</span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${
                                                        cls.students === 0 ? 'bg-transparent' : 
                                                        (cls.students / cls.capacity) > 0.9 ? 'bg-orange-500' : 'bg-primary'
                                                    }`} 
                                                    style={{ width: `${(cls.students / cls.capacity) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            cls.term === 'Setup Pending' 
                                                ? 'bg-secondary text-muted-foreground border-border' 
                                                : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30'
                                        }`}>
                                            {cls.term}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                <div className="border-t border-border bg-muted/20 px-6 py-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium text-foreground">1</span> to <span className="font-medium text-foreground">{classrooms.length}</span> of <span className="font-medium text-foreground">24</span> classrooms
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" disabled className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            <Button size="sm" className="h-8 w-8 p-0 bg-primary text-primary-foreground">1</Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">2</Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">3</Button>
                            <span className="px-2 text-muted-foreground text-xs">...</span>
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
            
            <ClassroomOverviewSheet 
                isOpen={!!selectedClassroom}
                onClose={() => setSelectedClassroom(null)}
                classroom={selectedClassroom}
                onNavigateToSubject={() => {
                    setSelectedClassroom(null);
                    onNavigateToSubject();
                }}
            />
            
            {/* Spacer */}
            <div className="h-20"></div>
        </div>
    );
};