import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for business validation
const successfulBookings = new Rate('successful_bookings');
const soldOutRejections = new Rate('sold_out_rejections');
const serverErrors = new Rate('server_errors');
const bookingDuration = new Trend('booking_duration');

// Configuration
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000';

export const options = {
  stages: [
    { duration: '20s', target: 10 },  // Ramp-up: 10 concurrent users
    { duration: '40s', target: 35 },  // Surge: 35 concurrent users
    { duration: '1m',  target: 50 },  // Peak Flash Sale: 50 concurrent users (triggers HPA scale-up)
    { duration: '20s', target: 10 },  // Ramp-down
    { duration: '10s', target: 0 },   // Cool-down
  ],
  thresholds: {
    // Service resilience thresholds
    'http_req_duration': ['p(95)<500'],        // 95% of requests must complete under 500ms
    'server_errors': ['rate<0.01'],            // Server 500s must remain strictly under 1%
    'http_req_failed{status:!400}': ['rate<0.02'], // Non-business errors must be under 2%
  },
};

export function setup() {
  // Ensure the target service is reachable
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'platform is healthy': (r) => r.status === 200,
  });

  // Fetch published events to find ticket tier IDs
  const eventsRes = http.get(`${BASE_URL}/api/v1/events`);
  let eventId = 1;
  let ticketTypeId = 1;

  if (eventsRes.status === 200) {
    const data = eventsRes.json();
    if (data.events && data.events.length > 0) {
      eventId = data.events[0].id;
      if (data.events[0].ticket_types && data.events[0].ticket_types.length > 0) {
        ticketTypeId = data.events[0].ticket_types[0].id;
      }
    }
  }

  return { eventId, ticketTypeId };
}

export default function (data) {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Health check baseline
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health probe returns 200': (r) => r.status === 200 });

  // 2. Browse Event Catalog
  const eventsRes = http.get(`${BASE_URL}/api/v1/events`, { headers });
  check(eventsRes, {
    'events query succeeds': (r) => r.status === 200,
  });

  // 3. User Authentication
  const userIndex = __VU % 50;
  const loginPayload = JSON.stringify({
    email: `customer${userIndex}@test.com`,
    password: 'TestPassword123!',
  });

  // Attempt login or fallback to guest / seeded credentials
  let authRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, { headers });
  let token = null;

  if (authRes.status === 200) {
    token = authRes.json('access_token');
  } else {
    // Authenticate with seeded admin or test user
    const adminLogin = JSON.stringify({
      email: 'admin@eventflow.dev',
      password: 'Admin1234!',
    });
    const fallbackAuth = http.post(`${BASE_URL}/api/v1/auth/login`, adminLogin, { headers });
    if (fallbackAuth.status === 200) {
      token = fallbackAuth.json('access_token');
    }
  }

  // 4. Flash Sale Ticket Reservation (Concurrent Transaction Rush)
  if (token) {
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const bookingPayload = JSON.stringify({
      items: [
        {
          ticket_type_id: data.ticketTypeId || 1,
          quantity: 1,
        },
      ],
    });

    const start = Date.now();
    const bookRes = http.post(`${BASE_URL}/api/v1/bookings`, bookingPayload, {
      headers: authHeaders,
    });
    bookingDuration.add(Date.now() - start);

    if (bookRes.status === 201) {
      successfulBookings.add(1);
      soldOutRejections.add(0);
      serverErrors.add(0);
    } else if (bookRes.status === 400 || bookRes.status === 409) {
      // Sold out or validation guard triggered gracefully (PostgreSQL concurrency lock worked!)
      successfulBookings.add(0);
      soldOutRejections.add(1);
      serverErrors.add(0);
    } else if (bookRes.status >= 500) {
      // Server crash / unhandled lock contention
      successfulBookings.add(0);
      soldOutRejections.add(0);
      serverErrors.add(1);
    }

    check(bookRes, {
      'booking was either confirmed or cleanly rejected without server crash': (r) =>
        r.status === 201 || r.status === 400 || r.status === 409,
    });
  }

  sleep(Math.random() * 0.5 + 0.2); // Jitter between 200ms and 700ms
}
