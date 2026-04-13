# Flowbite Referral Setup

Instructions for connecting your Flowbite site (`https://www.lawbrokr.com/referral`) to the partners app referral tracking.

## Steps

1. Read the `ref` query parameter from the URL on page load
2. Store it (e.g. in `localStorage` or a hidden field)
3. When "Book Now" is clicked, send a POST request to your partners app

## Code

Add this to your Flowbite `/referral` page:

```javascript
// On page load — grab and store the referral code
const ref = new URLSearchParams(window.location.search).get("ref");
if (ref) {
  localStorage.setItem("lawbrokr_ref", ref);
}

// When "Book Now" is clicked
const storedRef = localStorage.getItem("lawbrokr_ref");
if (storedRef) {
  fetch("https://YOUR_PARTNERS_APP_URL/api/referrals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: storedRef }),
  });
}
```

## Configuration

Replace `YOUR_PARTNERS_APP_URL` with your Vercel deployment URL (e.g. `https://lawbrokrpartners.vercel.app`).

## Referral link format

Each partner gets a unique link like:

```
https://www.lawbrokr.com/referral?ref=abc123def456
```

The `ref` value is a 12-character hex code unique to each partner.
