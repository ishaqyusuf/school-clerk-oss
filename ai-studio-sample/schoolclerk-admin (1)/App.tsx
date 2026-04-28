
import React, { useState } from 'react';
import { 
    LayoutDashboard, Calendar, Clock, GraduationCap, CheckCircle, 
    Settings, Search, Bell, Menu, ChevronRight, Users,
    Banknote, ChevronDown, Activity, List, PlusCircle, FilePlus, X,
    Receipt, School, Wallet
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { SessionDetails } from './pages/SessionDetails';
import { ConfigureTerm } from './pages/ConfigureTerm';
import { DataMigration } from './pages/DataMigration';
import { StudentsList } from './pages/StudentsList';
import { StudentOverview } from './pages/StudentOverview';
import { AccountStreams } from './pages/AccountStreams';
import { StreamDetails } from './pages/StreamDetails';
import { TransactionsManagement } from './pages/TransactionsManagement';
import { ClassroomsList } from './pages/ClassroomsList';
import { SubjectOverview } from './pages/SubjectOverview';
import { AssessmentRecord } from './pages/AssessmentRecord';
import { RemunerationOverview } from './pages/RemunerationOverview';
import { VariableWages } from './pages/VariableWages';
import { StaffPaymentEntry } from './pages/StaffPaymentEntry';
import { PayrollProcessing } from './pages/PayrollProcessing';
import { StaffList } from './pages/StaffList';
import { StaffDashboard } from './pages/StaffDashboard';
import { StaffOverview } from './pages/StaffOverview';
import { CreateSessionModal } from './components/CreateSessionModal';
import { RecordPaymentSheet } from './components/RecordPaymentSheet';
import { InternalTransferModal } from './components/InternalTransferModal';
import { ServicePaymentModal } from './components/ServicePaymentModal';
import { Button } from './components/ui';

type Page = 
    | 'dashboard' 
    | 'details' 
    | 'configure-term'
    | 'data-migration'
    | 'students' 
    | 'student-overview' 
    | 'accounting' 
    | 'accounting-details' 
    | 'transactions' 
    | 'classrooms' 
    | 'subject-overview' 
    | 'assessment-record'
    | 'remuneration'
    | 'variable-wages'
    | 'staff-payment-entry'
    | 'payroll'
    | 'staff'
    | 'staff-dashboard'
    | 'staff-overview';

// Helper Components for Navigation
const NavSectionHeader = ({ label }: { label: string }) => (
    <div className="px-3 mb-2 mt-5 text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
        {label}
    </div>
);

const NavItem = ({ 
    icon, 
    label, 
    active, 
    onClick 
}: { 
    icon: React.ReactNode, 
    label: string, 
    active?: boolean, 
    onClick?: () => void 
}) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            active 
                ? 'bg-primary/10 text-primary shadow-sm' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const SubNavItem = ({ 
    icon, 
    label, 
    active, 
    onClick 
}: { 
    icon: React.ReactNode, 
    label: string, 
    active?: boolean, 
    onClick?: () => void 
}) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            active 
                ? 'text-primary bg-primary/5' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export default function App() {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedStreamId, setSelectedStreamId] = useState<string>(''); // For accounting drill-down
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
    
    // Sidebar Expansion State
    const [isAccountingExpanded, setIsAccountingExpanded] = useState(true);

    // Navigation Handlers
    const handleNavigate = (page: string) => {
        setCurrentPage(page as Page);
        // Close mobile sidebar on navigation
        setIsSidebarOpen(false);
    };

    const handleViewStream = (streamId: string) => {
        setSelectedStreamId(streamId);
        setCurrentPage('accounting-details');
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out flex flex-col
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:translate-x-0
            `}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold leading-none">SchoolClerk</h1>
                                <p className="text-muted-foreground text-xs font-normal">Admin Portal</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto -mx-2 px-2 pb-6 space-y-1">
                        {/* Main Section */}
                        <div className="mb-2">
                             <NavItem 
                                icon={<LayoutDashboard size={18} />} 
                                label="Overview" 
                                active={currentPage === 'dashboard'} 
                                onClick={() => handleNavigate('dashboard')} 
                            />
                        </div>

                        {/* Academic Section */}
                        <NavSectionHeader label="Academic" />
                        <NavItem 
                            icon={<Calendar size={18} />} 
                            label="Academic Sessions" 
                            active={['details', 'configure-term', 'data-migration'].includes(currentPage)} 
                            onClick={() => handleNavigate('dashboard')} 
                        />
                        <NavItem 
                            icon={<School size={18} />} 
                            label="Classrooms" 
                            active={['classrooms', 'subject-overview', 'assessment-record'].includes(currentPage)}
                            onClick={() => handleNavigate('classrooms')} 
                        />
                        <NavItem icon={<Clock size={18} />} label="Term Management" />
                        <NavItem icon={<GraduationCap size={18} />} label="Grading" />
                        <NavItem icon={<CheckCircle size={18} />} label="Attendance" />

                        {/* People Section */}
                        <NavSectionHeader label="People" />
                        <NavItem 
                            icon={<Users size={18} />} 
                            label="Students" 
                            active={currentPage === 'students' || currentPage === 'student-overview'} 
                            onClick={() => handleNavigate('students')} 
                        />
                        <NavItem 
                            icon={<Users size={18} />} 
                            label="Staff" 
                            active={currentPage === 'staff'} 
                            onClick={() => handleNavigate('staff')} 
                        />

                        {/* Finance Section */}
                        <NavSectionHeader label="Finance" />
                        <div className="flex flex-col gap-0.5">
                            <button 
                                onClick={() => setIsAccountingExpanded(!isAccountingExpanded)}
                                className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    ['accounting', 'accounting-details', 'transactions', 'remuneration', 'payroll', 'variable-wages', 'staff-payment-entry'].includes(currentPage)
                                        ? 'bg-primary/10 text-primary' 
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Banknote size={18} />
                                    <span>Accounting</span>
                                </div>
                                {isAccountingExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            
                            {(isAccountingExpanded || ['accounting', 'accounting-details', 'transactions', 'remuneration', 'payroll', 'variable-wages', 'staff-payment-entry'].includes(currentPage)) && (
                                <div className="ml-4 pl-3 border-l border-border space-y-0.5 mt-1 animate-in slide-in-from-top-1 duration-200">
                                    <SubNavItem 
                                        icon={<Activity size={15} />}
                                        label="Account Streams" 
                                        active={currentPage === 'accounting' || currentPage === 'accounting-details'}
                                        onClick={() => handleNavigate('accounting')}
                                    />
                                    <SubNavItem 
                                        icon={<Wallet size={15} />}
                                        label="Remuneration"
                                        active={['remuneration', 'variable-wages', 'staff-payment-entry'].includes(currentPage)}
                                        onClick={() => handleNavigate('remuneration')}
                                    />
                                    <SubNavItem 
                                        icon={<CheckCircle size={15} />}
                                        label="Payroll"
                                        active={currentPage === 'payroll'}
                                        onClick={() => handleNavigate('payroll')}
                                    />
                                    <SubNavItem 
                                        icon={<Receipt size={15} />}
                                        label="Transactions"
                                        active={currentPage === 'transactions'}
                                        onClick={() => handleNavigate('transactions')}
                                    />
                                    <SubNavItem 
                                        icon={<PlusCircle size={15} />}
                                        label="Record Payment" 
                                        onClick={() => {
                                            setIsPaymentSheetOpen(true);
                                            setIsSidebarOpen(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* System Section */}
                        <NavSectionHeader label="System" />
                        <NavItem icon={<Settings size={18} />} label="Settings" />

                        {/* Staff Example Section */}
                        <NavSectionHeader label="Staff Portal (Demo)" />
                        <NavItem 
                            icon={<LayoutDashboard size={18} />} 
                            label="Staff Dashboard" 
                            active={currentPage === 'staff-dashboard'} 
                            onClick={() => handleNavigate('staff-dashboard')} 
                        />
                    </nav>

                    <div className="mt-auto pt-6 border-t border-border flex-shrink-0">
                        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                            <div 
                                className="h-9 w-9 rounded-full bg-cover bg-center border border-border shrink-0"
                                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCzu_5cYKeBi54BMUCs2C5onmi-oZvnswt3BDiB_ee0oyq39iQrcoHL17UWdSu1bIQOnuhtr4e8sdrwMS0RCBP70BY4f145GakyfjOQPtYMyEcfv8B5orNdO3")' }}
                            ></div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold truncate">Jane Anderson</span>
                                <span className="text-xs text-muted-foreground truncate">School Admin</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="font-bold">SchoolClerk</span>
                    <div className="w-6" /> {/* Spacer for centering */}
                </div>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {currentPage === 'dashboard' && (
                        <Dashboard 
                            onNavigate={(page) => handleNavigate(page)} 
                            onOpenModal={() => setIsModalOpen(true)} 
                        />
                    )}
                    {currentPage === 'details' && (
                        <SessionDetails onBack={() => handleNavigate('dashboard')} />
                    )}
                    {currentPage === 'configure-term' && (
                        <ConfigureTerm 
                            onBack={() => handleNavigate('dashboard')} 
                            onNext={() => handleNavigate('data-migration')}
                        />
                    )}
                    {currentPage === 'data-migration' && (
                        <DataMigration 
                            onBack={() => handleNavigate('configure-term')} 
                            onNext={() => handleNavigate('dashboard')} // Fallback or next step
                        />
                    )}
                    {currentPage === 'students' && (
                        <StudentsList onNavigate={() => handleNavigate('student-overview')} />
                    )}
                    {currentPage === 'student-overview' && (
                        <StudentOverview onBack={() => handleNavigate('students')} />
                    )}
                    {currentPage === 'accounting' && (
                        <AccountStreams 
                            onViewStatement={handleViewStream} 
                            onRecordPayment={() => setIsPaymentSheetOpen(true)}
                            onOpenTransfer={() => setIsTransferModalOpen(true)}
                        />
                    )}
                    {currentPage === 'accounting-details' && (
                        <StreamDetails 
                            streamId={selectedStreamId} 
                            onBack={() => handleNavigate('accounting')} 
                            onRecordPayment={() => {
                                if (selectedStreamId === 'operations') {
                                    setIsServiceModalOpen(true);
                                } else {
                                    setIsPaymentSheetOpen(true);
                                }
                            }}
                            onOpenTransfer={() => setIsTransferModalOpen(true)}
                        />
                    )}
                    {currentPage === 'remuneration' && (
                        <RemunerationOverview onNavigate={handleNavigate} />
                    )}
                    {currentPage === 'variable-wages' && (
                        <VariableWages onNavigate={handleNavigate} />
                    )}
                    {currentPage === 'staff-payment-entry' && (
                        <StaffPaymentEntry onBack={() => handleNavigate('remuneration')} />
                    )}
                    {currentPage === 'payroll' && (
                        <PayrollProcessing />
                    )}
                    {currentPage === 'transactions' && (
                        <TransactionsManagement />
                    )}
                    {currentPage === 'classrooms' && (
                        <ClassroomsList 
                            onNavigateToSubject={() => handleNavigate('subject-overview')}
                        />
                    )}
                    {currentPage === 'subject-overview' && (
                        <SubjectOverview 
                            onBack={() => handleNavigate('classrooms')}
                            onNavigateToAssessment={() => handleNavigate('assessment-record')}
                        />
                    )}
                    {currentPage === 'assessment-record' && (
                        <AssessmentRecord 
                            onBack={() => handleNavigate('subject-overview')}
                        />
                    )}
                    {currentPage === 'staff' && (
                        <StaffList onNavigateToOverview={(id) => {
                            setSelectedStaffId(id);
                            handleNavigate('staff-overview');
                        }} />
                    )}
                    {currentPage === 'staff-overview' && (
                        <StaffOverview 
                            staffId={selectedStaffId || undefined} 
                            onBack={() => handleNavigate('staff')} 
                        />
                    )}
                    {currentPage === 'staff-dashboard' && (
                        <StaffDashboard />
                    )}
                </div>
            </main>

            {/* Modals & Sheets */}
            <CreateSessionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
            
            <RecordPaymentSheet 
                isOpen={isPaymentSheetOpen} 
                onClose={() => setIsPaymentSheetOpen(false)} 
            />

            <InternalTransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
            />

            <ServicePaymentModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
            />
        </div>
    );
}
