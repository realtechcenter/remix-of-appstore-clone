import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, CreditCard, Settings, User, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import macsofyLogo from '@/assets/macsofy-logo.png';

interface DockItem {
  id: string;
  icon: React.ElementType | null;
  image?: string;
  label: string;
  path: string;
  requiresAuth?: boolean;
}

export const MacDock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const items: DockItem[] = [
    { id: 'home', icon: null, image: macsofyLogo, label: 'Macsofy', path: '/' },
    { id: 'games', icon: Gamepad2, label: language === 'km' ? 'ល្បែង' : 'Games', path: '/?category=games' },
    ...(user ? [
      { id: 'purchases', icon: ShoppingBag, label: language === 'km' ? 'ការទិញ' : 'Purchases', path: '/my-purchases', requiresAuth: true },
      { id: 'payments', icon: CreditCard, label: language === 'km' ? 'បង់ប្រាក់' : 'Payments', path: '/payment-history', requiresAuth: true },
      { id: 'settings', icon: Settings, label: language === 'km' ? 'ការកំណត់' : 'Settings', path: '/profile', requiresAuth: true },
    ] as DockItem[] : [
      { id: 'login', icon: User, label: language === 'km' ? 'ចូល' : 'Sign In', path: '/auth' },
    ]),
  ];

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const diff = Math.abs(hoveredIndex - index);
    if (diff === 0) return 1.35;
    if (diff === 1) return 1.15;
    if (diff === 2) return 1.05;
    return 1;
  };

  const getTranslateY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const diff = Math.abs(hoveredIndex - index);
    if (diff === 0) return -12;
    if (diff === 1) return -6;
    if (diff === 2) return -2;
    return 0;
  };

  return (
    <div className="mac-dock-wrapper">
      <div
        className="mac-dock"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/');
          const scale = getScale(index);
          const translateY = getTranslateY(index);

          return (
            <div key={item.id} className="relative flex flex-col items-center">
              {/* Tooltip */}
              {hoveredIndex === index && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground/80 text-background text-[11px] px-2 py-0.5 rounded-md whitespace-nowrap backdrop-blur-sm animate-fade-in z-50">
                  {item.label}
                </div>
              )}
              <button
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHoveredIndex(index)}
                className="mac-dock-item"
                style={{
                  transform: `scale(${scale}) translateY(${translateY}px)`,
                  transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              >
                {item.image ? (
                  <img src={item.image} alt={item.label} className="w-full h-full rounded-[10px] object-contain" />
                ) : Icon ? (
                  <div className={cn(
                    "w-full h-full rounded-[10px] flex items-center justify-center",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                ) : null}
              </button>
              {/* Active dot */}
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-foreground/60 mt-0.5 transition-opacity" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
