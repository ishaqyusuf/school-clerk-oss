import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Search, CheckCircle2, CreditCard, AlertTriangle, Plus, PlusCircle, Trash2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui';
import { Student } from '../types';
import { MOCK_STUDENTS } from '../constants';

interface RecordPaymentSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

// Data Models
interface Payable {
    id: string;
    name: string;
    targetStreamId: string;
    payableAmount: number;
    amountPaid: number;
    pendingAmount: number;
    status: 'PAID' | 'PARTIAL' | 'PENDING';
    isFeeItem: boolean;
}

interface Term {
    id: string;
    name: string;
    payables: Payable[];
}

interface StreamEntry {
    id: string;
    streamId: string;
    amount: number;
    payableAmount?: number;
    description: string;
    isAuto?: boolean;
}

const DEFAULT_STREAMS = [
    { id: 's1', name: 'Tuition Revenue' },
    { id: 's2', name: 'Transport Services' },
    { id: 's3', name: 'Uniforms & Store' },
    { id: 's4', name: 'Library Fees' },
    { id: 's5', name: 'General/Other' }
];

const StreamSelect = ({ 
    value, 
    onChange, 
    availableStreams, 
    onAddStream 
}: {
    value: string;
    onChange: (id: string, name: string) => void;
    availableStreams: { id: string; name: string }[];
    onAddStream: (name: string) => string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = availableStreams.find(s => s.id === value);
    const filtered = availableStreams.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelect = (stream: {id: string; name: string}) => {
        onChange(stream.id, stream.name);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreate = () => {
        if (!searchTerm.trim()) return;
        const newId = onAddStream(searchTerm);
        handleSelect({ id: newId, name: searchTerm });
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                className="w-full bg-transparent border border-border rounded-md px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary flex items-center justify-between cursor-text"
                onClick={() => setIsOpen(true)}
            >
                {isOpen ? (
                    <input 
                        autoFocus
                        className="bg-transparent border-none outline-none w-full text-sm placeholder:text-muted-foreground/50"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search or add..."
                    />
                ) : (
                    <span className="text-sm truncate select-none">{selected?.name || 'Select stream...'}</span>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 w-[250px] bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="max-h-[200px] overflow-y-auto">
                        {filtered.map(s => (
                            <div 
                                key={s.id} 
                                className="px-3 py-2 text-sm hover:bg-muted cursor-pointer transition-colors"
                                onClick={() => handleSelect(s)}
                            >
                                {s.name}
                            </div>
                        ))}
                        {searchTerm.trim() && !availableStreams.some(s => s.name.toLowerCase() === searchTerm.toLowerCase()) && (
                            <div 
                                className="px-3 py-2 text-sm hover:bg-primary/10 text-primary border-t border-border cursor-pointer transition-colors flex items-center gap-2"
                                onClick={handleCreate}
                            >
                                <Plus size={14} />
                                Create "{searchTerm}"
                            </div>
                        )}
                        {!searchTerm.trim() && filtered.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No streams found.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface CatalogItem {
    id: string;
    streamId: string;
    description: string;
    cost: number;
}

const DEFAULT_CATALOG: CatalogItem[] = [
    { id: 'c1', streamId: 's3', description: 'Math Textbook', cost: 50 },
    { id: 'c2', streamId: 's3', description: 'Science Kit', cost: 75 },
    { id: 'c3', streamId: 's3', description: 'School Uniform Set', cost: 150 },
    { id: 'c4', streamId: 's2', description: 'Transport - Route A', cost: 200 },
    { id: 'c5', streamId: 's2', description: 'Transport - Route B', cost: 250 },
    { id: 'c6', streamId: 's4', description: 'Library Fee (Annual)', cost: 50 },
];

const DescriptionSelect = ({ 
    value, 
    streamId,
    onChange, 
    onSelectSuggestion,
    catalogItems,
}: {
    value: string;
    streamId: string;
    onChange: (desc: string) => void;
    onSelectSuggestion: (desc: string, cost: number) => void;
    catalogItems: CatalogItem[];
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const relevantItems = catalogItems.filter(i => i.streamId === streamId);
    const filteredItems = relevantItems.filter(i => i.description.toLowerCase().includes(value.toLowerCase()) && i.description !== value);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input 
                type="text"
                className="w-full bg-transparent border border-border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-muted-foreground/50 text-sm"
                placeholder="Description..."
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
            />
            {isOpen && (filteredItems.length > 0 || (value.trim() && !relevantItems.some(i => i.description.toLowerCase() === value.toLowerCase()))) && (
                <div className="absolute z-50 top-full left-0 mt-1 w-[250px] bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="max-h-[200px] overflow-y-auto">
                        {filteredItems.map(item => (
                            <div 
                                key={item.id} 
                                className="px-3 py-2 text-sm hover:bg-muted cursor-pointer transition-colors flex justify-between items-center"
                                onClick={() => {
                                    onSelectSuggestion(item.description, item.cost);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="truncate pr-2">{item.description}</span>
                                <span className="text-muted-foreground font-medium shrink-0">${item.cost.toFixed(2)}</span>
                            </div>
                        ))}
                        {value.trim() && !relevantItems.some(i => i.description.toLowerCase() === value.toLowerCase()) && (
                            <div 
                                className="px-3 py-2 text-sm hover:bg-primary/10 text-primary border-t border-border cursor-pointer transition-colors flex items-center gap-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <Plus size={14} />
                                Create "{value}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Mock generator for student terms
const getMockTermsForStudent = (studentId: string): Term[] => {
    return [
        {
            id: 't1',
            name: 'Term 1 (23/24)',
            payables: [
                { id: 'p1', name: 'Tuition Fee', targetStreamId: 's1', payableAmount: 1000, amountPaid: 1000, pendingAmount: 0, status: 'PAID', isFeeItem: true },
                { id: 'p2', name: 'Bus Service (Route A)', targetStreamId: 's2', payableAmount: 200, amountPaid: 200, pendingAmount: 0, status: 'PAID', isFeeItem: false }
            ]
        },
        {
            id: 't2',
            name: 'Term 2 (23/24)',
            payables: [
                { id: 'p3', name: 'Tuition Fee', targetStreamId: 's1', payableAmount: 1000, amountPaid: 300, pendingAmount: 700, status: 'PARTIAL', isFeeItem: true },
                { id: 'p4', name: 'Uniform Set', targetStreamId: 's3', payableAmount: 250, amountPaid: 0, pendingAmount: 250, status: 'PENDING', isFeeItem: false },
                { id: 'p5', name: 'Library Access', targetStreamId: 's4', payableAmount: 50, amountPaid: 0, pendingAmount: 50, status: 'PENDING', isFeeItem: false }
            ]
        },
        {
            id: 't3',
            name: 'Term 3 (23/24)',
            payables: [
                { id: 'p6', name: 'Tuition Fee', targetStreamId: 's1', payableAmount: 1000, amountPaid: 0, pendingAmount: 1000, status: 'PENDING', isFeeItem: true }
            ]
        }
    ];
};

export const RecordPaymentSheet: React.FC<RecordPaymentSheetProps> = ({ isOpen, onClose }) => {
    // Top Level State
    const [searchQuery, setSearchQuery] = useState('');
    const [studentsData, setStudentsData] = useState<Student[]>(MOCK_STUDENTS);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isCreatingStudent, setIsCreatingStudent] = useState(false);
    
    // Create Student Form State
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentAdminNo, setNewStudentAdminNo] = useState('');
    const [newStudentClass, setNewStudentClass] = useState('Grade 1A');

    // Terms & Payables State
    const [studentTerms, setStudentTerms] = useState<Term[]>([]);
    const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
    
    // selectedPayables maps payable.id to the amount the user is paying right now
    const [selectedPayables, setSelectedPayables] = useState<Record<string, number>>({});
    
    // Stream Allocation State
    const [availableStreams, setAvailableStreams] = useState(DEFAULT_STREAMS);
    const [amountReceived, setAmountReceived] = useState<string>('0.00');
    const [manualAllocations, setManualAllocations] = useState<StreamEntry[]>([]);
    const [autoOverrides, setAutoOverrides] = useState<Record<string, Partial<StreamEntry>>>({});

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSelectedStudent(null);
            setIsCreatingStudent(false);
            setStudentTerms([]);
            setExpandedTermId(null);
            setSelectedPayables({});
            setAmountReceived('0.00');
            setManualAllocations([]);
            setAutoOverrides({});
        }
    }, [isOpen]);

    // Student Search Logic
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return studentsData.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.grade.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, studentsData]);

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setSearchQuery('');
        setIsCreatingStudent(false);
        const terms = getMockTermsForStudent(student.id);
        setStudentTerms(terms);
        // auto expand the first term with pending
        const firstPending = terms.find(t => t.payables.some(p => p.pendingAmount > 0));
        setExpandedTermId(firstPending ? firstPending.id : terms[0]?.id || null);
        setSelectedPayables({});
    };

    const handleCreateNewStudentClick = () => {
        setNewStudentName(searchQuery);
        setNewStudentAdminNo(`SC-NEW-${Math.floor(Math.random() * 1000)}`);
        setIsCreatingStudent(true);
    };

    const confirmCreateStudent = () => {
        const newStudent: Student = {
            id: `new-${Date.now()}`,
            name: newStudentName,
            admissionNo: newStudentAdminNo,
            grade: newStudentClass,
            gender: 'Male', // Default to valid gender, can be edited later
            status: 'Active',
            paymentStatus: 'Unpaid',
            image: `https://picsum.photos/seed/${newStudentName}/100/100`
        };
        setStudentsData(prev => [...prev, newStudent]);
        handleSelectStudent(newStudent);
    };

    // Payables Logic
    const handlePayableToggle = (payable: Payable) => {
        setSelectedPayables(prev => {
            const next = { ...prev };
            if (next[payable.id] !== undefined) {
                delete next[payable.id];
            } else {
                next[payable.id] = payable.pendingAmount; // default to full pending
            }
            return next;
        });
    };

    const handlePayableAmountChange = (payable: Payable, value: string) => {
        const amt = parseFloat(value);
        if (isNaN(amt)) return;
        
        setSelectedPayables(prev => ({
            ...prev,
            [payable.id]: Math.min(amt, payable.pendingAmount) // Max rule
        }));
    };

    // Streams Logic
    const autoAllocations = useMemo(() => {
        const map = new Map<string, { amount: number, payableAmount: number, descriptions: string[] }>();
        Object.entries(selectedPayables).forEach(([pId, amt]) => {
            if (typeof amt === 'number' && amt > 0) {
                // find payable in terms
                let p: Payable | undefined;
                studentTerms.forEach(t => {
                    const found = t.payables.find(px => px.id === pId);
                    if (found) p = found;
                });

                if (p) {
                    if (!map.has(p.targetStreamId)) map.set(p.targetStreamId, { amount: 0, payableAmount: 0, descriptions: [] });
                    map.get(p.targetStreamId)!.amount += amt;
                    map.get(p.targetStreamId)!.payableAmount += p.pendingAmount;
                    map.get(p.targetStreamId)!.descriptions.push(p.name);
                }
            }
        });
        return Array.from(map.entries()).map(([streamId, data]) => ({
            id: `auto-${streamId}`,
            streamId,
            amount: data.amount,
            payableAmount: data.payableAmount,
            description: data.descriptions.join(', '),
            isAuto: true
        }));
    }, [selectedPayables, studentTerms]);

    const activeAllocations = useMemo(() => {
        return autoAllocations.map(auto => ({
            ...auto,
            ...(autoOverrides[auto.id] || {})
        }));
    }, [autoAllocations, autoOverrides]);

    const allStreams = [...activeAllocations, ...manualAllocations];
    
    // Auto-update amountReceived to match total payable selections 
    // IF the user hasn't explicitly unlinked them. 
    // Let's implement a convenience where amount received total keeps up:
    const totalAllocated = allStreams.reduce((sum, s) => sum + s.amount, 0);
    
    useEffect(() => {
       // A realistic nice-to-have: if user adds payables, amountReceived auto-updates to match
       // unless they want to manually type a lesser amount. We will just set it for convenience.
       setAmountReceived(totalAllocated.toFixed(2));
    }, [totalAllocated]);

    const handleEditAutoStream = (id: string, field: keyof StreamEntry, value: any) => {
        setAutoOverrides(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value
            }
        }));
    };

    const handleAddManualStream = () => {
        setManualAllocations(prev => [
            ...prev, 
            { id: `man-${Date.now()}`, streamId: availableStreams[0].id, amount: 0, description: '', isAuto: false }
        ]);
    };

    const handleAddNewStream = (name: string) => {
        const newId = `s-custom-${Date.now()}`;
        setAvailableStreams(prev => [...prev, { id: newId, name }]);
        return newId;
    };

    const handleEditManualStream = (id: string, field: keyof StreamEntry, value: any) => {
        setManualAllocations(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleRemoveManualStream = (id: string) => {
        setManualAllocations(prev => prev.filter(s => s.id !== id));
    };

    const isAmountValid = parseFloat(amountReceived) === totalAllocated && totalAllocated > 0;

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="h-full w-full max-w-[800px] flex flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-none px-6 py-5 border-b border-border bg-card flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold leading-tight tracking-tight">Receive Payment</h2>
                        <p className="text-muted-foreground text-sm font-medium mt-1 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Session 2023/2024 - Term 2
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 dark:bg-background">
                    
                    {/* STUDENT SELECTION SECTION */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold">1. Select Student</label>
                            {selectedStudent && (
                                <button onClick={() => setSelectedStudent(null)} className="text-sm text-primary hover:underline">
                                    Change Student
                                </button>
                            )}
                        </div>

                        {!selectedStudent && !isCreatingStudent && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <input 
                                    className="block w-full rounded-xl border border-border bg-card pl-10 pr-3 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow shadow-sm" 
                                    placeholder="Search by student name, admission no..." 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                
                                {/* Search Dropdown */}
                                {searchQuery && (
                                    <div className="absolute top-full mt-2 w-full bg-card rounded-xl border border-border shadow-lg overflow-hidden z-10 animate-in fade-in slide-in-from-top-2">
                                        {searchResults.length > 0 ? (
                                            <div className="max-h-[300px] overflow-y-auto">
                                                {searchResults.map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        className="px-4 py-3 hover:bg-muted cursor-pointer flex items-center gap-4 transition-colors"
                                                        onClick={() => handleSelectStudent(s)}
                                                    >
                                                        <div className="h-10 w-10 rounded-full bg-cover bg-center border border-border" style={{ backgroundImage: `url('${s.image}')` }} />
                                                        <div>
                                                            <p className="font-bold text-sm">{s.name}</p>
                                                            <p className="text-xs text-muted-foreground">{s.grade} • {s.admissionNo}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                        
                                        {/* Create Action */}
                                        <div 
                                            className="px-4 py-3 bg-primary/5 hover:bg-primary/10 border-t border-border cursor-pointer flex items-center gap-3 transition-colors text-primary"
                                            onClick={handleCreateNewStudentClick}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserPlus className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Create student "{searchQuery}"</p>
                                                <p className="text-xs opacity-80">Add to roster and continue payment</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Created Student Context */}
                        {isCreatingStudent && (
                            <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4 animate-in zoom-in-95">
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <h3 className="font-bold text-base flex items-center gap-2">
                                        <UserPlus className="h-5 w-5 text-primary" />
                                        Quick Enroll Student
                                    </h3>
                                    <button onClick={() => setIsCreatingStudent(false)} className="text-muted-foreground hover:text-foreground">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                                        <input 
                                            className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" 
                                            value={newStudentName}
                                            onChange={(e) => setNewStudentName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground">Admission No (Auto-generated)</label>
                                        <input 
                                            className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" 
                                            value={newStudentAdminNo}
                                            onChange={(e) => setNewStudentAdminNo(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-xs font-medium text-muted-foreground">Class / Grade</label>
                                        <select 
                                            className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                            value={newStudentClass}
                                            onChange={(e) => setNewStudentClass(e.target.value)}
                                        >
                                            <option>Grade 1A</option>
                                            <option>Grade 2B</option>
                                            <option>Grade 3C</option>
                                            <option>Grade 4A</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setIsCreatingStudent(false)}>Cancel</Button>
                                    <Button onClick={confirmCreateStudent}>Save & Continue Payment</Button>
                                </div>
                            </div>
                        )}

                        {/* Selected Student Display */}
                        {selectedStudent && (
                            <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-in zoom-in-95">
                                <div className="flex items-center gap-4">
                                    <div 
                                        className="h-14 w-14 rounded-full bg-cover bg-center border-2 border-border shadow-sm" 
                                        style={{ backgroundImage: `url('${selectedStudent.image}')` }}
                                    ></div>
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-xs font-medium">{selectedStudent.grade}</span>
                                            <span>•</span>
                                            <span>ID: {selectedStudent.admissionNo}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ACADEMIC TERMS & PAYABLES SECTION */}
                    {selectedStudent && (
                        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <label className="block text-sm font-semibold">2. Select Items to Pay</label>
                            
                            {/* Term Tabs (Horizontal Scroll) */}
                            <div className="flex overflow-x-auto pb-2 gap-3 hide-scrollbar w-full">
                                {studentTerms.map(term => {
                                    const totalPaid = term.payables.reduce((s, p) => s + p.amountPaid, 0);
                                    const totalPayable = term.payables.reduce((s, p) => s + p.payableAmount, 0);
                                    const isActive = expandedTermId === term.id;
                                    
                                    return (
                                        <button 
                                            key={term.id}
                                            onClick={() => setExpandedTermId(isActive ? null : term.id)}
                                            className={`flex-shrink-0 flex flex-col items-start px-4 py-3 rounded-xl border transition-all ${
                                                isActive 
                                                    ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                                    : 'bg-card border-border hover:bg-muted text-foreground'
                                            }`}
                                        >
                                            <span className="font-bold text-sm tracking-tight">{term.name}</span>
                                            <span className={`text-xs mt-1 ${isActive ? 'text-primary/70 font-medium' : 'text-muted-foreground'}`}>
                                                ${totalPaid} / ${totalPayable} paid
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Term Payables Detail Panel */}
                            {expandedTermId && (
                                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm animate-in slide-in-from-top-2">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-3 w-10"></th>
                                                <th className="px-4 py-3">Item Description</th>
                                                <th className="px-4 py-3 text-right">Fee</th>
                                                <th className="px-4 py-3 text-right">Pending</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                                <th className="px-4 py-3 text-right w-[140px]">Pay Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {studentTerms.find(t => t.id === expandedTermId)?.payables.map(payable => {
                                                const isFullyPaid = payable.status === 'PAID';
                                                const isSelected = selectedPayables.hasOwnProperty(payable.id);
                                                const currentAmount = selectedPayables[payable.id] !== undefined ? selectedPayables[payable.id] : '';
                                                
                                                return (
                                                    <tr key={payable.id} className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                                                        <td className="px-4 py-4 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50 cursor-pointer"
                                                                disabled={isFullyPaid}
                                                                checked={isSelected}
                                                                onChange={() => handlePayableToggle(payable)}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{payable.name}</span>
                                                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                                                                    {payable.isFeeItem ? 'Core Fee' : 'Additional Charge'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                                                            ${payable.payableAmount.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-4 text-right tabular-nums font-medium text-foreground">
                                                            ${payable.pendingAmount.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                                isFullyPaid ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                                                payable.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                                                                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                            }`}>
                                                                {payable.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="relative">
                                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-muted-foreground text-xs">$</span>
                                                                <input 
                                                                    type="number"
                                                                    disabled={!isSelected}
                                                                    className={`block w-full text-right rounded-md border text-sm font-medium tabular-nums px-2 py-2 pl-6 focus:outline-none focus:ring-2 focus:ring-primary ${
                                                                        isSelected ? 'bg-background border-primary/50 shadow-sm' : 'bg-muted/50 border-transparent text-muted-foreground cursor-not-allowed'
                                                                    }`}
                                                                    value={currentAmount}
                                                                    onChange={(e) => handlePayableAmountChange(payable, e.target.value)}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Term Total Summary Footer */}
                                        <tfoot className="bg-muted/20 border-t border-border">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                    Term Selection Total:
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-primary tabular-nums text-base">
                                                    ${Object.entries(selectedPayables).reduce((acc, [pid, amt]) => {
                                                        const p = studentTerms.find(t => t.id === expandedTermId)?.payables.find(px => px.id === pid);
                                                        return acc + (p && typeof amt === 'number' ? amt : 0);
                                                    }, 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ALLOCATIONS / STREAM POSTING SECTION */}
                    {selectedStudent && (
                        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
                            <label className="block text-sm font-semibold">3. Stream Allocations</label>
                            
                            <div className="rounded-xl border border-border overflow-visible bg-card shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase font-semibold border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 w-[250px] rounded-tl-xl">Stream / Account</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 text-right w-[120px]">Payable</th>
                                            <th className="px-4 py-3 text-right w-[120px]">Amount</th>
                                            <th className="px-4 py-3 w-10 rounded-tr-xl"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {allStreams.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                                    No allocations yet. Select a payable above or add a manual entry.
                                                </td>
                                            </tr>
                                        ) : allStreams.map((stream) => (
                                            <tr key={stream.id} className={`${stream.isAuto ? 'bg-primary/[0.02]' : 'bg-background'}`}>
                                                <td className="px-4 py-2">
                                                    <StreamSelect 
                                                        value={stream.streamId}
                                                        availableStreams={availableStreams}
                                                        onAddStream={handleAddNewStream}
                                                        onChange={(newId: string) => stream.isAuto 
                                                            ? handleEditAutoStream(stream.id, 'streamId', newId)
                                                            : handleEditManualStream(stream.id, 'streamId', newId)
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <DescriptionSelect 
                                                        streamId={stream.streamId}
                                                        value={stream.description}
                                                        catalogItems={DEFAULT_CATALOG}
                                                        onChange={(desc) => stream.isAuto
                                                            ? handleEditAutoStream(stream.id, 'description', desc)
                                                            : handleEditManualStream(stream.id, 'description', desc)
                                                        }
                                                        onSelectSuggestion={(desc, cost) => {
                                                            if (stream.isAuto) {
                                                                handleEditAutoStream(stream.id, 'description', desc);
                                                                handleEditAutoStream(stream.id, 'payableAmount', cost);
                                                                handleEditAutoStream(stream.id, 'amount', cost);
                                                            } else {
                                                                handleEditManualStream(stream.id, 'description', desc);
                                                                handleEditManualStream(stream.id, 'payableAmount', cost);
                                                                handleEditManualStream(stream.id, 'amount', cost);
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-muted-foreground text-xs">$</span>
                                                        <input 
                                                            type="number"
                                                            className="block w-full text-right rounded-md border border-border bg-muted/50 px-2 py-1.5 pl-6 focus:outline-none focus:ring-2 focus:ring-primary font-medium tabular-nums text-muted-foreground"
                                                            value={stream.payableAmount !== undefined ? stream.payableAmount : ''}
                                                            onChange={(e) => stream.isAuto
                                                                ? handleEditAutoStream(stream.id, 'payableAmount', parseFloat(e.target.value) || 0)
                                                                : handleEditManualStream(stream.id, 'payableAmount', parseFloat(e.target.value) || 0)
                                                            }
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-muted-foreground text-xs">$</span>
                                                        <input 
                                                            type="number"
                                                            className="block w-full text-right rounded-md border border-border bg-background px-2 py-1.5 pl-6 focus:outline-none focus:ring-2 focus:ring-primary font-bold tabular-nums text-foreground"
                                                            value={stream.amount || ''}
                                                            onChange={(e) => stream.isAuto
                                                                ? handleEditAutoStream(stream.id, 'amount', parseFloat(e.target.value) || 0)
                                                                : handleEditManualStream(stream.id, 'amount', parseFloat(e.target.value) || 0)
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    {!stream.isAuto && (
                                                        <button 
                                                            onClick={() => handleRemoveManualStream(stream.id)}
                                                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                            title="Remove Manual Stream"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* Stream Totals Footer */}
                                    <tfoot className="bg-muted/30 border-t border-border">
                                        <tr>
                                            <td className="px-4 py-3 rounded-bl-xl">
                                                <button 
                                                    onClick={handleAddManualStream}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                                                >
                                                    <PlusCircle className="w-4 h-4" />
                                                    Add Extra Stream
                                                </button>
                                            </td>
                                            <td colSpan={2} className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                Total Allocated:
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums text-base">
                                                ${totalAllocated.toFixed(2)}
                                            </td>
                                            <td className="rounded-br-xl"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Payment Totals Review */}
                            <div className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                                <div>
                                    <h4 className="font-bold text-sm">Final Receipt Amount</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Edit if cash received differs from allocation</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-40">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground font-bold">$</span>
                                        <input 
                                            type="number"
                                            className="block w-full rounded-lg border-2 border-border bg-background pl-8 pr-3 py-2.5 font-bold text-lg focus:outline-none focus:border-primary focus:ring-0 shadow-sm tabular-nums" 
                                            value={amountReceived}
                                            onChange={(e) => setAmountReceived(e.target.value)}
                                        />
                                    </div>
                                    {!isAmountValid && totalAllocated > 0 && parseFloat(amountReceived) !== totalAllocated && (
                                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 text-xs font-semibold">
                                            <AlertTriangle className="h-4 w-4" />
                                            Mismatch
                                        </div>
                                    )}
                                    {isAmountValid && (
                                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Balanced
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                    
                    <div className="h-10"></div>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary" type="checkbox"/>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Generate & Print Receipt</span>
                    </label>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none font-medium">Cancel</Button>
                        <Button 
                            className="flex-1 sm:flex-none gap-2 font-bold shadow-md" 
                            disabled={!selectedStudent || !isAmountValid} 
                            onClick={onClose}
                        >
                            <CreditCard className="h-4 w-4" />
                            Confirm Payment
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
