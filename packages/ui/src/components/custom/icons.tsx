import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Image as media,
  Laptop,
  Loader2,
  LucideProps,
  Moon,
  MoreVertical,
  Pizza,
  Plus,
  Settings,
  SunMedium,
  Trash,
  Twitter,
  User,
  X,
  type LucideIcon,
  EyeOff,
  Eye,
  Menu,
  Pencil,
  BadgeDollarSign,
  ClipboardEdit,
  ShoppingBag,
  Banknote,
  Package,
  Construction,
  ArrowLeft,
  BookOpen,
  Printer,
  Save,
  FolderClosed,
  MoreVerticalIcon,
  Settings2,
  LayoutDashboard,
  Cog,
  FolderGit2,
  Home,
  NewspaperIcon,
  Pin,
  Cpu,
  ClipboardList,
  LayoutTemplate,
  Briefcase,
  Truck,
  PackageOpen,
  Merge,
  Percent,
  Delete,
  Mail,
  Layers,
  Eraser,
  Edit2,
  ArrowUp,
  ArrowDown,
  Move,
  Rocket,
  Phone,
  MapPin,
  Info,
  Timer,
  Receipt,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ImageIcon,
  Send,
  LineChart,
  Box,
  Download,
  MoreHorizontal,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserCircle,
  ShieldIcon,
  TimerIcon,
  Users,
  Flag,
  Smartphone,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  SortDesc,
  Activity,
} from "lucide-react";
import {
  Award,
  BarChart,
  Book,
  CalendarCheck,
  Coins,
  GraduationCap,
  List,
  MenuIcon,
  MessageSquare,
  School,
  Shield,
  Speaker,
  UserPlus,
  Wallet,
} from "lucide-react";

import { Cross2Icon, DashboardIcon } from "@radix-ui/react-icons";

