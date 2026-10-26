// src/components/ui/EntityTypeIcon.tsx
// Maps EntityType icon name → Lucide icon

import {
  User, MapPin, Shield, Zap, Clock, Users, Globe, Star,
  MessageSquare, Feather, Map, Package, GitBranch, Lightbulb,
  HelpCircle, Sword, Car, Rocket, Compass, Book, Landmark,
  Sparkles, Layers, Cpu, Heart, Crown, Crosshair, Flag,
  Sun, Building2, Calendar, Home,
} from 'lucide-react';

export const AVAILABLE_ICONS = [
  'User', 'Crown', 'Users', 'MapPin', 'Globe', 'Landmark', 'Shield',
  'Sword', 'Crosshair', 'Car', 'Rocket', 'Zap', 'Clock', 'Compass',
  'Book', 'Star', 'Heart', 'Sparkles', 'MessageSquare', 'Feather',
  'Map', 'Package', 'GitBranch', 'Lightbulb', 'Layers', 'Cpu', 'Flag',
  'Sun', 'Building2', 'Calendar', 'Home'
];

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  User, MapPin, Shield, Zap, Clock, Users, Globe, Star,
  MessageSquare, Feather, Map, Package, GitBranch, Lightbulb,
  Sword, Car, Rocket, Compass, Book, Landmark,
  Sparkles, Layers, Cpu, Heart, Crown, Crosshair, Flag,
  Sun, Building2, Calendar, Home,
};

interface Props { name: string; size?: number; color?: string; className?: string; }

export default function EntityTypeIcon({ name, size = 16, color, className }: Props) {
  const Icon = ICON_MAP[name] ?? HelpCircle;
  return <Icon size={size} color={color} className={className} />;
}
