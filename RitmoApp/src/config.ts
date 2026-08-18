// Where the app finds the Ritmo backend.
//
// IMPORTANT — set this to your backend's address:
//   • Testing on your phone with the server on your PC:
//       use your computer's LAN IP, e.g. "http://192.168.1.20:3000"
//       (find it by running `ipconfig` and reading the IPv4 Address).
//   • After deploying to Render (Phase 3):
//       use the public URL, e.g. "https://ritmo-backend.onrender.com"
//
// The phone canNOT reach "localhost" — that points to the phone itself.

export const BACKEND_URL = "http://192.168.1.195:3000";

// Pronunciation-practice voice feature. Off for now (needs a paid voice API).
// Flip to true once a voice provider is set up.
export const ENABLE_PRONUNCIATION = false;
