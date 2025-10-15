import { Cross2Icon } from "@radix-ui/react-icons";
import { cva, VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BadgeDollarSign,
  Banknote,
  BarChart,
  Book,
  BookOpen,
  Box,
  Briefcase,
  Building,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  ClipboardEdit,
  ClipboardList,
  Cog,
  Coins,
  Construction,
  Copy,
  Cpu,
  CreditCard,
  Delete,
  DollarSign,
  Download,
  Eraser,
  Eye,
  EyeOff,
  File,
  FileText,
  Filter,
  FolderClosed,
  FolderGit2,
  GraduationCap,
  HelpCircle,
  Home,
  ImageIcon,
  Info,
  Laptop,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  List,
  Loader2,
  LucideProps,
  Mail,
  MapPin,
  Image as media,
  Menu,
  MenuIcon,
  Merge,
  MessageSquare,
  Moon,
  MoreHorizontal,
  MoreVertical,
  MoreVerticalIcon,
  Move,
  NewspaperIcon,
  Package,
  PackageOpen,
  Pencil,
  Percent,
  Phone,
  Pin,
  Pizza,
  Plus,
  Printer,
  Receipt,
  Rocket,
  Save,
  School,
  Search,
  Send,
  Settings,
  Settings2,
  Shield,
  ShieldIcon,
  ShoppingBag,
  Speaker,
  SunMedium,
  Timer,
  Trash,
  TrendingDown,
  TrendingUp,
  Truck,
  Twitter,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@school-clerk/ui/cn";

export type Icon = LucideIcon;

export const Icons = {
  box: Box,
  book: Book,
  building: Building,
  calendar: Calendar,

  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  coins: Coins,
  "credit-card": CreditCard,
  // dashboard: Dashboard,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  list: List,
  "message-square": MessageSquare,
  settings: Settings,
  shield: Shield,
  speaker: Speaker,
  user: User,
  "user-plus": UserPlus,
  users: Users,
  wallet: Wallet,
  award: Award,
  "bar-chart": BarChart,
  //
  // box: Box,
  Filter: Filter,
  Menu: MoreHorizontal,
  pdf: File,
  Search: Search,
  Export: Download,
  placeholder: ImageIcon,
  reciept: Receipt,
  X: Cross2Icon,
  // calendar: Calendar,
  dollarSign: DollarSign,
  TrendingUp: TrendingUp,
  TrendingDown: TrendingDown,
  Notification: AlertCircle,
  // Logo: () => <Image alt="" src={logo2} width={48} height={48} />,
  // LogoLg: () => <Image alt="" src={logo2} width={120} />,
  // logoLg: ({ width = 120 }) => (
  //   <Link href="/">
  //     <Image alt="" src={logo2} width={width} />
  //   </Link>
  // ),
  time: Timer,
  cart: ShoppingBag,
  Logosm: GraduationCap,
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
  payment: Pin,
  punchout: Cpu,
  hrm: LayoutTemplate,
  communitySettings: LayoutTemplate,
  component: Layers,
  clear: Eraser,
  Email: Mail,
  jobs: Briefcase,
  // shield: ShieldIcon,
  dealer: Briefcase,
  customerService: ClipboardList,
  // "graduation-cap":GeneraCap
  communityInvoice: NewspaperIcon,
  dashboard: LayoutDashboard,
  salesSettings: Cog,
  save: Save,
  saveAndClose: FolderClosed,
  estimates: Banknote,
  packingList: Package,
  production: Construction,
  open: BookOpen,
  close: X,
  print: Printer,
  menu: Menu,
  school: School,
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
  // settings: Settings,
  settings2: Settings2,
  billing: CreditCard,
  products: PackageOpen,
  ellipsis: MoreVertical,
  add: Plus,
  dollar: BadgeDollarSign,
  inbound: Package,
  warning: AlertTriangle,
  // user: User,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  move2: Move,
  help: HelpCircle,
  pizza: Pizza,
  delivery: Truck,
  twitter: Twitter,
  check: Check,
  copy: Copy,
  copyDone: ClipboardCheck,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  lineChart: LineChart,
  hide: EyeOff,
  view: Eye,
  gender: MenuIcon,
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
}: { name: IconKeys; className? } & VariantProps<typeof iconVariants>) {
  const RenderIcon = Icons[name];
  if (!RenderIcon) return null;
  return <RenderIcon className={cn("", iconVariants(props), className)} />;
}
