import React from 'react';
import { X, Printer, Download, Share2, CheckCircle2, Clock, XCircle, CreditCard, User, FileText } from 'lucide-react';
import { Button, Card, Badge } from './ui';

interface Transaction {
    id: string;
    date: string;
    desc: string;
    student: string;
    category: string;
    type: string;
    amount: number;
    status: string;
}

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onStatusUpdate: (id: string, newStatus: string) => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ isOpen, onClose, transaction, onStatusUpdate }) => {
    if (!isOpen || !transaction) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <Card 
                className="w-full max-w-[500px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl border-0 bg-background"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Transaction Details</h2>
                            <p className="text-xs text-muted-foreground font-mono">{transaction.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount & Status */}
                    <div className="flex flex-col items-center justify-center py-6 bg-muted/20 rounded-xl border border-border relative">
                        <span className="text-sm font-medium text-muted-foreground mb-1">Total Amount</span>
                        <h1 className={`text-4xl font-bold tracking-tight ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </h1>
                         <div className="mt-4 flex items-center gap-2">
                            {transaction.status === 'completed' && <Badge variant="success" className="gap-1 pl-1 pr-2 py-1"><CheckCircle2 className="h-3.5 w-3.5" /> Successful</Badge>}
                            {transaction.status === 'pending' && <Badge variant="warning" className="gap-1 pl-1 pr-2 py-1"><Clock className="h-3.5 w-3.5" /> Pending</Badge>}
                            {transaction.status === 'failed' && <Badge variant="neutral" className="bg-red-100 text-red-700 border-red-200 gap-1 pl-1 pr-2 py-1"><XCircle className="h-3.5 w-3.5" /> Failed</Badge>}
                         </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Date & Time</label>
                                <p className="text-sm font-semibold">{transaction.date}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Category</label>
                                <p className="text-sm font-semibold">{transaction.category}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-semibold">Bank Transfer</p>
                                </div>
                            </div>
                            
                            {/* Status Updater */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    Update Status
                                </label>
                                <select 
                                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                    value={transaction.status}
                                    onChange={(e) => onStatusUpdate(transaction.id, e.target.value)}
                                >
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-border/50">
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <p className="text-sm font-semibold">{transaction.desc}</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Student / Payer</label>
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                    <User className="h-3 w-3" />
                                </div>
                                <p className="text-sm font-semibold">{transaction.student}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-border bg-muted/10 flex justify-between gap-3">
                    <Button variant="outline" className="gap-2 text-xs" onClick={() => alert('Receipt downloading...')}>
                        <Printer className="h-4 w-4" />
                        Print Receipt
                    </Button>
                     <Button variant="outline" className="gap-2 text-xs">
                        <Share2 className="h-4 w-4" />
                        Share
                    </Button>
                </div>
            </Card>
        </div>
    );
};