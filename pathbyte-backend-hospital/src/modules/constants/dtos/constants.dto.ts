export interface CreateConstantDTO {
  key: string;
  value: any;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface ConstantResponseDTO {
  _id: string;
  key: string;
  value: any;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateConstantDTO {
  key?: string;
  value?: any;
  description?: string;
  category?: string;
  isActive?: boolean;
}
