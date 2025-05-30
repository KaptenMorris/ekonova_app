import { Coins } from 'lucide-react';
import type { FC } from 'react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const Logo: FC<LogoProps> = ({ className, iconSize = 24, textSize = "text-xl" }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Coins className="text-primary" size={iconSize} />
      <span className={`font-semibold ${textSize} text-foreground`}>Ekonova</span>
    </div>
  );
};

export default Logo;
