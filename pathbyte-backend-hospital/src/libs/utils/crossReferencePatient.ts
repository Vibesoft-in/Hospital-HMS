// Cross-reference utilities — pathlab integration removed in hospital-only build

export async function crossReferencePatient(_pathlabPatient: any): Promise<void> {
  // No-op: pathlab cross-referencing not available in hospital-only build
}

export async function getPathlabCasesForHmsPatient(_pathlabPatientId: string): Promise<any[]> {
  return [];
}
