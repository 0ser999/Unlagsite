import { Gamepad2, Trash2, Package, History, CircuitBoard, MessageSquare } from 'lucide-react';

const ICONS = {
  gamemode: Gamepad2,
  cleaner: Trash2,
  debloat: Package,
  backups: History,
  bios: CircuitBoard,
  assistant: MessageSquare,
};

export function ToolIcon({ id, size = 18 }) {
  const Icon = ICONS[id];
  return Icon ? <Icon size={size} strokeWidth={1.5} /> : null;
}
