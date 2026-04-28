
import React from 'react';
import { 
    ChevronLeft, Mail, Phone, MapPin, Calendar, Shield, 
    BookOpen, School, Award, Activity, Clock, FileText,
    MoreVertical, Edit2, Trash2, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { Staff } from '../types';

interface StaffOverviewProps {
    staffId?: string;
    onBack: () => void;
}

// Mock data for a single staff member
const MOCK_STAFF_DETAILS: Staff & { 
    phone: string, 
    address: string, 
    joinedDate: string,
    attendance: string,
    rating: string,
    bio: string
} = {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.j@schoolclerk.com',
    phone: '+1 (555) 123-4567',
    address: '123 Academic Way, Education City',
    role: 'Teacher',
    status: 'Active',
    joinedDate: 'Aug 15, 2023',
    attendance: '98.5%',
    rating: '4.9/5.0',
    bio: 'Dedicated Mathematics teacher with over 8 years of experience in secondary education. Passionate about making complex concepts accessible to all students.',
    permissions: [
        { id: 'p1', type: 'classroom', targetId: 'c1', targetName: 'Grade 10A' },
        { id: 'p2', type: 'subject', targetId: 's1', targetName: 'Mathematics' },
        { id: 'p3', type: 'subject', targetId: 's2', targetName: 'Further Mathematics' }
    ],
    image: 'https://picsum.photos/seed/sarah/200/200'
};

export const StaffOverview = ({ onBack }: StaffOverviewProps) => {
    const member = MOCK_STAFF_DETAILS;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <ChevronLeft size={18} />
                    </div>
                    <span className="text-sm font-medium">Back to Staff List</span>
                </button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Edit2 size={14} />
                        Edit Profile
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 size={14} />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Profile Hero Section */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                <div className="px-8 pb-8 -mt-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                            <div className="h-32 w-32 rounded-3xl border-4 border-card bg-card shadow-xl overflow-hidden">
                                <img 
                                    src={member.image} 
                                    alt={member.name}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="text-center md:text-left pb-2">
                                <div className="flex items-center gap-3 justify-center md:justify-start">
                                    <h1 className="text-3xl font-bold tracking-tight">{member.name}</h1>
                                    <Badge variant="success" className="h-5 px-2">
                                        <CheckCircle2 size={10} className="mr-1" />
                                        {member.status}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground font-medium mt-1">{member.role} • Senior Faculty</p>
                            </div>
                        </div>
                        <div className="flex gap-2 pb-2">
                            <Button className="rounded-xl gap-2">
                                <Mail size={16} />
                                Send Message
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 border-t border-border pt-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Contact Information</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail size={16} className="text-primary" />
                                    <span>{member.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone size={16} className="text-primary" />
                                    <span>{member.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin size={16} className="text-primary" />
                                    <span>{member.address}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Employment Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar size={16} className="text-primary" />
                                    <span className="text-muted-foreground">Joined:</span>
                                    <span className="font-medium">{member.joinedDate}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Shield size={16} className="text-primary" />
                                    <span className="text-muted-foreground">Access Level:</span>
                                    <Badge variant="neutral" className="text-[10px]">{member.role}</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Clock size={16} className="text-primary" />
                                    <span className="text-muted-foreground">Work Type:</span>
                                    <span className="font-medium">Full-time</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Performance Metrics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/30 p-3 rounded-2xl border border-border">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Attendance</p>
                                    <p className="text-xl font-bold text-emerald-500">{member.attendance}</p>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-2xl border border-border">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Rating</p>
                                    <p className="text-xl font-bold text-amber-500">{member.rating}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Bio & Permissions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-primary" />
                            Professional Biography
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {member.bio}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Shield size={20} className="text-primary" />
                                Assigned Permissions
                            </h3>
                            <Button variant="outline" size="sm">Manage Access</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {member.permissions.map(p => (
                                <div key={p.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border hover:border-primary/30 transition-colors group">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                        {p.type === 'classroom' ? <School size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{p.targetName}</p>
                                        <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{p.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Recent Activity & Documents */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-primary" />
                            Recent Activity
                        </h3>
                        <div className="space-y-6">
                            {[
                                { action: 'Uploaded Grade 10A Math Results', time: '2 hours ago' },
                                { action: 'Updated Attendance for Grade 11B', time: 'Yesterday' },
                                { action: 'Requested Leave for April 12th', time: '3 days ago' }
                            ].map((activity, i) => (
                                <div key={i} className="flex gap-3 relative">
                                    {i !== 2 && <div className="absolute left-2 top-6 bottom-[-24px] w-px bg-border" />}
                                    <div className="h-4 w-4 rounded-full bg-primary/20 border-2 border-primary shrink-0 z-10" />
                                    <div>
                                        <p className="text-xs font-medium leading-tight">{activity.action}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-primary" />
                            Documents
                        </h3>
                        <div className="space-y-3">
                            {[
                                { name: 'Employment_Contract.pdf', size: '1.2 MB' },
                                { name: 'Academic_Certificates.zip', size: '4.5 MB' },
                                { name: 'Performance_Review_2024.pdf', size: '850 KB' }
                            ].map((doc, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-transparent hover:border-border transition-all cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className="text-muted-foreground group-hover:text-primary" />
                                        <div>
                                            <p className="text-xs font-medium truncate max-w-[120px]">{doc.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{doc.size}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreVertical size={14} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" className="w-full mt-4 text-xs">Upload New Document</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
