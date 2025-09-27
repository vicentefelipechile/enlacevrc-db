/**
 * @file Provides standardized JSON response functions for the Cloudflare Worker.
 * @author vicentefelipechile
 */

/**
 * @description Creates a standard JSON response with a given status code.
 * @param {T} data The data to be stringified and sent in the response body.
 * @param {number} [status=200] The HTTP status code for the response.
 * @returns {Response} A Cloudflare Response object.
 */
export function JsonResponse<T>(data: T, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * @description Creates a standard JSON error response.
 * @param {string} message The error message.
 * @param {number} [status=500] The HTTP status code for the error response.
 * @returns {Response} A Cloudflare Response object.
 */
export function ErrorResponse(message: string, status: number = 500): Response {
    return JsonResponse({
        success: false,
        error: message
    }, status);
}

/**
 * @description Creates a standard JSON success response, typically for operations
 * that don't return data (like POST or PUT).
 * @param {string} message The success message.
 * @param {number} [status=200] The HTTP status code for the response.
 * @returns {Response} A Cloudflare Response object.
 */
export function SuccessResponse(message: string, status: number = 200): Response {
    return JsonResponse({
        success: true,
        message: message
    }, status);
}
