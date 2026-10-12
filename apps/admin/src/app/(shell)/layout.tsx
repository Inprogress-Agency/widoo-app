import { ShellContainer } from '@/containers/ShellContainer';
import type { ReactNode } from 'react';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <ShellContainer>{children}</ShellContainer>;
}
