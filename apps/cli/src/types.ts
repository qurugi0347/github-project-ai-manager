export interface GpmConfig {
  owner: string;
  ownerType: 'organization' | 'user';
  repo?: string;
  projectNumber: number;
  projectUrl: string;
}
