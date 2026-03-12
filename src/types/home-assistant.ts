import { CameraConfig } from '@/components/camera/types';

export interface HAConfig {
  localUrl: string;
  publicUrl: string;
  token: string;
  deviceMappings: Record<number, string>;
  personMappings: Record<string, string>;
  sceneMappings: Record<string, string>;
  cameras?: CameraConfig[];
}
