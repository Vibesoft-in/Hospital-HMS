/** Class representing an API Error Response with a related HTTP Status Code **/
class APIError extends Error {
  status: number;
  title: string;
  message: string;
  constructor(
    status = 500,
    title = "Internal Server Error",
    message = "An unknown server error occurred."
  ) {
    super(message);
    this.status = status;
    this.title = title;
    this.message = message;
  }
  toJSON() {
    const { status, title, message } = this;
    return {
      error: {
        status,
        title,
        message,
      },
    };
  }
}

export { APIError };