import { cva, VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

export type Icon = LucideIcon;
type SVGIconProps = {
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  viewBox?: string;
};
export const PaymentMethodIcon = {
  link: Smartphone,
  cash: Banknote,
  zelle: Smartphone,
  terminal: CreditCard,
  check: Building,
  others: DollarSign,
  wallet: Banknote,
};
const SVGIcon: React.FC<SVGIconProps> = ({
  size = 20,
  stroke = "currentColor",
  fill = "currentColor",
  strokeWidth = 0.25,
  className,
  children,
  viewBox,
}) => {
  const intrinsicContentDimension = 20;
  const defaultViewBox = `0 0 ${intrinsicContentDimension} ${intrinsicContentDimension}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox || defaultViewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
};
export const LogoIcons = {
  // Variant 1: Monogram SC with cap above the S (geometric cap, minimal tassel)
  Variant1: {
    LogoSm: (props: any) => (
      <svg
        width="48"
        height="48"
        viewBox="0 0 64 64"
        role="img"
        aria-label="SchoolClerk"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <g fill="none" fillRule="evenodd">
          {/* cap */}
          <polygon
            points="32,8 6,22 32,36 58,22"
            fill="currentColor"
            transform="translate(0,2)"
          />
          {/* tassel */}
          <rect
            x="41"
            y="26"
            width="2"
            height="10"
            fill="currentColor"
            rx="1"
          />
          <circle cx="43" cy="37" r="1.8" fill="currentColor" />
          {/* monogram SC */}
          <text
            x="50%"
            y="68%"
            textAnchor="middle"
            fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight="600"
            fontSize="22"
            fill="currentColor"
            dominantBaseline="middle"
          >
            SC
          </text>
        </g>
      </svg>
    ),

    Logo: (props: any) => (
      <svg
        width="360"
        height="40"
        viewBox="0 0 720 160"
        role="img"
        aria-label="SchoolClerk"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Full wordmark with cap sitting slightly above the 'S' */}
        <g fill="currentColor" fillRule="nonzero">
          {/* cap (left) */}
          <g transform="translate(10,8)">
            <polygon points="40,0 6,22 40,44 74,22" />
            <rect x="55" y="26" width="4" height="18" rx="2" />
            <circle cx="57" cy="46" r="2.8" />
          </g>

          {/* wordmark text - using text element so it's editable/responsive */}
          <text
            x="120"
            y="98"
            fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight="700"
            fontSize="72"
          >
            SchoolClerk
          </text>
        </g>
      </svg>
    ),
  },

  // Variant 2: Wordmark only, very geometric cap forming part of the "S"
  Variant2: {
    LogoSm: (props: any) => (
      <svg
        width="48"
        height="48"
        viewBox="0 0 64 64"
        role="img"
        aria-label="SchoolClerk monogram"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="currentColor" fillRule="nonzero">
          {/* stylized SC monogram: S formed with open strokes, C to the right */}
          <path
            d="M14 20c8-8 22-8 30 0"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M46 18c6 6 6 18 0 24"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* tiny cap as a wedge above the S */}
          <polygon points="16,6 32,14 48,6 32,0" />
        </g>
      </svg>
    ),

    Logo: (props: any) => (
      <svg
        width="420"
        height="80"
        viewBox="0 0 840 160"
        role="img"
        aria-label="SchoolClerk"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="currentColor">
          {/* cap integrated as a small wedge above the 'S' baseline */}
          <g transform="translate(18,6)">
            <polygon points="28,0 96,36 28,72 -40,36" />
            <rect x="82" y="38" width="6" height="20" rx="3" />
            <circle cx="86" cy="60" r="3" />
          </g>

          {/* wordmark text */}
          <text
            x="140"
            y="102"
            fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight="700"
            fontSize="72"
          >
            SchoolClerk
          </text>
        </g>
      </svg>
    ),
  },

  // Variant 3: Elegant minimalist: thin type with a small cap acting as punctuation
  Variant3: {
    LogoSm: (props: any) => (
      <svg
        width="48"
        height="48"
        viewBox="0 0 64 64"
        role="img"
        aria-label="SchoolClerk small"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="none" fillRule="evenodd">
          {/* small cap as simple line + diamond */}
          <path d="M6 26 L32 10 L58 26 L32 42 Z" fill="currentColor" />
          <line
            x1="34"
            y1="22"
            x2="34"
            y2="38"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* small subtle SC monogram */}
          <text
            x="32"
            y="54"
            fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight="600"
            fontSize="18"
            fill="currentColor"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            SC
          </text>
        </g>
      </svg>
    ),

    Logo: (props: any) => (
      <svg
        width="480"
        height="96"
        viewBox="0 0 960 192"
        role="img"
        aria-label="SchoolClerk"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="currentColor">
          {/* cap, positioned over the start of the wordmark */}
          <g transform="translate(24,8)">
            <path d="M28 0 L96 36 L28 72 L-40 36 Z" />
            <rect x="88" y="40" width="5" height="26" rx="2.5" />
            <circle cx="90" cy="68" r="3" />
          </g>

          {/* wordmark - thin modern weight */}
          <text
            x="160"
            y="116"
            fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
            fontWeight="500"
            fontSize="84"
          >
            SchoolClerk
          </text>
        </g>
      </svg>
    ),
  },
};
export const Icons = {
  Status: Activity,
  profile: UserCircle,
  dashbord2: DashboardIcon,
  edit2: Edit2,
  box: Box,
  roles: ShieldIcon,
  Filter: Filter,
  Menu: MoreHorizontal,
  pdf: File,
  Search: Search,
  Export: Download,
  placeholder: ImageIcon,
  reciept: Receipt,
  X: Cross2Icon,
  calendar: Calendar,
  dollarSign: DollarSign,
  TrendingUp: TrendingUp,
  TrendingDown: TrendingDown,
  Notification: AlertCircle,

  time: Timer,
  cart: ShoppingBag,

  delivery2: Send,
  pickup: Package,
  Merge: Merge,
  Warn: Info,
  Rocket: Rocket,
  Delete: Delete,
  orders: ShoppingBag,
  project: FolderGit2,
  phone: Phone,
  address: MapPin,
  units: Home,
  tasks: Pin,
  payment: CreditCard,
  pendingPayment: TimerIcon,
  punchout: Cpu,
  hrm: LayoutTemplate,
  communitySettings: LayoutTemplate,
  component: Layers,
  clear: Eraser,
  Email: Mail,
  sortDesc: SortDesc,
  jobs: Briefcase,
  dealer: Briefcase,
  customerService: ClipboardList,
  communityInvoice: NewspaperIcon,
  dashboard: LayoutDashboard,
  salesSettings: Cog,
  save: Save,
  saveAndClose: FolderClosed,
  estimates: Banknote,
  send: Send,
  packingList: Package,
  production: Construction,
  open: BookOpen,
  close: X,
  print: Printer,
  menu: Menu,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  trash: Trash,
  post: FileText,
  page: File,
  percent: Percent,
  media,
  more: MoreVerticalIcon,
  settings: Settings,
  settings2: Settings2,
  billing: CreditCard,
  products: PackageOpen,
  ellipsis: MoreVertical,
  add: Plus,
  dollar: BadgeDollarSign,
  inbound: Package,
  warning: AlertTriangle,
  employees: Users,
  user: User,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  move2: Move,
  help: HelpCircle,
  pizza: Pizza,
  delivery: Truck,
  copy: Copy,
  copyDone: ClipboardCheck,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  lineChart: LineChart,
  hide: EyeOff,
  view: Eye,
  flag: Flag,
  edit: ClipboardEdit,

  book: Book,
  building: Building,

  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  coins: Coins,
  "credit-card": CreditCard,
  // dashboard: Dashboard,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  list: List,
  "message-square": MessageSquare,

  shield: Shield,
  speaker: Speaker,

  "user-plus": UserPlus,
  users: Users,
  wallet: Wallet,
  award: Award,
  "bar-chart": BarChart,
  //
  // box: Box,

  // Logo: () => <Image alt="" src={logo2} width={48} height={48} />,
  // LogoLg: () => <Image alt="" src={logo2} width={120} />,
  // logoLg: ({ width = 120 }) => (
  //   <Link href="/">
  //     <Image alt="" src={logo2} width={width} />
  //   </Link>
  // ),

  // logo: () => (
  //   <Link href="/">
  //     <Image alt="" src={logo} width={48} height={48} />
  //   </Link>
  // ),
  // PrintLogo: () => (
  //   <Link href="/">
  //     <Image
  //       alt=""
  //       onLoadingComplete={(img) => {}}
  //       width={178}
  //       height={80}
  //       src={logo2}
  //     />
  //   </Link>
  // ),
  Transactions2: (props: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={40}
      height={40}
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        d="M23.333 16.667H5V20h18.333v-3.333Zm0-6.667H5v3.333h18.333V10ZM5 26.667h11.667v-3.334H5v3.334Zm19 10 4.333-4.334 4.334 4.334L35 34.333 30.667 30 35 25.667l-2.333-2.334-4.334 4.334L24 23.333l-2.333 2.334L26 30l-4.333 4.333L24 36.667Z"
      />
    </svg>
  ),

  school: School,

  twitter: Twitter,
  check: Check,

  gender: MenuIcon,

  ...PaymentMethodIcon,
  LogoIcons,
};

export type IconKeys = keyof typeof Icons;
const iconVariants = cva("", {
  variants: {
    variant: {
      primary: "text-primary",
      muted: "text-muted-foreground",
      destructive: "text-red-600",
    },
    size: {
      sm: "size-4",
      default: "",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "muted",
  },
});
export function Icon({
  name,
  className,
  ...props
}: { name: IconKeys; className?: string } & VariantProps<typeof iconVariants>) {
  const RenderIcon: any = Icons[name];
  if (!RenderIcon) return null;
  return <RenderIcon className={cn("", iconVariants(props), className)} />;
}
export const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-gray-500" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "disputed":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};
