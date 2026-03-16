import React from 'react';
import { X, Lock, Check, ChevronDown } from 'lucide-react';
import { Button, Card } from './ui';

interface NewAssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NewAssessmentModal: React.FC<NewAssessmentModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <Card 
                className="w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl border border-border bg-card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">New Assessment</h2>
                        <p className="text-sm text-muted-foreground mt-1">Create a new assessment for this term.</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Term
                        </label>
                        <div className="relative">
                            <input 
                                className="block w-full rounded-lg border border-border bg-muted/50 text-muted-foreground py-2.5 px-3 text-sm focus:ring-0 focus:border-border cursor-not-allowed select-none shadow-sm" 
                                disabled readOnly type="text" value="Term 2, 2024 (Current)"
                            />
                            <Lock className="absolute right-3 top-2.5 text-muted-foreground h-[18px] w-[18px]" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="assessment-name">
                            Assessment Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                            id="assessment-name"
                            className="block w-full rounded-lg border border-border bg-background text-foreground py-2.5 px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all outline-none" 
                            placeholder="e.g. Mid-Term Geometry Quiz" 
                            type="text"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="assessment-type">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select 
                                    id="assessment-type"
                                    className="block w-full rounded-lg border border-border bg-background text-foreground py-2.5 pl-3 pr-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none outline-none"
                                >
                                    <option disabled selected value="">Select type...</option>
                                    <option value="test">Test</option>
                                    <option value="ca">Continuous Assessment (CA)</option>
                                    <option value="exam">Examination</option>
                                    <option value="assignment">Assignment</option>
                                    <option value="project">Project</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                    <ChevronDown className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="max-score">
                                Max Score <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input 
                                    id="max-score"
                                    className="block w-full rounded-lg border border-border bg-background text-foreground py-2.5 pl-3 pr-9 text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all outline-none" 
                                    type="number" max={100} min={0} placeholder="100" 
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-medium text-muted-foreground pt-0.5">pts</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/20 rounded-b-xl border-t border-border">
                    <Button 
                        variant="outline" 
                        onClick={onClose} 
                        className="bg-background border-border text-foreground hover:bg-muted"
                    >
                        Cancel
                    </Button>
                    <Button className="gap-2 shadow-sm font-medium" onClick={onClose}>
                        <Check className="h-[18px] w-[18px]" />
                        Save Assessment
                    </Button>
                </div>
            </Card>
        </div>
    );
};