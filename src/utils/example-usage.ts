import { Page } from "puppeteer";
import { setupApiInterception } from "./apiInterceptor.js";

/**
 * Example usage of the API interceptor utility with waiting functionality
 *
 * This shows how to use the extracted API interception functionality
 * in your own Puppeteer automation code.
 */

export async function exampleApiInterception(page: Page) {
  // Example 1: Basic setup with API pattern matching and waiting
  const { clearResponses, removeListeners, waitForRequests, getActiveRequestsCount } = await setupApiInterception(
    page,
    '/api/login',
    (response) => {
      console.log('Captured API response:', response.url, response.status);
    },
    true, // Enable waiting for requests
    10000 // Request timeout
  );

  // Navigate to a page and perform actions
  await page.goto('https://example.com/login');
  await page.type('#username', 'testuser');
  await page.type('#password', 'testpass');
  await page.click('#login-button');

  // Wait for all API calls to complete automatically
  console.log('Waiting for API requests to complete...');
  const responses = await waitForRequests(15000); // Wait max 15 seconds
  console.log(`Captured ${responses.length} API responses`);

  // Alternative: Check active requests manually
  if (getActiveRequestsCount() > 0) {
    console.log(`Still have ${getActiveRequestsCount()} active requests`);
    await waitForRequests(5000); // Wait a bit more
  }

  // Clear responses for the next batch
  clearResponses();

  // Clean up listeners when done
  removeListeners();

  return responses;
}

/**
 * Example 2: Using the ApiInterceptor class directly with waiting
 */
import { ApiInterceptor } from "./apiInterceptor.js";

export async function exampleWithClassAndWait(page: Page) {
  const interceptor = new ApiInterceptor(page, {
    apiPattern: '/api/',
    onResponse: (response) => {
      if (response.status >= 400) {
        console.error(`API Error: ${response.url} - ${response.status}`);
      }
    },
    waitForRequests: true,
    requestTimeout: 8000
  });

  await interceptor.setupInterception();

  // Perform your page interactions here
  await page.goto('https://example.com');
  await page.click('#submit-button');

  // Wait for all API requests to complete
  const responses = await interceptor.waitForRequests(12000);
  console.log(`All ${responses.length} API requests completed`);

  // Check if any requests are still active
  const activeCount = interceptor.getActiveRequestsCount();
  if (activeCount > 0) {
    console.warn(`Warning: ${activeCount} requests still active`);
  }

  // Clean up
  interceptor.removeListeners();

  return responses;
}

/**
 * Example 3: Non-blocking mode (don't wait for requests)
 */
export async function exampleNonBlocking(page: Page) {
  const { getResponses, waitForRequests } = await setupApiInterception(
    page,
    '/api/',
    undefined,
    false // Don't wait for requests
  );

  // Perform actions
  await page.goto('https://example.com');

  // Get responses immediately (won't wait)
  const responses = getResponses();
  console.log(`Got ${responses.length} responses immediately`);

  // Optionally wait later if needed
  const allResponses = await waitForRequests(5000);
  console.log(`Got ${allResponses.length} responses after waiting`);

  return allResponses;
}