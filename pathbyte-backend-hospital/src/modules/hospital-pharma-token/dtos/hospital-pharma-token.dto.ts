export interface CreateHospitalPharmaTokenDTO {
  appointmentId: string; // Hospital visit _id
  pharmaTokenId?: string; // Optional - will be auto-generated if not provided
  status?: "Pending" | "In Progress" | "Completed" | "Cancelled";
}

export interface HospitalPharmaTokenResponseDTO {
  pharmaTokenId: string; // Randomly generated hospital pharma token (HPH prefix)
  appointmentId: string; // Hospital visit _id
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  appointment?: any; // Populated appointment data
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHospitalPharmaTokenDTO {
  appointmentId?: string; // Hospital visit _id
  pharmaTokenId?: string; // Can be manually updated
  status?: "Pending" | "In Progress" | "Completed" | "Cancelled";
}