export interface Scene {
  id: number;
  name: string;
  isActive: boolean;
  icon: string;
}

export interface Log {
  time: string;
  message: string;
}
