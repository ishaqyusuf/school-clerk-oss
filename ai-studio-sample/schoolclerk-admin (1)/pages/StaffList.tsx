
import React, { useState } from 'react';
import { 
    Users, Plus, Search, Filter, MoreVertical, Mail, Shield, 
    CheckCircle2, XCircle, ChevronRight, BookOpen, School, Trash2, Edit2
} from 'lucide-react';
import { Button } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { Staff, Permission } from '../types';

const MOCK_STAFF: Staff[] = [
    {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah.j@schoolclerk.com',
        role: 'Teacher',
        status: 'Active',
        permissions: [
            { id: 'p1', type: 'classroom', targetId: 'c1', targetName: 'Grade 10A' },
            { id: 'p2', type: 'subject', targetId: 's1', targetName: 'Mathematics' }
        ],
        image: 'https://picsum.photos/seed/sarah/100/100'
    },
    {
        id: '2',
        name: 'Robert Smith',
        email: 'robert.s@schoolclerk.com',
        role: 'Teacher',
        status: 'Active',
        permissions: [
            { id: 'p3', type: 'classroom', targetId: 'c2', targetName: 'Grade 11B' }
        ],
        image: 'https://picsum.photos/seed/robert/100/100'
    },
    {
        id: '3',
        name: 'Emily Davis',
        email: 'emily.d@schoolclerk.com',
        role: 'Accountant',
        status: 'Active',
        permissions: [],
        image: 'https://picsum.photos/seed/emily/100/100'
    }
];

