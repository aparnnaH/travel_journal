// Canva integration types.
// These mirror the subset of Canva design/export response data the journal
// workspace needs.
export type CanvaDesignOwner = {
  user_id: string;
  team_id: string;
};

export type CanvaDesignLinks = {
  edit_url: string;
  view_url: string;
};

export type CanvaThumbnail = {
  width: number;
  height: number;
  url: string;
};

export type CanvaDesign = {
  id: string;
  title?: string;
  owner: CanvaDesignOwner;
  urls: CanvaDesignLinks;
  thumbnail?: CanvaThumbnail;
  created_at?: number;
  updated_at?: number;
  page_count?: number;
  design_types?: string[];
};

export type CanvaExportJobStatus = 'failed' | 'in_progress' | 'success';

export type CanvaExportJob = {
  id: string;
  status: CanvaExportJobStatus;
  urls?: string[];
  error?: {
    code: string;
    message: string;
  };
};

export type CanvaExportResult = {
  designId: string;
  title: string;
  format: 'png' | 'jpg' | 'pdf';
  job: CanvaExportJob;
  dataUrls?: string[];
};
