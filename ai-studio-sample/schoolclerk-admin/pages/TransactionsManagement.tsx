import React, { useState } from 'react';
import { 
    Search, Filter, Download, Calendar, ArrowUpRight, 
    ArrowDownLeft, MoreHorizontal, Eye, FileText, CheckCircle2, XCircle, Clock,
    Printer
} from 'lucide-react';
import { Button, Card, Badge, Input } from '../components/ui';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';

export const TransactionsManagement = () => {
    // Mock Data State
    const [transactions, setTransactions] = useState([
        { id: 'TXN-8821', date: 'Oct 24, 2023', desc: 'Tuition Payment - 2nd Installment', student: 'John Doe', category: 'School Fees', type: 'credit', amount: 500.00, status: 'completed' },
        { id: 'TXN-8820', date: 'Oct 23, 2023', desc: 'Uniform Purchase (Set of 2)', student: 'Jane Smith', category: 'Uniforms', type: 'credit', amount: 150.00, status: 'completed' },
        { id: 'TXN-8819', date: 'Oct 22, 2023', desc: 'Bank Charges - Monthly', student: 'System', category: 'Bank Fees', type: 'debit', amount: 25.00, status: 'completed' },
        { id: 'TXN-8818', date: 'Oct 22, 2023', desc: 'Textbooks Grade 5', student: 'Michael Brown', category: 'Book Store', type: 'credit', amount: 120.00, status: 'pending' },
        { id: 'TXN-8817', date: 'Oct 21, 2023', desc: 'Plumbing Repairs', student: 'Vendor', category: 'Maintenance', type: 'debit', amount: 450.00, status: 'completed' },
        { id: 'TXN-8816', date: 'Oct 20, 2023', desc: 'Bus Fuel', student: 'Transport', category: 'Operations', type: 'debit', amount: 80.00, status: 'failed' },
        { id: 'TXN-8815', date: 'Oct 19, 2023', desc: 'Development Levy', student: 'Sarah Connor', category: 'Levies', type: 'credit', amount: 200.00, status: 'completed' },
        { id: 'TXN-8814', date: 'Oct 19, 2023', desc: 'Sports Kit Fee', student: 'Tom Hardy', category: 'Sports', type: 'credit', amount: 85.00, status: 'completed' },
    ]);

    const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const handleViewDetails = (txn: typeof transactions[0]) => {
        setSelectedTransaction(txn);
        setIsDetailsOpen(true);
    };

    const handleStatusUpdate = (id: string, newStatus: string) => {
        // Update main list
        setTransactions(prev => prev.map(txn => 
            txn.id === id ? { ...txn, status: newStatus } : txn
        ));
        
        // Update selected item if open so the modal reflects the change immediately
        if (selectedTransaction && selectedTransaction.id === id) {
            setSelectedTransaction({ ...selectedTransaction, status: newStatus });
        }
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transaction Management</h1>
                    <p className="text-muted-foreground text-sm">View, filter, and export financial transactions across all accounts.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button className="gap-2 shadow-sm">
                        <Filter className="h-4 w-4" />
                        Advanced Filter
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search ref, description..." className="pl-9" />
                </div>
                <div className="relative">
                     <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                     <select className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none appearance-none cursor-pointer">
                        <option>This Month</option>
                        <option>Last Month</option>
                        <option>This Term</option>
                        <option>Custom Range</option>
                     </select>
                </div>
                <div>
                     <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer">
                        <option>All Streams</option>
                        <option>School Fees</option>
                        <option>Uniforms</option>
                        <option>Operations</option>
                        <option>Book Store</option>
                     </select>
                </div>
                <div>
                     <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer">
                        <option>All Statuses</option>
                        <option>Completed</option>
                        <option>Pending</option>
                        <option>Failed</option>
                     </select>
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden border-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/30 border-b border-border text-muted-foreground font-medium">
                            <tr>
                                <th className="p-4 whitespace-nowrap"><input type="checkbox" className="rounded border-border" /></th>
                                <th className="p-4 whitespace-nowrap">Transaction Details</th>
                                <th className="p-4 whitespace-nowrap">Category</th>
                                <th className="p-4 whitespace-nowrap">Date</th>
                                <th className="p-4 whitespace-nowrap text-right">Amount</th>
                                <th className="p-4 whitespace-nowrap text-center">Status</th>
                                <th className="p-4 whitespace-nowrap text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {transactions.map((txn) => (
                                <tr key={txn.id} className="hover:bg-muted/20 transition-colors group">
                                    <td className="p-4"><input type="checkbox" className="rounded border-border" /></td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{txn.desc}</span>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span className="font-mono text-primary/80">{txn.id}</span>
                                                <span>•</span>
                                                <span>{txn.student}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge variant="neutral" className="bg-secondary text-secondary-foreground font-normal border border-border">{txn.category}</Badge>
                                    </td>
                                    <td className="p-4 text-muted-foreground">{txn.date}</td>
                                    <td className="p-4 text-right">
                                        <div className={`font-bold ${txn.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                                            {txn.type === 'credit' ? '+' : '-'}${txn.amount.toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center">
                                            {txn.status === 'completed' && <Badge variant="success" className="gap-1 pl-1 pr-2"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>}
                                            {txn.status === 'pending' && <Badge variant="warning" className="gap-1 pl-1 pr-2"><Clock className="h-3 w-3" /> Pending</Badge>}
                                            {txn.status === 'failed' && <Badge variant="neutral" className="bg-red-100 text-red-700 border-red-200 gap-1 pl-1 pr-2"><XCircle className="h-3 w-3" /> Failed</Badge>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                onClick={() => handleViewDetails(txn)}
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                onClick={() => alert(`Printing receipt for ${txn.id}`)}
                                                title="Print Receipt"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="p-4 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Showing 1-8 of 128 transactions</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled>Previous</Button>
                        <Button variant="outline" size="sm">Next</Button>
                    </div>
                </div>
            </Card>
            
            <TransactionDetailsModal 
                isOpen={isDetailsOpen} 
                onClose={() => setIsDetailsOpen(false)} 
                transaction={selectedTransaction}
                onStatusUpdate={handleStatusUpdate}
            />
        </div>
    );
};