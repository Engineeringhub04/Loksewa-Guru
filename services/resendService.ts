// A simple service to send an email via a backend endpoint.
// The backend (e.g., a Vercel Serverless Function) would handle the actual sending using a service like Resend.

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string; }) => {
    const endpoint = 'https://loksewa-guru-resend.vercel.app/api/send';

    try {
        // Using `no-cors` and `text/plain` to send a "simple request" that bypasses CORS preflight checks.
        // This is a "fire-and-forget" method; we cannot read the response from the server.
        // This is necessary because the server endpoint is not configured with the correct CORS headers.
        await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors', // Bypasses CORS preflight, but makes the response opaque.
            headers: {
                // Using text/plain to make this a CORS "simple request".
                // The server will need to parse this text body as JSON.
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                to,
                subject,
                html,
                apiKey: 're_W1VxvFmY_CfbgEoV8fbfLPMRfcxeNvQBv', // API key for the service
            }),
        });

        // With `no-cors`, the response object doesn't contain useful information about success or failure.
        // We log that the request was dispatched and assume it will be processed.
        console.log('Email send request was dispatched (no-cors).');
        
        // Return a generic success message as we can't read the actual response.
        return { message: "Request dispatched successfully" };

    } catch (error) {
        // This will only catch network-level errors (e.g., DNS failure, server offline),
        // not CORS errors (which are suppressed by `no-cors`) or server application errors.
        console.error('Error dispatching email request:', error);
        throw error;
    }
};
