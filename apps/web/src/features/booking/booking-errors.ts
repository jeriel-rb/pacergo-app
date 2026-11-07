/** Server refusals from the booking RPCs and routes, mapped to `sessions`
 *  i18n keys. Postgres messages are English, so the UI never shows them as
 *  they are: anything not listed falls back to the generic error. */
const BOOKING_ERROR_KEYS: Record<string, string> = {
  // create_booking
  booking_time_overlap: "errors.timeOverlap",
  booking_undated_request_open: "errors.undatedRequestOpen",
  booking_open_request_limit: "errors.openRequestLimit",
  // Older database: one open booking per member and trainer.
  "you already have an open booking with this companion": "errors.openBookingExists",
  "cannot book a time in the past": "errors.pastTime",
  "cannot book yourself": "errors.selfBooking",
  "offering not available": "errors.offeringUnavailable",
  "booking not available": "errors.unavailable",
  "not authenticated": "errors.signedOut",
  // accept / decline / complete RPCs and the cancel route
  booking_unauthenticated: "errors.signedOut",
  "accept not allowed": "errors.actionNotAllowed",
  "decline not allowed": "errors.actionNotAllowed",
  "complete not allowed": "errors.actionNotAllowed",
  booking_not_found: "errors.actionNotAllowed",
  booking_cancel_trainer_only: "errors.actionNotAllowed",
  booking_cancel_not_allowed: "errors.actionNotAllowed",
};

/** The `sessions` key to show for a failed booking call. */
export function bookingErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  return BOOKING_ERROR_KEYS[message] ?? "error";
}
