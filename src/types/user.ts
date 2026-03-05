export interface User {
  name: string;
  avatar: string;
  online: boolean;
  isLocalAvatar?: boolean; // 标记是否为本地上传的头像，防止被 HA 自动同步覆盖
}
