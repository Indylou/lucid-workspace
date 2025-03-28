import { FC, SVGProps } from "react";

declare module "lucide-react" {
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
  }

  export type Icon = FC<IconProps>;

  // Basic Icons
  export const Plus: Icon;
  export const MoreVertical: Icon;
  export const AlertCircle: Icon;
  export const Clock: Icon;
  export const MessageCircle: Icon;
  export const Settings: Icon;
  export const Users: Icon;
  export const Edit: Icon;
  export const FileEdit: Icon;
  export const Star: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Filter: Icon;
  export const MoreHorizontal: Icon;
  export const PlusCircle: Icon;
  export const Search: Icon;
  export const Calendar: Icon;
  export const BarChart: Icon;
  export const LogOut: Icon;
  export const Bookmark: Icon;
  export const Activity: Icon;
  export const Layout: Icon;
  export const Loader2: Icon;
  export const FolderKanban: Icon;

  // Editor Icons
  export const Bold: Icon;
  export const Italic: Icon;
  export const List: Icon;
  export const ListOrdered: Icon;
  export const Code: Icon;
  export const Heading1: Icon;
  export const Heading2: Icon;
  export const Heading3: Icon;
  export const Quote: Icon;
  export const Undo: Icon;
  export const Redo: Icon;
  export const ArrowLeft: Icon;
  export const Save: Icon;
  export const ListTodo: Icon;
  export const StarOff: Icon;
  export const Trash: Icon;

  // Additional Icons
  export const Bell: Icon;
  export const Check: Icon;
  export const ChevronDown: Icon;
  export const ChevronUp: Icon;
  export const Circle: Icon;
  export const Upload: Icon;
  export const X: Icon;
  export const FileIcon: Icon;
  export const FileText: Icon;
  export const Image: Icon;
  export const File: Icon;
  export const Underline: Icon;
  export const Highlighter: Icon;
  export const Type: Icon;
  export const Link: Icon;
  export const AtSign: Icon;
  export const Minus: Icon;
  export const Video: Icon;
  export const Play: Icon;
  export const Pause: Icon;
  export const CheckCircle2: Icon;
  export const BarChart2: Icon;
  export const Brain: Icon;
  export const MessageSquare: Icon;
  export const Zap: Icon;
  export const ArrowUpRight: Icon;
  export const Sparkles: Icon;
  export const CodeSquare: Icon;
  export const Tag: Icon;
  export const Folder: Icon;
  export const Trash2: Icon;
  export const UserIcon: Icon;
  export const CheckSquare: Icon;
  export const User: Icon;

  // Missing Icons
  export const PieChart: Icon;
  export const LineChart: Icon;
  export const ArrowDownRight: Icon;
  export const CheckCircle: Icon;
  export const Flag: Icon;
  export const Home: Icon;
  export const CircleSlash: Icon;
  export const CalendarIcon: Icon;
  export const Moon: Icon;
  export const Sun: Icon;
  export const Pencil: Icon;
} 