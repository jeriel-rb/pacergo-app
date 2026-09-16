alter type booking_status add value if not exists 'pending_payment';
alter type booking_status add value if not exists 'payment_processing';
alter type booking_status add value if not exists 'payment_failed';
