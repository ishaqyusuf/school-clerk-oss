import React from 'react';
import { X, Calendar, Settings } from 'lucide-react';
import { Button, Input, Card } from './ui';

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <Card 
                className="w-full max-w-[560px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl border-0"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Create New Academic Session</h2>
                        <p className="text-sm text-muted-foreground mt-1">Set up the dates and term structure for the upcoming school year.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Session Name</label>
                        <Input placeholder="e.g., 2025/2026" className="h-12 text-base" />
                        <p className="text-xs text-muted-foreground">This is the unique identifier for the academic year.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Academic Year Start</label>
                            <div className="relative">
                                <Input type="date" className="h-12 pl-10" />
                                <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Academic Year End</label>
                            <div className="relative">
                                <Input type="date" className="h-12 pl-10" />
                                <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="flex items-center gap-2 pb-3 border-b border-border mb-4">
                            <Settings className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-base">Term Configuration</h3>
                        </div>
                        
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 flex gap-4 items-start">
                            <div className="pt-1">
                                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-border text-primary focus:ring-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Initialize with Terms</h4>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                    Automatically create 1st, 2nd, and 3rd terms based on school-wide standard defaults. You can adjust specific term dates later.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-muted/30 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="h-11 px-6">Cancel</Button>
                    <Button className="h-11 px-8 shadow-md">Create Session</Button>
                </div>
            </Card>
        </div>
    );
};