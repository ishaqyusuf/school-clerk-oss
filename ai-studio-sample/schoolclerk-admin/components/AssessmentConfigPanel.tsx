import React from 'react';
import { Switch, Input, Button, Card } from './ui';
import { Calendar } from 'lucide-react';

export const AssessmentConfigPanel = () => {
    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">General Information</h3>
                    <Card className="space-y-4 p-5 shadow-sm border-border bg-card">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground" htmlFor="assessment-name">Assessment Name</label>
                            <Input 
                                id="assessment-name" 
                                defaultValue="Mid-Term Assessment" 
                                placeholder="e.g. Mid-Term Assessment" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground" htmlFor="assessment-type">Assessment Type</label>
                            <div className="relative">
                                <select 
                                    id="assessment-type"
                                    className="block w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-primary shadow-sm text-foreground outline-none focus:ring-2 focus:ring-offset-0"
                                >
                                    <option value="test">Test</option>
                                    <option selected value="ca">Continuous Assessment (CA)</option>
                                    <option value="exam">Examination</option>
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </Card>
                </section>

                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Scoring & Grading</h3>
                    <Card className="space-y-6 p-5 shadow-sm border-border bg-card">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground" htmlFor="max-score">Maximum Obtainable Score</label>
                            <div className="relative">
                                <Input 
                                    id="max-score" 
                                    type="number" 
                                    defaultValue={100} 
                                    min={0} 
                                    placeholder="0" 
                                    className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">PTS</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">Scores entered in the sheet will be validated against this value.</p>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-foreground" htmlFor="term-average">Include in Term Average</label>
                                    <p className="text-xs text-muted-foreground">Contributes to the student's final term grade calculation.</p>
                                </div>
                                <Switch checked={true} onChange={() => {}} />
                            </div>
                            
                            <div className="space-y-2 pt-4 border-t border-border">
                                <label className="text-sm font-medium text-foreground" htmlFor="assessment-weight">Weight (0-100%)</label>
                                <div className="relative">
                                    <Input 
                                        id="assessment-weight" 
                                        type="number" 
                                        defaultValue={30} 
                                        min={0} 
                                        max={100} 
                                        placeholder="0" 
                                        className="pr-12"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">%</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">The percentage contribution of this assessment to the final term grade.</p>
                            </div>
                        </div>
                    </Card>
                </section>

                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Scheduling</h3>
                    <Card className="space-y-4 p-5 shadow-sm border-border bg-card">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground" htmlFor="assessment-date">Assessment Date</label>
                            <div className="relative">
                                <Input 
                                    id="assessment-date" 
                                    type="date" 
                                    defaultValue="2024-05-15" 
                                    className="pl-10"
                                />
                                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            </div>
                        </div>
                    </Card>
                </section>
            </div>
            
            <footer className="flex-none bg-card border-t border-border px-6 py-4">
                <div className="flex items-center justify-end gap-3">
                    <Button variant="outline" className="text-muted-foreground">
                        Discard Changes
                    </Button>
                    <Button className="shadow-sm font-semibold">
                        Save Configuration
                    </Button>
                </div>
            </footer>
        </div>
    );
};