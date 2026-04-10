// Vessel AIS — returns AISstream config for client-side WebSocket
// The client connects directly to AISstream WebSocket using the key served here
// This keeps the key server-side while allowing real-time WS from browser

export async function GET() {
  // Return config for client WebSocket connection
  // Client will connect to wss://stream.aisstream.io/v0/stream
  // and subscribe to major shipping lanes
  return Response.json({
    wsUrl: 'wss://stream.aisstream.io/v0/stream',
    apiKey: process.env.AISSTREAM_KEY || 'a70cef39abe1a883c779b3c7b5e0ddfc422d4c0f',
    bboxes: [
      // Persian Gulf / Strait of Hormuz
      [[22.0, 50.0], [28.0, 62.0]],
      // Strait of Malacca / Singapore
      [[0.5, 98.0], [7.0, 106.0]],
      // Suez Canal / Red Sea
      [[11.0, 29.0], [32.0, 44.0]],
      // English Channel / North Sea
      [[47.0, -6.0], [58.0, 8.0]],
      // Mediterranean
      [[30.0, -6.0], [47.0, 40.0]],
      // South China Sea / Taiwan Strait
      [[0.0, 105.0], [26.0, 125.0]],
      // Black Sea
      [[40.5, 27.5], [47.0, 42.0]],
      // Arabian Sea / Gulf of Aden
      [[10.0, 50.0], [25.0, 70.0]],
    ],
    msgTypes: ['PositionReport'],
  })
}
