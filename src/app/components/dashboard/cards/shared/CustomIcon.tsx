import * as LucideIcons from 'lucide-react';
import { getIconUrl } from '@/assets/icons';
import { getMdiIconPath } from '@/utils/mdi-helpers';

export type IconState = 'default' | 'active' | 'alarm';

interface CustomIconProps {
  name?: string;
  className?: string;
  state?: IconState;
}

export function CustomIcon({ name, className = '', state = 'default' }: CustomIconProps) {
  let stateClass = '';
  switch (state) {
    case 'active':
      stateClass = 'text-primary';
      break;
    case 'alarm':
      stateClass = 'text-red-500';
      break;
    default:
      stateClass = 'text-muted-foreground';
  }
  const combinedClass = `${stateClass} ${className}`;

  if (!name) return null;

  // Check for SVG URL (Local assets or remote)
  const svgUrl = getIconUrl(name);
  if (svgUrl) {
    return (
      <span
        className={`inline-block align-middle bg-current ${combinedClass}`}
        style={{
          maskImage: `url(${svgUrl})`,
          maskSize: 'contain',
          maskPosition: 'center',
          maskRepeat: 'no-repeat',
          WebkitMaskImage: `url(${svgUrl})`,
          WebkitMaskSize: 'contain',
          WebkitMaskPosition: 'center',
          WebkitMaskRepeat: 'no-repeat',
        }}
        aria-hidden="true"
        role="img"
        aria-label={name}
      />
    );
  }

  // Check for MDI Icon
  const mdiPath = getMdiIconPath(name);
  if (mdiPath) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={combinedClass}
        fill="currentColor"
        style={{ width: '1em', height: '1em' }}
        aria-hidden="true"
        role="img"
        aria-label={name}
      >
        <path d={mdiPath} />
      </svg>
    );
  }

  // Fallback to Lucide Icons
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={combinedClass} />;
}
