export function successResponse(data: any, message = "success", code = 200) {
  return {
    code,
    message,
    data,
  };
}

export function errorResponse(
  code: number,
  message: string,
  status?: string,
  details?: any
) {
  return {
    code,
    message,
    data: {
      error: {
        code,
        message,
        status: status || "ERROR",
        details: details || null,
      },
    },
  };
}