export const StaffList = ({ onNavigateToOverview }: { onNavigateToOverview: (id: string) => void }) => {
    const [staff, setStaff] = useState<Staff[]>(MOCK_STAFF);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form states for enrollment/edit
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'Teacher' as Staff['role']
    });

    const filteredStaff = staff.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEnrollClick = () => {
        setIsEditing(false);
        setFormData({ name: '', email: '', role: 'Teacher' });
        setIsEnrollModalOpen(true);
    };

    const handleEditClick = (member: Staff) => {
        setIsEditing(true);
        setSelectedStaff(member);
        setFormData({
            name: member.name,
            email: member.email,
            role: member.role
        });
        setIsEnrollModalOpen(true);
    };

    const handleDeleteClick = (member: Staff) => {
        setStaffToDelete(member);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (staffToDelete) {
            setStaff(prev => prev.filter(s => s.id !== staffToDelete.id));
            setIsDeleteModalOpen(false);
            setStaffToDelete(null);
        }
    };

    const handleSaveStaff = () => {
        if (isEditing && selectedStaff) {
            setStaff(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, ...formData } : s));
        } else {
            const newStaff: Staff = {
                id: Math.random().toString(36).substr(2, 9),
                ...formData,
                status: 'Active',
                permissions: [],
                image: `https://picsum.photos/seed/${formData.name}/100/100`
            };
            setStaff(prev => [...prev, newStaff]);
        }
        setIsEnrollModalOpen(false);
    };

    const handleAddPermission = (staffId: string, permission: Omit<Permission, 'id'>) => {
        setStaff(prev => prev.map(s => {
            if (s.id === staffId) {
                return {
                    ...s,
                    permissions: [...s.permissions, { ...permission, id: Math.random().toString(36).substr(2, 9) }]
                };
            }
            return s;
        }));
    };

    const handleRemovePermission = (staffId: string, permissionId: string) => {
        setStaff(prev => prev.map(s => {
            if (s.id === staffId) {
                return {
                    ...s,
                    permissions: s.permissions.filter(p => p.id !== permissionId)
                };
            }
            return s;
        }));
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
                    <p className="text-muted-foreground">Enroll staff members and manage their access permissions.</p>
                </div>
                <Button onClick={handleEnrollClick} className="gap-2">
                    <Plus size={18} />
                    Enroll New Staff
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{staff.length}</p>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Active Teachers</p>
                    <p className="text-2xl font-bold">{staff.filter(s => s.role === 'Teacher').length}</p>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Admin Staff</p>
                    <p className="text-2xl font-bold">{staff.filter(s => s.role === 'Admin' || s.role === 'Accountant').length}</p>
                </div>
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Pending Access</p>
                    <p className="text-2xl font-bold text-amber-500">2</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <input 
                        type="text"
                        placeholder="Search staff by name or email..."
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="secondary" className="gap-2">
                    <Filter size={18} />
                    Filters
                </Button>
            </div>

            {/* Staff Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-bottom border-border">
                                <th className="px-6 py-4 text-sm font-semibold">Staff Member</th>
                                <th className="px-6 py-4 text-sm font-semibold">Role</th>
                                <th className="px-6 py-4 text-sm font-semibold">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold">Permissions</th>
                                <th className="px-6 py-4 text-sm font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredStaff.map((member) => (
                                <tr key={member.id} className="hover:bg-muted/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={member.image} 
                                                alt={member.name}
                                                className="h-10 w-10 rounded-full object-cover border border-border"
                                                referrerPolicy="no-referrer"
                                            />
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="neutral" className="font-normal">
                                            {member.role}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            {member.status === 'Active' ? (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            ) : (
                                                <XCircle size={14} className="text-muted-foreground" />
                                            )}
                                            <span className="text-sm">{member.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                                            {member.permissions.length > 0 ? (
                                                member.permissions.map(p => (
                                                    <Badge key={p.id} variant="default" className="text-[10px] py-0 px-1.5 gap-1">
                                                        {p.type === 'classroom' ? <School size={10} /> : <BookOpen size={10} />}
                                                        {p.targetName}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No specific permissions</span>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    setSelectedStaff(member);
                                                    setIsPermissionModalOpen(true);
                                                }}
                                                className="text-[10px] text-primary hover:underline font-medium"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="h-8 px-3 text-xs gap-1.5"
                                                onClick={() => onNavigateToOverview(member.id)}
                                            >
                                                <ChevronRight size={14} />
                                                View Profile
                                            </Button>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleEditClick(member)}
                                            >
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteClick(member)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Permission Management Modal */}
            {isPermissionModalOpen && selectedStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Manage Permissions</h2>
                                <p className="text-sm text-muted-foreground">{selectedStaff.name}</p>
                            </div>
                            <button onClick={() => setIsPermissionModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current Access</h3>
                                <div className="space-y-2">
                                    {selectedStaff.permissions.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                    {p.type === 'classroom' ? <School size={16} /> : <BookOpen size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{p.targetName}</p>
                                                    <p className="text-[10px] uppercase text-muted-foreground">{p.type}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemovePermission(selectedStaff.id, p.id)}
                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {selectedStaff.permissions.length === 0 && (
                                        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                                            <Shield className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                            <p className="text-sm text-muted-foreground">No permissions assigned yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add New Permission</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button 
                                        variant="outline" 
                                        className="justify-start gap-2 h-auto py-3 px-4"
                                        onClick={() => handleAddPermission(selectedStaff.id, { type: 'classroom', targetId: 'new', targetName: 'Grade 12C' })}
                                    >
                                        <School size={18} />
                                        <div className="text-left">
                                            <p className="text-xs font-bold">Classroom</p>
                                            <p className="text-[10px] text-muted-foreground">Assign to a class</p>
                                        </div>
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="justify-start gap-2 h-auto py-3 px-4"
                                        onClick={() => handleAddPermission(selectedStaff.id, { type: 'subject', targetId: 'new', targetName: 'Physics' })}
                                    >
                                        <BookOpen size={18} />
                                        <div className="text-left">
                                            <p className="text-xs font-bold">Subject</p>
                                            <p className="text-[10px] text-muted-foreground">Assign to a subject</p>
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                            <Button onClick={() => setIsPermissionModalOpen(false)}>Done</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enrollment Modal */}
            {isEnrollModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold">{isEditing ? 'Edit Staff Member' : 'Enroll Staff Member'}</h2>
                            <button onClick={() => setIsEnrollModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" 
                                    placeholder="e.g. John Doe" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <input 
                                    type="email" 
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" 
                                    placeholder="john@example.com" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select 
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Staff['role'] })}
                                >
                                    <option value="Teacher">Teacher</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Accountant">Accountant</option>
                                    <option value="Principal">Principal</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setIsEnrollModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleSaveStaff}>
                                {isEditing ? 'Save Changes' : 'Complete Enrollment'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && staffToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 text-center">
                            <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Delete Staff Member?</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Are you sure you want to delete <span className="font-bold text-foreground">{staffToDelete.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                                <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Delete Staff</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
