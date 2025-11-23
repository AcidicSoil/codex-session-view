export const VIEWER_ROUTE_ID = '/(site)/viewer/' as const;
export const VIEWER_ROUTE_PATH = '/viewer' as const;

export type ViewerSearch = {
  filters: string[];
  expanded: string[];
  sizeMinMb?: number;
};
