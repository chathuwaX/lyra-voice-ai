/**
 * Health Controller
 */
export function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'mira-voice-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    providers: {
      gemini: !!process.env.GEMINI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
    },
  });
}
